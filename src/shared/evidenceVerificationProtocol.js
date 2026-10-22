/**
 * evidenceVerificationProtocol.js
 *
 * P0.4 Core Truthfulness Protocol:
 * COMPLETION ≠ EVIDENCE ≠ VERIFICATION
 *
 * Epistemic State Invariants:
 * - COMPLETED: The canonical completion system recorded the completion action.
 * - RECORDED: A reflection, note, or focus session record was actually stored.
 * - EVIDENCE: A learner-produced artifact, reflection, or evidence record exists.
 * - VERIFIED: An explicit verification mechanism evaluated that evidence against a defined criterion.
 *
 * NEVER infer verification or mastery merely from:
 * - clicking Complete
 * - finishing a timer
 * - opening a lesson
 * - viewing content
 * - submitting a reflection
 * - selecting a checkbox
 * - pressing "done"
 */

export const EVIDENCE_STATES = Object.freeze({
  NO_EVIDENCE: 'NO_EVIDENCE',
  EVIDENCE_RECORDED: 'EVIDENCE_RECORDED',
  VERIFICATION_PENDING: 'VERIFICATION_PENDING',
  VERIFIED: 'VERIFIED'
});

export const COMPLETION_STATES = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
});

/**
 * Resolve explicit evidence state for a task, subtask, or session record.
 * A completion record alone produces COMPLETED with NO_EVIDENCE, never VERIFIED.
 */
export function resolveEvidenceState({
  taskOrSubtask = null,
  session = null,
  completion = null,
  evidenceArtifact = null,
  verificationRecord = null
} = {}) {
  // 1. Explicit verification requires an external verification record with verified status
  if (verificationRecord && verificationRecord.status === 'verified') {
    return EVIDENCE_STATES.VERIFIED;
  }

  // 2. Verification pending: learner submitted evidence requiring explicit evaluation
  if (
    (verificationRecord && verificationRecord.status === 'pending') ||
    (evidenceArtifact && evidenceArtifact.requiresVerification && !evidenceArtifact.verified)
  ) {
    return EVIDENCE_STATES.VERIFICATION_PENDING;
  }

  // 3. Evidence recorded: learner provided genuine notes, reflections, or project artifacts
  const checkNotes = (notes) => {
    if (!notes || typeof notes !== 'string') return false;
    const trimmed = notes.trim();
    if (trimmed.length === 0) return false;
    if (trimmed === 'Completed without notes.' || trimmed === 'No reflection provided.' || trimmed === 'Completed without notes') {
      return false;
    }
    return true;
  };

  const hasNotes = Boolean(
    checkNotes(session?.notes) ||
    checkNotes(completion?.notes) ||
    checkNotes(taskOrSubtask?.notes)
  );

  const hasArtifact = Boolean(evidenceArtifact && (evidenceArtifact.id || evidenceArtifact.url || evidenceArtifact.file));

  if (hasArtifact || hasNotes) {
    return EVIDENCE_STATES.EVIDENCE_RECORDED;
  }

  // 4. Default: No evidence recorded
  return EVIDENCE_STATES.NO_EVIDENCE;
}
