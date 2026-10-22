/**
 * focusTelemetrySimulator.js
 *
 * Test & Development Telemetry Simulator.
 *
 * Phase 2 & 11: Production runtime must NEVER import this simulator.
 * Isolate from production module graph. All records produced here are tagged
 * with DEV_SIMULATION or TEST_FIXTURE provenance so they can NEVER be stored
 * or rendered as real learner telemetry.
 */

import {
  APP_CATEGORIES,
  DEFAULT_APP_CLASSIFICATIONS,
  TELEMETRY_PROVENANCE
} from '../shared/focusIntegrityProtocol';
import { getAppOverrides, recordFocusTelemetry } from '../services/focusIntegrityService';

/**
 * Test & Development Harness: Reconstructs synthetic phone telemetry
 * used ONLY in automated testing.
 */
export function simulateSyntheticSessionTelemetry(sessionId, intendedMinutes = 25, syntheticIntervals = []) {
  const intendedSeconds = intendedMinutes * 60;
  const observedWindowSeconds = intendedSeconds;

  const overrides = getAppOverrides();

  // Classify synthetic intervals
  let refSecs = 0;
  let distSecs = 0;
  let unkSecs = 0;

  const interruptions = syntheticIntervals.map(inter => {
    const pkg = inter.packageName;
    const category = overrides[pkg] || DEFAULT_APP_CLASSIFICATIONS[pkg] || APP_CATEGORIES.UNKNOWN;
    const dur = inter.durationSeconds || Math.round((inter.endTime - inter.startTime) / 1000) || 0;

    if (category === APP_CATEGORIES.REFERENCE) refSecs += dur;
    else if (category === APP_CATEGORIES.DISTRACTION) distSecs += dur;
    else if (category === APP_CATEGORIES.UNKNOWN) unkSecs += dur;

    return {
      startTime: inter.startTime || 0,
      endTime: inter.endTime || 0,
      durationSeconds: dur,
      packageName: pkg,
      category
    };
  }).filter(i => i.category !== APP_CATEGORIES.NEUTRAL);

  const totalInterrupted = refSecs + distSecs + unkSecs;
  const longestStretch = Math.max(0, observedWindowSeconds - totalInterrupted);

  const summary = {
    sessionId,
    summaryId: `summary-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    intendedSeconds,
    observedWindowSeconds,
    interruptionCount: interruptions.length,
    interruptionSeconds: totalInterrupted,
    referenceSeconds: refSecs,
    distractionSeconds: distSecs,
    unknownSeconds: unkSecs,
    longestUninterruptedSeconds: longestStretch,
    interruptions,
    provenance: TELEMETRY_PROVENANCE.DEV_SIMULATION,
    timestamp: Date.now(),
    syncState: 'SYNCED'
  };

  recordFocusTelemetry(summary);
  return summary;
}
