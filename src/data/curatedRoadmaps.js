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
        name: 'Electronics',
        phases: [
          {
            name: 'Semiconductor Foundations',
            tasks: [
              {
                name: 'Diode Mechanics',
                time: 30,
                difficulty: 'medium',
                subtasks: [
                  { name: 'P-N junction forward & reverse bias', completed: true },
                  { name: 'Zener breakdown and voltage regulation', completed: true },
                  { name: 'Diode clipping and clamping circuits', completed: false }
                ]
              }
            ]
          },
          {
            name: 'Transistor Switching',
            tasks: [
              {
                name: 'BJT Cutoff & Saturation',
                time: 38,
                difficulty: 'hard',
                subtasks: [
                  { name: 'Biasing fundamentals and load line analysis', completed: true },
                  { name: 'Why does Q1 turn on?', completed: false },
                  { name: 'Calculate base resistor for complete saturation', completed: false }
                ]
              },
              {
                name: 'Switching Circuit Design',
                time: 45,
                difficulty: 'hard',
                subtasks: [
                  { name: 'Flyback diode protection for inductive loads', completed: false },
                  { name: 'Driver stage rise and fall time optimization', completed: false }
                ]
              }
            ]
          },
          {
            name: 'Microcontroller Hardware Interface',
            tasks: [
              {
                name: 'GPIO Hardware Architecture',
                time: 40,
                difficulty: 'medium',
                subtasks: [
                  { name: 'Push-pull vs Open-drain output stages', completed: false },
                  { name: 'Input hysteresis and Schmitt triggers', completed: false },
                  { name: 'Interrupt service routine latency', completed: false }
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
        name: 'Systems Architecture',
        phases: [
          {
            name: 'Memory Model & Pointer Semantics',
            tasks: [
              {
                name: 'Memory Layout & Lifetime',
                time: 35,
                difficulty: 'medium',
                subtasks: [
                  { name: 'Virtual address space layout: stack vs heap', completed: true },
                  { name: 'Pointer dereferencing without memory safety net', completed: false },
                  { name: 'Alignment, padding and cacheline efficiency', completed: false }
                ]
              }
            ]
          },
          {
            name: 'Concurrent State Execution',
            tasks: [
              {
                name: 'Synchronization Primitives',
                time: 45,
                difficulty: 'hard',
                subtasks: [
                  { name: 'Race conditions and memory barriers', completed: false },
                  { name: 'Mutex vs Spinlock vs Lock-free atomic compare-exchange', completed: false }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
