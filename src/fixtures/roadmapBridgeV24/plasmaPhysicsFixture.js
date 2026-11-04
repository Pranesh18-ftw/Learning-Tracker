/**
 * plasmaPhysicsFixture.js
 *
 * Realistic External AI Output for:
 * Domain C: Plasma Physics
 *
 * Demonstrates:
 * - Theoretical rigor: Kinetic Vlasov theory vs Two-fluid/MHD models, Landau damping
 * - Advanced computational physics: Boris pusher, Particle-In-Cell (PIC) simulation
 * - Concrete learning/doing separation: Derivation/proofs vs computational benchmarks
 */

export const PLASMA_PHYSICS_OUTPUT = {
  rawResponse: `# UNIVERSAL DEEP RESEARCH DOSSIER & ROADMAP
## Domain: Plasma Physics
## Provider: Frontier AI / Computational Plasma Physics
## Timestamp: 2026-10-09

### PHASE 1 — FIELD RECONSTRUCTION
Plasma Physics is the study of ionized gases exhibiting collective behavior mediated by long-range electromagnetic forces rather than localized binary neutral collisions.
- **Boundaries**: Distinct from neutral gas fluid dynamics; governing dynamics require coupled solutions of Maxwell's equations and kinetic distribution functions (or macroscopic moments).
- **Taxonomies**:
  1. Single-Particle Motion & Guiding Center Drifts
  2. Magnetohydrodynamics (MHD: Ideal, Resistive, Hall)
  3. Plasma Waves & Wave-Particle Resonance
  4. Kinetic Theory & Vlasov-Maxwell Systems
  5. Computational Plasma Modeling (PIC, Gyrokinetic, Magnetohydrodynamic codes)

### PHASE 2 — HISTORICAL & INTELLECTUAL LINEAGE
- **Seminal Works**:
  - Langmuir, I. "Oscillations in Ionized Gases" (Proc. Natl. Acad. Sci., 1928) [SRC-PLAS-01]
  - Alfvén, H. "Existence of Electromagnetic-Hydrodynamic Waves" (Nature, 1942) [SRC-PLAS-02]
  - Landau, L. "On the vibrations of the electronic plasma" (J. Phys. USSR, 1946) [SRC-PLAS-03]
  - Spitzer, L. "Physics of Fully Ionized Gases" (Interscience, 1956) [SRC-PLAS-04]
  - Birdsall, C. K. & Langdon, A. B. "Plasma Physics via Computer Simulation" (McGraw-Hill, 1985) [SRC-PLAS-05]
  - Freidberg, J. P. "Ideal Magnetohydrodynamics" (Plenum Press, 1987) [SRC-PLAS-06]
`,
  canonicalJson: {
    schemaVersion: '2.3.0',
    learnerContext: {
      goal: 'Plasma Physics',
      targetDestination: 'Plasma Physicist capable of analyzing kinetic and magnetohydrodynamic (MHD) plasma phenomena, wave-particle interactions, and running computational Particle-In-Cell (PIC) simulations.',
      currentLevel: 'BEGINNER_TO_INTERMEDIATE',
      purpose: 'ACADEMIC_RESEARCH'
    },
    fieldIntelligence: {
      fieldDefinition: 'Physics of collective electrodynamic interactions in quasi-neutral ionized gases across macroscopic fluid and microscopic kinetic regimes.',
      historicalLineage: [
        { era: '1920s', milestone: 'Irving Langmuir coins the term plasma and discovers high-frequency electron plasma oscillations.' },
        { era: '1942', milestone: 'Hannes Alfvén discovers magnetohydrodynamic waves (Alfvén waves), establishing ideal MHD theory.' },
        { era: '1946', milestone: 'Lev Landau proves collisionless damping of plasma waves via complex contour integration.' },
        { era: '1980s-Present', milestone: 'High-performance computing enables gyrokinetic turbulence modeling and multi-dimensional Particle-In-Cell simulations.' }
      ],
      foundationalIdeas: [
        'Debye shielding length and quasi-neutrality criterion (lambda_D << L)',
        'Guiding center drift mechanics (E x B drift, grad-B drift, curvature drift)',
        'Ideal Magnetohydrodynamic (MHD) equations and magnetic flux freezing (Alfvén theorem)',
        'Kinetic Vlasov equation and collisionless Landau damping'
      ],
      currentState: 'Major experimental efforts in magnetic confinement (ITER tokamak, Wendelstein 7-X stellarator) and laser inertial confinement (NIF fusion ignition).',
      researchFrontier: [
        { topic: 'Quasi-symmetric 3D magnetic fields in stellarator optimization', status: 'ACTIVE' },
        { topic: 'Relativistic laser-plasma acceleration and runaway electron mitigation in tokamak disruptions', status: 'ACTIVE' }
      ],
      openProblems: [
        'Predictive modeling of anomalous electron thermal transport caused by micro-turbulent drift waves',
        'Non-linear magnetic reconnection rate scaling in low-collisionality astrophysical and laboratory plasmas'
      ],
      durabilityMap: {
        durableSkills: ['Maxwell equations coupling to charge transport', 'Plasma dispersion relation derivation', 'Asymptotic expansion (guiding center theory)', 'Phase space distribution analysis'],
        transferableSkills: ['Numerical particle pusher algorithms (Boris method)', 'Fourier spectral analysis of wave modes', 'Scientific visualization in high dimensions'],
        toolDependentSkills: ['Specific proprietary PIC simulation GUIs', 'Commercial finite element packages without kinetic solvers'],
        commoditizingSkills: ['Plugging parameters into pre-packaged 0D plasma scaling laws'],
        vulnerableKnowledge: ['Assuming ideal MHD applies universally to collisionless, hot thermonuclear regimes']
      },
      whatStandardRoadmapWouldMiss: [
        'Landau contour integration along the complex velocity plane to capture pole residue contributions',
        'Boris particle integrator phase-space volume preservation (symplectic properties)',
        'Magnetic island formation and tearing mode instability in resistive MHD',
        'Ponderomotive force in intense laser-plasma interactions'
      ],
      highLeverageConcepts: [
        'Landau damping occurs purely through phase mixing and resonant energy exchange between particles traveling near the wave phase velocity (v ~ v_phase)',
        'Magnetic flux freezing: In ideal MHD with infinite conductivity, magnetic field lines move rigidly with the plasma fluid elements',
        'Boris pusher algorithm preserves the exact gyroradius and energy over long integration times because it is volume-preserving in phase space'
      ],
      bridgeConcepts: [
        'Statistical mechanics (Boltzmann transport equation) bridging to microscopic Maxwell fields via the Vlasov distribution function',
        'Fluid mechanics (Navier-Stokes equations) extending into MHD via the Lorentz force J x B'
      ],
      practicalFailureModes: [
        'Applying single-fluid MHD to phenomena operating on time scales shorter than the ion cyclotron frequency',
        'Numerical grid instability (Cherenkov radiation) in PIC codes when particle grid-crossing speed exceeds numerical CFL limits',
        'Neglecting displacement current in high-frequency electromagnetic wave regimes'
      ],
      sourceLedger: [
        {
          id: 'SRC-PLAS-01',
          title: 'Oscillations in Ionized Gases',
          authors: ['Irving Langmuir'],
          year: 1928,
          type: 'LANDMARK_WORK',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-PLAS-02',
          title: 'Existence of Electromagnetic-Hydrodynamic Waves',
          authors: ['Hannes Alfvén'],
          year: 1942,
          type: 'PRIMARY_RESEARCH',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-PLAS-03',
          title: 'On the vibrations of the electronic plasma',
          authors: ['Lev Landau'],
          year: 1946,
          type: 'PRIMARY_RESEARCH',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-PLAS-04',
          title: 'Physics of Fully Ionized Gases',
          authors: ['Lyman Spitzer'],
          year: 1956,
          type: 'TEXTBOOK_MONOGRAPH',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-PLAS-05',
          title: 'Plasma Physics via Computer Simulation',
          authors: ['C. K. Birdsall', 'A. B. Langdon'],
          year: 1985,
          type: 'LANDMARK_WORK',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        }
      ],
      claims: [
        {
          claim: 'Landau damping is an intrinsically collisionless phenomenon arising from phase mixing of resonant particles whose velocities match the phase velocity of the electrostatic wave.',
          sourceId: 'SRC-PLAS-03',
          confidence: 'HIGH'
        },
        {
          claim: 'In ideal magnetohydrodynamics with zero resistivity, the magnetic flux through any closed contour moving with the plasma fluid is conserved in time (Alfvén frozen-in flux theorem).',
          sourceId: 'SRC-PLAS-02',
          confidence: 'HIGH'
        }
      ],
      roadmapInfluences: [
        {
          finding: 'Landau damping cannot be derived from fluid equations because it requires resolving the velocity distribution function f(x,v,t) around the resonant pole v = omega / k.',
          whyItMatters: 'Demonstrates the fundamental breakdown of fluid approximations in hot plasmas, necessitating kinetic theory.',
          roadmapConsequence: 'Dedicated Arc on Kinetic Theory and Complex Contour Residue Integration rather than restricting curriculum to fluid MHD.',
          learningDepth: 'DEEP_MASTERY_TARGET',
          taskDesign: 'Derive plasma dielectric permittivity using the Landau contour and compute the imaginary frequency damping rate gamma.',
          projectConsequence: 'Project 1 requires simulating collisionless Landau damping in a 1D Particle-In-Cell code to observe electrostatic wave attenuation without collisions.'
        }
      ]
    },
    learningArcs: [
      {
        id: 'ARC-PLAS-01',
        title: 'Fundamental Scales, Guiding Center Motion & Magnetohydrodynamics',
        description: 'Derive Debye length, single-particle magnetic drifts, and the governing equations of ideal and resistive MHD.',
        modules: [
          {
            id: 'MOD-PLAS-01',
            title: 'Debye Shielding, Plasma Frequency & Single-Particle Drifts',
            learningUnits: [
              {
                title: 'Poisson-Boltzmann Equation & Debye Screening Length',
                depth: 'WORKING_FLUENCY',
                description: 'Derive electrostatic potential decay around a test charge immersed in thermal electron plasma.'
              },
              {
                title: 'Guiding Center Drift Velocity Derivations',
                depth: 'WORKING_FLUENCY',
                description: 'E x B drift, gradient-B drift, and curvature drift equations from Lorentz force perturbation analysis.'
              }
            ],
            doingTasks: [
              {
                title: 'Calculate Debye Length and Plasma Parameter for Laboratory & Astrophysical Regimes',
                mode: 'calculate',
                subtasks: [
                  { title: 'Calculate lambda_D for tokamak core (n=1e20 m^-3, T=10 keV) vs interstellar medium' },
                  { title: 'Verify plasma parameter N_D >> 1 condition for collective behavior validation' }
                ]
              },
              {
                title: 'Simulate Guiding Center Orbit in Inhomogeneous Magnetic Field',
                mode: 'simulate',
                subtasks: [
                  { title: 'Implement numerical Boris velocity pusher in Python' },
                  { title: 'Simulate electron trajectory in magnetic mirror and calculate magnetic moment conservation (mu = mv_perp^2 / 2B)' }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ARC-PLAS-02',
        title: 'Kinetic Theory, Wave-Particle Interactions & PIC Modeling',
        description: 'Solve the Vlasov-Maxwell system, prove collisionless Landau damping, and build a 1D Particle-In-Cell simulation.',
        modules: [
          {
            id: 'MOD-PLAS-02',
            title: 'Vlasov Equation, Landau Damping & Two-Stream Instability',
            learningUnits: [
              {
                title: 'Vlasov Equation in 1D Phase Space',
                depth: 'DEEP_MASTERY_TARGET',
                description: 'Collisionless Boltzmann equation governing evolution of distribution function f(x,v,t).'
              },
              {
                title: 'Landau Contour Integration and Residue Theory',
                depth: 'DEEP_MASTERY_TARGET',
                description: 'Analytical continuation around pole v = omega / k to evaluate damping and growth rates.'
              }
            ],
            doingTasks: [
              {
                title: 'Derive Dispersion Relation for Two-Stream Instability',
                mode: 'derive',
                subtasks: [
                  { title: 'Linearize Vlasov-Poisson equations for two counter-streaming cold electron beams' },
                  { title: 'Solve for complex frequency roots and determine maximum growth rate gamma_max' }
                ]
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'PRJ-PLAS-01',
        title: '1D1V Particle-In-Cell (PIC) Simulation of Landau Damping and Two-Stream Instability',
        scaffolding: 'PARTIALLY_GUIDED',
        description: 'Build a full electrostatic Particle-In-Cell simulation code from scratch featuring Cloud-In-Cell (CIC) charge weighting, FFT Poisson solver, and Boris particle advancement.',
        capabilitiesExercised: ['PIC grid interpolation', 'Poisson equation solving via FFT', 'Boris leapfrog integration', 'Phase space visualization'],
        failureModesEncountered: ['Numerical heating from insufficient particle count per cell', 'Energy conservation drift from improper charge deposition'],
        evidenceProduced: 'Phase-space (x, v) vortex formation plots demonstrating nonlinear particle trapping and exponential growth rate matching analytical Penrose criterion.'
      }
    ]
  }
};
