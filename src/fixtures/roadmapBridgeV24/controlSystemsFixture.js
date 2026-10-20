/**
 * controlSystemsFixture.js
 *
 * Realistic External AI Output for:
 * Domain B: Control Systems Engineering
 *
 * Demonstrates:
 * - Mathematical rigor: state-space, Kalman filter, LQR/LQG, Model Predictive Control (MPC)
 * - Anti-generic: moves far beyond simple PID heuristics to physical stability proofs and state estimation
 * - Learning vs Doing separation: derivation/proof learning units separated from numerical simulation & implementation tasks
 */

export const CONTROL_SYSTEMS_OUTPUT = {
  rawResponse: `# UNIVERSAL DEEP RESEARCH DOSSIER & ROADMAP
## Domain: Control Systems Engineering
## Provider: Frontier AI / Control Theory Synthesis
## Timestamp: 2026-10-09

### PHASE 1 — FIELD RECONSTRUCTION
Control Systems Engineering is the mathematical and cyber-physical science of shaping dynamical behavior in physical processes to guarantee stability, reject disturbances, and follow trajectories in the presence of modeling uncertainty and sensory noise.
- **Boundaries**: Differentiated from pure software development; focuses on physical dynamics described by differential and difference equations, actuator saturation, and feedback instability.
- **Taxonomies**:
  1. Classical Frequency-Domain Control (SISO, Root Locus, Bode, Nyquist)
  2. Modern State-Space Control (MIMO, Controllability, Observability, LQR, Kalman Filtering)
  3. Advanced Optimal & Predictive Control (H-infinity, mu-synthesis, Model Predictive Control - MPC)
  4. Real-Time Embedded Discretization & Implementation (Tustin transform, quantization, anti-windup)

### PHASE 2 — HISTORICAL & INTELLECTUAL LINEAGE
- **Seminal Works**:
  - Nyquist, H. "Regeneration Theory" (Bell System Tech. J., 1932) [SRC-CTRL-01]
  - Bode, H. W. "Network Analysis and Feedback Amplifier Design" (Van Nostrand, 1945) [SRC-CTRL-02]
  - Kalman, R. E. "A New Approach to Linear Filtering and Prediction Problems" (ASME J. Basic Eng., 1960) [SRC-CTRL-03]
  - Doyle, J. C., Glover, K., Khargonekar, P. P., & Francis, B. A. "State-space solutions to standard H2 and H-infinity control problems" (IEEE Trans. Autom. Control, 1989) [SRC-CTRL-04]
  - Rawlings, J. B., Mayne, D. Q., & Diehl, M. M. "Model Predictive Control: Theory, Computation, and Design" (Nob Hill, 2017) [SRC-CTRL-05]
`,
  canonicalJson: {
    schemaVersion: '2.3.0',
    learnerContext: {
      goal: 'Control Systems Engineering',
      targetDestination: 'Control Systems Engineer proficient in state-space dynamical modeling, multivariable robust control (LQR, LQG, H-infinity), Model Predictive Control (MPC), and embedded real-time implementation.',
      currentLevel: 'INTERMEDIATE',
      purpose: 'CAREER_AND_RESEARCH'
    },
    fieldIntelligence: {
      fieldDefinition: 'Mathematical analysis and synthesis of feedback algorithms to ensure stability, disturbance attenuation, and optimality in physical dynamical systems.',
      historicalLineage: [
        { era: '1930s-1940s', milestone: 'Frequency-domain foundations: Nyquist stability criterion and Bode gain-phase relationship for feedback amplifiers.' },
        { era: '1960s', milestone: 'State-space revolution: Rudolf Kalman introduces state controllability, observability, and optimal linear-quadratic estimation (Kalman filter).' },
        { era: '1980s-Present', milestone: 'Robust H-infinity control (Doyle et al.) and real-time optimization-based Model Predictive Control (MPC).' }
      ],
      foundationalIdeas: [
        'Dynamical system state-space representation (dx/dt = Ax + Bu, y = Cx + Du)',
        'Lyapunov stability theory (direct and indirect methods)',
        'Kalman filter optimal state estimation and Separation Principle',
        'Model Predictive Control with quadratic programming (QP) under inequality constraints'
      ],
      currentState: 'Ubiquitous use of state-space observers and optimization-based control (MPC) in autonomous vehicles, aerospace, and robotics.',
      researchFrontier: [
        { topic: 'Data-driven and reinforcement learning control with formal Lyapunov stability guarantees', status: 'ACTIVE' },
        { topic: 'Embedded real-time nonlinear MPC solvers using first-order operator splitting (ADMM)', status: 'ACTIVE' }
      ],
      openProblems: [
        'Guaranteed stability margins in output-feedback nonlinear adaptive systems under sparse sensor coverage',
        'Formal verification of neural network policies operating in safety-critical feedback loops'
      ],
      durabilityMap: {
        durableSkills: ['Linear algebra & matrix calculus', 'Lyapunov stability proofs', 'Frequency response analysis', 'Discrete-time sampling theory'],
        transferableSkills: ['State estimation synthesis', 'Quadratic programming optimization', 'System identification'],
        toolDependentSkills: ['Specific MATLAB toolbox GUIs', 'Proprietary simulator setups'],
        commoditizingSkills: ['Manual heuristic PID tuning on static systems'],
        vulnerableKnowledge: ['Analog operational amplifier filter synthesis without digital microcontroller awareness']
      },
      whatStandardRoadmapWouldMiss: [
        'Observability Gramian calculation to determine sensor placement quality',
        'Actuator integrator windup mitigation via clamping and back-calculation',
        'Separation Theorem proof justifying decoupled observer-controller synthesis',
        'Bode Integral Theorem (Waterbed Effect) fundamental limitation on disturbance rejection'
      ],
      highLeverageConcepts: [
        'Bode Integral Theorem (conservation of sensitivity: improving disturbance rejection at low frequencies necessarily increases sensitivity at high frequencies)',
        'Separation Principle: LQR pole placement and Kalman filter estimator design can be solved independently for linear systems',
        'Receding horizon principle in Model Predictive Control'
      ],
      bridgeConcepts: [
        'Laplace s-domain to discrete z-domain bilinear (Tustin) transform and frequency pre-warping',
        'Physical conservation laws (Euler-Lagrange equations) directly generating state-space matrices'
      ],
      practicalFailureModes: [
        'Neglecting actuator rate or saturation limits causing closed-loop instability via windup',
        'Discretization aliasing caused by sampling below the Nyquist rate of unmodeled high-frequency dynamics',
        'Observer divergence caused by mismatched process noise covariance matrix Q'
      ],
      sourceLedger: [
        {
          id: 'SRC-CTRL-01',
          title: 'Regeneration Theory',
          authors: ['Harry Nyquist'],
          year: 1932,
          type: 'LANDMARK_WORK',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-CTRL-02',
          title: 'Network Analysis and Feedback Amplifier Design',
          authors: ['Hendrik W. Bode'],
          year: 1945,
          type: 'LANDMARK_WORK',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-CTRL-03',
          title: 'A New Approach to Linear Filtering and Prediction Problems',
          authors: ['Rudolf E. Kalman'],
          year: 1960,
          type: 'PRIMARY_RESEARCH',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-CTRL-04',
          title: 'State-space solutions to standard H2 and H-infinity control problems',
          authors: ['J. C. Doyle', 'K. Glover', 'P. P. Khargonekar', 'B. A. Francis'],
          year: 1989,
          type: 'PRIMARY_RESEARCH',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-CTRL-05',
          title: 'Model Predictive Control: Theory, Computation, and Design',
          authors: ['J. B. Rawlings', 'D. Q. Mayne', 'M. M. Diehl'],
          year: 2017,
          type: 'TEXTBOOK_MONOGRAPH',
          recency: 'CURRENT',
          verificationStatus: 'SOURCE_VERIFIED'
        }
      ],
      claims: [
        {
          claim: 'The Bode Sensitivity Integral demonstrates that feedback cannot eliminate sensitivity to disturbance across all frequencies; it merely redistributes it.',
          sourceId: 'SRC-CTRL-02',
          confidence: 'HIGH'
        },
        {
          claim: 'For linear time-invariant systems with Gaussian noise, the optimal state feedback controller and the optimal state estimator can be designed independently and combined without losing closed-loop stability (Separation Theorem).',
          sourceId: 'SRC-CTRL-03',
          confidence: 'HIGH'
        }
      ],
      roadmapInfluences: [
        {
          finding: 'Bode Integral Theorem proves feedback sensitivity behaves like an incompressible fluid: suppressing disturbance at low frequencies amplifies it at higher frequencies.',
          whyItMatters: 'Prevents engineers from over-tuning aggressive controllers that amplify high-frequency measurement noise into destructive mechanical oscillations.',
          roadmapConsequence: 'Inserted mandatory Sensitivity & Complementary Sensitivity loop shaping module with strict waterbed effect trade-off analysis.',
          learningDepth: 'DEEP_MASTERY_TARGET',
          taskDesign: 'Calculate Bode sensitivity integral and plot closed-loop peak sensitivity Ms across frequency.',
          projectConsequence: 'Project 1 requires formal verification of gain margin and phase margin constraints.'
        }
      ]
    },
    learningArcs: [
      {
        id: 'ARC-CTRL-01',
        title: 'Modern State-Space Modeling, Observability, and Full-State Feedback',
        description: 'Formulate state-space representations, prove controllability and observability, and synthesize LQR controllers.',
        modules: [
          {
            id: 'MOD-CTRL-01',
            title: 'State-Space Realization & Controllability/Observability Gramians',
            learningUnits: [
              {
                title: 'Controllability Matrix Rank and Popov-Belevitch-Hautus (PBH) Test',
                depth: 'DEEP_MASTERY_TARGET',
                description: 'Mathematical derivation of unreachable subspace modes from system dynamics matrices (A, B).'
              }
            ],
            doingTasks: [
              {
                title: 'Derive State-Space Model of Inverted Pendulum on a Cart',
                mode: 'derive',
                subtasks: [
                  { title: 'Formulate non-linear equations of motion using Euler-Lagrange equations' },
                  { title: 'Linearize around the upright unstable equilibrium point to obtain A and B matrices' },
                  { title: 'Compute controllability matrix rank to prove system is stabilizable' }
                ]
              }
            ]
          },
          {
            id: 'MOD-CTRL-02',
            title: 'Linear Quadratic Regulator (LQR) Synthesis & Algebraic Riccati Equation',
            learningUnits: [
              {
                title: 'Algebraic Riccati Equation (ARE) and Infinite-Horizon Cost Function',
                depth: 'WORKING_FLUENCY',
                description: 'Balancing state deviation penalties (Q matrix) against control actuation effort (R matrix).'
              }
            ],
            doingTasks: [
              {
                title: 'Synthesize and Tune LQR Gain Vector K in Simulation',
                mode: 'simulate',
                subtasks: [
                  { title: 'Solve Continuous-time Algebraic Riccati Equation (CARE) using Schur decomposition' },
                  { title: 'Simulate closed-loop response to step disturbances with varying Q/R ratios' },
                  { title: 'Verify closed-loop eigenvalues lie strictly in the open left-half complex plane' }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ARC-CTRL-02',
        title: 'Optimal State Estimation & Constrained Model Predictive Control',
        description: 'Synthesize discrete Kalman filters and design Model Predictive Controllers subject to actuator saturation.',
        modules: [
          {
            id: 'MOD-CTRL-03',
            title: 'Kalman Filter Observer Synthesis under Sensor Noise',
            learningUnits: [
              {
                title: 'Discrete Kalman Filter Predict-Update Equations',
                depth: 'WORKING_FLUENCY',
                description: 'Optimal recursive minimum mean-square error estimation for linear systems subject to Gaussian white noise.'
              }
            ],
            doingTasks: [
              {
                title: 'Implement Discrete Kalman Filter in C for Microcontroller Deployment',
                mode: 'implement',
                subtasks: [
                  { title: 'Implement covariance propagation and Kalman gain matrix inversion' },
                  { title: 'Inject artificial Gaussian noise into simulated sensor stream and verify convergence' },
                  { title: 'Benchmark execution time and matrix operations against CPU cycle limits' }
                ]
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'PRJ-CTRL-01',
        title: 'Rotary Inverted Pendulum (Furuta Pendulum) Swing-Up and Stabilization',
        scaffolding: 'GUIDED',
        description: 'Design a hybrid control system combining energy-based swing-up with LQR balancing and a Kalman state observer.',
        capabilitiesExercised: ['Euler-Lagrange modeling', 'LQR state feedback', 'Kalman filtering', 'Actuator saturation management'],
        failureModesEncountered: ['Motor voltage saturation during aggressive swing-up', 'Estimator divergence from encoder quantization'],
        evidenceProduced: 'Real-time simulation logs showing swing-up within 1.5 seconds and continuous stabilization under external tap disturbances.'
      },
      {
        id: 'PRJ-CTRL-02',
        title: 'Constrained Model Predictive Control for Trajectory Tracking Platform',
        scaffolding: 'PARTIALLY_GUIDED',
        description: 'Implement a discrete-time Model Predictive Controller using a Quadratic Programming solver (OSQP) to navigate a 2-DOF dynamic platform under strict velocity and actuator acceleration limits.',
        capabilitiesExercised: ['Receding horizon formulation', 'QP constraint setup', 'Embedded real-time solver integration'],
        failureModesEncountered: ['QP solver infeasibility under rapid trajectory steps', 'Computation time exceeding sampling period'],
        evidenceProduced: 'Phase-plane trajectories confirming zero constraint violations during high-speed path tracking.'
      }
    ]
  }
};
