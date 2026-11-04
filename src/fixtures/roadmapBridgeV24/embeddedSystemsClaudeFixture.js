/**
 * embeddedSystemsClaudeFixture.js
 *
 * Realistic External AI Output (Claude 3.7 / Opus format) for:
 * Domain A: Embedded Systems Firmware Engineering
 *
 * Demonstrates:
 * - Full 15-phase research reconstruction
 * - 6 Evidence layers with authentic sources and citations
 * - Explicit Research Influences that reshape the roadmap
 * - Genuine Learning Units vs Doing Tasks separation
 * - Concrete failure modes, bridge concepts, and scaffolded projects
 */

export const EMBEDDED_SYSTEMS_CLAUDE_OUTPUT = {
  rawResponse: `# UNIVERSAL DEEP RESEARCH DOSSIER & ROADMAP
## Domain: Embedded Systems Firmware Engineering
## Provider: Claude 3.7 Sonnet / Research Engine
## Timestamp: 2026-10-09

### PHASE 1 — FIELD RECONSTRUCTION
Embedded Systems Firmware Engineering is the discipline of architecting, implementing, and formally validating deterministic software executed directly upon resource-constrained microcontrollers without relying on general-purpose OS abstractions.
- **Boundaries**: Strictly differentiated from embedded Linux/POSIX application programming; firmware directly controls hardware timing, register transitions, interrupt latency, and memory topologies.
- **Taxonomy**:
  1. Bare-Metal Concurrency & Register Abstraction
  2. Real-Time Operating Systems (RTOS) & Schedulers
  3. Memory Models, Caches & DMA Coherency
  4. Fault Handling, Diagnostics & Safety-Critical Engineering

### PHASE 2 — HISTORICAL & INTELLECTUAL LINEAGE
- **Seminal Origins**: Maurice Wilkes (microprogramming, 1951); Jack Ganssle (firmware engineering practices, 1990s); ARM Cortex-M architecture transition (2004).
- **Seminal Works**:
  - Ganssle, J. "The Firmware Handbook" (Newnes, 2004) [SRC-001]
  - Sha, L., Rajkumar, R., & Lehoczky, J. P. "Priority Inheritance Protocols: An Approach to Real-Time Synchronization" (IEEE Trans. Computers, 1990) [SRC-002]
  - ARM Ltd. "ARMv7-M Architecture Reference Manual" [SRC-003]
  - Klein, G. et al. "seL4: Formal Verification of an OS-kernel" (ACM SOSP, 2009) [SRC-004]
  - MISRA "Guidelines for the use of the C language in critical systems" (MISRA C:2012) [SRC-005]

### PHASE 3 — KNOWLEDGE & COMPETENCY MAP
- **High-Leverage Concepts**: Volatile semantics and memory-mapped I/O compiler reordering barriers; NVIC tail-chaining and interrupt late-arrival mechanics; Direct Memory Access (DMA) ring buffers with cache invalidate/clean operations.
- **Bridge Concepts**: Hardware-software co-verification using logic analyzers and SWO trace; state machine formalization (hierarchical state machines / QP framework).
- **Practical Failure Modes**: Priority inversion causing unbounded lockouts (e.g., Mars Pathfinder failure mode); stack overflow undetected due to missing MPU guard bands; race conditions between ISRs and main thread over non-atomic 32-bit words on 8/16/32-bit registers.

### PHASE 4 — CURRENT STATE OF THE FIELD
- **Standard Practice**: ARM Cortex-M4/M33 and RISC-V 32-bit cores dominate industrial and IoT applications. FreeRTOS remains the de facto lightweight RTOS; Zephyr RTOS rapidly expanding in connected IoT.
- **Verification Standards**: Static analysis using MISRA-C checkers, Clang-Tidy, and unit testing on host with Ceedling/Unity or Renode emulation.

### PHASE 5 — RESEARCH FRONTIER
- **Active Research**: Formal microkernel verification applied to embedded microcontrollers (seL4 ports to RISC-V/ARM); Rust for embedded systems with compile-time memory safety guarantees (embedded-hal, embassy); hardware root-of-trust (RoT) side-channel resistance against differential power analysis (DPA).

### PHASE 6 — FIELD TRAJECTORY & DURABILITY MAP
- **Durable Foundations**: C pointer arithmetic, binary arithmetic, memory maps, interrupt latency mechanics, register bitwise manipulation, Nyquist-Shannon sampling implications in ADCs.
- **Transferable Capabilities**: State-machine architecture, scheduler theory, RTOS synchronization primitives, protocol packetization.
- **Tool-Dependent & Commoditizing**: Vendor-specific GUI configuration wizards (e.g., STM32CubeMX graphical clickers); proprietary closed-source IDE configurations.
- **Declining Practices**: Unbounded super-loops (bare while(1) polling loops without state machine rigor or low-power sleep transitions); raw malloc() in embedded production firmware.

### RESEARCH INFLUENCES ON ROADMAP
1. **Finding [INF-001]**: Cache coherency hazards on ARM Cortex-M7 with DMA buffers.
   - *Consequence*: Added mandatory DMA cache maintenance subtasks (DMB/DSB instruction injection, SCB_CleanDCache) in Module 2.3.
2. **Finding [INF-002]**: Priority inversion unbounded delay in mutex synchronization.
   - *Consequence*: Enforced Priority Ceiling Protocol (PCP) implementation and a dedicated diagnostic lab simulating the Mars Pathfinder glitch.
3. **Finding [INF-003]**: Interrupt latency jitter from unoptimized ISRs.
   - *Consequence*: Replaced generic timer lessons with cycle-accurate oscilloscope GPIO toggling measurements and NVIC tail-chaining trace analysis.
4. **Finding [INF-004]**: Dynamic memory heap non-determinism.
   - *Consequence*: Strict two-tier memory policy: block allocation (TLSF) and static memory pools required across all modules.
5. **Finding [INF-005]**: Formal verification & Rust memory safety trend.
   - *Consequence*: Added Capstone track on Memory Protection Unit (MPU) sandboxing and memory-safe design patterns.
`,
  canonicalJson: {
    schemaVersion: '2.3.0',
    learnerContext: {
      goal: 'Embedded Systems Firmware Engineering',
      targetDestination: 'Senior Firmware Engineer capable of architecting bare-metal, RTOS, low-power, and secure embedded firmware for production ARM Cortex-M microcontrollers.',
      currentLevel: 'INTERMEDIATE',
      purpose: 'CAREER_MASTERY'
    },
    fieldIntelligence: {
      fieldDefinition: 'Engineering of deterministic, resource-constrained bare-metal and RTOS firmware interfacing directly with physical hardware registers.',
      historicalLineage: [
        { era: '1970s-1990s', milestone: 'Transition from assembly microcode to C for embedded microcontrollers; Jack Ganssle firmware reliability foundation.' },
        { era: '2004', milestone: 'ARM Cortex-M core release introducing unified NVIC, SysTick, and standardized CMSIS register definitions.' },
        { era: '2009-Present', milestone: 'Formal verification (seL4) and introduction of zero-cost safety abstractions in bare-metal systems.' }
      ],
      foundationalIdeas: [
        'Memory-mapped I/O and compiler memory barriers',
        'Interrupt service routines and preemptive hardware arbitration',
        'Deterministic execution timing and real-time schedulability',
        'Direct Memory Access (DMA) and zero-copy peripheral transfers'
      ],
      currentState: 'Predominance of 32-bit Cortex-M and RISC-V cores running FreeRTOS or Zephyr with MISRA-C compliance.',
      researchFrontier: [
        { topic: 'Formally verified microkernels on embedded silicon', status: 'ACTIVE' },
        { topic: 'Embedded Rust concurrency without runtime garbage collection', status: 'EMERGING' },
        { topic: 'Side-channel attack mitigation on Cortex-M cryptoprocessors', status: 'ACTIVE' }
      ],
      openProblems: [
        'Deterministic real-time scheduling on heterogeneous multicore microcontrollers (Cortex-M4 + Cortex-M0+)',
        'Zero-trust firmware updates over untrusted mesh radio networks with rollback immunity'
      ],
      durabilityMap: {
        durableSkills: ['Register-level memory manipulation', 'Interrupt handling and priority grouping', 'State machine design', 'Logic analyzer bus decoding'],
        transferableSkills: ['RTOS synchronization primitives', 'Communication protocol design', 'Fault isolation strategies'],
        toolDependentSkills: ['Vendor graphical code generation tools', 'Specific proprietary IDE toolchains'],
        commoditizingSkills: ['Basic GPIO toggling', 'Vendor boilerplate setup'],
        vulnerableKnowledge: ['Raw superloop polling without power optimization', 'Unbounded malloc() usage']
      },
      whatStandardRoadmapWouldMiss: [
        'Cache coherency and DMA bus-master synchronization barriers',
        'NVIC tail-chaining and interrupt late-arrival cycle timing',
        'Unbounded priority inversion reproduced via logic analyzer',
        'Memory Protection Unit (MPU) sub-region stack guard fault containment'
      ],
      highLeverageConcepts: [
        'Compiler barriers (asm volatile("" ::: "memory")) vs hardware pipeline memory barriers (DMB, DSB, ISB)',
        'Atomic bit-banding and exclusive load-store instructions (LDREX/STREX)',
        'Zero-copy circular ring buffers with single-producer single-consumer lock-free semantics'
      ],
      bridgeConcepts: [
        'Digital signal timing to software state transitions (Nyquist theorem applied to ADC sampling jitter)',
        'Hardware bus protocol analysis (I2C clock stretching, SPI phase/polarity polarity mismatch debugging)'
      ],
      practicalFailureModes: [
        'Missing volatile keyword causing aggressive compiler loop optimization',
        'Priority inversion causing deadlock or watchdog resets',
        'DMA buffer overwritten by CPU cache writeback during transmission',
        'Stack-heap collision corrupting peripheral control structures'
      ],
      sourceLedger: [
        {
          id: 'SRC-001',
          title: 'The Firmware Handbook',
          authors: ['Jack Ganssle'],
          year: 2004,
          type: 'LANDMARK_WORK',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-002',
          title: 'Priority Inheritance Protocols: An Approach to Real-Time Synchronization',
          authors: ['L. Sha', 'R. Rajkumar', 'J. P. Lehoczky'],
          year: 1990,
          type: 'PRIMARY_RESEARCH',
          recency: 'HISTORICAL',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-003',
          title: 'ARMv7-M Architecture Reference Manual',
          authors: ['ARM Ltd.'],
          year: 2018,
          type: 'OFFICIAL_DOCUMENTATION',
          recency: 'CURRENT',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-004',
          title: 'seL4: Formal Verification of an OS-kernel',
          authors: ['G. Klein et al.'],
          year: 2009,
          type: 'PRIMARY_RESEARCH',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-005',
          title: 'MISRA C:2012 Guidelines for the use of the C language in critical systems',
          authors: ['MISRA Consortium'],
          year: 2013,
          type: 'PROFESSIONAL_STANDARD',
          recency: 'CURRENT',
          verificationStatus: 'SOURCE_VERIFIED'
        }
      ],
      claims: [
        {
          claim: 'Cache incoherency during DMA transactions results in silent data corruption unless hardware memory barriers or CPU cache line invalidations are executed.',
          sourceId: 'SRC-003',
          confidence: 'HIGH'
        },
        {
          claim: 'Priority inheritance prevents unbounded priority inversion by dynamically boosting the priority of a low-priority task holding a mutex required by a high-priority task.',
          sourceId: 'SRC-002',
          confidence: 'HIGH'
        },
        {
          claim: 'Unbounded heap allocation in safety-critical firmware introduces fragmentation failure modes prohibited by modern aerospace and automotive standards.',
          sourceId: 'SRC-005',
          confidence: 'HIGH'
        }
      ],
      roadmapInfluences: [
        {
          finding: 'Cache coherency race hazards on ARM Cortex-M7 with DMA buffers',
          whyItMatters: 'Silent memory corruption occurs when CPU cache and DMA write to the same physical SRAM address.',
          roadmapConsequence: 'Inserted mandatory cache clean and invalidate operations in the DMA driver design module.',
          learningDepth: 'WORKING_FLUENCY',
          taskDesign: 'Task requires writing a zero-copy DMA driver with SCB_CleanDCache and SCB_InvalidateDCache calls verified on hardware.',
          projectConsequence: 'Project 1 requires DMA-based circular buffer telemetry verified via oscilloscope.'
        },
        {
          finding: 'Priority inversion caused the Mars Pathfinder spacecraft computer to reset repeatedly in 1997.',
          whyItMatters: 'Medium priority task starves high priority task when low priority task holds shared resource.',
          roadmapConsequence: 'Enforced Priority Ceiling Protocol and priority inheritance auditing in RTOS synchronization modules.',
          learningDepth: 'DEEP_MASTERY_TARGET',
          taskDesign: 'Diagnostic task to artificially induce priority inversion and measure scheduling delay with logic analyzer.',
          projectConsequence: 'Project 2 mandates priority inheritance enabled mutexes for multi-task sensor processing.'
        }
      ]
    },
    learningArcs: [
      {
        id: 'ARC-01',
        title: 'Bare-Metal Concurrency & Register-Level Hardware Interfacing',
        description: 'Direct register programming, memory-mapped I/O, compiler barriers, and hardware interrupt handling without an operating system.',
        modules: [
          {
            id: 'MOD-01',
            title: 'Memory-Mapped I/O, Volatile Semantics, and Compiler Barriers',
            learningUnits: [
              {
                title: 'Volatile Qualifier and Assembly Memory Ordering',
                depth: 'WORKING_FLUENCY',
                description: 'Understand how GCC/Clang reorders instructions and why volatile forces memory access on every iteration.'
              },
              {
                title: 'Data Memory Barriers (DMB, DSB, ISB) in Cortex-M',
                depth: 'DEEP_MASTERY_TARGET',
                description: 'Understand ARM pipeline flushes and memory bus serialization requirements.'
              }
            ],
            doingTasks: [
              {
                title: 'Implement Bare-Metal Peripheral Driver from Register Databook',
                mode: 'implement',
                subtasks: [
                  { title: 'Define peripheral struct with volatile uint32_t register offsets' },
                  { title: 'Configure RCC clock gating registers to energize peripheral bus' },
                  { title: 'Implement atomic read-modify-write bitmask operations without race conditions' }
                ]
              },
              {
                title: 'Reproduce Compiler Reordering Optimization Bug',
                mode: 'debug',
                subtasks: [
                  { title: 'Compile non-volatile loop at -O3 and inspect disassembled objdump' },
                  { title: 'Add volatile qualifier and DMB barrier and verify correct register read generation' }
                ]
              }
            ]
          },
          {
            id: 'MOD-02',
            title: 'NVIC Interrupt Latency, Preemption, and Tail-Chaining',
            learningUnits: [
              {
                title: 'ARM Cortex-M Nested Vectored Interrupt Controller (NVIC)',
                depth: 'WORKING_FLUENCY',
                description: 'Preemption priority vs sub-priority grouping and hardware stack-push mechanics.'
              }
            ],
            doingTasks: [
              {
                title: 'Measure ISR Latency and Tail-Chaining on Hardware Oscilloscope',
                mode: 'measure',
                subtasks: [
                  { title: 'Toggle GPIO pin on timer interrupt entry and measure latency delta' },
                  { title: 'Trigger simultaneous interrupts to observe hardware tail-chaining execution without pop-push overhead' }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ARC-02',
        title: 'RTOS Kernel Internals, Deterministic Scheduling, and Concurrency',
        description: 'Kernel design, context switching assembly, thread control blocks, and synchronization primitives.',
        modules: [
          {
            id: 'MOD-03',
            title: 'Preemptive Context Switching and PendSV Handler',
            learningUnits: [
              {
                title: 'Cortex-M Process Stack Pointer (PSP) vs Main Stack Pointer (MSP)',
                depth: 'DEEP_MASTERY_TARGET',
                description: 'Dual stack architecture and unprivileged execution mode separation.'
              }
            ],
            doingTasks: [
              {
                title: 'Implement Minimal Assembly PendSV Context Switcher',
                mode: 'implement',
                subtasks: [
                  { title: 'Save r4-r11 registers to task process stack pointer (PSP)' },
                  { title: 'Switch current Task Control Block (TCB) pointer in scheduler' },
                  { title: 'Restore registers and return using EXC_RETURN value 0xFFFFFFFD' }
                ]
              }
            ]
          },
          {
            id: 'MOD-04',
            title: 'Synchronization Hazards: Mutexes, Semaphores, and Priority Inversion',
            learningUnits: [
              {
                title: 'Priority Inheritance Protocol Mechanics (Sha et al.)',
                depth: 'WORKING_FLUENCY',
                description: 'Dynamic priority boosting to prevent medium-priority tasks from preempting mutex holders.'
              }
            ],
            doingTasks: [
              {
                title: 'Simulate Mars Pathfinder Priority Inversion Failure Mode',
                mode: 'diagnostic',
                subtasks: [
                  { title: 'Create Low, Medium, and High priority FreeRTOS tasks sharing a mutex' },
                  { title: 'Induce starvation of High-priority task with Medium task running continuously' },
                  { title: 'Enable configUSE_MUTEXES and priority inheritance to observe automatic resolution' }
                ]
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'PRJ-01',
        title: 'Zero-Copy DMA UART Driver with Lock-Free Circular Buffer',
        scaffolding: 'GUIDED',
        description: 'Build a production-grade asynchronous UART communication driver utilizing DMA ring-buffers and idle-line interrupt detection.',
        capabilitiesExercised: ['DMA channel configuration', 'Circular buffer index wrap math', 'Memory barrier placement', 'Interrupt service handling'],
        failureModesEncountered: ['DMA buffer overwrite before CPU process completes', 'Cache incoherency on Cortex-M7'],
        evidenceProduced: 'Scope captures showing zero CPU utilization during 115200 baud streaming and unit test suite passing in Unity.'
      },
      {
        id: 'PRJ-02',
        title: 'Preemptive Priority-Based RTOS Micro-Kernel on ARM Cortex-M',
        scaffolding: 'PARTIALLY_GUIDED',
        description: 'Implement a working real-time operating system kernel from scratch in C and assembly featuring priority scheduling, sleep timers, and mutexes.',
        capabilitiesExercised: ['ARM assembly context switching', 'SysTick interrupt time slicing', 'Priority ceiling mutex implementation'],
        failureModesEncountered: ['Stack alignment faults (8-byte AAPCS compliance)', 'HardFault on invalid EXC_RETURN'],
        evidenceProduced: 'Multi-threaded demo running 4 concurrent tasks toggling LEDs at precise frequencies with zero deadline misses.'
      },
      {
        id: 'PRJ-03',
        title: 'Secure Fault-Tolerant Cryptographic Telemetry Gateway with MPU Isolation',
        scaffolding: 'OPEN_ENDED',
        description: 'Architect a secure, production-grade connected firmware platform featuring dual-bank firmware updates, hardware cryptographic verification, and MPU task isolation.',
        capabilitiesExercised: ['MPU sub-region stack guard configuration', 'Dual-bank flash bootloader rollback', 'Watchdog window monitoring'],
        failureModesEncountered: ['Flash page erase latency blocking real-time loops', 'MemManage fault upon unauthorized SRAM access'],
        evidenceProduced: 'Automated test suite demonstrating intentional memory corruption trapped by MPU without kernel panic.'
      }
    ]
  }
};
