/**
 * canonicalExchangeModel.js
 *
 * Versioned Canonical Exchange Model & Schema Specifications for Universal AI Roadmap Bridge v2.1.
 *
 * v2.1 additions:
 * - Learning Units (knowledge acquisition) separated from Doing Tasks (application)
 * - Depth levels (SURFACE_AWARENESS to RESEARCH_LEVEL)
 * - Task modes (learn, recall, explain, calculate, predict, trace, compare, etc.)
 * - Project scaffolding levels (GUIDED → OPEN_ENDED)
 * - Adaptation rule types
 * - Enriched field intelligence (bridge concepts, high-leverage, often-skipped)
 *
 * Target Schema Root:
 * {
 *   schemaVersion: '2.1.0',
 *   learnerContext,
 *   fieldIntelligence,
 *   dependencyGraph,
 *   learningArcs,
 *   modules,
 *   competencies,
 *   projects,
 *   learningMissions,
 *   evidenceModel,
 *   adaptationRules,
 *   finalDestination
 * }
 */

export const CANONICAL_SCHEMA_VERSION = '2.3.0';

// ── RESEARCH LAYERS (v2.3) ──

export const RESEARCH_LAYERS = {
  FOUNDATIONS: 'FOUNDATIONS',
  FIELD_DEVELOPMENT: 'FIELD_DEVELOPMENT',
  CURRENT_PRACTICE: 'CURRENT_PRACTICE',
  CURRENT_RESEARCH: 'CURRENT_RESEARCH',
  EMERGING_FUTURE: 'EMERGING_FUTURE',
  FIELD_SURVIVAL: 'FIELD_SURVIVAL'
};

export const RESEARCH_LAYER_LABELS = {
  FOUNDATIONS: 'Layer A: Foundations & Seminal Works',
  FIELD_DEVELOPMENT: 'Layer B: Development & Paradigm Shifts',
  CURRENT_PRACTICE: 'Layer C: Current Practice & Standards',
  CURRENT_RESEARCH: 'Layer D: Current Research & Debates',
  EMERGING_FUTURE: 'Layer E: Emerging Frontiers & Future',
  FIELD_SURVIVAL: 'Layer F: Field Survival & Durability'
};

// ── SOURCE STRATIFICATION (v2.3) ──

export const SOURCE_TYPES = {
  PRIMARY_RESEARCH: 'PRIMARY_RESEARCH',
  SYSTEMATIC_REVIEW: 'SYSTEMATIC_REVIEW',
  SURVEY_REVIEW: 'SURVEY_REVIEW',
  LANDMARK_WORK: 'LANDMARK_WORK',
  TEXTBOOK_MONOGRAPH: 'TEXTBOOK_MONOGRAPH',
  OFFICIAL_DOCUMENTATION: 'OFFICIAL_DOCUMENTATION',
  PROFESSIONAL_STANDARD: 'PROFESSIONAL_STANDARD',
  INSTITUTIONAL_SOURCE: 'INSTITUTIONAL_SOURCE',
  REPUTABLE_INDUSTRY_SOURCE: 'REPUTABLE_INDUSTRY_SOURCE',
  OTHER: 'OTHER'
};

// ── RESEARCH RECENCY (v2.3) ──

export const RESEARCH_RECENCY = {
  HISTORICAL: 'HISTORICAL',
  ESTABLISHED: 'ESTABLISHED',
  CURRENT: 'CURRENT',
  RECENT: 'RECENT',
  EMERGING: 'EMERGING',
  SPECULATIVE: 'SPECULATIVE'
};

// ── QUALITATIVE RESEARCH QUALITY (v2.3 — No fake percentages) ──

export const RESEARCH_QUALITY_LEVELS = {
  STRONG: 'STRONG',
  ADEQUATE: 'ADEQUATE',
  LIMITED: 'LIMITED',
  INSUFFICIENT: 'INSUFFICIENT'
};

// ── DURABILITY CLASSIFICATIONS (v2.3) ──

export const DURABILITY_CLASSIFICATIONS = {
  DURABLE_FOUNDATION: 'DURABLE_FOUNDATION',
  TRANSFERABLE_CAPABILITY: 'TRANSFERABLE_CAPABILITY',
  CURRENT_PRACTICE: 'CURRENT_PRACTICE',
  TOOL_DEPENDENT: 'TOOL_DEPENDENT',
  FAST_MOVING: 'FAST_MOVING',
  COMMODITIZING: 'COMMODITIZING',
  DECLINING: 'DECLINING',
  EMERGING: 'EMERGING',
  SPECULATIVE: 'SPECULATIVE'
};

// ── FIELD TRAJECTORY CLASSIFICATION ──

export const FIELD_TRAJECTORY_CLASSES = [
  'DURABLE_FOUNDATION',
  'ESTABLISHED',
  'CURRENT_PRACTICE',
  'FAST_MOVING',
  'EMERGING',
  'SPECULATIVE',
  'CONTESTED',
  'DECLINING_OR_DEPRECATED',
  'OPEN_PROBLEM',
  'CROSS_DISCIPLINARY_BRIDGE'
];

// ── SOURCE VERIFICATION ──

export const SOURCE_VERIFICATION_STATUSES = {
  SOURCE_VERIFIED: 'SOURCE_VERIFIED',
  SOURCE_NOT_VERIFIED: 'SOURCE_NOT_VERIFIED',
  UNCERTAIN_CLAIM: 'UNCERTAIN_CLAIM'
};

// ── LEARNING MODES (v2.1 expanded) ──

export const LEARNING_MODES = [
  'learn',
  'recall',
  'retrieve',
  'explain',
  'calculate',
  'predict',
  'trace',
  'compare',
  'classify',
  'investigate',
  'measure',
  'simulate',
  'implement',
  'build',
  'debug',
  'design',
  'optimize',
  'test',
  'reproduce',
  'create',
  'reflect',
  'transfer',
  'apply',
  // Non-engineering cognitive and analytical modes (v2.4)
  'derive',
  'contextualize',
  'analyze',
  'argue',
  'research',
  'critique',
  'evaluate',
  'source_criticism'
];

// ── DEPTH LEVELS (v2.1 / v2.3) ──

export const DEPTH_LEVELS = {
  AWARENESS: 'AWARENESS',
  UNDERSTANDING: 'UNDERSTANDING',
  WORKING_FLUENCY: 'WORKING_FLUENCY',
  DEEP_MASTERY_TARGET: 'DEEP_MASTERY_TARGET',
  FRONTIER_AWARENESS: 'FRONTIER_AWARENESS',
  // Backward compatibility aliases
  SURFACE_AWARENESS: 'SURFACE_AWARENESS',
  WORKING_UNDERSTANDING: 'WORKING_UNDERSTANDING',
  FUNCTIONAL_FLUENCY: 'FUNCTIONAL_FLUENCY',
  DEEP_UNDERSTANDING: 'DEEP_UNDERSTANDING',
  RESEARCH_LEVEL: 'RESEARCH_LEVEL'
};

// ── PROJECT SCAFFOLDING LEVELS (v2.1) ──

export const SCAFFOLDING_LEVELS = {
  GUIDED: 'GUIDED',
  PARTIALLY_GUIDED: 'PARTIALLY_GUIDED',
  SPECIFICATION_ONLY: 'SPECIFICATION_ONLY',
  OPEN_ENDED: 'OPEN_ENDED'
};

// ── ADAPTATION WEAKNESS TYPES (v2.1) ──

export const ADAPTATION_WEAKNESS_TYPES = {
  KNOWLEDGE: 'KNOWLEDGE',
  SKILL: 'SKILL',
  EXECUTION: 'EXECUTION',
  DEBUGGING: 'DEBUGGING',
  PREREQUISITE: 'PREREQUISITE',
  OVERCONFIDENCE: 'OVERCONFIDENCE',
  RESOURCE_CONSTRAINT: 'RESOURCE_CONSTRAINT'
};

// ── CONFIDENCE LEVELS ──

export const CONFIDENCE_LEVELS = {
  DETECTED: 'DETECTED',
  PARTIALLY_DETECTED: 'PARTIALLY_DETECTED',
  NOT_DETECTED: 'NOT_DETECTED',
  AMBIGUOUS: 'AMBIGUOUS'
};

/**
 * Creates an empty canonical field intelligence structure.
 * Missing fields remain explicitly null or empty arrays; never manufactured.
 */
export function createEmptyFieldIntelligence() {
  return {
    fieldDefinition: null,
    historicalLineage: [],
    foundationalIdeas: [],
    knowledgeAreas: [],
    competencyAreas: [],
    currentState: null,
    researchFrontier: [],
    openProblems: [],
    contestedAreas: [],
    fieldTrajectory: [],
    durabilityMap: {
      durableSkills: [],
      transferableSkills: [],
      toolDependentSkills: [],
      commoditizingSkills: [],
      vulnerableKnowledge: [],
      skipList: []
    },
    survivalStrategy: null,
    adjacentFields: [],
    researchersAndGroups: [],
    sourceLedger: [],
    uncertainties: [],
    // v2.3 research depth & provenance fields
    researchMethodology: null,
    researchScope: null,
    researchLimitations: [],
    coverageGaps: [],
    researchLayers: {
      FOUNDATIONS: null,
      FIELD_DEVELOPMENT: null,
      CURRENT_PRACTICE: null,
      CURRENT_RESEARCH: null,
      EMERGING_FUTURE: null,
      FIELD_SURVIVAL: null
    },
    claims: [],
    roadmapInfluences: [],
    whatStandardRoadmapWouldMiss: [],
    // v2.1 enrichments
    highLeverageConcepts: [],
    oftenSkippedConcepts: [],
    bridgeConcepts: [],
    commonMisconceptions: [],
    practicalFailureModes: [],
    professionalFailureModes: []
  };
}

/**
 * Creates an empty v2.1 adaptation rules structure.
 */
export function createEmptyAdaptationRules() {
  return {
    rules: [],
    // Pre-defined adaptation templates
    weaknessHandlers: {
      KNOWLEDGE: 'Revisit learning unit with additional explanation and retrieval practice',
      SKILL: 'Assign smaller practical task with scaffolding',
      EXECUTION: 'Provide step-by-step subtask decomposition',
      DEBUGGING: 'Present intentional failure case to diagnose',
      PREREQUISITE: 'Return to prerequisite learning unit',
      OVERCONFIDENCE: 'Assign explanation/retrieval variant to verify depth',
      RESOURCE_CONSTRAINT: 'Provide alternative resources or simulation'
    }
  };
}

/**
 * SAMPLE ONLY DATA — NEVER IMPORT THIS DATA AS LEARNER PROGRESS
 * Included solely for UI demonstration, format verification, and unit tests.
 */
export const SAMPLE_AI_RESEARCH_ANSWER_MARKDOWN = `# SAMPLE ONLY — NEVER IMPORT THIS DATA
# Field Intelligence Dossier: Applied Quantum Computing

## Phase 1: Field Reconstruction
Quantum computing bridges quantum mechanics, computational complexity theory, and linear algebra to manipulate quantum bits (qubits) using superposition, entanglement, and interference.

## Phase 4: Current State of the Field
Current hardware operates in the Noisy Intermediate-Scale Quantum (NISQ) era (50-1000 noisy physical qubits) with ongoing transition toward Fault-Tolerant Quantum Computing (FTQC) via surface codes and lattice surgery. Dominant SDKs include Qiskit (IBM), Cirq (Google), and PennyLane (Xanadu).

## Phase 5: Research Frontier
- Logical Qubit Scaling & Quantum Error Correction (QEC)
- Variational Quantum Eigensolvers (VQE) under barren plateau mitigation
- Neutral atom array quantum computing architectures

## Phase 6: Field Trajectory & High-Leverage Concepts
- **Linear Algebra Fundamentals (Hilbert Space, Unitary Operators)**: [DURABLE_FOUNDATION]
- **Surface Codes & Syndrome Decoding**: [FAST_MOVING]
- **Ad-hoc NISQ Heuristics**: [SPECULATIVE]

## Learning Arc 1: Quantum Mechanics & Linear Algebra Foundations
### Module 1.1: State Vectors and Dirac Notation
- [ ] Represent single qubit pure states on the Bloch Sphere
- [ ] Calculate inner and outer products of state vectors
- [ ] Implement state vector evolution in Qiskit
*Learning Mode*: calculate | *Mission*: Derive Bloch coordinates for standard superpositions

## Learning Arc 2: Quantum Algorithms & Circuit Synthesis
### Module 2.1: Quantum Phase Estimation & Shor's Building Blocks
- [ ] Implement Quantum Fourier Transform (QFT) circuit
- [ ] Measure phase precision scaling with ancilla count
*Prerequisite*: Module 1.1

## Practical Projects
- **Project 1: 5-Qubit Entanglement Swapping Simulation**: Build and benchmark an entanglement swapping circuit with simulated depolarizing noise.

## Specialization Tracks
- **Track A: Quantum Error Correction (Prerequisite: Arc 1 & 2)**: Trade-off: High mathematical rigor vs delayed immediate hardware application.

## Source Ledger
- Nielsen & Chuang (2010), *Quantum Computation and Quantum Information*, Cambridge University Press. [SOURCE_VERIFIED]
- Preskill (2018), *Quantum Computing in the NISQ era and beyond*, Quantum 2, 79. [SOURCE_VERIFIED]
`;

export const SAMPLE_CANONICAL_V2_DATA = {
  schemaVersion: CANONICAL_SCHEMA_VERSION,
  _sampleNotice: 'SAMPLE ONLY — NEVER IMPORT THIS DATA',
  learnerContext: {
    goal: 'Applied Quantum Computing',
    destination: 'Quantum Algorithm Developer',
    currentLevel: 'INTERMEDIATE',
    purpose: 'RESEARCH',
    targetHorizon: '6 months',
    weeklyHours: 12,
    constraints: 'Access to classical Python workstation, no physical dilution refrigerator',
    priorKnowledge: 'Linear algebra, Python, classical computer architecture'
  },
  fieldIntelligence: {
    fieldDefinition: 'Computation utilizing coherent quantum phenomena such as superposition and entanglement.',
    historicalLineage: [
      { epoch: '1982', contributor: 'Richard Feynman', discovery: 'Simulating physics with computers' },
      { epoch: '1994', contributor: 'Peter Shor', discovery: 'Polynomial-time factoring algorithm' }
    ],
    foundationalIdeas: ['Hilbert Space representation', 'Unitary evolution', 'Measurement postulate'],
    knowledgeAreas: ['Quantum Information Theory', 'Circuit Synthesis', 'Quantum Error Correction'],
    competencyAreas: ['Bloch Sphere geometry', 'Algorithm composition', 'Noise mitigation'],
    currentState: 'NISQ to FTQC transition with optical and superconducting modalities.',
    researchFrontier: [
      { area: 'Surface Code Decoding', status: 'FAST_MOVING', keyChallenge: 'Sub-microsecond minimum-weight perfect matching' }
    ],
    openProblems: ['Scalable fault-tolerant logical qubit interconnects'],
    contestedAreas: ['Viability of quantum advantage for NISQ variational algorithms'],
    fieldTrajectory: [
      { topic: 'Linear Algebra Foundations', classification: 'DURABLE_FOUNDATION' },
      { topic: 'Surface Code Decoding', classification: 'FAST_MOVING' }
    ],
    durabilityMap: {
      durableSkills: ['Linear algebra', 'Information theory', 'Computational complexity'],
      transferableSkills: ['Classical compiler optimization', 'Signal processing'],
      toolDependentSkills: ['Current Qiskit version APIs'],
      commoditizingSkills: ['Manual circuit drawing without synthesis compilers'],
      vulnerableKnowledge: ['Vendor-specific pulse shaping calibrations'],
      skipList: ['Proprietary single-vendor hardware control scripts']
    },
    survivalStrategy: 'Anchor deeply in Hilbert space linear algebra; treat SDKs as transient wrappers.',
    adjacentFields: ['Cryogenics', 'RF Engineering', 'Complexity Theory'],
    researchersAndGroups: ['IBM Quantum', 'Google Quantum AI', 'QuTech'],
    sourceLedger: [
      {
        id: 'SRC-001',
        title: 'Quantum Computation and Quantum Information',
        authors: ['Michael A. Nielsen', 'Isaac L. Chuang'],
        year: 2010,
        type: 'TEXTBOOK_MONOGRAPH',
        recency: 'ESTABLISHED',
        citation: 'Nielsen & Chuang (2010), Quantum Computation and Quantum Information',
        status: 'SOURCE_VERIFIED',
        relevance: 'Foundational textbook',
        authorityLevel: 'PRIMARY',
        supportedClaims: ['CLM-001'],
        verificationStatus: 'SOURCE_VERIFIED'
      },
      {
        id: 'SRC-002',
        title: 'Quantum Computing in the NISQ era and beyond',
        authors: ['John Preskill'],
        year: 2018,
        type: 'SURVEY_REVIEW',
        recency: 'RECENT',
        citation: 'Preskill (2018), Quantum Computing in the NISQ era and beyond, Quantum 2, 79',
        status: 'SOURCE_VERIFIED',
        relevance: 'Seminal NISQ framing review',
        authorityLevel: 'AUTHORITATIVE',
        supportedClaims: ['CLM-002'],
        verificationStatus: 'SOURCE_VERIFIED'
      }
    ],
    uncertainties: ['Exact timeline for fault-tolerant logical threshold demonstration'],
    // v2.3 research depth & provenance fields
    researchScope: 'Gate-based quantum computing spanning linear algebra foundations to fault-tolerant surface codes.',
    researchLimitations: [
      'Focus is restricted to gate-model quantum computing; adiabatic quantum annealing is not comprehensively reviewed.',
      'Hardware specifics reflect public literature as of early FTQC threshold milestones.'
    ],
    coverageGaps: [
      'Cryogenic microwave control electronics engineering specifics',
      'Optical interconnect bus routing for modular QPUs'
    ],
    claims: [
      {
        id: 'CLM-001',
        claim: 'Unitary evolution and projective measurement form the axiomatic foundation of gate-based quantum algorithms.',
        sourceId: 'SRC-001',
        confidence: 'HIGH',
        whySourceMatters: 'Canonical formulation in standard reference text'
      },
      {
        id: 'CLM-002',
        claim: 'Current NISQ hardware is fundamentally constrained by physical qubit error rates before reaching fault-tolerant surface code thresholds.',
        sourceId: 'SRC-002',
        confidence: 'HIGH',
        whySourceMatters: 'Seminal survey establishing the NISQ paradigm limits'
      }
    ],
    roadmapInfluences: [
      {
        finding: 'Linear algebra primitives are invariant across all hardware architectures',
        consequence: 'Deeper mathematical treatment in Arc 1 before introducing SDK-specific syntax',
        findingArea: 'FOUNDATIONS'
      },
      {
        finding: 'NISQ heuristics are transient and fast-changing',
        consequence: 'Focus on noise modeling principles rather than vendor-specific pulse calibrations',
        findingArea: 'CURRENT_PRACTICE'
      }
    ],
    whatStandardRoadmapWouldMiss: [
      {
        area: 'Quantum Circuit Synthesis',
        commonlyTaught: 'Basic single-qubit gates and Bell states',
        commonlyOmitted: 'Decoherence timescales and fidelity metrics beyond average gate error rates',
        highLeverage: 'Tensor product representations for multi-qubit systems',
        bridgeConcept: 'Error correction codes linked to classical linear codes',
        realWorldFailure: 'Ignoring physical coupling topology when compiling circuits',
        currentDevelopment: 'Neutral atom array architectures with dynamic reconfigurability',
        researchConnection: 'Syndrome decoding algorithms for topological surface codes'
      }
    ],
    // v2.1 enrichments
    highLeverageConcepts: ['Tensor products for multi-qubit systems', 'Measurement-induced collapse'],
    oftenSkippedConcepts: ['Decoherence timescales', 'Fidelity metrics beyond gate error rates'],
    bridgeConcepts: ['Classical-quantum interface protocols', 'Error correction code theory from classical coding'],
    commonMisconceptions: ['Quantum computers are simply faster classical computers'],
    practicalFailureModes: ['Ignoring noise models when designing circuits'],
    professionalFailureModes: ['Over-relying on simulator results without hardware validation']
  },
  dependencyGraph: {
    nodes: [
      { id: 'mod-1-1', name: 'State Vectors & Dirac Notation' },
      { id: 'mod-2-1', name: 'Quantum Phase Estimation' }
    ],
    edges: [
      { from: 'mod-1-1', to: 'mod-2-1', type: 'PREREQUISITE' }
    ]
  },
  learningArcs: [
    {
      id: 'arc-1',
      name: 'Quantum Foundations',
      description: 'Mathematical grounding and state vectors',
      modules: [
        {
          id: 'mod-1-1',
          name: 'State Vectors & Dirac Notation',
          description: 'Bloch sphere geometry and unitary operators',
          learningUnits: [
            {
              id: 'lu-1-1-1',
              name: 'Understand qubit state representation',
              depth: 'WORKING_UNDERSTANDING',
              concept: 'State vectors in Hilbert space',
              whyItMatters: 'Foundation for all quantum computation',
              misconceptionRisk: 'Confusing classical bit states with quantum superposition',
              prerequisiteKnowledge: ['Linear algebra basics'],
              retrievalTarget: 'Explain Bloch sphere coordinates from memory',
              transferTarget: 'Apply state vector notation to multi-qubit systems'
            }
          ],
          subtasks: [
            { id: 'sub-1', name: 'Represent single qubit pure states on the Bloch Sphere', completed: false },
            { id: 'sub-2', name: 'Calculate inner and outer products of state vectors', completed: false }
          ],
          learningMode: 'calculate',
          prerequisites: []
        }
      ]
    },
    {
      id: 'arc-2',
      name: 'Quantum Algorithms',
      description: 'Algorithm synthesis and speedups',
      modules: [
        {
          id: 'mod-2-1',
          name: 'Quantum Phase Estimation',
          description: 'Phase precision and eigenvalue measurement',
          subtasks: [
            { id: 'sub-3', name: 'Implement Quantum Fourier Transform circuit', completed: false }
          ],
          learningMode: 'build',
          prerequisites: ['mod-1-1']
        }
      ]
    }
  ],
  modules: [],
  competencies: [
    { id: 'comp-1', name: 'Bloch Sphere state manipulation', tier: 'DURABLE' }
  ],
  projects: [
    {
      id: 'proj-1',
      name: '5-Qubit Entanglement Swapping Simulation',
      description: 'Benchmark entanglement fidelity under depolarizing noise channel.',
      scaffoldingLevel: 'PARTIALLY_GUIDED',
      capabilitiesExercised: ['Circuit construction', 'Noise modeling'],
      prerequisiteModules: ['mod-1-1'],
      failureModes: ['Incorrect noise channel parametrization'],
      whatFailureTeaches: 'Importance of realistic noise models'
    }
  ],
  learningMissions: [
    { id: 'miss-1', moduleId: 'mod-1-1', task: 'Derive Bloch coordinates for equal superposition' }
  ],
  evidenceModel: {
    requiresVerifiableProof: true
  },
  adaptationRules: {
    rules: [
      {
        condition: 'Learner completes implementation but cannot explain',
        weaknessType: 'OVERCONFIDENCE',
        action: 'Assign explanation/retrieval variant to verify depth'
      },
      {
        condition: 'Learner understands concept but cannot implement',
        weaknessType: 'SKILL',
        action: 'Assign smaller practical task with scaffolding'
      }
    ]
  },
  finalDestination: 'Quantum Algorithm Developer'
};
