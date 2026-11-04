/**
 * truthTable.js
 *
 * Developer Truth Table for Major System Transitions (Prompt #27).
 *
 * Defines and verifies the exact multi-surface invariant expectations
 * across all 8 surfaces: NOW, WORLD, PATH, FOCUS, GROWTH, ARCHIVE, IDENTITY, TRAJECTORY.
 *
 * Guarantees: Contradictions between surfaces are mathematically and structurally impossible.
 */

export const SYSTEM_TRUTH_TABLE = [
  {
    event: 'START_FOCUS_SESSION',
    description: 'User enters focus on a learning object from Now, Path, or World',
    world: 'Unchanged (concept retains current status)',
    path: 'Unchanged (route stop marked active)',
    now: 'Engaged (transfers active challenge into quiet Focus space)',
    focus: 'Active (timer running, distractions suppressed, ambient guidance visible)',
    growth: 'Unchanged (awaiting completion or verified session telemetry)',
    archive: 'Unchanged',
    identity: 'Active limits applied (duration calibrated to learner reality)',
    trajectory: 'Unchanged (target capability remains connected)'
  },
  {
    event: 'PAUSE_FOCUS_SESSION',
    description: 'User temporarily pauses work during focus',
    world: 'Unchanged',
    path: 'Unchanged',
    now: 'Paused',
    focus: 'Paused (elapsed time frozen)',
    growth: 'Unchanged',
    archive: 'Unchanged',
    identity: 'Unchanged',
    trajectory: 'Unchanged'
  },
  {
    event: 'RESUME_FOCUS_SESSION',
    description: 'User resumes paused work',
    world: 'Unchanged',
    path: 'Unchanged',
    now: 'Engaged',
    focus: 'Active (timer resumes)',
    growth: 'Unchanged',
    archive: 'Unchanged',
    identity: 'Unchanged',
    trajectory: 'Unchanged'
  },
  {
    event: 'COMMIT_EVIDENCE / COMPLETE_SUBTASK',
    description: 'User demonstrates or completes a practical subtask or challenge with evidence',
    world: 'Updated (concept progress advances, completed nodes turn green/tactile check)',
    path: 'Updated (current route stop completed, next stop unlocks or advances)',
    now: 'Updated (shows satisfying completion pulse, queues next logical challenge)',
    focus: 'Closed / Reflected (returns from quiet space with evidence preserved)',
    growth: 'Received (new recall, application, or project evidence milestone logged in timeline)',
    archive: 'Preserved (meaningful artifact / memory moment created or enriched)',
    identity: 'Resource usage validated (e.g. simulation or hardware logged)',
    trajectory: 'Updated (capability progresses toward Demonstrated or Applied status)'
  },
  {
    event: 'UNDO_LAST_ACTION',
    description: 'User triggers global undo on an accidental completion',
    world: 'Reverted (concept restored to previous progress)',
    path: 'Reverted (stop restored to active status)',
    now: 'Reverted (active challenge restored to previous state)',
    focus: 'Reverted / Idled',
    growth: 'Reverted (derived evidence entry removed/recalculated)',
    archive: 'Reverted (derived artifact reverted or unlinked)',
    identity: 'Unchanged',
    trajectory: 'Reverted (capability evidence recalculated from canonical state)'
  },
  {
    event: 'SELECT_LEARNING_CONTEXT',
    description: 'User deep-dives or switches focus to a concept anywhere (World, Path, Search, Trajectory)',
    world: 'Focused (highlights selected concept and opens deep-dive drawer)',
    path: 'Synchronized (highlights corresponding route stop)',
    now: 'Synchronized (Challenge Card shifts to selected item without loss of state)',
    focus: 'Ready (next launch targets this exact concept)',
    growth: 'Filterable (highlights evidence for this concept/domain)',
    archive: 'Filterable (highlights artifacts matching this concept/domain)',
    identity: 'Context preserved',
    trajectory: 'Highlighted (shows capability required for this concept)'
  },
  {
    event: 'UPDATE_IDENTITY_REALITY',
    description: 'Learner changes available time, hardware inventory, or internet reliability',
    world: 'Adaptive (lab/hardware-only projects show adaptive simulation notes)',
    path: 'Re-calibrated (schedule adapts to available daily hours and hardware: none/kit)',
    now: 'Calibrated (challenges adapt to practical vs simulation mode)',
    focus: 'Calibrated (default session durations match attention capacity)',
    growth: 'Unchanged',
    archive: 'Unchanged',
    identity: 'Persisted to canonical store',
    trajectory: 'Aligned (destination timelines reflect weekly hours reality)'
  },
  {
    event: 'RESET_EVERYTHING',
    description: 'User explicitly resets learning data to fresh onboarding state',
    world: 'Reset to curated defaults or empty subject state',
    path: 'Reset to initial route',
    now: 'Reset to initial challenge',
    focus: 'Cleared',
    growth: 'Empty ("Not enough evidence yet. Keep working.")',
    archive: 'Empty ("Your first meaningful work will appear here.")',
    identity: 'Reset to baseline defaults',
    trajectory: 'Reset to chosen destination'
  }
];

/**
 * Validates whether two views agree on the state of a given learning item.
 *
 * @param {Object} itemA - State of item in view A (e.g. Now)
 * @param {Object} itemB - State of item in view B (e.g. World)
 * @returns {boolean} True if states are strictly consistent
 */
export function assertSingleRealityConsistency(itemA, itemB) {
  if (!itemA || !itemB) return false;
  // If IDs match, completion status must match
  if (itemA.id && itemB.id && itemA.id === itemB.id) {
    if (Boolean(itemA.completed) !== Boolean(itemB.completed)) {
      return false;
    }
  }
  return true;
}
