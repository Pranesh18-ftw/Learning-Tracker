/**
 * visualRegistry.js
 *
 * Canonical registry of validated learning visuals.
 *
 * CORE TRUTHFULNESS INVARIANTS:
 * 1. An interactive visualization may appear ONLY when the current learning item
 *    explicitly declares a registered visualId.
 * 2. Visuals fail closed: an unknown visualId or an incompatible concept produces NO visual.
 * 3. Never guess or infer a visual using keywords or fuzzy matching.
 * 4. Every visual is strictly classified as QUANTITATIVE, CONCEPTUAL, or ILLUSTRATIVE.
 */

export const VISUAL_CLASSIFICATION = {
  QUANTITATIVE: 'QUANTITATIVE',
  CONCEPTUAL: 'CONCEPTUAL',
  ILLUSTRATIVE: 'ILLUSTRATIVE'
};

export const VISUAL_REGISTRY = {
  'rc-charging': {
    visualId: 'rc-charging',
    classification: VISUAL_CLASSIFICATION.QUANTITATIVE,
    classificationBadge: 'Quantitative Physical Model',
    model: 'rc-circuit',
    domain: 'Electronics',
    title: 'Capacitor Charge Dynamics',
    tagline: 'Charge accumulation & analytical exponential RC curve',
    formula: 'V_C(t) = V_S · (1 - e^(-t / RC))',
    equations: [
      'τ = R × C',
      'V_C(t) = V_S · (1 - e^(-t / τ))',
      'E = ½ · C · V²',
      'I(t) = (V_S / R) · e^(-t / τ)'
    ],
    units: {
      capacitance: 'µF',
      resistance: 'kΩ',
      voltage: 'V',
      time: 'ms',
      energy: 'µJ',
      current: 'mA'
    },
    requiredParameters: ['capacitanceUf', 'resistanceKohm', 'supplyVoltage'],
    allowedConceptIds: [
      'capacitor-rc-dynamics',
      'capacitors-rc-dynamics',
      'rc-circuit-time-constant',
      'capacitor-charge-dynamics',
      'task-capacitors-rc'
    ],
    pedagogicalNote: 'Governed by pure analytical differential equations. Numerical values reflect exact RC exponential math.'
  },

  'ohms-law': {
    visualId: 'ohms-law',
    classification: VISUAL_CLASSIFICATION.QUANTITATIVE,
    classificationBadge: 'Quantitative Physical Model',
    model: 'ohms-law',
    domain: 'Electronics',
    title: "Ohm's Law Workbench",
    tagline: 'Current response to resistance and voltage',
    formula: 'I = V / R',
    equations: [
      'I = V / R',
      'P = V · I = I² · R'
    ],
    units: {
      voltage: 'V',
      resistance: 'kΩ',
      current: 'mA'
    },
    requiredParameters: ['resistanceKohm', 'voltageVolts'],
    allowedConceptIds: [
      'resistors-ohms-law',
      'resistor-networks',
      'voltage-current-linearity',
      'task-resistors-ohm'
    ],
    pedagogicalNote: 'Current is calculated directly via Ohm’s Law. Carrier animation is an illustrative visualization aid, not literal electron drift velocity.'
  },

  'bjt-switch': {
    visualId: 'bjt-switch',
    classification: VISUAL_CLASSIFICATION.CONCEPTUAL,
    classificationBadge: 'Conceptual Model (Educational Approximation)',
    model: 'bjt-switch',
    domain: 'Electronics',
    title: 'BJT Saturation Switch',
    tagline: 'Base-emitter threshold & collector saturation states',
    formula: 'V_BE ≈ 0.7V (Silicon model assumption), V_CE(sat) ≈ 0.2V',
    equations: [
      'V_BE ≈ 0.7V (threshold assumption)',
      'I_B = (V_in - V_BE) / R_B',
      'I_C(sat) ≈ (V_CC - V_CE(sat)) / R_L'
    ],
    units: {
      voltage: 'V',
      current: 'mA'
    },
    requiredParameters: ['baseSwitchOn'],
    allowedConceptIds: [
      'bjt-cutoff-saturation',
      'transistor-switching',
      'why-does-q1-turn-on',
      'task-bjt-switching'
    ],
    pedagogicalNote: 'Uses standard educational silicon approximations (V_BE ≈ 0.7V, V_CE(sat) ≈ 0.2V). Actual device drop varies with temperature, doping, and collector current.'
  },

  'diode-barrier': {
    visualId: 'diode-barrier',
    classification: VISUAL_CLASSIFICATION.CONCEPTUAL,
    classificationBadge: 'Conceptual Model (Educational Approximation)',
    model: 'diode',
    domain: 'Electronics',
    title: 'P-N Junction Barrier',
    tagline: 'Forward conduction & reverse barrier mechanics',
    formula: 'V_F ≈ 0.7V (Silicon standard assumption)',
    equations: [
      'Forward bias: V_applied > V_threshold → Depletion collapses',
      'Reverse bias: V_applied < 0 → Depletion widens'
    ],
    units: {
      voltage: 'V'
    },
    requiredParameters: ['forwardBias'],
    allowedConceptIds: [
      'diode-mechanics',
      'pn-junction-bias',
      'semiconductor-foundations',
      'task-diode-mechanics'
    ],
    pedagogicalNote: 'Forward voltage drop of ~0.7V is an educational simplification for Silicon diodes (Germanium ≈ 0.3V, Schottky ≈ 0.2–0.4V).'
  },

  'memory-model': {
    visualId: 'memory-model',
    classification: VISUAL_CLASSIFICATION.CONCEPTUAL,
    classificationBadge: 'Conceptual Architecture Diagram',
    model: 'memory-model',
    domain: 'Systems',
    title: 'Virtual Address Space',
    tagline: 'Stack frames (growth downward) vs Heap allocations (growth upward)',
    formula: 'Deterministic stack frames vs manual dynamic heap',
    equations: [],
    units: {},
    requiredParameters: [],
    allowedConceptIds: [
      'memory-layout-lifetime',
      'virtual-address-space',
      'stack-vs-heap',
      'task-memory-layout'
    ],
    pedagogicalNote: 'Depicts canonical process memory architecture. Specific segment growth direction and layout depends on OS ABI and target architecture.'
  },

  'concurrency-cas': {
    visualId: 'concurrency-cas',
    classification: VISUAL_CLASSIFICATION.CONCEPTUAL,
    classificationBadge: 'Conceptual Synchronization Primitive',
    model: 'concurrency',
    domain: 'Systems',
    title: 'Atomic Compare & Swap',
    tagline: 'Lock-free memory barriers and hardware coordination',
    formula: 'bool CAS(int* ptr, int oldVal, int newVal)',
    equations: [],
    units: {},
    requiredParameters: [],
    allowedConceptIds: [
      'synchronization-primitives',
      'concurrent-state-execution',
      'lock-free-cas',
      'task-concurrency-primitives'
    ],
    pedagogicalNote: 'Conceptual representation of atomic hardware compare-exchange primitive.'
  },

  'gpio-buffer': {
    visualId: 'gpio-buffer',
    classification: VISUAL_CLASSIFICATION.CONCEPTUAL,
    classificationBadge: 'Conceptual Architecture Diagram',
    model: 'gpio-stage',
    domain: 'Hardware',
    title: 'I/O Pin Buffer Stage',
    tagline: 'Push-pull vs open-drain circuitry and input hysteresis',
    formula: 'Push-pull (V_DD/GND) vs Open-drain (GND only)',
    equations: [],
    units: {},
    requiredParameters: [],
    allowedConceptIds: [
      'gpio-hardware-architecture',
      'push-pull-vs-open-drain',
      'microcontroller-hardware-interface',
      'task-gpio-architecture'
    ],
    pedagogicalNote: 'Generalized CMOS I/O stage architecture. Specific input Schmitt trigger thresholds and pull resistor values depend on the microcontroller datasheet.'
  },

  'code-trace': {
    visualId: 'code-trace',
    classification: VISUAL_CLASSIFICATION.ILLUSTRATIVE,
    classificationBadge: 'Illustrative Code Trace',
    model: 'code-trace',
    domain: 'Programming',
    title: 'Execution Trace',
    tagline: 'Data transformation pipeline and deterministic state transition',
    formula: 'f: Stream → Stream',
    equations: [],
    units: {},
    requiredParameters: [],
    allowedConceptIds: [
      'code-pipeline-trace',
      'execution-trace',
      'task-code-pipeline'
    ],
    pedagogicalNote: 'Illustrative diagram of stream transformation.'
  }
};

/**
 * Validates and retrieves a registered visual descriptor.
 * Strict fail-closed rules:
 * - If visualId is unknown: returns null
 * - If conceptId is provided and not in allowedConceptIds: returns null
 *
 * @param {string} visualId - Explicit visual identifier requested
 * @param {string} [conceptId] - Learning item / concept identifier
 * @returns {object|null} The registered visual descriptor or null
 */
export const getRegisteredVisual = (visualId, conceptId = null) => {
  if (!visualId || typeof visualId !== 'string') {
    return null;
  }

  const normalizedVisualId = visualId.trim().toLowerCase();
  const entry = VISUAL_REGISTRY[normalizedVisualId];

  if (!entry) {
    // Unknown visual ID -> FAIL CLOSED
    return null;
  }

  // If a conceptId is passed, verify compatibility
  if (conceptId && typeof conceptId === 'string') {
    const normalizedConceptId = conceptId.trim().toLowerCase();
    const isAllowed = entry.allowedConceptIds.some(allowedId => {
      const normAllowed = allowedId.toLowerCase();
      return normAllowed === normalizedConceptId || normalizedConceptId.includes(normAllowed);
    });

    if (!isAllowed) {
      // Incompatible concept -> FAIL CLOSED
      return null;
    }
  }

  return entry;
};

/**
 * Checks if a concept ID is explicitly allowed for a given visual ID.
 *
 * @param {string} visualId
 * @param {string} conceptId
 * @returns {boolean}
 */
export const isConceptAllowedForVisual = (visualId, conceptId) => {
  return getRegisteredVisual(visualId, conceptId) !== null;
};

/**
 * Returns all registered visual IDs.
 * @returns {string[]}
 */
export const getAllRegisteredVisualIds = () => {
  return Object.keys(VISUAL_REGISTRY);
};
