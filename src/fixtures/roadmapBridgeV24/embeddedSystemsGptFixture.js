/**
 * embeddedSystemsGptFixture.js
 *
 * Realistic External AI Output (GPT-4o / Gemini Pro format) for:
 * Domain A: Embedded Systems Firmware Engineering
 *
 * Tests Requirement 8 (Provider Difference Test):
 * Same learning goal as Claude fixture, but with distinct external AI structure:
 * - Architectural focus: RISC-V Privileged Spec & Zephyr RTOS Kconfig/DeviceTree
 * - Different modular decomposition, distinct sources, and unique project milestones
 * - Demonstrates that the normalizer preserves genuinely different perspectives.
 */

export const EMBEDDED_SYSTEMS_GPT_OUTPUT = {
  rawResponse: `# Comprehensive Embedded Firmware Architecture Roadmap
## Provider: GPT-4o / Advanced Architecture Mode
## Focus: RISC-V & Zephyr RTOS Industrial Ecosystem

### 1. Discipline Demarcation
Embedded firmware engineering resides at the strict interface of silicon register microarchitectures and real-time algorithmic execution. Unlike general software engineering, the primary resources are physical time (microseconds), electrical power (microamps), and silicon memory (kilobytes).

### 2. Historical Arc & Core Literature
- Waterman, A. & Asanović, K. "The RISC-V Instruction Set Manual: Volume II: Privileged Architecture" (RISC-V International, 2021) [SRC-GPT-01]
- Ganssle, J. "The Art of Designing Embedded Systems" (Newnes, 2008) [SRC-GPT-02]
- Barr Group "Embedded C Coding Standard" (Barr Group, 2018) [SRC-GPT-03]
- Zephyr Project "Zephyr RTOS Architecture and DeviceTree Specification" (Linux Foundation, 2023) [SRC-GPT-04]

### 3. Foundational Competencies & Architecture
- Privileged processor modes (Machine Mode M-mode vs User Mode U-mode in RISC-V)
- Control and Status Registers (CSRs: mstatus, mie, mtvec, mepc)
- Zephyr RTOS DeviceTree hardware abstraction model vs direct vendor CMSIS headers
- Power domain management (Run, Sleep, Deep Sleep, Stop mode with SRAM retention)

### 4. Failure Modes & Trap Diagnostics
- Hard fault exception unrolling from stack corruption
- Bus fault triggered by unaligned memory access on strict architectures
- Watchdog timer starvation under high-frequency asynchronous external interrupts
- DeviceTree pinmux conflicts causing electrical contention on shared GPIOs
`,
  canonicalJson: {
    schemaVersion: '2.3.0',
    learnerContext: {
      goal: 'Embedded Systems Firmware Engineering',
      targetDestination: 'Senior Firmware Engineer proficient in RISC-V privileged architecture, Zephyr RTOS, and low-power hardware-software integration.',
      currentLevel: 'INTERMEDIATE',
      purpose: 'CAREER_MASTERY'
    },
    fieldIntelligence: {
      fieldDefinition: 'Low-level software development directly on microcontrollers with emphasis on deterministic hardware scheduling, power optimization, and multi-mode architecture.',
      historicalLineage: [
        { era: '1980s', milestone: 'Intel 8051 and Motorola 68HC11 dominance with manual assembly and memory bank switching.' },
        { era: '2010', milestone: 'RISC-V open standard architecture developed at UC Berkeley, providing open privileged specifications.' },
        { era: '2016-Present', milestone: 'Zephyr RTOS established by the Linux Foundation as an open, vendor-neutral RTOS with modern build toolchains.' }
      ],
      foundationalIdeas: [
        'RISC-V Machine Mode and Trap Handling',
        'Declarative Hardware Description via DeviceTree',
        'Stateful Power State Transitions and Sleep Latency',
        'Hardware Watchdogs and Resilient Recovery Loops'
      ],
      currentState: 'Coexistence of proprietary ARM ecosystems and rapidly growing open RISC-V microcontrollers running modern RTOS stacks.',
      researchFrontier: [
        { topic: 'Hardware-enforced capability architectures (CHERI) in microcontrollers', status: 'EMERGING' },
        { topic: 'Energy harvesting intermittent computing algorithms', status: 'ACTIVE' }
      ],
      openProblems: [
        'Eliminating vendor-lock-in through standardized open-source HAL layers',
        'Asymmetric multiprocessing synchronization across heterogeneous cores without shared memory cache controllers'
      ],
      durabilityMap: {
        durableSkills: ['Computer architecture fundamentals', 'Assembly trap dispatching', 'Bus protocol analysis (I2C/SPI/UART)', 'C bit-manipulation'],
        transferableSkills: ['DeviceTree syntax', 'Kconfig build modularity', 'Power profiling'],
        toolDependentSkills: ['West command line tools', 'Vendor proprietary flasher utilities'],
        commoditizingSkills: ['Standard Arduino wrapper library usage'],
        vulnerableKnowledge: ['8-bit microchip assembly without C abstractions']
      },
      whatStandardRoadmapWouldMiss: [
        'RISC-V CSR register manipulation (csrr, csrw, csrs)',
        'DeviceTree overlay compilation and hardware bindings verification',
        'Power consumption profiling with shunt resistor and current sense amplifier',
        'HardFault trap register disassembly inspection'
      ],
      highLeverageConcepts: [
        'Atomic read-clear-set CSR instructions in RISC-V',
        'DeviceTree overlay binding resolution during compile time',
        'Windowed watchdog timers to prevent runaway loops'
      ],
      bridgeConcepts: [
        'Electrical voltage level shifting vs software push-pull / open-drain pin configuration',
        'Asynchronous event queues bridging interrupt contexts to cooperative threads'
      ],
      practicalFailureModes: [
        'Unbalanced interrupt enable/disable calls in nested critical sections',
        'Forgetting pull-up resistors causing floating I2C bus lines',
        'Brownout reset triggered by inrush current during radio transmission bursts'
      ],
      sourceLedger: [
        {
          id: 'SRC-GPT-01',
          title: 'The RISC-V Instruction Set Manual: Volume II: Privileged Architecture',
          authors: ['Andrew Waterman', 'Krste Asanović'],
          year: 2021,
          type: 'PROFESSIONAL_STANDARD',
          recency: 'CURRENT',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-GPT-02',
          title: 'The Art of Designing Embedded Systems',
          authors: ['Jack Ganssle'],
          year: 2008,
          type: 'LANDMARK_WORK',
          recency: 'ESTABLISHED',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-GPT-03',
          title: 'Embedded C Coding Standard',
          authors: ['Barr Group'],
          year: 2018,
          type: 'PROFESSIONAL_STANDARD',
          recency: 'CURRENT',
          verificationStatus: 'SOURCE_VERIFIED'
        },
        {
          id: 'SRC-GPT-04',
          title: 'Zephyr RTOS Architecture and DeviceTree Specification',
          authors: ['Zephyr Project'],
          year: 2023,
          type: 'OFFICIAL_DOCUMENTATION',
          recency: 'RECENT',
          verificationStatus: 'SOURCE_VERIFIED'
        }
      ],
      claims: [
        {
          claim: 'RISC-V Machine Mode trap vectors must handle both asynchronous external interrupts and synchronous software traps through the mtvec register.',
          sourceId: 'SRC-GPT-01',
          confidence: 'HIGH'
        },
        {
          claim: 'DeviceTree allows separation of board-level hardware descriptions from compiled driver logic, enabling portable firmware across microcontroller families.',
          sourceId: 'SRC-GPT-04',
          confidence: 'HIGH'
        }
      ],
      roadmapInfluences: [
        {
          finding: 'Open-standard RISC-V microarchitectures require explicit understanding of CSR register mechanics rather than vendor-supplied header macros.',
          whyItMatters: 'Allows firmware engineers to write universal trap handlers and custom peripheral drivers on any RISC-V core.',
          roadmapConsequence: 'Dedicated Arc on RISC-V Privileged Architecture and CSR Assembly manipulation.',
          learningDepth: 'WORKING_FLUENCY',
          taskDesign: 'Implement trap vector in assembly reading mcause and mepc registers.',
          projectConsequence: 'Project 1 targets bare-metal RISC-V trap dispatcher.'
        }
      ]
    },
    learningArcs: [
      {
        id: 'ARC-GPT-01',
        title: 'RISC-V Privileged Architecture & Bare-Metal Machine Mode',
        description: 'Explore RISC-V assembly, Control and Status Registers (CSRs), trap handling, and bare-metal peripheral drivers.',
        modules: [
          {
            id: 'MOD-GPT-01',
            title: 'Control and Status Registers (CSRs) & Trap Vectors',
            learningUnits: [
              {
                title: 'RISC-V CSR Instructions (csrr, csrw, csrs, csrc)',
                depth: 'WORKING_FLUENCY',
                description: 'Direct assembly manipulation of processor state and interrupt masks.'
              }
            ],
            doingTasks: [
              {
                title: 'Write RISC-V Machine-Mode Trap Dispatcher',
                mode: 'implement',
                subtasks: [
                  { title: 'Configure mtvec register with base address of assembly trap vector' },
                  { title: 'Decode mcause register to separate synchronous faults from external interrupts' },
                  { title: 'Return from trap using mret instruction with restored registers' }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ARC-GPT-02',
        title: 'Zephyr RTOS & DeviceTree Driver Architecture',
        description: 'Modern vendor-neutral embedded development using Zephyr RTOS, Kconfig configuration, and DeviceTree overlays.',
        modules: [
          {
            id: 'MOD-GPT-02',
            title: 'DeviceTree Hardware Bindings & Peripheral Driver Writing',
            learningUnits: [
              {
                title: 'Zephyr DeviceTree Node Structure & Phandle References',
                depth: 'WORKING_FLUENCY',
                description: 'Declarative pin control and peripheral address assignment in DeviceTree.'
              }
            ],
            doingTasks: [
              {
                title: 'Create Out-of-Tree Custom Sensor Driver for Zephyr',
                mode: 'implement',
                subtasks: [
                  { title: 'Define YAML binding specification for custom I2C temperature sensor' },
                  { title: 'Write DeviceTree overlay mapping sensor to hardware I2C bus pins' },
                  { title: 'Implement sensor_driver_api struct functions (sample_fetch, channel_get)' }
                ]
              }
            ]
          }
        ]
      }
    ],
    projects: [
      {
        id: 'PRJ-GPT-01',
        title: 'RISC-V Bare-Metal Cooperative Kernel with Assembly Trap Handling',
        scaffolding: 'GUIDED',
        description: 'Build a bare-metal runtime on a RISC-V emulator or silicon board that initializes hardware, handles timer interrupts, and dispatches tasks.',
        capabilitiesExercised: ['RISC-V assembly', 'CSR register configuration', 'Linker script memory mapping'],
        failureModesEncountered: ['Trap loop caused by unhandled exception during trap handler execution'],
        evidenceProduced: 'UART trace showing clean trap dispatch and timer scheduling.'
      },
      {
        id: 'PRJ-GPT-02',
        title: 'Ultra-Low-Power Sensor Beacon with Zephyr RTOS & Power Management',
        scaffolding: 'OPEN_ENDED',
        description: 'Architect a battery-powered telemetry node that sleeps in sub-microamp mode and wakes via RTC interrupt to broadcast sensor readings.',
        capabilitiesExercised: ['Zephyr PM subsystem', 'DeviceTree low-power pin states', 'Current measurement profiling'],
        failureModesEncountered: ['Floating GPIO pins consuming hundreds of microamps in sleep state'],
        evidenceProduced: 'Current probe oscillogram confirming under 5 microamps average current draw.'
      }
    ]
  }
};
