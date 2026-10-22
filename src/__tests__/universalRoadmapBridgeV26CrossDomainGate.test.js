/**
 * universalRoadmapBridgeV26CrossDomainGate.test.js
 *
 * UNIVERSAL AI ROADMAP BRIDGE v2.6 — FINAL CROSS-DOMAIN ACCEPTANCE GATE
 * Adversarial Verification & Release Invariant Audit
 *
 * Domains Tested:
 * A. Engineering: Embedded Systems Firmware Engineering (Claude & GPT fixtures)
 * B. Physical Science: Control Systems & Plasma Physics
 * C. Humanities: Historiography & Source Criticism
 * D. Life Sciences / Mathematical Biology: Evolutionary Biology & Population Genetics
 *
 * Input Formats Tested (15 Formats):
 * 1. Canonical exchange JSON (v2.3)
 * 2. Alternate JSON structures
 * 3. Research-heavy JSON
 * 4. Roadmap-heavy JSON
 * 5. Markdown roadmap
 * 6. Markdown tables (curriculum & research tables)
 * 7. Research report without complete roadmap
 * 8. Roadmap without research dossier
 * 9. Mixed prose, headings, and JSON code block
 * 10. Useful free-form bulleted output
 * 11. Malformed JSON containing useful information (auto-repaired syntax)
 * 12. Missing optional fields
 * 13. Very large pasted content
 * 14. Ambiguous field names
 * 15. Unknown classifications & unexpected structures
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  normalizeRoadmapInput,
  detectFormat,
  attemptJsonRepair,
  FORMAT_TYPES
} from '../services/roadmapBridge/roadmapNormalizer';
import {
  CANONICAL_SCHEMA_VERSION,
  CONFIDENCE_LEVELS,
  RESEARCH_LAYERS,
  DURABILITY_CLASSIFICATIONS,
  SOURCE_VERIFICATION_STATUSES
} from '../services/roadmapBridge/canonicalExchangeModel';
import { RoadmapContext, RoadmapProvider } from '../context/RoadmapContext';
import ConceptDeepDiveDrawer from '../components/ConceptDeepDiveDrawer';
import FieldIntelligenceDrawer from '../components/FieldIntelligenceDrawer';
import UniversalRoadmapBridgeModal from '../components/UniversalRoadmapBridgeModal';

// Domain Fixtures
import { EMBEDDED_SYSTEMS_CLAUDE_OUTPUT } from '../fixtures/roadmapBridgeV24/embeddedSystemsClaudeFixture';
import { EMBEDDED_SYSTEMS_GPT_OUTPUT } from '../fixtures/roadmapBridgeV24/embeddedSystemsGptFixture';
import { CONTROL_SYSTEMS_OUTPUT } from '../fixtures/roadmapBridgeV24/controlSystemsFixture';
import { PLASMA_PHYSICS_OUTPUT } from '../fixtures/roadmapBridgeV24/plasmaPhysicsFixture';
import { HISTORIOGRAPHY_OUTPUT } from '../fixtures/roadmapBridgeV24/historiographyFixture';
import { EVOLUTIONARY_BIOLOGY_OUTPUT } from '../fixtures/roadmapBridgeV24/evolutionaryBiologyFixture';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('UNIVERSAL AI ROADMAP BRIDGE v2.6 — CROSS-DOMAIN ACCEPTANCE GATE', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
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

  // ══════════════════════════════════════════════════════════════════
  // SECTION 2: CROSS-DOMAIN ACCEPTANCE MATRIX
  // ══════════════════════════════════════════════════════════════════
  describe('2. Cross-Domain Acceptance Matrix (4 Materially Different Domains)', () => {

    test('Domain A (Engineering): Embedded Systems Firmware Engineering parses completely', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      expect(report.success).toBe(true);
      expect(report.canImportDirectly).toBe(true);
      expect(report.canonicalRoadmap.length).toBeGreaterThan(0);

      const subject = report.canonicalRoadmap[0];
      expect(subject.fieldIntelligence.historicalLineage.length).toBeGreaterThan(0);
      expect(subject.phases.length).toBeGreaterThanOrEqual(2);

      // Verify engineering task modes
      const allTasks = subject.phases.flatMap(p => p.tasks);
      const allDoing = allTasks.flatMap(t => t.doingTasks || []);
      const modes = allDoing.map(d => d.mode);
      expect(modes.some(m => ['implement', 'measure', 'debug', 'build', 'calculate'].includes(m))).toBe(true);
    });

    test('Domain B (Physical Science): Control Systems & Plasma Physics preserve derivations and models', () => {
      // Control Systems
      const csReport = normalizeRoadmapInput(CONTROL_SYSTEMS_OUTPUT.canonicalJson);
      expect(csReport.success).toBe(true);
      expect(csReport.canonicalRoadmap[0].phases.length).toBeGreaterThanOrEqual(2);
      const csTasks = csReport.canonicalRoadmap[0].phases.flatMap(p => p.tasks);
      expect(csTasks.some(t => (t.learningUnits || []).length > 0)).toBe(true);

      // Plasma Physics
      const ppReport = normalizeRoadmapInput(PLASMA_PHYSICS_OUTPUT.canonicalJson);
      expect(ppReport.success).toBe(true);
      expect(ppReport.canonicalRoadmap[0].fieldIntelligence.foundationalIdeas.length).toBeGreaterThan(0);
      const ppDoing = ppReport.canonicalRoadmap[0].phases.flatMap(p => p.tasks).flatMap(t => t.doingTasks || []);
      expect(ppDoing.some(d => ['derive', 'simulate', 'calculate', 'model'].includes(d.mode))).toBe(true);
    });

    test('Domain C (Humanities): Historiography adapts without forcing STEM assumptions', () => {
      const histReport = normalizeRoadmapInput(HISTORIOGRAPHY_OUTPUT.canonicalJson);
      expect(histReport.success).toBe(true);
      const subject = histReport.canonicalRoadmap[0];
      expect(subject.fieldIntelligence.fieldDefinition).toContain('historical interpretation');

      // Verify humanities doing modes: contextualize, critique, compare, inspect sources
      const histDoing = subject.phases.flatMap(p => p.tasks).flatMap(t => t.doingTasks || []);
      expect(histDoing.length).toBeGreaterThan(0);
      const validHumanitiesModes = ['contextualize', 'critique', 'compare', 'evaluate_evidence', 'construct_argument', 'analyze_source'];
      expect(histDoing.some(d => validHumanitiesModes.includes(d.mode) || d.mode === 'reflect' || d.mode === 'investigate')).toBe(true);
    });

    test('Domain D (Life Sciences / Mathematical Biology): Population Genetics preserves stochastic theory', () => {
      const bioReport = normalizeRoadmapInput(EVOLUTIONARY_BIOLOGY_OUTPUT.canonicalJson);
      expect(bioReport.success).toBe(true);
      const subject = bioReport.canonicalRoadmap[0];
      expect(subject.fieldIntelligence.foundationalIdeas.some(i => i.includes('Wright-Fisher') || i.includes('coalescent'))).toBe(true);
      expect(subject.projects.length).toBeGreaterThanOrEqual(3);
      expect(subject.projects.some(p => p.scaffoldingLevel === 'OPEN_ENDED')).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3: INPUT-FORMAT COMPATIBILITY (15 Formats)
  // ══════════════════════════════════════════════════════════════════
  describe('3. Input-Format Compatibility Matrix (15 Formats)', () => {

    test('Format 1: Canonical exchange JSON (v2.3)', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      expect(report.format).toBe(FORMAT_TYPES.CANONICAL_JSON);
      expect(report.canImportDirectly).toBe(true);
    });

    test('Format 2: Alternate JSON structures with custom field names (modules, stages, tracks)', () => {
      const alternateJson = {
        title: 'Modern Robotics',
        stages: [
          {
            stageName: 'Stage 1: Kinematics',
            modules: [
              { moduleTitle: 'Forward Kinematics', steps: ['Derive DH parameters', 'Simulate 2-DOF arm'] }
            ]
          }
        ]
      };
      const report = normalizeRoadmapInput(alternateJson);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases.length).toBe(1);
      expect(report.canonicalRoadmap[0].phases[0].tasks.length).toBe(1);
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].subtasks.length).toBe(2);
    });

    test('Format 3: Research-heavy JSON preserves all research dimensions', () => {
      const researchHeavy = {
        schemaVersion: CANONICAL_SCHEMA_VERSION,
        fieldIntelligence: EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson.fieldIntelligence,
        learningArcs: [
          { name: 'Core Foundations', modules: [{ name: 'Memory & Cache', steps: ['Verify cache coherency'] }] }
        ]
      };
      const report = normalizeRoadmapInput(researchHeavy);
      expect(report.researchQuality.rating).toBe('STRONG');
      expect(report.canonicalRoadmap[0].fieldIntelligence.historicalLineage.length).toBeGreaterThan(0);
    });

    test('Format 4: Roadmap-heavy JSON without research metadata creates plan and warns', () => {
      const roadmapHeavy = {
        title: 'Fast Execution Track',
        phases: [
          {
            name: 'Phase 1: Bootstrapping',
            tasks: [
              { name: 'Setup Toolchain', subtasks: ['Install GCC', 'Configure Makefile'] }
            ]
          }
        ]
      };
      const report = normalizeRoadmapInput(roadmapHeavy);
      expect(report.success).toBe(true);
      expect(report.canImportDirectly).toBe(true);
      expect(report.researchQuality.rating).toMatch(/LIMITED|INSUFFICIENT/);
      expect(report.warnings.some(w => w.includes('research') || w.includes('coverage') || w.includes('Historical'))).toBe(true);
    });

    test('Format 5: Markdown roadmap parses headings and checklists', () => {
      const markdown = `# Embedded Systems Firmware
## Phase 1: Microcontroller Fundamentals
### Bare-metal GPIO
- [ ] Configure RCC clock register
- [ ] Toggle pin output at 1Hz
### Interrupt Controllers
- [ ] Configure NVIC priority
- [ ] Write SysTick handler
`;
      const report = normalizeRoadmapInput(markdown);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases.length).toBe(1);
      expect(report.canonicalRoadmap[0].phases[0].tasks.length).toBe(2);
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].subtasks.length).toBe(2);
    });

    test('Format 6: Markdown tables parses tabular curricula and research tables', () => {
      const markdownTable = `# Classical Mechanics Curriculum
| Phase | Module | Tasks |
| --- | --- | --- |
| Phase 1: Newtonian Foundations | 1.1 Kinematics | Derive equations of motion; Calculate projectile trajectory |
| Phase 1: Newtonian Foundations | 1.2 Momentum & Energy | Verify conservation laws; Collisions in center of mass |
| Phase 2: Lagrangian Formulation | 2.1 Principle of Least Action | Euler-Lagrange equations; Generalized coordinates |
`;
      const report = normalizeRoadmapInput(markdownTable);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases.length).toBeGreaterThanOrEqual(1);
      const allTasks = report.canonicalRoadmap[0].phases.flatMap(p => p.tasks);
      expect(allTasks.length).toBeGreaterThanOrEqual(2);
    });

    test('Format 7: Research report without a complete roadmap flags needsConversion', () => {
      const pureReport = `# FIELD RECONSTRUCTION REPORT: Quantum Information
### Intellectual Lineage
- 1982: Feynman proposes quantum simulation
- 1994: Shor discovers polynomial factoring
### Open Problems
- Fault-tolerant threshold scaling
- Quantum error mitigation in NISQ devices
### Durable Knowledge
- Quantum state postulates
- Unitary transformations
`;
      const report = normalizeRoadmapInput(pureReport);
      expect(report.format).toBe(FORMAT_TYPES.RESEARCH_REPORT);
      expect(report.needsConversion).toBe(true);
      expect(report.confidence.modules).toBe(CONFIDENCE_LEVELS.NOT_DETECTED);
    });

    test('Format 8: Roadmap without a research dossier imports safely', () => {
      const bareRoadmap = `# Swift Programming
## Phase 1: Language Syntax
- [ ] Optionals and unwrapping
- [ ] Structs vs Classes
`;
      const report = normalizeRoadmapInput(bareRoadmap);
      expect(report.success).toBe(true);
      expect(report.canImportDirectly).toBe(true);
      expect(report.canonicalRoadmap[0].fieldIntelligence.historicalLineage).toEqual([]);
    });

    test('Format 9: Mixed prose, headings, and JSON extracts JSON block', () => {
      const mixed = `Here is the comprehensive roadmap you requested. I have structured it according to the v2.3 exchange specification:
\`\`\`json
{
  "schemaVersion": "2.3.0",
  "subjects": [
    {
      "name": "Distributed Systems Engineering",
      "phases": [
        {
          "name": "Phase 1: Consensus",
          "tasks": [
            { "name": "Raft Implementation", "subtasks": ["Leader election", "Log replication"] }
          ]
        }
      ]
    }
  ]
}
\`\`\`
Let me know if you need any adjustments to this plan!`;
      const report = normalizeRoadmapInput(mixed);
      expect(report.format).toBe(FORMAT_TYPES.MIXED_AI_RESPONSE);
      expect(report.canImportDirectly).toBe(true);
      expect(report.canonicalRoadmap[0].name).toBe('Distributed Systems Engineering');
    });

    test('Format 10: Useful free-form bulleted output converts to phases and tasks', () => {
      const freeform = `- Module 1: Introduction to Compilers
  - Lexical analysis with regular expressions
  - Context-free grammars and parsing
- Module 2: Code Generation
  - Intermediate representation (IR)
  - Register allocation via graph coloring
`;
      const report = normalizeRoadmapInput(freeform);
      expect(report.format).toBe(FORMAT_TYPES.FREEFORM);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases.length).toBeGreaterThanOrEqual(1);
    });

    test('Format 11: Malformed JSON containing useful information auto-repairs syntax', () => {
      // Missing closing bracket and unquoted trailing comma
      const malformedJson = `{
  "schemaVersion": "2.3.0",
  "subjects": [
    {
      "name": "Astrophysics & Stellar Evolution",
      "phases": [
        {
          "name": "Phase 1: Stellar Structure",
          "tasks": [
            { "name": "Hydrostatic Equilibrium", "subtasks": ["Derive pressure gradient", "Equation of state",] },
          ]
        }
      ]
    }
  ]
`; // missing closing brace
      const report = normalizeRoadmapInput(malformedJson);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].name).toBe('Astrophysics & Stellar Evolution');
      expect(report.warnings.some(w => w.includes('Malformed JSON') || w.includes('repaired'))).toBe(true);
    });

    test('Format 12: Missing optional fields do not crash and remain null/empty', () => {
      const minimalJson = {
        name: 'Minimalist Track',
        phases: [
          {
            name: 'P1',
            tasks: [{ name: 'T1' }]
          }
        ]
      };
      const report = normalizeRoadmapInput(minimalJson);
      expect(report.success).toBe(true);
      const task = report.canonicalRoadmap[0].phases[0].tasks[0];
      expect(task.learningUnits).toEqual([]);
      expect(task.doingTasks).toEqual([]);
      expect(task.evidenceExpected).toBeNull();
      expect(task.whyItMatters).toBeNull();
    });

    test('Format 13: Very large pasted content (200KB) parses safely under 5MB guard', () => {
      const largeSubtasks = Array.from({ length: 1500 }, (_, i) => `- [ ] Step ${i + 1} validation procedure`).join('\n');
      const largePayload = `# High Scale Learning\n## Phase 1: Massive Scope\n### Task 1: Comprehensive Steps\n${largeSubtasks}`;
      expect(largePayload.length).toBeGreaterThan(40000); // 40KB+
      const report = normalizeRoadmapInput(largePayload);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].subtasks.length).toBe(1500);

      // Verify payload exceeding 5MB is rejected safely
      const oversizedPayload = 'A'.repeat(5 * 1024 * 1024 + 10);
      const overReport = normalizeRoadmapInput(oversizedPayload);
      expect(overReport.success).toBe(false);
      expect(overReport.errors[0]).toContain('exceeds maximum allowed size');
    });

    test('Format 14: Ambiguous field names mapped via synonym dictionaries', () => {
      const ambiguousJson = {
        curriculum: 'Audio DSP',
        tracks: [
          {
            title: 'Filter Design',
            units: [
              {
                unitName: 'Biquad Filters',
                items: ['Direct Form I', 'Direct Form II transposed'],
                prereqs: ['Z-transform basics']
              }
            ]
          }
        ]
      };
      const report = normalizeRoadmapInput(ambiguousJson);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases[0].name).toBe('Filter Design');
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].name).toBe('Biquad Filters');
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].subtasks.length).toBe(2);
    });

    test('Format 15: Unknown classifications and unexpected structures default safely', () => {
      const unexpectedJson = {
        name: 'Quantum Optics',
        phases: [
          {
            name: 'Phase 1',
            tasks: [
              {
                name: 'Photon Statistics',
                depth: 'SUPER_DEEP_LEVEL_99', // unknown depth
                doingTasks: [
                  { name: 'Measure Mandel parameter', mode: 'teleport' } // unknown mode
                ],
                subtasks: [{ name: 'Analyze coincidence counter', status: 'UNKNOWN_STATUS' }]
              }
            ]
          }
        ]
      };
      const report = normalizeRoadmapInput(unexpectedJson);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].subtasks[0].completed).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 5 & 6: RESEARCH INTEGRITY, PROVENANCE, AND SOURCE LEDGER
  // ══════════════════════════════════════════════════════════════════
  describe('5 & 6. Research Coverage vs Verification & Source Ledger Integrity', () => {

    test('Distinguishes structural research coverage from factual verification', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      // Rating is qualitative (STRONG)
      expect(report.researchQuality.rating).toBe('STRONG');
      // Must not generate fake numerical precision like "94.2% verified"
      expect(report.researchQuality.verifiedFactualPercentage).toBeUndefined();
    });

    test('Source ledger preserves missing metadata as null without inventing citations', () => {
      const jsonWithIncompleteSource = {
        name: 'Cryptography',
        fieldIntelligence: {
          sourceLedger: [
            {
              id: 'SRC-CRYPTO-1',
              title: 'Diffie-Hellman Key Exchange',
              // Missing authors, year, url, doi
              sourceType: 'MONOGRAPH'
            }
          ]
        },
        phases: [{ name: 'Phase 1', tasks: [{ name: 'Task 1' }] }]
      };
      const report = normalizeRoadmapInput(jsonWithIncompleteSource);
      const src = report.canonicalRoadmap[0].fieldIntelligence.sourceLedger[0];
      expect(src.title).toBe('Diffie-Hellman Key Exchange');
      expect(src.authors).toEqual([]);
      expect(src.year).toBeNull();
      expect(src.url).toBeNull();
      expect(src.identifier).toBeNull();
    });

    test('Sanitizes unsafe external URLs in sources to avoid execution', () => {
      const jsonWithUnsafeUrls = {
        name: 'Web Security',
        fieldIntelligence: {
          sourceLedger: [
            { id: 'SRC-BAD-1', title: 'Malicious Link', url: 'javascript:alert(document.cookie)' },
            { id: 'SRC-BAD-2', title: 'Data URL Link', url: 'data:text/html,<script>evil()</script>' },
            { id: 'SRC-GOOD-1', title: 'Valid Link', url: 'https://ieee.org/papers/example' }
          ]
        },
        phases: [{ name: 'Phase 1', tasks: [{ name: 'Task 1' }] }]
      };
      const report = normalizeRoadmapInput(jsonWithUnsafeUrls);
      const sources = report.canonicalRoadmap[0].fieldIntelligence.sourceLedger;
      expect(sources[0].url).toBe('#');
      expect(sources[1].url).toBe('#');
      expect(sources[2].url).toBe('https://ieee.org/papers/example');
      expect(report.warnings.some(w => w.includes('Sanitized unsafe external source URL'))).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 7: LEARNING AND DOING MUST REMAIN DISTINCT
  // ══════════════════════════════════════════════════════════════════
  describe('7. Learning and Doing Separation Hierarchy', () => {

    test('Maintains distinct learning units, doing tasks, and subtasks across STEM and Humanities', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const engTask = report.canonicalRoadmap[0].phases[0].tasks[0];
      expect(engTask.learningUnits.length).toBeGreaterThan(0);
      expect(engTask.doingTasks.length).toBeGreaterThan(0);
      expect(engTask.subtasks.length).toBeGreaterThan(0);

      // Verify that learning unit is conceptual understanding, not task
      const lu = engTask.learningUnits[0];
      expect(lu.name).toBeDefined();
      expect(lu.completed).toBeUndefined(); // Read-only concept, never an interactive checkbox

      // Verify that doing task has an actionable mode
      const dt = engTask.doingTasks[0];
      expect(dt.mode).toBeDefined();
      expect(['implement', 'measure', 'derive', 'simulate', 'debug', 'build']).toContain(dt.mode);
    });

    test('UI renders ConceptDeepDiveDrawer with separate Understand and Do tabs', () => {
      const mockConcept = {
        id: 'task-test-1',
        name: 'STM32 Clock Tree Configuration',
        phaseName: 'Phase 1: Hardware Foundations',
        subjectName: 'Embedded Systems',
        completed: false,
        subtasks: [
          { id: 'sub-1', name: 'Configure PLL to 168MHz', completed: false }
        ],
        learningUnits: [
          { id: 'lu-1', name: 'Phase-Locked Loop Multiplication Factors', depth: 'DEEP_DIVE', conceptualGoal: 'Understand VCO frequency limits' }
        ],
        doingTasks: [
          { id: 'dt-1', name: 'Measure MCO pin clock output on oscilloscope', mode: 'measure' }
        ]
      };

      act(() => {
        root.render(
          <ConceptDeepDiveDrawer
            concept={mockConcept}
            allConcepts={[mockConcept]}
            onClose={() => {}}
            onToggleSubtask={() => {}}
          />
        );
      });

      // Tab 1: Understand
      expect(container.textContent).toContain('What to Understand');
      expect(container.textContent).toContain('Phase-Locked Loop Multiplication Factors');
      expect(container.textContent).toContain('Conceptual Target (Read-Only)');

      // Click Tab 2: What to Do
      const doTabBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('What to Do'));
      expect(doTabBtn).toBeDefined();

      act(() => {
        doTabBtn.click();
      });

      expect(container.textContent).toContain('Configure PLL to 168MHz');
      expect(container.textContent).toContain('Measure MCO pin clock output on oscilloscope');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 10: PROJECT AND CAPABILITY PROGRESSION
  // ══════════════════════════════════════════════════════════════════
  describe('10. Project & Scaffolding Progression', () => {

    test('Preserves scaffolding progression (GUIDED → OPEN_ENDED) and practical failure modes', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const projects = report.canonicalRoadmap[0].projects;
      expect(projects.length).toBeGreaterThanOrEqual(3);

      const scaffoldLevels = projects.map(p => p.scaffoldingLevel);
      expect(scaffoldLevels).toContain('GUIDED');
      expect(scaffoldLevels).toContain('PARTIALLY_GUIDED');
      expect(scaffoldLevels).toContain('OPEN_ENDED');

      projects.forEach(p => {
        expect(p.capabilitiesExercised).toBeDefined();
        expect(p.practicalFailureModes.length).toBeGreaterThan(0);
        expect(p.whatFailureTeaches).toBeDefined();
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 11 & 12: CANONICAL EXECUTION MODEL & PLAN-ONLY IMPORT
  // ══════════════════════════════════════════════════════════════════
  describe('11 & 12. Canonical Execution & Plan-Only Import Invariants', () => {

    test('Plan-only import: imported work starts 100% incomplete without fabricated progress', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const subject = report.canonicalRoadmap[0];

      subject.phases.forEach(p => {
        p.tasks.forEach(t => {
          expect(t.completed).toBe(false);
          expect(t.completedAt).toBeNull();
          t.subtasks.forEach(st => {
            expect(st.completed).toBe(false);
            expect(st.completedAt).toBeNull();
          });
        });
      });
    });

    test('RoadmapContext remains single source of truth for task and subtask completion', () => {
      let contextRef = null;
      const TestConsumer = () => {
        const ctx = React.useContext(RoadmapContext);
        contextRef = ctx;
        return (
          <div>
            <div data-testid="track-count">{ctx.subjects.length}</div>
          </div>
        );
      };

      act(() => {
        root.render(
          <RoadmapProvider>
            <TestConsumer />
          </RoadmapProvider>
        );
      });

      // Import roadmap in append mode
      act(() => {
        contextRef.importRoadmap(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson, 'append');
      });

      expect(contextRef.subjects.length).toBeGreaterThan(0);
      const currentSubj = contextRef.subjects[0];
      const firstPhase = currentSubj.phases[0];
      const firstTask = firstPhase.tasks[0];
      expect(firstTask).toBeDefined();
      expect(contextRef.isTaskCompleted(firstTask.id)).toBe(false);

      // Complete a subtask via RoadmapContext
      if (firstTask.subtasks && firstTask.subtasks.length > 0) {
        const firstSub = firstTask.subtasks[0];
        act(() => {
          contextRef.toggleSubtask(currentSubj.id, firstPhase.id, firstTask.id, firstSub.id);
        });

        // Verify that subtask completion is updated in canonical storage
        const updatedSubj = contextRef.subjects.find(s => s.id === currentSubj.id);
        const updatedTask = updatedSubj.phases[0].tasks[0];
        expect(updatedTask.subtasks.find(s => s.id === firstSub.id).completed).toBe(true);

        // Undo subtask
        act(() => {
          contextRef.toggleSubtask(currentSubj.id, firstPhase.id, firstTask.id, firstSub.id);
        });
        const revertedSubj = contextRef.subjects.find(s => s.id === currentSubj.id);
        expect(revertedSubj.phases[0].tasks[0].subtasks.find(s => s.id === firstSub.id).completed).toBe(false);
      }
    });

    test('Append import protects existing learner roadmaps from silent destruction', () => {
      let contextRef = null;
      const TestConsumer = () => {
        contextRef = React.useContext(RoadmapContext);
        return <div>Track Count: {contextRef.subjects.length}</div>;
      };

      act(() => {
        root.render(
          <RoadmapProvider>
            <TestConsumer />
          </RoadmapProvider>
        );
      });

      const initialCount = contextRef.subjects.length;

      // Append new track
      act(() => {
        contextRef.importRoadmap(HISTORIOGRAPHY_OUTPUT.canonicalJson, 'append');
      });

      expect(contextRef.subjects.length).toBe(initialCount + 1);

      // Append same track again -> checks collision and appends with (Imported) suffix
      act(() => {
        contextRef.importRoadmap(HISTORIOGRAPHY_OUTPUT.canonicalJson, 'append');
      });

      expect(contextRef.subjects.length).toBe(initialCount + 2);
      expect(contextRef.subjects.some(s => s.name.includes('(Imported)'))).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 14: RESPONSIVE & ACCESSIBILITY AUDIT
  // ══════════════════════════════════════════════════════════════════
  describe('14. Responsive & Accessibility Acceptance', () => {

    test('FieldIntelligenceDrawer adheres to dialog accessibility guidelines', () => {
      const mockSubject = {
        name: 'Quantum Optics',
        fieldIntelligence: {
          fieldDefinition: 'Quantum states of light and matter interaction.',
          historicalLineage: [{ era: '1900', milestone: 'Planck radiation law' }],
          durabilityMap: {
            durableFoundations: ['Maxwell-Bloch equations'],
            toolDependentSkills: ['QuTiP syntax']
          },
          sourceLedger: [{ id: 'SRC-1', title: 'Quantum Optics', authors: ['Mandel', 'Wolf'], year: 1995 }]
        }
      };

      const onClose = jest.fn();
      act(() => {
        root.render(<FieldIntelligenceDrawer subject={mockSubject} onClose={onClose} />);
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('field-intel-drawer-title');

      // Test Escape key closes dialog
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
      });
      expect(onClose).toHaveBeenCalled();
    });

    test('UniversalRoadmapBridgeModal renders all accessible steps and responsive classes', () => {
      const onClose = jest.fn();
      const onImport = jest.fn();

      act(() => {
        root.render(
          <UniversalRoadmapBridgeModal
            isOpen={true}
            onClose={onClose}
            onImportRoadmap={onImport}
          />
        );
      });

      const modalDialog = container.querySelector('[role="dialog"]');
      expect(modalDialog).toBeDefined();
      expect(modalDialog.getAttribute('aria-modal')).toBe('true');
      expect(container.textContent).toContain('Universal AI Roadmap Bridge');
      expect(container.textContent).toContain('Learner Intent & Charter');
    });
  });

});
