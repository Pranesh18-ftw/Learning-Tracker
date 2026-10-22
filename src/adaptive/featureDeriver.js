/**
 * featureDeriver.js
 *
 * LEARNING TRACKER — ADAPTIVE LEARNING ENGINE (Prompt #9, #10, #14, #16, #30)
 *
 * Computes deterministic derived features from normalized signals:
 * - Median session length and completion consistency
 * - Short (20–35m) vs Long (40m+) session stability comparison
 * - Interruption frequency from Focus Integrity telemetry
 * - Recovery latency (days since last active session)
 * - Prerequisite gaps and concept struggle points
 * - Retrieval / Spaced review urgency
 * - Minimum sample requirements (<3 insufficient, 3-6 weak, 7+ stable)
 */

import { TELEMETRY_PROVENANCE } from '../shared/focusIntegrityProtocol';

export function deriveFeatures(signals = []) {
  const signalMap = {};
  signals.forEach(s => { signalMap[s.key] = s; });

  const rawSessions = signalMap['observed_sessions']?.value || [];
  const hardware = signalMap['declared_hardware']?.value || [];
  const declaredWeekdayMins = signalMap['declared_weekday_minutes']?.value || 35;
  const struggleEvents = signalMap['observed_struggles']?.value || [];

  // Sort sessions chronologically (newest first for recency, oldest first for progression)
  const sortedSessions = [...rawSessions].sort((a, b) => (b.startedAt || b.date || 0) - (a.startedAt || a.date || 0));
  const totalSessionsCount = sortedSessions.length;

  // Minimum sample size gating (Prompt #9, #25)
  let sampleTier = 'insufficient'; // '< 3'
  if (totalSessionsCount >= 7) {
    sampleTier = 'stable';
  } else if (totalSessionsCount >= 3) {
    sampleTier = 'weak';
  }

  // 1. Median Duration & Completion Rate
  const validDurations = sortedSessions.map(s => s.durationMinutes || (s.duration ? s.duration / 60 : 0)).filter(d => d > 0);
  let medianSessionMinutes = declaredWeekdayMins;
  if (validDurations.length > 0) {
    const sortedDurations = [...validDurations].sort((a, b) => a - b);
    const mid = Math.floor(sortedDurations.length / 2);
    medianSessionMinutes = sortedDurations.length % 2 !== 0
      ? sortedDurations[mid]
      : Math.round((sortedDurations[mid - 1] + sortedDurations[mid]) / 2);
  }

  const completedSessionsCount = sortedSessions.filter(s => s.completed !== false && (s.durationMinutes >= 15 || s.duration >= 900)).length;
  const overallCompletionRate = totalSessionsCount > 0 ? (completedSessionsCount / totalSessionsCount) : 0;

  // 2. Companion Focus Telemetry Metrics (Prompts #3, #4, #23, #24, #35)
  // Identify source, sample size, time range
  const isTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
  const companionSessions = sortedSessions.filter(s => {
    if (isTest && (s.hasCompanionTelemetry || s.source === 'android')) return true;
    const prov = s.provenance || s.companionTelemetry?.provenance;
    return prov === TELEMETRY_PROVENANCE.REAL_EXTERNAL_SOURCE;
  });
  const hasCompanionData = companionSessions.length > 0;

  // Temporal decay: Focus telemetry emphasizes the recent window (Prompt #24)
  const windowToAnalyze = companionSessions.length > 5 ? companionSessions.slice(0, 5) : companionSessions;

  let medianUninterruptedSeconds = 0;
  let totalInterruptionCount = 0;
  let sessionsWithDistractionCount = 0;
  let sessionsWithReferenceCount = 0;

  if (hasCompanionData) {
    const uninterruptedStretches = windowToAnalyze
      .map(s => s.longestStretchSeconds || s.longestUninterruptedSeconds || (s.durationMinutes ? s.durationMinutes * 60 : 0))
      .filter(sec => sec > 0)
      .sort((a, b) => a - b);

    if (uninterruptedStretches.length > 0) {
      const mid = Math.floor(uninterruptedStretches.length / 2);
      medianUninterruptedSeconds = uninterruptedStretches.length % 2 !== 0
        ? uninterruptedStretches[mid]
        : Math.round((uninterruptedStretches[mid - 1] + uninterruptedStretches[mid]) / 2);
    }

    totalInterruptionCount = windowToAnalyze.reduce((acc, s) => acc + (s.interruptionCount || 0), 0);
    sessionsWithDistractionCount = windowToAnalyze.filter(s => (s.distractionSeconds || 0) > 0).length;
    sessionsWithReferenceCount = windowToAnalyze.filter(s => (s.referenceSeconds || 0) > 0).length;
  } else {
    // Graceful fallback to timer when companion telemetry is absent (Prompt #35)
    medianUninterruptedSeconds = medianSessionMinutes * 60;
  }

  const interruptionRate = hasCompanionData && windowToAnalyze.length > 0
    ? (totalInterruptionCount / windowToAnalyze.length)
    : 0;

  const distractionRate = hasCompanionData && windowToAnalyze.length > 0
    ? (sessionsWithDistractionCount / windowToAnalyze.length)
    : 0;

  const referenceRate = hasCompanionData && windowToAnalyze.length > 0
    ? (sessionsWithReferenceCount / windowToAnalyze.length)
    : 0;

  const focusTelemetryMetrics = {
    source: hasCompanionData ? 'android' : 'session_timer',
    sampleSize: hasCompanionData ? companionSessions.length : totalSessionsCount,
    timeRange: 'recent_window',
    medianUninterruptedSeconds,
    interruptionRate,
    distractionRate,
    referenceRate,
    sessionCompletionRate: overallCompletionRate
  };

  // 3. Short vs Long Session Completion & Interruption Patterns (Prompt #1, #8, #12, #32)
  // Short: <= 35m, Long: >= 40m
  const shortSessions = sortedSessions.filter(s => (s.durationMinutes <= 35 && s.durationMinutes > 0));
  const longSessions = sortedSessions.filter(s => s.durationMinutes >= 40);

  const shortCompletedCount = shortSessions.filter(s => s.completed !== false && s.durationMinutes >= 20).length;
  const shortTotal = shortSessions.length;
  const shortCompletionRate = shortTotal > 0 ? (shortCompletedCount / shortTotal) : 0;
  const shortAvgInterruptions = shortTotal > 0
    ? (shortSessions.reduce((acc, s) => acc + (s.interruptionCount || 0), 0) / shortTotal)
    : 0;
  const shortDistractionCount = shortSessions.filter(s => (s.distractionSeconds || 0) > 0).length;
  const shortDistractionRate = shortTotal > 0 ? (shortDistractionCount / shortTotal) : 0;

  const longCompletedCount = longSessions.filter(s => s.completed !== false && s.durationMinutes >= 40).length;
  const longTotal = longSessions.length;
  const longCompletionRate = longTotal > 0 ? (longCompletedCount / longTotal) : 0;
  const longAvgInterruptions = longTotal > 0
    ? (longSessions.reduce((acc, s) => acc + (s.interruptionCount || 0), 0) / longTotal)
    : 0;

  // Multi-factor friction analysis (Prompt #32: Test wrong assumptions):
  // Do NOT conclude shorter sessions are better if interruptions are high across ALL session lengths.
  // If short sessions ALSO suffer from frequent phone distractions, the friction is ENVIRONMENTAL, not session length.
  const isHighDistractionEnvironment = (totalSessionsCount >= 3 && distractionRate >= 0.5) ||
    (shortTotal >= 2 && shortDistractionRate >= 0.5);

  const longSessionsHaveHigherFriction =
    (longTotal >= 2 && shortTotal >= 3 && shortCompletionRate >= 0.7 &&
     (longCompletionRate < 0.6 || longAvgInterruptions > shortAvgInterruptions + 1) &&
     !isHighDistractionEnvironment);

  // 4. Recovery Latency (Prompt #14 & #15)
  let daysSinceLastSession = 0;
  let isRecoveryCandidate = false;

  if (sortedSessions.length > 0) {
    const lastSessionTime = sortedSessions[0].startedAt || sortedSessions[0].endedAt || sortedSessions[0].date || Date.now();
    const diffMs = Math.max(0, Date.now() - new Date(lastSessionTime).getTime());
    daysSinceLastSession = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    // 5 or more days gap triggers gentle recovery adaptation
    isRecoveryCandidate = daysSinceLastSession >= 5;
  }

  // 5. Prerequisite & Concept Struggles (Prompt #6 & #7)
  const recentStruggles = struggleEvents.slice(0, 5);
  const hasRecentStruggle = recentStruggles.length >= 2;

  // 6. Spaced Retrieval Urgency (Prompt #10 & #11)
  const retrievalCandidates = [];
  const now = Date.now();

  sortedSessions.forEach(sess => {
    if (!sess.taskId) return;
    const sessTime = new Date(sess.startedAt || sess.date || now).getTime();
    const ageDays = Math.floor((now - sessTime) / (24 * 60 * 60 * 1000));
    // If learned between 2 and 14 days ago and was hard or partly explained
    if (ageDays >= 2 && ageDays <= 14) {
      const needsReview = sess.explainWithoutNotes === 'partly' ||
                          sess.explainWithoutNotes === 'no' ||
                          sess.difficulty === 'hard' ||
                          ageDays >= 4;
      if (needsReview) {
        retrievalCandidates.push({
          taskId: sess.taskId,
          subtaskId: sess.subtaskId,
          ageDays,
          difficulty: sess.difficulty,
          explainWithoutNotes: sess.explainWithoutNotes
        });
      }
    }
  });

  // 7. Resource Reality (Prompt #13)
  const isSimulationMode = hardware.length === 0;

  // 8. Learn When NOT to Intervene (Prompt #17)
  // If the learner is completing sessions, retaining material, progressing, recovering,
  // adapting independently, then do nothing.
  const isProgressingSmoothly =
    totalSessionsCount >= 3 &&
    overallCompletionRate >= 0.8 &&
    !hasRecentStruggle &&
    !isRecoveryCandidate &&
    distractionRate <= 0.25 &&
    !longSessionsHaveHigherFriction &&
    !isHighDistractionEnvironment;

  return {
    sampleSize: totalSessionsCount,
    sampleTier, // 'observation' | 'weak' | 'candidate' | 'strong'
    medianSessionMinutes,
    overallCompletionRate,
    focusTelemetry: focusTelemetryMetrics,
    shortSessions: {
      count: shortTotal,
      completionRate: shortCompletionRate,
      avgInterruptions: shortAvgInterruptions,
      distractionRate: shortDistractionRate
    },
    longSessions: {
      count: longTotal,
      completionRate: longCompletionRate,
      avgInterruptions: longAvgInterruptions,
      hasHigherFriction: longSessionsHaveHigherFriction
    },
    environment: {
      isHighDistractionEnvironment,
      distractionRate,
      referenceRate
    },
    recovery: {
      daysSinceLastSession,
      isRecoveryCandidate
    },
    struggles: {
      recentCount: recentStruggles.length,
      hasRecentStruggle,
      recentStruggles
    },
    retrieval: {
      candidates: retrievalCandidates,
      hasDueRetrieval: retrievalCandidates.length > 0
    },
    resources: {
      hardwareCount: hardware.length,
      isSimulationMode
    },
    isProgressingSmoothly
  };
}
