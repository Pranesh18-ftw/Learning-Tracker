/**
 * Curated trajectories for the Cinematic Learning OS.
 * Structured to immediately illustrate the Arc -> Scene -> Take hierarchy.
 */

export const CURATED_ROADMAPS = [
  {
    id: 'electronics-embedded',
    name: 'Electronics & Embedded Systems',
    tagline: 'From semiconductor physics to autonomous firmware execution.',
    subjects: [
      {
        id: 'subject-electronics',
        name: 'Electronics',
        phases: [
          {
            id: 'phase-semiconductor-foundations',
            name: 'Semiconductor Foundations',
            tasks: [
              {
                id: 'task-diode-mechanics',
                name: 'Diode Mechanics',
                conceptId: 'diode-mechanics',
                visualId: 'diode-barrier',
                time: 30,
                difficulty: 'medium',
                subtasks: [
                  { id: 'sub-diode-pn-bias', name: 'P-N junction forward & reverse bias', completed: false },
                  { id: 'sub-diode-zener', name: 'Zener breakdown and voltage regulation', completed: false },
                  { id: 'sub-diode-clipping', name: 'Diode clipping and clamping circuits', completed: false }
                ]
              }
            ]
          },
          {
            id: 'phase-transistor-switching',
            name: 'Transistor Switching',
            tasks: [
              {
                id: 'task-bjt-switching',
                name: 'BJT Cutoff & Saturation',
                conceptId: 'bjt-cutoff-saturation',
                visualId: 'bjt-switch',
                time: 38,
                difficulty: 'hard',
                subtasks: [
                  { id: 'sub-bjt-biasing', name: 'Biasing fundamentals and load line analysis', completed: false },
                  { id: 'sub-bjt-why-q1', name: 'Why does Q1 turn on?', completed: false },
                  { id: 'sub-bjt-saturation-resistor', name: 'Calculate base resistor for complete saturation', completed: false }
                ]
              },
              {
                id: 'task-switching-circuit-design',
                name: 'Switching Circuit Design',
                conceptId: 'switching-circuit-design',
                time: 45,
                difficulty: 'hard',
                subtasks: [
                  { id: 'sub-switching-flyback-diode', name: 'Flyback diode protection for inductive loads', completed: false },
                  { id: 'sub-switching-rise-fall-opt', name: 'Driver stage rise and fall time optimization', completed: false }
                ]
              }
            ]
          },
          {
            id: 'phase-mcu-hardware-interface',
            name: 'Microcontroller Hardware Interface',
            tasks: [
              {
                id: 'task-gpio-architecture',
                name: 'GPIO Hardware Architecture',
                conceptId: 'gpio-hardware-architecture',
                visualId: 'gpio-buffer',
                time: 40,
                difficulty: 'medium',
                subtasks: [
                  { id: 'sub-gpio-pushpull-opendrain', name: 'Push-pull vs Open-drain output stages', completed: false },
                  { id: 'sub-gpio-schmitt-trigger', name: 'Input hysteresis and Schmitt triggers', completed: false },
                  { id: 'sub-gpio-isr-latency', name: 'Interrupt service routine latency', completed: false }
                ]
              }
            ]
          },
          {
            id: 'phase-circuit-dynamics',
            name: 'Circuit Dynamics & Energy Storage',
            tasks: [
              {
                id: 'task-resistors-ohm',
                name: "Resistors & Ohm's Law",
                conceptId: 'resistors-ohms-law',
                visualId: 'ohms-law',
                time: 25,
                difficulty: 'easy',
                subtasks: [
                  { id: 'sub-resistors-linearity', name: 'Voltage vs current linearity (I = V/R)', completed: false },
                  { id: 'sub-resistors-predict-current', name: 'Predict current drop as resistance scales', completed: false },
                  { id: 'sub-resistors-power-dissipation', name: 'Thermal power dissipation in resistive loads', completed: false }
                ]
              },
              {
                id: 'task-capacitors-rc',
                name: 'Capacitors & RC Dynamics',
                conceptId: 'capacitors-rc-dynamics',
                visualId: 'rc-charging',
                time: 30,
                difficulty: 'medium',
                subtasks: [
                  { id: 'sub-capacitors-energy-store', name: 'Understand how a capacitor stores and releases energy', completed: false },
                  { id: 'sub-capacitors-charge-separation', name: 'Charge separation across dielectric plates', completed: false },
                  { id: 'sub-capacitors-rc-constant', name: 'RC time constant (tau = R x C) and 63.2% rise time', completed: false },
                  { id: 'sub-capacitors-stored-energy', name: 'Calculate energy stored in electrostatic field', completed: false }
                ]
              },
              {
                id: 'task-inductors-magnetic',
                name: 'Inductors & Magnetic Storage',
                conceptId: 'inductors-magnetic-storage',
                time: 35,
                difficulty: 'hard',
                subtasks: [
                  { id: 'sub-inductors-flux-faraday', name: 'Magnetic flux lines and Faraday induction', completed: false },
                  { id: 'sub-inductors-back-emf', name: 'Back-EMF and flyback suppression diode', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'systems-software',
    name: 'Systems Programming & Architecture',
    tagline: 'Low-level execution, deterministic memory, and concurrent pipelines.',
    subjects: [
      {
        id: 'subject-systems-architecture',
        name: 'Systems Architecture',
        phases: [
          {
            id: 'phase-memory-model',
            name: 'Memory Model & Pointer Semantics',
            tasks: [
              {
                id: 'task-memory-layout',
                name: 'Memory Layout & Lifetime',
                conceptId: 'memory-layout-lifetime',
                visualId: 'memory-model',
                time: 35,
                difficulty: 'medium',
                subtasks: [
                  { id: 'sub-mem-stack-vs-heap', name: 'Virtual address space layout: stack vs heap', completed: false },
                  { id: 'sub-mem-pointer-deref', name: 'Pointer dereferencing without memory safety net', completed: false },
                  { id: 'sub-mem-alignment-cache', name: 'Alignment, padding and cacheline efficiency', completed: false }
                ]
              }
            ]
          },
          {
            id: 'phase-concurrent-execution',
            name: 'Concurrent State Execution',
            tasks: [
              {
                id: 'task-concurrency-primitives',
                name: 'Synchronization Primitives',
                conceptId: 'synchronization-primitives',
                visualId: 'concurrency-cas',
                time: 45,
                difficulty: 'hard',
                subtasks: [
                  { id: 'sub-sync-race-conditions', name: 'Race conditions and memory barriers', completed: false },
                  { id: 'sub-sync-mutex-spinlock-cas', name: 'Mutex vs Spinlock vs Lock-free atomic compare-exchange', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
