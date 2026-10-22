/**
 * identityRealityControlRoom.test.js
 *
 * Tests for LEARNING TRACKER — IDENTITY & REALITY REDESIGN
 */

import {
  loadIdentity,
  saveIdentity,
  DEFAULT_IDENTITY,
  getRealitySummary,
  resolveSystemKnowledge,
  syncIdentityToSettings,
  IDENTITY_STORAGE_KEY
} from '../utils/identityRealityResolver';

describe('Identity & Reality Engine — identityRealityResolver', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('loadIdentity returns DEFAULT_IDENTITY when storage is empty', () => {
    const identity = loadIdentity();
    expect(identity).toBeDefined();
    expect(identity.destination.primaryGoal).toBe('Embedded Systems Internship');
    expect(identity.resources.hardware).toContain('ESP32');
    expect(identity.timeReality.weekdayMinutes).toBe(35);
  });

  test('saveIdentity and loadIdentity persist updates correctly', () => {
    const custom = {
      ...DEFAULT_IDENTITY,
      destination: {
        ...DEFAULT_IDENTITY.destination,
        primaryGoal: 'Autonomous Robotics Engineer'
      },
      timeReality: {
        weekdayMinutes: 45,
        saturdayHours: 3,
        sundayHours: 2
      }
    };

    saveIdentity(custom);
    const loaded = loadIdentity();
    expect(loaded.destination.primaryGoal).toBe('Autonomous Robotics Engineer');
    expect(loaded.timeReality.weekdayMinutes).toBe(45);
    expect(loaded.timeReality.saturdayHours).toBe(3);
  });

  test('getRealitySummary produces grounded qualitative indicators without fake psychometric numbers', () => {
    const summary = getRealitySummary(DEFAULT_IDENTITY);
    expect(summary.time.label).toContain('35 min weekdays');
    expect(summary.hardware.label).toContain('Hardware Kit');
    expect(summary.feasibility.status).toBe('feasible');
    expect(summary.feasibility.badge).toContain('FEASIBLE');
  });

  test('"Hardware: None" is a completely valid, supported state (Simulation Route)', () => {
    const simulationIdentity = {
      ...DEFAULT_IDENTITY,
      resources: {
        ...DEFAULT_IDENTITY.resources,
        hardware: [] // No physical hardware
      }
    };

    const summary = getRealitySummary(simulationIdentity);
    expect(summary.hardware.isSimulationOnly).toBe(true);
    expect(summary.hardware.label).toContain('Simulation Only');
    expect(summary.feasibility.note).toContain('software simulation');
  });

  test('resolveSystemKnowledge separates DECLARED, OBSERVED, and INFERRED with user correction support', () => {
    const mockSessions = [
      { id: 's1', duration: 30, completed: true },
      { id: 's2', duration: 40, completed: true },
      { id: 's3', duration: 35, completed: true }
    ];

    const mockRoadmap = [
      {
        id: 'subj1',
        name: 'Electronics',
        phases: [
          {
            id: 'ph1',
            name: 'Circuits',
            tasks: [
              { id: 't1', name: 'Ohm Law', completed: true },
              { id: 't2', name: 'RC Circuits', completed: false, subtasks: [{ id: 'st1', completed: true }] }
            ]
          }
        ]
      }
    ];

    const knowledge = resolveSystemKnowledge(DEFAULT_IDENTITY, mockSessions, mockRoadmap);

    // Check tiers
    const declaredItems = knowledge.filter(k => k.tier === 'DECLARED');
    const observedItems = knowledge.filter(k => k.tier === 'OBSERVED');
    const inferredItems = knowledge.filter(k => k.tier === 'INFERRED');

    expect(declaredItems.length).toBeGreaterThanOrEqual(2);
    expect(observedItems.length).toBeGreaterThanOrEqual(2);
    expect(inferredItems.length).toBeGreaterThanOrEqual(1);

    // Observed median duration should be ~35 min from [30, 35, 40]
    const durationObs = observedItems.find(o => o.id === 'obs-duration');
    expect(durationObs.title).toContain('35 min median session');
    expect(durationObs.detail).toContain('3 actual completed sessions');

    // Observed milestone count should be 2
    const milestoneObs = observedItems.find(o => o.id === 'obs-milestones');
    expect(milestoneObs.title).toContain('2 roadmap capabilities');
  });

  test('user can override inferred system hypothesis ("That\'s not right")', () => {
    const identityWithOverride = {
      ...DEFAULT_IDENTITY,
      overrides: {
        'inf-session-bias': 'I actually learn best in 50-minute deep immersion stretches.'
      }
    };

    const knowledge = resolveSystemKnowledge(identityWithOverride, [], []);
    const sessionInference = knowledge.find(k => k.id === 'inf-session-bias');

    expect(sessionInference.isOverridden).toBe(true);
    expect(sessionInference.overrideText).toBe('I actually learn best in 50-minute deep immersion stretches.');
  });

  test('syncIdentityToSettings synchronizes weekday time commitment to dailyGoalHours', () => {
    let updatedSettings = null;
    const mockUpdateSettings = (next) => {
      updatedSettings = next;
    };

    const identity = {
      ...DEFAULT_IDENTITY,
      timeReality: {
        weekdayMinutes: 60
      }
    };

    const currentSettings = { dailyLearningHours: 2, dailyGoalHours: 2 };
    syncIdentityToSettings(identity, currentSettings, mockUpdateSettings);

    expect(updatedSettings).toBeDefined();
    expect(updatedSettings.dailyLearningHours).toBe(1.0);
    expect(updatedSettings.dailyGoalHours).toBe(1.0);
  });
});
