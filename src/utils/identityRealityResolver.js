/**
 * identityRealityResolver.js
 *
 * LEARNING TRACKER — IDENTITY & REALITY ENGINE
 *
 * Answers:
 * "Who am I trying to become, what do I currently have, and what constraints am I actually living with?"
 *
 * Philosophy:
 * 1. Not an account settings page (name, email, password).
 * 2. Personal control room: destination + reality inventory + constraints.
 * 3. Never assumes: "Everyone has a laptop, lab, hardware, 3 hours a day, and unlimited money."
 * 4. "No Hardware" is a completely valid, supported state (simulation-first route).
 * 5. Distinct semantics: DECLARED (by user) vs OBSERVED (real data) vs INFERRED (hypothesis).
 * 6. User can always correct the system ("That's not right").
 */

import { safeStorageGet, safeStorageSet } from './storage';
import { loadHypotheses } from '../adaptive/adaptiveStorage';

export const IDENTITY_STORAGE_KEY = 'learningTracker_identity';

export const DEFAULT_IDENTITY = {
  destination: {
    primaryGoal: 'Embedded Systems Internship',
    statement: 'I want to become genuinely capable of building embedded systems.',
    targetRole: 'Embedded Systems Engineer',
    industry: 'Consumer Hardware & Robotics',
    targetTimeline: '2027 Placement / Internship',
    priority: 'High',
    secondaryGoals: [
      'Build real physical hardware',
      'Understand electronics deeply from first principles',
      'Master low-level C and memory architectures'
    ]
  },
  resources: {
    hardware: ['Laptop', 'ESP32', 'Multimeter', 'Breadboard'], // [] empty = None (simulation mode)
    software: ['VS Code', 'LTspice', 'KiCad', 'Python'],
    access: ['Home workspace', 'College lab'],
    internet: 'Reliable' // 'Reliable' | 'Limited' | 'Mostly mobile data' | 'Offline often'
  },
  timeReality: {
    weekdayMinutes: 35, // 20, 30, 35, 45, 60
    saturdayHours: 2,
    sundayHours: 1,
    pattern: 'focused-weekday-deep-weekend'
  },
  workEnvironment: {
    primaryLocation: 'Mixed (Home & College)',
    noiseLevel: 'Moderate noise' // 'Quiet environment' | 'Moderate noise' | 'Frequent interruption' | 'Shared space'
  },
  constraints: ['Time', 'College schedule', 'Hardware budget'],
  preferences: {
    startTriggers: ['A concrete problem', 'A project', 'A clear checklist'],
    conceptFlow: 'concrete-to-abstract', // 'concrete-to-abstract' | 'abstract-to-concrete'
    executionBias: 'build-to-understand', // 'build-to-understand' | 'understand-to-build'
    sessionBias: 'short-focused' // 'short-focused' | 'deep-immersion'
  },
  overrides: {},
  connectedDevices: {
    laptop: { connected: true, name: 'Web Workstation (Current)', lastSync: 'Just now' },
    phone: { connected: false, name: null, lastSync: null }
  }
};

/**
 * Loads current identity state from safe storage with fallback
 */
export function loadIdentity() {
  const saved = safeStorageGet(IDENTITY_STORAGE_KEY, null);
  if (!saved || typeof saved !== 'object') {
    return { ...DEFAULT_IDENTITY };
  }
  return {
    ...DEFAULT_IDENTITY,
    ...saved,
    destination: {
      ...DEFAULT_IDENTITY.destination,
      ...(saved.destination || {})
    },
    resources: {
      ...DEFAULT_IDENTITY.resources,
      ...(saved.resources || {})
    },
    timeReality: {
      ...DEFAULT_IDENTITY.timeReality,
      ...(saved.timeReality || {})
    },
    workEnvironment: {
      ...DEFAULT_IDENTITY.workEnvironment,
      ...(saved.workEnvironment || {})
    },
    preferences: {
      ...DEFAULT_IDENTITY.preferences,
      ...(saved.preferences || {})
    },
    connectedDevices: {
      ...DEFAULT_IDENTITY.connectedDevices,
      ...(saved.connectedDevices || {})
    },
    overrides: saved.overrides || {}
  };
}

/**
 * Persists updated identity state
 */
export function saveIdentity(identity) {
  const result = safeStorageSet(IDENTITY_STORAGE_KEY, identity);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('learningTracker_identity_updated', { detail: identity }));
    } catch (e) {
      // In non-browser test runners that mock window partially, fail safely
    }
  }
  return result;
}

/**
 * Resolves qualitative and factual reality indicators
 */
export function getRealitySummary(identity) {
  const hardware = identity?.resources?.hardware || [];
  const access = identity?.resources?.access || [];
  const weekdayMins = identity?.timeReality?.weekdayMinutes || 35;
  const weekendHours = (identity?.timeReality?.saturdayHours || 0) + (identity?.timeReality?.sundayHours || 0);
  const internet = identity?.resources?.internet || 'Reliable';

  // Hardware qualitative tier
  let hardwareLabel = 'Simulation Only (No Hardware)';
  let hardwareMeter = 25;
  if (hardware.length >= 5 || hardware.includes('Oscilloscope')) {
    hardwareLabel = 'Advanced Bench Kit';
    hardwareMeter = 90;
  } else if (hardware.length >= 2) {
    hardwareLabel = 'Basic Hardware Kit';
    hardwareMeter = 60;
  } else if (hardware.length === 1) {
    hardwareLabel = 'Minimal Hardware (Laptop + 1 board)';
    hardwareMeter = 40;
  }

  // Time qualitative tier
  let timeLabel = `${weekdayMins} min weekdays · ${weekendHours}h weekend`;
  let timeMeter = Math.min(100, Math.round((weekdayMins / 60) * 80 + weekendHours * 10));

  // Lab qualitative tier
  let labLabel = 'No dedicated workspace';
  let labMeter = 30;
  if (access.includes('College lab') || access.includes('Shared lab') || access.includes('Makerspace')) {
    labLabel = 'Lab access available';
    labMeter = 80;
  } else if (access.includes('Home workspace')) {
    labLabel = 'Home workspace only';
    labMeter = 60;
  }

  // Internet tier
  let internetMeter = 90;
  if (internet === 'Limited') internetMeter = 50;
  if (internet === 'Mostly mobile data') internetMeter = 40;
  if (internet === 'Offline often') internetMeter = 25;

  return {
    time: { label: timeLabel, meter: timeMeter },
    hardware: { label: hardwareLabel, meter: hardwareMeter, isSimulationOnly: hardware.length === 0 },
    lab: { label: labLabel, meter: labMeter },
    internet: { label: internet, meter: internetMeter },
    feasibility: {
      status: 'feasible',
      badge: '✓ FEASIBLE ROUTE',
      note: hardware.length === 0
        ? 'Route adapted: Focuses on software simulation and conceptual derivations without physical hardware assumptions.'
        : 'Route adapted: Includes practical breadboard builds & physical measurements calibrated to your kit.'
    }
  };
}

/**
 * Builds the transparent 3-tier system knowledge model:
 * DECLARED vs OBSERVED vs INFERRED
 */
export function resolveSystemKnowledge(identity, sessions = [], roadmap = []) {
  const overrides = identity?.overrides || {};
  const items = [];

  // 1. DECLARED (explicitly entered by user)
  items.push({
    id: 'dec-goal',
    tier: 'DECLARED',
    category: 'Target Destination',
    title: identity?.destination?.primaryGoal || 'Stem Mastery',
    detail: identity?.destination?.statement || 'Personal capability goal.',
    source: 'Declared by you in Destination setup',
    confidence: 'Explicit',
    canOverride: true,
    isOverridden: !!overrides['dec-goal']
  });

  const hwList = (identity?.resources?.hardware || []).join(', ');
  items.push({
    id: 'dec-hardware',
    tier: 'DECLARED',
    category: 'Available Hardware',
    title: hwList.length > 0 ? hwList : 'No physical hardware (Simulation route)',
    detail: hwList.length > 0 ? 'Physical bench components' : 'Virtual simulation & SPICE modeling',
    source: 'Declared by you in Resource Inventory',
    confidence: 'Explicit',
    canOverride: true,
    isOverridden: !!overrides['dec-hardware']
  });

  items.push({
    id: 'dec-time',
    tier: 'DECLARED',
    category: 'Time Commitment',
    title: `${identity?.timeReality?.weekdayMinutes || 35} min / weekday`,
    detail: `Weekend: ${identity?.timeReality?.saturdayHours || 2}h Sat · ${identity?.timeReality?.sundayHours || 1}h Sun`,
    source: 'Declared by you in Time Reality',
    confidence: 'Explicit',
    canOverride: true,
    isOverridden: !!overrides['dec-time']
  });

  // 2. OBSERVED (derived strictly from real usage data)
  const validSessions = (sessions || []).filter(s => s && (s.duration || s.minutes));
  const sessionDurations = validSessions.map(s => Number(s.duration || s.minutes || 0)).filter(d => d > 0);

  let medianDuration = 30;
  if (sessionDurations.length > 0) {
    sessionDurations.sort((a, b) => a - b);
    const mid = Math.floor(sessionDurations.length / 2);
    medianDuration = sessionDurations.length % 2 !== 0
      ? sessionDurations[mid]
      : Math.round((sessionDurations[mid - 1] + sessionDurations[mid]) / 2);
  }

  const completedSessionsCount = validSessions.length;

  items.push({
    id: 'obs-duration',
    tier: 'OBSERVED',
    category: 'Empirical Focus Duration',
    title: completedSessionsCount > 0
      ? `${medianDuration} min median session`
      : '30 min initial baseline',
    detail: completedSessionsCount > 0
      ? `Measured across ${completedSessionsCount} actual completed sessions`
      : 'Awaiting your first 3 sessions to compute personalized median',
    source: 'Recorded from active focus sessions',
    confidence: completedSessionsCount >= 5 ? 'High (Empirical)' : 'Emerging',
    canOverride: true,
    isOverridden: !!overrides['obs-duration']
  });

  // Count completed tasks/milestones in roadmap
  let completedTasksCount = 0;
  (roadmap || []).forEach(subj => {
    (subj.phases || []).forEach(ph => {
      (ph.tasks || []).forEach(tk => {
        if (tk.completed || (tk.subtasks || []).some(s => s.completed)) {
          completedTasksCount++;
        }
      });
    });
  });

  items.push({
    id: 'obs-milestones',
    tier: 'OBSERVED',
    category: 'Milestone Execution Rate',
    title: completedTasksCount > 0
      ? `${completedTasksCount} roadmap capabilities practiced (${completedTasksCount} ${completedTasksCount === 1 ? 'task' : 'tasks'} completed)`
      : 'No roadmap capabilities practiced yet',
    detail: completedTasksCount > 0
      ? `Recorded through completion of ${completedTasksCount} core tasks or subtasks`
      : 'No roadmap tasks or subtasks marked completed yet',
    source: 'Roadmap task completion records',
    confidence: 'Exact count',
    canOverride: false,
    isOverridden: false
  });

  // 3. INFERRED (gentle hypotheses, never stated as absolute facts)
  const isShortSessionInferred = (identity?.timeReality?.weekdayMinutes || 35) <= 35;
  items.push({
    id: 'inf-session-bias',
    tier: 'INFERRED',
    category: 'Session Structure Hypothesis',
    title: isShortSessionInferred
      ? 'Short, high-intensity intervals (25–35m) show highest consistency'
      : 'Deep immersion blocks (45–60m) match current momentum',
    detail: 'System working hypothesis based on declared constraints and completion patterns',
    source: 'Algorithmic route hypothesis (Non-binding)',
    confidence: 'Hypothesis (You can correct this)',
    canOverride: true,
    isOverridden: !!overrides['inf-session-bias'],
    overrideText: overrides['inf-session-bias'] || null
  });

  const hasHardware = (identity?.resources?.hardware || []).length > 0;
  items.push({
    id: 'inf-route-bias',
    tier: 'INFERRED',
    category: 'Pedagogical Sequencing',
    title: hasHardware
      ? 'Interleaving SPICE simulation with immediate breadboard builds'
      : 'Pure conceptual derivations followed by virtual simulation checks',
    detail: 'Adapts weekly stops so foundational principles are practiced before advanced phases',
    source: 'Curriculum optimization logic',
    confidence: 'Adaptive Recommendation',
    canOverride: true,
    isOverridden: !!overrides['inf-route-bias'],
    overrideText: overrides['inf-route-bias'] || null
  });

  // Dynamic hypotheses formulated by Adaptive Learning Engine (Prompt #1, #21, #40)
  const adaptiveHypotheses = loadHypotheses();
  adaptiveHypotheses.forEach(h => {
    // Avoid duplicate if key already matched
    if (h.id === 'shorter_sessions_sustainable' || h.id === 'simulation_mode_preferred') return;

    if (h.status === 'supported' || h.status === 'candidate') {
      const overrideKey = `hyp-${h.key}`;
      items.push({
        id: overrideKey,
        tier: 'INFERRED',
        category: `Adaptive Hypothesis · ${h.dimension || 'behavioral'}`,
        title: h.statement,
        detail: h.rationale,
        source: `Derived from ${h.sampleSize || 'recent'} observed events`,
        confidence: h.status === 'supported' ? 'Supported Pattern' : 'Emerging Candidate',
        canOverride: true,
        isOverridden: !!overrides[overrideKey],
        overrideText: overrides[overrideKey] || null
      });
    }
  });

  return items;
}

/**
 * Synchronizes identity time reality to roadmap daily learning hours
 */
export function syncIdentityToSettings(identity, currentSettings, updateSettings) {
  if (!updateSettings || typeof updateSettings !== 'function') return;

  const weekdayMins = identity?.timeReality?.weekdayMinutes || 35;
  const hoursEquivalent = Number((weekdayMins / 60).toFixed(1));

  if (currentSettings && currentSettings.dailyLearningHours !== hoursEquivalent) {
    updateSettings({
      ...currentSettings,
      dailyLearningHours: hoursEquivalent,
      dailyGoalHours: hoursEquivalent
    });
  }
}
