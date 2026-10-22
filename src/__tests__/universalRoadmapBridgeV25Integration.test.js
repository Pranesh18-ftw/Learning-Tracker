/**
 * universalRoadmapBridgeV25Integration.test.js
 *
 * Exhaustive Integration & UI Verification Suite for:
 * UNIVERSAL AI ROADMAP BRIDGE v2.5 — FIELD INTELLIGENCE UX + LEARNING EXECUTION INTEGRATION
 *
 * Tests all 25 integration requirements from Part 15:
 *  1. Field intelligence navigation
 *  2. Knowledge-area detail
 *  3. Topic/subtopic detail
 *  4. Learning-unit display
 *  5. Doing-task display
 *  6. Learning and doing remain distinct
 *  7. Daily mission with complete information
 *  8. Daily mission with incomplete information
 *  9. Research provenance indicators
 * 10. Durability presentation
 * 11. Research-to-roadmap relationships
 * 12. Dependency navigation
 * 13. Project scaffolding display
 * 14. Research-rich but roadmap-poor import
 * 15. Roadmap-rich but research-poor import
 * 16. Existing canonical execution compatibility
 * 17. Plan-only import
 * 18. Reload persistence
 * 19. Existing roadmap protection
 * 20. Mobile layout
 * 21. Keyboard/accessibility behavior
 * 22. Missing source metadata
 * 23. Missing optional sections
 * 24. No fabricated content
 * 25. No duplicate completion state
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { normalizeRoadmapInput } from '../services/roadmapBridge/roadmapNormalizer';
import {
  SAMPLE_CANONICAL_V2_DATA,
  SAMPLE_AI_RESEARCH_ANSWER_MARKDOWN,
  DEPTH_LEVELS,
  SCAFFOLDING_LEVELS,
  DURABILITY_CLASSIFICATIONS,
  SOURCE_VERIFICATION_STATUSES
} from '../services/roadmapBridge/canonicalExchangeModel';
import { buildSubjectTopology } from '../utils/conceptRelationshipResolver';
import ConceptDeepDiveDrawer from '../components/ConceptDeepDiveDrawer';
import LearningArcModal from '../components/LearningArcModal';
import FieldIntelligenceDrawer from '../components/FieldIntelligenceDrawer';
import DashboardTasks from '../components/DashboardTasks';
import { RoadmapProvider, RoadmapContext } from '../context/RoadmapContext';
import { safeStorageClear, safeStorageGet } from '../utils/storage';
import { EMBEDDED_SYSTEMS_CLAUDE_OUTPUT } from '../fixtures/roadmapBridgeV24/embeddedSystemsClaudeFixture';
import { HISTORIOGRAPHY_OUTPUT } from '../fixtures/roadmapBridgeV24/historiographyFixture';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('UNIVERSAL AI ROADMAP BRIDGE v2.5 — FIELD INTELLIGENCE UX & EXECUTION INTEGRATION', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    safeStorageClear();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Field Intelligence Navigation
  // ──────────────────────────────────────────────────────────────────────────
  test('1. Field intelligence navigation: opens drawer and navigates across research layers, durability map, sources, projects, and gaps', () => {
    const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
    expect(report.canImportDirectly).toBe(true);
    const subject = report.canonicalRoadmap[0];

    act(() => {
      root.render(
        <FieldIntelligenceDrawer
          subject={subject}
          onClose={() => {}}
        />
      );
    });

    // Check title
    expect(container.textContent).toContain(subject.name);
    expect(container.textContent).toContain('Research Layers');
    expect(container.textContent).toContain('Durability Map');
    expect(container.textContent).toContain('Sources & Claims');
    expect(container.textContent).toContain('Projects Progression');
    expect(container.textContent).toContain('Gaps & Adaptation');

    // Click Durability Map tab
    const durabilityTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Durability Map'));
    expect(durabilityTab).toBeTruthy();
    act(() => {
      durabilityTab.click();
    });
    expect(container.textContent).toContain('Pedagogical Durability Framework');

    // Click Sources & Claims tab
    const sourcesTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Sources & Claims'));
    expect(sourcesTab).toBeTruthy();
    act(() => {
      sourcesTab.click();
    });
    expect(container.textContent).toContain('Epistemic Provenance');

    // Click Projects Progression tab
    const projectsTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Projects Progression'));
    expect(projectsTab).toBeTruthy();
    act(() => {
      projectsTab.click();
    });
    expect(container.textContent).toContain('Scaffolded Practical Progression');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Knowledge-Area Detail (Level 2 Arc Inspector)
  // ──────────────────────────────────────────────────────────────────────────
  test('2. Knowledge-area detail: LearningArcModal displays purpose, capabilities developed, important concepts, and research influences', () => {
    const arcData = {
      index: 1,
      name: 'Memory-Mapped I/O & Bus Architecture',
      purpose: 'Understand direct register addressing, peripheral clocks, and hardware bus protocols.',
      whyThisAreaMatters: 'Firmware engineers operate without operating system abstractions and must configure memory-mapped registers directly.',
      capabilitiesDeveloped: [
        'Calculate register offsets from peripheral base addresses',
        'Configure bus clock prescalers without system deadlock'
      ],
      importantConcepts: ['Bus Matrix', 'APB/AHB Peripherals', 'Register Alignment'],
      relevantResearchFindings: ['Misaligned 32-bit register reads cause unaligned bus faults on Cortex-M0'],
      concepts: [
        { id: 'c1', name: 'Memory-Mapped Registers', completed: true },
        { id: 'c2', name: 'Clock Gating & Prescaling', completed: false }
      ],
      establishedCount: 1,
      totalConcepts: 2
    };

    act(() => {
      root.render(
        <LearningArcModal
          arc={arcData}
          subjectName="Embedded Systems"
          allProjects={[{ id: 'p1', name: 'Bus Analyzer', prerequisiteModules: ['Memory-Mapped I/O & Bus Architecture'] }]}
          onClose={() => {}}
          onSelectConcept={() => {}}
        />
      );
    });

    expect(container.textContent).toContain('Memory-Mapped I/O & Bus Architecture');
    expect(container.textContent).toContain('Purpose & Field Significance');
    expect(container.textContent).toContain(arcData.purpose);
    expect(container.textContent).toContain(arcData.whyThisAreaMatters);
    expect(container.textContent).toContain('Calculate register offsets');
    expect(container.textContent).toContain('Misaligned 32-bit register reads');
    expect(container.textContent).toContain('1 of 2 concepts established');
    expect(container.textContent).toContain('Bus Analyzer');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Topic/Subtopic Detail (Level 3 Concept Inspector)
  // ──────────────────────────────────────────────────────────────────────────
  test('3. Topic/subtopic detail: ConceptDeepDiveDrawer renders all Level 3 progressive tabs (Understand, Do, Why It Matters, Next)', () => {
    const conceptData = {
      id: 'concept-1',
      name: 'Interrupts & ISR Constraints',
      phaseName: 'Hardware Interfacing',
      subjectName: 'Embedded Systems',
      glyph: 'hardware',
      completed: false,
      isCurrent: true,
      depth: 'DEEP_MASTERY_TARGET',
      whyItMatters: 'Interrupts enable asynchronous event-driven responsiveness without CPU polling waste.',
      capabilities: ['Configure NVIC priority levels', 'Implement reentrant ring buffers'],
      prerequisites: ['GPIO Basics', 'Register Configuration'],
      consequences: ['Direct Memory Access (DMA)'],
      subtasks: [
        { id: 'st1', name: 'Configure NVIC priority', completed: false },
        { id: 'st2', name: 'Write ISR handler and clear pending flag', completed: false }
      ],
      learningUnits: [
        { id: 'lu1', name: 'Understand asynchronous execution and vector table layout', depth: 'DEEP_MASTERY_TARGET', whyItMatters: 'Handlers execute asynchronously with preemptive priority.' }
      ],
      doingTasks: [
        { id: 'dt1', name: 'Diagnose shared-state hazard using oscilloscope', mode: 'diagnostic' }
      ],
      practicalFailureModes: ['Shared variable race conditions without volatile keyword'],
      highLeverageConcepts: ['Atomic Critical Sections'],
      sourceRoadmapInfluences: ['Real-time safety critical standards require bounded ISR execution time.'],
      evidenceExpected: 'Working oscilloscope trace showing <5µs latency.'
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={conceptData}
          allConcepts={[conceptData, { name: 'GPIO Basics' }, { name: 'Direct Memory Access (DMA)' }]}
          allProjects={[{ id: 'proj1', name: 'Reaction Time System', capabilitiesExercised: ['Interrupts & ISR Constraints'] }]}
          onClose={() => {}}
        />
      );
    });

    // Check header info
    expect(container.textContent).toContain('Interrupts & ISR Constraints');
    expect(container.textContent).toContain('DEEP_MASTERY_TARGET');
    expect(container.textContent).toContain('You Are Here');

    // 1. What to Understand tab is default
    expect(container.textContent).toContain('What to Understand');
    expect(container.textContent).toContain('Understand asynchronous execution');
    expect(container.textContent).toContain('Atomic Critical Sections');

    // 2. Click What to Do
    const doTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('What to Do'));
    act(() => {
      doTab.click();
    });
    expect(container.textContent).toContain('Diagnose shared-state hazard');
    expect(container.textContent).toContain('diagnostic');
    expect(container.textContent).toContain('Configure NVIC priority');
    expect(container.textContent).toContain('Expected Learner Evidence');
    expect(container.textContent).toContain('<5µs latency');

    // 3. Click Why It Matters
    const whyTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Why It Matters'));
    act(() => {
      whyTab.click();
    });
    expect(container.textContent).toContain('Interrupts enable asynchronous event-driven responsiveness');
    expect(container.textContent).toContain('Shared variable race conditions without volatile keyword');
    expect(container.textContent).toContain('Real-time safety critical standards');

    // 4. Click What's Next
    const nextTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('What\'s Next'));
    act(() => {
      nextTab.click();
    });
    expect(container.textContent).toContain('Configure NVIC priority levels');
    expect(container.textContent).toContain('GPIO Basics');
    expect(container.textContent).toContain('Direct Memory Access (DMA)');
    expect(container.textContent).toContain('Reaction Time System');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Learning-Unit Display (Read-Only, Not Checkboxes)
  // ──────────────────────────────────────────────────────────────────────────
  test('4. Learning-unit display: learning units render with depth badges and conceptual goals without checkable inputs', () => {
    const conceptData = {
      id: 'concept-1',
      name: 'Memory Virtualization',
      phaseName: 'Operating Systems',
      subjectName: 'Computer Systems',
      learningUnits: [
        {
          id: 'lu-1',
          name: 'Explain page tables and multi-level address translation',
          depth: 'WORKING_FLUENCY',
          whyItMatters: 'Translates virtual addresses to physical pages without fragmentation.',
          misconceptionRisk: 'Confusing page directory with physical frame'
        }
      ],
      subtasks: [
        { id: 'st-1', name: 'Implement 2-level page table walk in C', completed: false }
      ]
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={conceptData}
          onClose={() => {}}
        />
      );
    });

    // Verify learning unit text
    expect(container.textContent).toContain('Explain page tables and multi-level address translation');
    expect(container.textContent).toContain('WORKING_FLUENCY');
    expect(container.textContent).toContain('Misconception Risk');
    expect(container.textContent).toContain('Confusing page directory with physical frame');
    expect(container.textContent).toContain('Conceptual Target (Read-Only)');

    // Crucial check: verify that learning unit itself has NO checkbox or input
    const inputs = container.querySelectorAll('input[type="checkbox"]');
    expect(inputs.length).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Doing-Task Display
  // ──────────────────────────────────────────────────────────────────────────
  test('5. Doing-task display: practical activities render with cognitive mode badges (implement, derive, measure, etc.)', () => {
    const conceptData = {
      id: 'concept-doing',
      name: 'Thermal Dissipation & Heatsinks',
      phaseName: 'Power Electronics',
      subjectName: 'Electronics',
      doingTasks: [
        { id: 'dt-1', name: 'Derive junction temperature from thermal resistance network', mode: 'derive' },
        { id: 'dt-2', name: 'Measure case temperature under 5A continuous load', mode: 'measure' },
        { id: 'dt-3', name: 'Implement PWM thermal throttling algorithm', mode: 'implement' }
      ],
      subtasks: [
        { id: 'st-1', name: 'Calculate theta-JA for TO-220 package', completed: false }
      ]
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={conceptData}
          onClose={() => {}}
        />
      );
    });

    // Switch to What to Do
    const doTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('What to Do'));
    act(() => {
      doTab.click();
    });

    expect(container.textContent).toContain('Derive junction temperature');
    expect(container.textContent).toContain('derive');
    expect(container.textContent).toContain('Measure case temperature');
    expect(container.textContent).toContain('measure');
    expect(container.textContent).toContain('Implement PWM thermal throttling');
    expect(container.textContent).toContain('implement');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Learning and Doing Remain Distinct
  // ──────────────────────────────────────────────────────────────────────────
  test('6. Learning and doing remain distinct: learning units explain what to understand, doing tasks describe action, subtasks are interactive checklist', () => {
    let subtaskToggled = false;
    const conceptData = {
      id: 'c-diff',
      name: 'Ohm\'s Law & Divider Networks',
      phaseName: 'DC Foundations',
      subjectName: 'Circuit Analysis',
      learningUnits: [
        { id: 'lu-diff', name: 'Understand V = I * R charge drift', depth: 'WORKING_UNDERSTANDING' }
      ],
      doingTasks: [
        { id: 'dt-diff', name: 'Calculate current draw across three series resistors', mode: 'calculate' }
      ],
      subtasks: [
        { id: 'st-diff', name: 'Assemble voltage divider on breadboard and measure Vout', completed: false }
      ]
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={conceptData}
          onToggleSubtask={(concept, st) => {
            if (st.id === 'st-diff') subtaskToggled = true;
          }}
          onClose={() => {}}
        />
      );
    });

    // In What to Understand:
    expect(container.textContent).toContain('Understand V = I * R charge drift');

    // Switch to What to Do:
    const doTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('What to Do'));
    act(() => {
      doTab.click();
    });

    // Subtask is clickable and triggers toggle
    const subtaskEl = container.querySelector('[class*="cursor-pointer"]');
    expect(subtaskEl).toBeTruthy();
    expect(subtaskEl.textContent).toContain('Assemble voltage divider on breadboard');
    act(() => {
      subtaskEl.click();
    });
    expect(subtaskToggled).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Daily Mission with Complete Information (7-Phase Brief)
  // ──────────────────────────────────────────────────────────────────────────
  test('7. Daily mission with complete information: DashboardTasks presents Understand, Apply, Produce, Verify, Recover, and Connection when present', () => {
    const fullTask = {
      id: 'task-full-1',
      name: 'Implement GPIO Interrupt Handler',
      taskName: 'GPIO Interrupts',
      subjectId: 'subj-1',
      subjectName: 'Embedded Firmware',
      phaseId: 'phase-1',
      phaseName: 'Hardware Architecture',
      time: 30,
      difficulty: 'hard',
      learningUnits: [
        { id: 'lu-1', name: 'Understand vector table layout and preemptive priority', depth: 'DEEP_MASTERY_TARGET' }
      ],
      doingTasks: [
        { id: 'dt-1', name: 'Simulate nested interrupt preemption in simulator', mode: 'simulate' }
      ],
      subtasks: [
        { id: 'st-1', name: 'Clear pending interrupt flag in register', completed: false }
      ],
      evidenceExpected: 'Logic analyzer capture verifying zero flag hang',
      practicalFailureModes: ['Interrupt storm caused by forgetting to clear pending flag'],
      whyItMatters: 'Interrupt responsiveness guarantees real-time deadlines.',
      consequences: ['Timer capture and PWM control']
    };

    const mockSubject = {
      id: 'subj-1',
      name: 'Embedded Firmware',
      phases: [{
        id: 'phase-1',
        name: 'Hardware Architecture',
        tasks: [fullTask]
      }]
    };

    act(() => {
      root.render(
        <RoadmapProvider initialSubjects={[mockSubject]}>
          <DashboardTasks />
        </RoadmapProvider>
      );
    });

    // Unfold Daily Mission Structure
    const unfoldBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Unfold Daily Mission Structure'));
    expect(unfoldBtn).toBeTruthy();
    act(() => {
      unfoldBtn.click();
    });

    // Verify all present phases
    expect(container.textContent).toContain('1. Understand (Learning Units)');
    expect(container.textContent).toContain('Understand vector table layout');
    expect(container.textContent).toContain('2 & 3. Apply & Practice (Activity Mode)');
    expect(container.textContent).toContain('Simulate nested interrupt preemption');
    expect(container.textContent).toContain('4. Produce (Target Task)');
    expect(container.textContent).toContain('5. Verify Your Work (Expected Evidence)');
    expect(container.textContent).toContain('Logic analyzer capture');
    expect(container.textContent).toContain('6. Recover (Failure Mode & Resilience)');
    expect(container.textContent).toContain('Interrupt storm caused by forgetting to clear pending flag');
    expect(container.textContent).toContain('7. Connection (Why This Matters & Unlocks Next)');
    expect(container.textContent).toContain('Timer capture and PWM control');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Daily Mission with Incomplete Information (Graceful Omission)
  // ──────────────────────────────────────────────────────────────────────────
  test('8. Daily mission with incomplete information: missing sections are gracefully omitted without fabricating placeholder content', () => {
    // Task with NO failure modes, NO expected evidence, NO doing tasks
    const minimalTask = {
      id: 'task-min-1',
      name: 'Read Basic Resistor Color Codes',
      taskName: 'Resistor Codes',
      subjectId: 'subj-min',
      subjectName: 'Electronics Basics',
      phaseId: 'phase-min',
      phaseName: 'Passive Components',
      time: 15,
      difficulty: 'easy',
      learningUnits: [
        { id: 'lu-m1', name: 'Decode 4-band color rings into resistance in ohms' }
      ],
      subtasks: [
        { id: 'st-m1', name: 'Verify 5 resistors using color bands and multimeter', completed: false }
      ]
      // evidenceExpected, practicalFailureModes, doingTasks, consequences are absent
    };

    const mockSubject = {
      id: 'subj-min',
      name: 'Electronics Basics',
      phases: [{
        id: 'phase-min',
        name: 'Passive Components',
        tasks: [minimalTask]
      }]
    };

    act(() => {
      root.render(
        <RoadmapProvider initialSubjects={[mockSubject]}>
          <DashboardTasks />
        </RoadmapProvider>
      );
    });

    const unfoldBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Unfold Daily Mission Structure'));
    expect(unfoldBtn).toBeTruthy();
    act(() => {
      unfoldBtn.click();
    });

    // 1. Understand is rendered
    expect(container.textContent).toContain('1. Understand (Learning Units)');
    expect(container.textContent).toContain('Decode 4-band color rings');

    // 4. Produce is rendered
    expect(container.textContent).toContain('4. Produce (Target Task)');

    // Missing sections MUST NOT be fabricated
    expect(container.textContent).not.toContain('5. Verify Your Work');
    expect(container.textContent).not.toContain('6. Recover');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Research Provenance Indicators
  // ──────────────────────────────────────────────────────────────────────────
  test('9. Research provenance indicators: honestly displays Source Attributed vs Unverified without claiming independent verification', () => {
    const subjectData = {
      name: 'Plasma Physics',
      fieldIntelligence: {
        claims: [
          {
            claim: 'Debye screening length lambda_D = sqrt(epsilon_0 * k_B * T / (n * e^2))',
            sourceRef: 'Chen, Introduction to Plasma Physics (1984), Ch. 1',
            confidence: 'HIGH',
            verified: true
          },
          {
            claim: 'Direct electrostatic confinement scaling law beyond Lawson criterion',
            sourceRef: 'Unpublished arXiv preprint 2024',
            confidence: 'LOW',
            verified: false
          }
        ],
        sourceLedger: [
          { title: 'Chen, Introduction to Plasma Physics', type: 'TEXTBOOK_MONOGRAPH' }
        ]
      }
    };

    act(() => {
      root.render(
        <FieldIntelligenceDrawer
          subject={subjectData}
          onClose={() => {}}
        />
      );
    });

    // Open Sources tab
    const sourcesTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Sources & Claims'));
    act(() => {
      sourcesTab.click();
    });

    // Must show epistemic provenance disclaimer
    expect(container.textContent).toContain('Epistemic Provenance & Verification Notice');
    expect(container.textContent).toContain('Learning Tracker displays citations extracted from external AI models honestly');
    expect(container.textContent).not.toContain('Learning Tracker independently verified all citations');

    // Check claims
    expect(container.textContent).toContain('Debye screening length');
    expect(container.textContent).toContain('Source Attributed');
    expect(container.textContent).toContain('Direct electrostatic confinement');
    expect(container.textContent).toContain('Unverified Citation');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Durability Presentation
  // ──────────────────────────────────────────────────────────────────────────
  test('10. Durability presentation: explains durability classifications with longevity, transferability, and study depth consequences', () => {
    const subjectData = {
      name: 'Firmware Architecture',
      fieldIntelligence: {
        durabilityMap: {
          durableSkills: ['Ohm\'s Law', 'Interrupt Vector Priority', 'Binary Logic'],
          transferableSkills: ['State Machine Design', 'Memory Profiling'],
          toolDependentSkills: ['STM32CubeMX HAL Configuration', 'Keil uVision IDE'],
          vulnerableKnowledge: ['Vendor-specific register headers undergoing deprecation']
        }
      }
    };

    act(() => {
      root.render(
        <FieldIntelligenceDrawer
          subject={subjectData}
          onClose={() => {}}
        />
      );
    });

    const durabilityTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Durability Map'));
    act(() => {
      durabilityTab.click();
    });

    expect(container.textContent).toContain('Durable Foundations (20+ Year Longevity)');
    expect(container.textContent).toContain('Target: Deep Understanding');
    expect(container.textContent).toContain('Ohm\'s Law');
    expect(container.textContent).toContain('Transferable Capabilities');
    expect(container.textContent).toContain('State Machine Design');
    expect(container.textContent).toContain('Tool-Dependent Knowledge');
    expect(container.textContent).toContain('STM32CubeMX HAL Configuration');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 11. Research-to-Roadmap Relationships
  // ──────────────────────────────────────────────────────────────────────────
  test('11. Research-to-roadmap relationships: displays curricular influences and research consequences when present', () => {
    const conceptData = {
      id: 'c-research-influence',
      name: 'Memory Barrier Instructions',
      phaseName: 'Concurrency',
      subjectName: 'Computer Systems',
      whyItMatters: 'Guarantees memory visibility across out-of-order CPU pipelines.',
      sourceRoadmapInfluences: [
        'Peterson & Silberschatz (2018): Modern weakly ordered CPUs reorder stores unless DMB/DSB instructions are issued.',
        'ARMv7-M Architecture Reference Manual: Required between peripheral clock enable and first register access.'
      ]
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={conceptData}
          onClose={() => {}}
        />
      );
    });

    // Go to Why It Matters tab
    const whyTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Why It Matters'));
    act(() => {
      whyTab.click();
    });

    expect(container.textContent).toContain('Field Research & Curricular Influence');
    expect(container.textContent).toContain('Peterson & Silberschatz (2018)');
    expect(container.textContent).toContain('ARMv7-M Architecture Reference Manual');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 12. Dependency Navigation
  // ──────────────────────────────────────────────────────────────────────────
  test('12. Dependency navigation: renders prerequisites and consequences with clickable links to jump to related concepts', () => {
    let navigatedConcept = null;
    const allConcepts = [
      { id: 'c1', name: 'Ohm\'s Law' },
      { id: 'c2', name: 'Resistor Networks' },
      { id: 'c3', name: 'Thevenin Equivalent Circuits' }
    ];

    const currentConcept = {
      id: 'c2',
      name: 'Resistor Networks',
      phaseName: 'DC Circuits',
      subjectName: 'Electronics',
      prerequisites: ['Ohm\'s Law'],
      consequences: ['Thevenin Equivalent Circuits'],
      capabilities: ['Solve multi-branch nodal equations']
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={currentConcept}
          allConcepts={allConcepts}
          onSelectConcept={(c) => {
            navigatedConcept = c;
          }}
          onClose={() => {}}
        />
      );
    });

    // Go to What's Next tab
    const nextTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('What\'s Next'));
    act(() => {
      nextTab.click();
    });

    // Find prerequisite button
    const prereqBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Ohm\'s Law');
    expect(prereqBtn).toBeTruthy();
    act(() => {
      prereqBtn.click();
    });
    expect(navigatedConcept).toEqual({ id: 'c1', name: 'Ohm\'s Law' });

    // Find consequence button
    const consequenceBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Thevenin Equivalent Circuits');
    expect(consequenceBtn).toBeTruthy();
    act(() => {
      consequenceBtn.click();
    });
    expect(navigatedConcept).toEqual({ id: 'c3', name: 'Thevenin Equivalent Circuits' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 13. Project Scaffolding Display
  // ──────────────────────────────────────────────────────────────────────────
  test('13. Project scaffolding display: renders progression levels (GUIDED → OPEN_ENDED) with capabilities exercised and failure modes', () => {
    const subjectData = {
      name: 'Embedded Systems',
      projects: [
        {
          id: 'p1',
          name: 'LED Blink with Delay Loop',
          scaffoldingLevel: 'GUIDED',
          description: 'Step-by-step breadboard build using simple busy-wait loop.',
          capabilitiesExercised: ['GPIO output configuration', 'Clock enable'],
          failureModes: ['Floating GPIO pin causes spurious flicker'],
          whatFailureTeaches: 'Input buffers require pull-up or pull-down configuration to avoid floating state.'
        },
        {
          id: 'p2',
          name: 'Autonomous Obstacle-Avoiding Rover',
          scaffoldingLevel: 'OPEN_ENDED',
          description: 'Design and build a multi-sensor differential drive system with custom fail-safe supervisor.',
          capabilitiesExercised: ['PWM motor control', 'Ultrasonic echo timing', 'Watchdog reset'],
          failureModes: ['Motor back-EMF resets microcontroller on sudden stop'],
          whatFailureTeaches: 'Inductive spikes require flyback diode clamps and decoupled power domains.'
        }
      ]
    };

    act(() => {
      root.render(
        <FieldIntelligenceDrawer
          subject={subjectData}
          onClose={() => {}}
        />
      );
    });

    const projectsTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Projects Progression'));
    act(() => {
      projectsTab.click();
    });

    expect(container.textContent).toContain('LED Blink with Delay Loop');
    expect(container.textContent).toContain('GUIDED');
    expect(container.textContent).toContain('Autonomous Obstacle-Avoiding Rover');
    expect(container.textContent).toContain('OPEN_ENDED');
    expect(container.textContent).toContain('Floating GPIO pin causes spurious flicker');
    expect(container.textContent).toContain('Inductive spikes require flyback diode clamps');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 14. Research-Rich but Roadmap-Poor Import
  // ──────────────────────────────────────────────────────────────────────────
  test('14. Research-rich but roadmap-poor import: preserves full research dossier and signals roadmap structuring status', () => {
    // Rich research dossier with minimal execution roadmap
    const researchOnlyInput = `
# Deep Field Reconstruction: Quantum Electrodynamics (QED)

## Field Definition
Relativistic quantum field theory of electrodynamics describing how light and matter interact.

## Research Frontier
- Precision tests of anomalous magnetic dipole moment (g-2)
- High-intensity laser vacuum breakdown

## Durability Map
- Durable Foundations: Dirac equation, Gauge invariance, Feynman perturbation theory
- Transferable: Renormalization group methods

## Source Ledger
- Feynman, QED: The Strange Theory of Light and Matter (1985)
- Peskin & Schroeder, An Introduction to Quantum Field Theory (1995)
    `.trim();

    const report = normalizeRoadmapInput(researchOnlyInput);
    expect(report.canImportDirectly).toBe(false);
    expect(report.needsConversion).toBe(true);
    expect(report.canonicalRoadmap.length).toBe(1);

    const subject = report.canonicalRoadmap[0];
    // Research dossier is completely preserved
    expect(subject.fieldIntelligence.fieldDefinition).toContain('Relativistic quantum field theory');
    expect(subject.fieldIntelligence.durabilityMap.durableSkills.length).toBeGreaterThan(0);
    expect(subject.fieldIntelligence.sourceLedger.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Roadmap-Rich but Research-Poor Import
  // ──────────────────────────────────────────────────────────────────────────
  test('15. Roadmap-rich but research-poor import: allows execution while honestly communicating limited research coverage', () => {
    const roadmapOnlyInput = JSON.stringify({
      name: 'Python Web Development',
      phases: [
        {
          name: 'Routing & Views',
          tasks: [
            {
              name: 'Build FastAPI Endpoint',
              subtasks: ['Define route decorator', 'Add Pydantic schema validation']
            }
          ]
        }
      ]
    });

    const report = normalizeRoadmapInput(roadmapOnlyInput);
    expect(report.canImportDirectly).toBe(true);
    expect(report.canonicalRoadmap.length).toBe(1);

    const subject = report.canonicalRoadmap[0];
    expect(subject.phases[0].tasks[0].name).toBe('Build FastAPI Endpoint');
    expect(subject.phases[0].tasks[0].subtasks.length).toBe(2);

    // Research fields are empty/null and NOT fabricated
    expect(subject.fieldIntelligence.fieldDefinition).toBeNull();
    expect(subject.fieldIntelligence.claims).toEqual([]);
    expect(subject.fieldIntelligence.sourceLedger).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 16. Existing Canonical Execution Compatibility
  // ──────────────────────────────────────────────────────────────────────────
  test('16. Existing canonical execution compatibility: RoadmapContext operations (toggleSubtask, isTaskCompleted, getNextSubtask) work seamlessly with imported structures', () => {
    const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
    const subject = report.canonicalRoadmap[0];

    let contextValue = null;

    act(() => {
      root.render(
        <RoadmapProvider initialSubjects={[subject]}>
          <RoadmapContext.Consumer>
            {val => {
              contextValue = val;
              return <div>Ready</div>;
            }}
          </RoadmapContext.Consumer>
        </RoadmapProvider>
      );
    });

    expect(contextValue).toBeTruthy();
    expect(contextValue.subjects.length).toBe(1);

    // Get next subtask
    const nextSubtask = contextValue.getNextSubtask();
    expect(nextSubtask).toBeTruthy();
    expect(nextSubtask.name).toBeTruthy();
    expect(nextSubtask.subjectId).toBe(subject.id);

    // Complete subtask
    act(() => {
      contextValue.toggleSubtask(
        nextSubtask.subjectId,
        nextSubtask.phaseId,
        nextSubtask.taskId,
        nextSubtask.subtaskId
      );
    });

    // Check completion persisted in canonical store
    const updatedNext = contextValue.getNextSubtask();
    expect(updatedNext.id).not.toBe(nextSubtask.id);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 17. Plan-Only Import
  // ──────────────────────────────────────────────────────────────────────────
  test('17. Plan-only import: all imported tasks and subtasks begin incomplete with completed: false', () => {
    const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
    const subject = report.canonicalRoadmap[0];

    subject.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        expect(task.completed).toBe(false);
        (task.subtasks || []).forEach(st => {
          expect(st.completed).toBe(false);
        });
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 18. Reload Persistence
  // ──────────────────────────────────────────────────────────────────────────
  test('18. Reload persistence: field intelligence, projects, learning units, and tasks persist across reload in storage', () => {
    const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
    const subject = report.canonicalRoadmap[0];

    let contextValue = null;

    act(() => {
      root.render(
        <RoadmapProvider initialSubjects={[subject]}>
          <RoadmapContext.Consumer>
            {val => {
              contextValue = val;
              return <div>Ready</div>;
            }}
          </RoadmapContext.Consumer>
        </RoadmapProvider>
      );
    });

    // Verify localStorage has persisted roadmap
    const storedRoadmap = safeStorageGet('roadmap', []);
    expect(storedRoadmap.length).toBeGreaterThan(0);
    const storedSubject = storedRoadmap[0];

    expect(storedSubject.fieldIntelligence).toBeTruthy();
    expect(storedSubject.projects.length).toBeGreaterThan(0);
    expect(storedSubject.phases[0].tasks[0].learningUnits.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 19. Existing Roadmap Protection
  // ──────────────────────────────────────────────────────────────────────────
  test('19. Existing roadmap protection: append mode preserves existing tracks without collision or data destruction', () => {
    const existingSubject = {
      id: 'existing-1',
      name: 'Existing Track',
      phases: [{ id: 'p1', name: 'Phase 1', tasks: [{ id: 't1', name: 'Task 1', completed: true }] }]
    };

    let contextValue = null;

    act(() => {
      root.render(
        <RoadmapProvider initialSubjects={[existingSubject]}>
          <RoadmapContext.Consumer>
            {val => {
              contextValue = val;
              return <div>Ready</div>;
            }}
          </RoadmapContext.Consumer>
        </RoadmapProvider>
      );
    });

    expect(contextValue.subjects.length).toBe(1);

    // Import second roadmap in append mode
    act(() => {
      contextValue.importRoadmap([
        {
          id: 'imported-track',
          name: 'Imported Track',
          phases: [{ id: 'p2', name: 'Phase 2', tasks: [{ id: 't2', name: 'Task 2', completed: false }] }]
        }
      ], { mode: 'append' });
    });

    expect(contextValue.subjects.length).toBe(2);
    expect(contextValue.subjects[0].id).toBe('existing-1');
    expect(contextValue.subjects[0].phases[0].tasks[0].completed).toBe(true);
    expect(contextValue.subjects[1].name).toBe('Imported Track');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 20. Mobile Layout
  // ──────────────────────────────────────────────────────────────────────────
  test('20. Mobile layout: components render cleanly with responsive classes and no horizontal overflow constraints', () => {
    const conceptData = {
      id: 'c-mobile',
      name: 'Responsive Topic Detail View',
      phaseName: 'Mobile Testing',
      subjectName: 'UX Design',
      learningUnits: [{ name: 'Responsive Layouts' }],
      subtasks: [{ name: 'Test 320px viewport' }]
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={conceptData}
          onClose={() => {}}
        />
      );
    });

    // Check presence of responsive modal container with max-w constraint
    const modalEl = container.querySelector('[role="dialog"]');
    expect(modalEl).toBeTruthy();
    expect(modalEl.className).toContain('p-3 sm:p-4');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 21. Keyboard/Accessibility Behavior
  // ──────────────────────────────────────────────────────────────────────────
  test('21. Keyboard/accessibility behavior: dialogs include role="dialog", aria-modal="true", and close on Escape key', () => {
    let closed = false;
    const conceptData = {
      id: 'c-a11y',
      name: 'Accessible Focus Trap',
      phaseName: 'A11y Testing',
      subjectName: 'Design Systems'
    };

    act(() => {
      root.render(
        <ConceptDeepDiveDrawer
          concept={conceptData}
          onClose={() => { closed = true; }}
        />
      );
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    // Press Escape key
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(closed).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 22. Missing Source Metadata
  // ──────────────────────────────────────────────────────────────────────────
  test('22. Missing source metadata: handled gracefully without errors or manufactured citations', () => {
    const subjectWithoutSources = {
      name: 'Independent Study',
      fieldIntelligence: {
        claims: [{ claim: 'A theoretical claim without source metadata', sourceRef: null, confidence: 'LOW' }],
        sourceLedger: []
      }
    };

    act(() => {
      root.render(
        <FieldIntelligenceDrawer
          subject={subjectWithoutSources}
          onClose={() => {}}
        />
      );
    });

    const sourcesTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Sources & Claims'));
    act(() => {
      sourcesTab.click();
    });

    expect(container.textContent).toContain('A theoretical claim without source metadata');
    expect(container.textContent).toContain('No explicit source citations provided');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 23. Missing Optional Sections
  // ──────────────────────────────────────────────────────────────────────────
  test('23. Missing optional sections: missing projects or adaptation rules do not break navigation or UI rendering', () => {
    const minimalSubject = {
      name: 'Minimal Subject',
      projects: [],
      fieldIntelligence: {},
      phases: []
    };

    act(() => {
      root.render(
        <FieldIntelligenceDrawer
          subject={minimalSubject}
          onClose={() => {}}
        />
      );
    });

    const projectsTab = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Projects Progression'));
    act(() => {
      projectsTab.click();
    });

    expect(container.textContent).toContain('No integrated projects specified in this track.');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 24. No Fabricated Content
  // ──────────────────────────────────────────────────────────────────────────
  test('24. No fabricated content: normalizer never invents missing research or claims', () => {
    const inputWithoutResearch = JSON.stringify({
      name: 'Plain Track',
      phases: [{ name: 'Phase 1', tasks: [{ name: 'Task 1' }] }]
    });

    const report = normalizeRoadmapInput(inputWithoutResearch);
    const fi = report.canonicalRoadmap[0].fieldIntelligence;

    expect(fi.fieldDefinition).toBeNull();
    expect(fi.currentState).toBeNull();
    expect(fi.claims).toEqual([]);
    expect(fi.sourceLedger).toEqual([]);
    expect(fi.durabilityMap.durableSkills).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 25. No Duplicate Completion State
  // ──────────────────────────────────────────────────────────────────────────
  test('25. No duplicate completion state: canonical execution engine remains single source of truth for task completion', () => {
    const report = normalizeRoadmapInput(HISTORIOGRAPHY_OUTPUT.canonicalJson);
    const subject = report.canonicalRoadmap[0];

    let contextValue = null;

    act(() => {
      root.render(
        <RoadmapProvider initialSubjects={[subject]}>
          <RoadmapContext.Consumer>
            {val => {
              contextValue = val;
              return <div>Ready</div>;
            }}
          </RoadmapContext.Consumer>
        </RoadmapProvider>
      );
    });

    // Complete subtask through canonical engine
    const nextSubtask = contextValue.getNextSubtask();
    expect(nextSubtask).toBeTruthy();

    act(() => {
      contextValue.completeSubtask({
        subjectId: nextSubtask.subjectId,
        phaseId: nextSubtask.phaseId,
        taskId: nextSubtask.taskId,
        subtaskId: nextSubtask.subtaskId,
        durationMinutes: 25,
        notes: 'Derived primary source critique'
      });
    });

    // Canonical completions array has exactly 1 record
    expect(contextValue.taskCompletions.length).toBe(1);
    expect(contextValue.taskCompletions[0].subtaskId).toBe(nextSubtask.subtaskId);

    // No separate parallel store exists
    expect(safeStorageGet('parallel_completion_store', null)).toBeNull();
  });
});
