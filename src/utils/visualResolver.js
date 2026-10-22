/**
 * visualResolver.js
 *
 * Truthful, explicitly mapped resolution of learning tasks to visual learning objects.
 *
 * CORE INVARIANT (P0.5):
 * A visual may appear ONLY when the current learning item explicitly requests that visual
 * via a registered visualId AND the concept is compatible with that visual.
 *
 * NEVER select a simulation merely because the title/body contains keywords such as
 * capacitor, resistor, transistor, diode, filter, Ohm, voltage, current.
 *
 * If no valid visualId exists or the concept is incompatible:
 * FAILS CLOSED -> returns { type: 'none', title: null }.
 *
 * "A missing visual is always preferable to a misleading visual."
 */

import { getRegisteredVisual, VISUAL_CLASSIFICATION } from '../shared/visualRegistry';

/**
 * Resolves learning visual strictly through explicit registry mapping.
 *
 * @param {object} task - Learning task
 * @param {object} subtask - Active subtask / milestone
 * @param {object} subject - Parent subject
 * @returns {object} Validated visual descriptor or { type: 'none', title: null }
 */
export const resolveLearningVisual = (task = {}, subtask = {}, subject = {}) => {
  // 1. Explicit visual identifier must be provided
  const visualId =
    subtask?.visualId ||
    task?.visualId ||
    subtask?.learningVisual?.visualId ||
    task?.learningVisual?.visualId;

  if (!visualId || typeof visualId !== 'string') {
    // Missing visualId -> FAIL CLOSED
    return {
      type: 'none',
      title: null
    };
  }

  // 2. Extract concept identifier
  const conceptId =
    subtask?.conceptId ||
    subtask?.id ||
    task?.conceptId ||
    task?.id ||
    '';

  // 3. Strict verification against canonical visual registry
  const registered = getRegisteredVisual(visualId, conceptId);

  if (!registered) {
    // Unknown visualId or mismatched concept -> FAIL CLOSED
    return {
      type: 'none',
      title: null
    };
  }

  // 4. Return canonical registered visual object
  const stageType =
    registered.classification === VISUAL_CLASSIFICATION.ILLUSTRATIVE
      ? 'code'
      : (registered.model === 'diode' ||
         registered.model === 'memory-model' ||
         registered.model === 'concurrency' ||
         registered.model === 'gpio-stage')
        ? 'diagram'
        : 'interactive';

  return {
    type: stageType,
    ...registered
  };
};

/**
 * Resolve concrete, task-specific proof criteria.
 * Returns null or honest retrieval prompts without making unsubstantiated claims.
 */
export const resolveProofCriteria = (task = {}, subtask = {}, subject = {}) => {
  if (subtask?.proofCriteria && Array.isArray(subtask.proofCriteria)) {
    return subtask.proofCriteria;
  }
  if (task?.proofCriteria && Array.isArray(task.proofCriteria)) {
    return task.proofCriteria;
  }

  const conceptId = (subtask?.conceptId || task?.conceptId || '').toLowerCase();
  const text = `${subject?.name || ''} ${task?.name || ''} ${subtask?.name || ''}`.toLowerCase();

  if (conceptId === 'capacitors-rc-dynamics' || text.includes('capacitors & rc')) {
    return [
      'Explain what capacitance means through physical charge separation',
      'Predict voltage charging curve across capacitor over time',
      'Explain the RC time constant (τ = R · C)',
      'Calculate energy stored in electrostatic field (E = ½ C V²)'
    ];
  }

  if (conceptId === 'diode-mechanics' || text.includes('diode mechanics')) {
    return [
      'Explain forward bias threshold (simplified ~0.7V Silicon approximation)',
      'Contrast Zener breakdown regulation with avalanche breakdown',
      'Explain asymmetric conduction mechanics'
    ];
  }

  if (conceptId === 'bjt-cutoff-saturation' || text.includes('bjt cutoff')) {
    return [
      'State base-emitter saturation threshold (model assumption V_BE ≈ 0.7V)',
      'Calculate required base resistor (R_B) to drive into saturation',
      'Explain why V_CE drops to ~0.2V when the transistor turns fully ON'
    ];
  }

  if (conceptId === 'memory-layout-lifetime' || text.includes('memory layout')) {
    return [
      'Explain why stack allocation is deterministic and fast',
      'Trace pointer dereference and explain memory alignment/padding',
      'Identify memory safety pitfalls (dangling pointers, double free)'
    ];
  }

  if (conceptId === 'resistors-ohms-law' || text.includes("resistors & ohm's law")) {
    return [
      'State Ohm’s law from first principles (V = I · R)',
      'Predict how current changes when resistance is doubled',
      'Calculate thermal dissipation in watts (P = I² · R)'
    ];
  }

  if (conceptId === 'gpio-hardware-architecture' || text.includes('gpio hardware')) {
    return [
      'Contrast push-pull vs open-drain electrical configurations',
      'Explain how Schmitt trigger hysteresis eliminates signal chatter',
      'Calculate interrupt response latency across clock cycles'
    ];
  }

  // Honest default retrieval prompts
  return [
    'Explain the governing principle clearly without looking at notes',
    'Demonstrate one concrete working example or numerical derivation'
  ];
};

/**
 * Returns a natural, unpretentious challenge statement for the day.
 */
export const resolveChallengePrompt = (task = {}, subtask = {}) => {
  const name = subtask?.name || task?.name || 'Milestone';
  const conceptId = (subtask?.conceptId || task?.conceptId || '').toLowerCase();
  const text = `${task?.taskName || ''} ${name}`.toLowerCase();

  if (conceptId === 'capacitors-rc-dynamics' || text.includes('capacitor')) {
    return 'Understand how a capacitor stores and releases energy.';
  }
  if (conceptId === 'bjt-cutoff-saturation' || text.includes('q1') || text.includes('bjt')) {
    return 'Determine the base excitation threshold that drives Q1 into saturation.';
  }
  if (conceptId === 'diode-mechanics' || text.includes('diode')) {
    return 'Explain how a P-N junction conducts forward current and blocks reverse voltage.';
  }
  if (conceptId === 'memory-layout-lifetime' || text.includes('virtual address')) {
    return 'Map how stack frames and heap allocations occupy virtual memory.';
  }
  if (conceptId === 'resistors-ohms-law' || text.includes('ohm')) {
    return 'Understand why current scales inversely with resistance.';
  }

  return `Work through ${name} from first principles and test your recall.`;
};
