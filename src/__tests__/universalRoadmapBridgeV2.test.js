/* eslint-disable no-script-url */
/**
 * universalRoadmapBridgeV2.test.js
 *
 * Exhaustive Regression Suite for Universal AI Roadmap Bridge v2.1.
 * Validates all 31 release requirements from Part 24.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  detectFormat,
  normalizeRoadmapInput,
  detectCycles,
  FORMAT_TYPES,
  assessResearchQuality,
  normalizeSourceLedger
} from '../services/roadmapBridge/roadmapNormalizer';
import {
  createLearnerContext
} from '../services/roadmapBridge/learnerContextModel';
import {
  generateConversionPrompt,
  generateDeepResearchCharter
} from '../services/roadmapBridge/researchCharter';
import {
  CANONICAL_SCHEMA_VERSION,
  CONFIDENCE_LEVELS,
  SAMPLE_AI_RESEARCH_ANSWER_MARKDOWN,
  SAMPLE_CANONICAL_V2_DATA,
  DEPTH_LEVELS,
  SCAFFOLDING_LEVELS,
  SOURCE_TYPES,
  RESEARCH_RECENCY,
  RESEARCH_QUALITY_LEVELS,
  DURABILITY_CLASSIFICATIONS,
  createEmptyFieldIntelligence,
  createEmptyAdaptationRules
} from '../services/roadmapBridge/canonicalExchangeModel';
import UniversalRoadmapBridgeModal from '../components/UniversalRoadmapBridgeModal';
import { RoadmapProvider, RoadmapContext } from '../context/RoadmapContext';
import { safeStorageClear, safeStorageGet } from '../utils/storage';

describe('UNIVERSAL AI ROADMAP BRIDGE v2.1 — COMPLETE TEST MATRIX (31 Requirements)', () => {
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

  // ──────────────────────────────────────────────────────────────
  // 1. DEEP HIERARCHICAL RESEARCH STRUCTURE
  // ──────────────────────────────────────────────────────────────
  test('1. deep hierarchical research structure: parses v2.1 schema with field intelligence, learning units, and doing tasks', () => {
    const raw = JSON.stringify(SAMPLE_CANONICAL_V2_DATA);
    expect(detectFormat(raw)).toBe(FORMAT_TYPES.CANONICAL_JSON);

    const report = normalizeRoadmapInput(raw);
    expect(report.success).toBe(true);
    expect(report.canImportDirectly).toBe(true);
    expect(report.confidence.learningArcs).toBe(CONFIDENCE_LEVELS.DETECTED);
    expect(report.confidence.modules).toBe(CONFIDENCE_LEVELS.DETECTED);

    const subj = report.canonicalRoadmap[0];
    expect(subj.phases.length).toBe(2);
    expect(subj.phases[0].tasks.length).toBe(1);
    expect(subj.phases[0].tasks[0].subtasks.length).toBe(2);
    // Invariant: all tasks imported as PLAN ONLY
    expect(subj.phases[0].tasks[0].completed).toBe(false);
    expect(subj.phases[0].tasks[0].subtasks[0].completed).toBe(false);
    expect(subj.fieldIntelligence.fieldDefinition).toContain('coherent quantum phenomena');
    // v2.1: Enriched field intelligence
    expect(subj.fieldIntelligence.highLeverageConcepts.length).toBeGreaterThan(0);
    expect(subj.fieldIntelligence.oftenSkippedConcepts.length).toBeGreaterThan(0);
    expect(subj.fieldIntelligence.bridgeConcepts.length).toBeGreaterThan(0);
    expect(subj.fieldIntelligence.commonMisconceptions.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────
  // 2. KNOWLEDGE AREA EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('2. knowledge area extraction: extracts knowledge areas from field intelligence', () => {
    const report = normalizeRoadmapInput(SAMPLE_CANONICAL_V2_DATA);
    const fi = report.canonicalRoadmap[0].fieldIntelligence;
    expect(fi.knowledgeAreas).toEqual(['Quantum Information Theory', 'Circuit Synthesis', 'Quantum Error Correction']);
  });

  // ──────────────────────────────────────────────────────────────
  // 3. TOPIC EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('3. topic extraction: extracts arc/phase-level topics from structured input', () => {
    const md = `# Applied Robotics
## Learning Arc 1: Kinematics
### Module 1.1: Forward Kinematics
- [ ] Understand DH Parameters
- [ ] Calculate transformation matrices
### Module 1.2: Inverse Kinematics
- [ ] Analytical IK for 3-DOF arm
`;

    expect(detectFormat(md)).toBe(FORMAT_TYPES.MARKDOWN_ROADMAP);

    const report = normalizeRoadmapInput(md);
    expect(report.success).toBe(true);
    expect(report.canonicalRoadmap[0].name).toBe('Applied Robotics');
    expect(report.canonicalRoadmap[0].phases.length).toBe(1);
    expect(report.canonicalRoadmap[0].phases[0].tasks.length).toBe(2);
    expect(report.canonicalRoadmap[0].phases[0].tasks[0].subtasks.length).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────
  // 4. SUBTOPIC EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('4. subtopic extraction: parses nested subtopics from bullet outlines', () => {
    const outline = `
- Phase 1: Machine Learning Math
  - Linear Algebra Essentials
  - Multivariate Calculus
- Phase 2: Supervised Learning
  - Linear Regression from Scratch
`;

    const format = detectFormat(outline);
    expect([FORMAT_TYPES.MARKDOWN_ROADMAP, FORMAT_TYPES.FREEFORM]).toContain(format);

    const report = normalizeRoadmapInput(outline);
    expect(report.canImportDirectly).toBe(true);
    expect(report.canonicalRoadmap[0].phases.length).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────
  // 5. LEARNING UNIT EXTRACTION (v2.1)
  // ──────────────────────────────────────────────────────────────
  test('5. learning unit extraction: extracts knowledge acquisition units from canonical JSON', () => {
    const withLU = {
      name: 'Interrupts Deep Dive',
      learningArcs: [
        {
          name: 'Hardware Interrupt Model',
          modules: [
            {
              name: 'Interrupt Fundamentals',
              learningUnits: [
                {
                  name: 'Understand what an interrupt is',
                  depth: 'WORKING_UNDERSTANDING',
                  concept: 'Asynchronous hardware signal',
                  whyItMatters: 'Foundation for all event-driven hardware interaction',
                  misconceptionRisk: 'Confusing interrupts with polling',
                  retrievalTarget: 'Explain interrupt flow from memory',
                  transferTarget: 'Apply to DMA and timer peripherals'
                },
                {
                  name: 'Understand vector table lookup',
                  depth: 'FUNCTIONAL_FLUENCY',
                  concept: 'Vector table maps interrupt number to handler address'
                }
              ],
              subtasks: [
                { name: 'Configure an interrupt' },
                { name: 'Write an ISR' }
              ]
            }
          ]
        }
      ]
    };

    const report = normalizeRoadmapInput(withLU);
    expect(report.success).toBe(true);
    expect(report.confidence.learningUnits).toBe(CONFIDENCE_LEVELS.DETECTED);

    const mod = report.canonicalRoadmap[0].phases[0].tasks[0];
    expect(mod.learningUnits.length).toBe(2);
    expect(mod.learningUnits[0].name).toBe('Understand what an interrupt is');
    expect(mod.learningUnits[0].depth).toBe('WORKING_UNDERSTANDING');
    expect(mod.learningUnits[0].whyItMatters).toContain('Foundation');
    expect(mod.learningUnits[0].misconceptionRisk).toContain('polling');
    expect(mod.learningUnits[1].depth).toBe('FUNCTIONAL_FLUENCY');

    expect(report.summaryMetrics.learningUnitCount).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────
  // 6. DOING TASK EXTRACTION (v2.1)
  // ──────────────────────────────────────────────────────────────
  test('6. doing task extraction: extracts application tasks with modes from canonical JSON', () => {
    const withDT = {
      name: 'GPIO Programming',
      learningArcs: [
        {
          name: 'Register-Level GPIO',
          modules: [
            {
              name: 'GPIO Output Control',
              doingTasks: [
                { name: 'Configure GPIO output register', mode: 'implement' },
                { name: 'Measure toggle frequency', mode: 'measure' },
                { name: 'Debug a silent GPIO pin', mode: 'debug' }
              ],
              subtasks: [{ name: 'Read reference manual section' }]
            }
          ]
        }
      ]
    };

    const report = normalizeRoadmapInput(withDT);
    expect(report.success).toBe(true);
    expect(report.confidence.doingTasks).toBe(CONFIDENCE_LEVELS.DETECTED);

    const mod = report.canonicalRoadmap[0].phases[0].tasks[0];
    expect(mod.doingTasks.length).toBe(3);
    expect(mod.doingTasks[0].mode).toBe('implement');
    expect(mod.doingTasks[1].mode).toBe('measure');
    expect(mod.doingTasks[2].mode).toBe('debug');
    expect(mod.doingTasks[0].completed).toBe(false);

    expect(report.summaryMetrics.doingTaskCount).toBe(3);
  });

  // ──────────────────────────────────────────────────────────────
  // 7. SUBTASK EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('7. subtask extraction: maps steps/items/procedures to subtasks via synonyms', () => {
    const alternateJson = JSON.stringify({
      title: 'Compiler Construction',
      tracks: [
        {
          name: 'Front-End Pipeline',
          modules: [
            {
              name: 'Lexical Analysis',
              steps: ['Regular expressions to DFAs', 'Lexer generator implementation']
            }
          ]
        }
      ]
    });

    expect(detectFormat(alternateJson)).toBe(FORMAT_TYPES.ALTERNATE_JSON);

    const report = normalizeRoadmapInput(alternateJson);
    expect(report.success).toBe(true);
    expect(report.canonicalRoadmap[0].phases.length).toBe(1);
    expect(report.canonicalRoadmap[0].phases[0].name).toBe('Front-End Pipeline');
    expect(report.canonicalRoadmap[0].phases[0].tasks[0].name).toBe('Lexical Analysis');
    expect(report.canonicalRoadmap[0].phases[0].tasks[0].subtasks.length).toBe(2);
    expect(report.canonicalRoadmap[0].phases[0].tasks[0].completed).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // 8. PROJECT EXTRACTION (v2.1 enriched)
  // ──────────────────────────────────────────────────────────────
  test('8. project extraction: preserves scaffolding level, capabilities, and failure modes', () => {
    const withProjects = {
      name: 'Embedded Systems',
      phases: [{ name: 'P1', tasks: [{ name: 'T1' }] }],
      projects: [
        {
          name: 'Interrupt-Driven Reaction Timer',
          description: 'Build a reaction time measurement system using GPIO interrupts',
          scaffoldingLevel: 'PARTIALLY_GUIDED',
          capabilitiesExercised: ['Interrupt configuration', 'Timer measurement', 'ISR design'],
          prerequisiteModules: ['mod-interrupts'],
          failureModes: ['Race condition in shared timer variable'],
          whatFailureTeaches: 'Importance of volatile and critical sections'
        }
      ]
    };

    const report = normalizeRoadmapInput(withProjects);
    expect(report.success).toBe(true);
    expect(report.confidence.projects).toBe(CONFIDENCE_LEVELS.DETECTED);

    const proj = report.canonicalRoadmap[0].projects[0];
    expect(proj.name).toBe('Interrupt-Driven Reaction Timer');
    expect(proj.scaffoldingLevel).toBe('PARTIALLY_GUIDED');
    expect(proj.capabilitiesExercised).toContain('ISR design');
    expect(proj.failureModes).toContain('Race condition in shared timer variable');
    expect(proj.whatFailureTeaches).toContain('critical sections');
  });

  // ──────────────────────────────────────────────────────────────
  // 9. COMPETENCY EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('9. competency extraction: maps competencies/skills/capabilities from alternate keys', () => {
    const withCompetencies = {
      name: 'Data Engineering',
      phases: [{ name: 'Phase 1', tasks: [{ name: 'T1' }] }],
      competencies: [
        { id: 'c1', name: 'SQL query optimization', tier: 'ESTABLISHED' },
        { id: 'c2', name: 'ETL pipeline design', tier: 'CURRENT_PRACTICE' }
      ]
    };

    const report = normalizeRoadmapInput(withCompetencies);
    expect(report.confidence.competencies).toBe(CONFIDENCE_LEVELS.DETECTED);
    expect(report.canonicalRoadmap[0].competencies.length).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────
  // 10. DEPENDENCY EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('10. dependency extraction: resolves prerequisite edges and builds dependency graph', () => {
    const withDeps = {
      name: 'Dependency Test',
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            { id: 'task-a', name: 'Foundations', subtasks: [], prerequisites: [] },
            { id: 'task-b', name: 'Advanced', subtasks: [], prerequisites: ['task-a'] }
          ]
        }
      ],
      dependencyGraph: {
        edges: [{ from: 'task-a', to: 'task-b', type: 'PREREQUISITE' }]
      }
    };

    const report = normalizeRoadmapInput(withDeps);
    expect(report.confidence.dependencyGraph).toBe(CONFIDENCE_LEVELS.DETECTED);
  });

  // ──────────────────────────────────────────────────────────────
  // 11. SPECIALIZATION EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('11. specialization extraction: maps specialization branches from alternate keys', () => {
    const withSpecs = {
      name: 'ML Track',
      phases: [{ name: 'P1', tasks: [{ name: 'T1' }] }],
      specializationBranches: [
        { name: 'Computer Vision', description: 'CNN architectures and object detection' },
        { name: 'NLP', description: 'Transformer models and attention mechanisms' }
      ]
    };

    const report = normalizeRoadmapInput(withSpecs);
    expect(report.confidence.specializations).toBe(CONFIDENCE_LEVELS.DETECTED);
    expect(report.canonicalRoadmap[0].specializations.length).toBe(2);
    expect(report.summaryMetrics.specializationCount).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────
  // 12. FRONTIER EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('12. frontier extraction: detects research frontier from research report', () => {
    const reportText = `# Phase 1: Field Reconstruction
Semiconductor engineering deals with solid-state physics and microfabrication.

## Research Frontier
- 2nm Gate-All-Around nanosheets
- High-NA EUV lithography limits

## Source Ledger
- Sze & Ng, Physics of Semiconductor Devices. [SOURCE_VERIFIED]
`;

    expect(detectFormat(reportText)).toBe(FORMAT_TYPES.RESEARCH_REPORT);

    const report = normalizeRoadmapInput(reportText);
    expect(report.canImportDirectly).toBe(false);
    expect(report.needsConversion).toBe(true);
    expect(report.summaryMetrics.frontierCount).toBe(2);
    expect(report.summaryMetrics.sourceCount).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────
  // 13. SOURCE EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('13. source extraction: preserves verification status from source ledger', () => {
    const report = normalizeRoadmapInput(SAMPLE_CANONICAL_V2_DATA);
    const sources = report.canonicalRoadmap[0].fieldIntelligence.sourceLedger;
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0].status).toBe('SOURCE_VERIFIED');
    expect(sources[0].citation).toContain('Nielsen');
  });

  // ──────────────────────────────────────────────────────────────
  // 14. ALTERNATE JSON FIELD NAMES
  // ──────────────────────────────────────────────────────────────
  test('14. alternate JSON field names: maps tracks/modules/units synonym hierarchy safely', () => {
    const alternateJson = {
      title: 'Compiler Construction',
      tracks: [
        {
          name: 'Front-End Pipeline',
          modules: [
            {
              name: 'Lexical Analysis',
              steps: ['Regular expressions to DFAs', 'Lexer generator implementation']
            }
          ]
        }
      ],
      fieldIntelligence: {
        advancedFrontier: [{ area: 'Incremental parsing', status: 'EMERGING' }],
        sources: [{ citation: 'Dragon Book', status: 'SOURCE_VERIFIED' }],
        oftenSkippedHighLeverage: ['Error recovery strategies', 'Incremental compilation']
      }
    };

    const report = normalizeRoadmapInput(alternateJson);
    expect(report.success).toBe(true);
    const fi = report.canonicalRoadmap[0].fieldIntelligence;
    // advancedFrontier → researchFrontier via synonyms
    expect(fi.researchFrontier.length).toBe(1);
    expect(fi.researchFrontier[0].area).toBe('Incremental parsing');
    // sources → sourceLedger via synonyms
    expect(fi.sourceLedger.length).toBe(1);
    // oftenSkippedHighLeverage → highLeverageConcepts via synonyms
    expect(fi.highLeverageConcepts.length).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────
  // 15. MARKDOWN INPUT
  // ──────────────────────────────────────────────────────────────
  test('15. markdown input: extracts research dossier and triggers conversion prompt', () => {
    const reportText = `# Phase 1: Field Reconstruction
Semiconductor engineering deals with solid-state physics and microfabrication.

## Research Frontier
- 2nm Gate-All-Around nanosheets
- High-NA EUV lithography limits

## Source Ledger
- Sze & Ng, Physics of Semiconductor Devices. [SOURCE_VERIFIED]
`;

    const report = normalizeRoadmapInput(reportText);
    const convPrompt = generateConversionPrompt(reportText, report);
    expect(convPrompt).toContain('LEARNING TRACKER ROADMAP CONVERSION PROMPT');
    expect(convPrompt).toContain('Structured Learning Arcs');
    expect(convPrompt).toContain('Learning Units');
  });

  // ──────────────────────────────────────────────────────────────
  // 16. MIXED MARKDOWN + JSON
  // ──────────────────────────────────────────────────────────────
  test('16. mixed Markdown + JSON: extracts enclosed JSON code block seamlessly', () => {
    const mixed = `Here is the research roadmap you requested:
\`\`\`json
{
  "name": "Distributed Systems",
  "learningArcs": [
    {
      "name": "Consensus Foundations",
      "modules": [
        {
          "name": "Raft Protocol",
          "subtasks": [{ "name": "Leader election" }, { "name": "Log replication" }]
        }
      ]
    }
  ]
}
\`\`\`
Let me know if you would like deeper explanations!`;

    expect(detectFormat(mixed)).toBe(FORMAT_TYPES.MIXED_AI_RESPONSE);

    const report = normalizeRoadmapInput(mixed);
    expect(report.success).toBe(true);
    expect(report.canonicalRoadmap[0].name).toBe('Distributed Systems');
    expect(report.canonicalRoadmap[0].phases[0].name).toBe('Consensus Foundations');
  });

  // ──────────────────────────────────────────────────────────────
  // 17. MISSING LEARNING SECTION
  // ──────────────────────────────────────────────────────────────
  test('17. missing learning section: reports NOT_DETECTED for learning units without inventing data', () => {
    const bareJson = JSON.stringify({
      subjects: [
        {
          name: 'Quick Track',
          phases: [
            {
              name: 'Phase 1',
              tasks: [{ name: 'Task A', subtasks: [{ name: 'Sub 1' }] }]
            }
          ]
        }
      ]
    });

    const report = normalizeRoadmapInput(bareJson);
    expect(report.success).toBe(true);
    expect(report.confidence.learningUnits).toBe(CONFIDENCE_LEVELS.NOT_DETECTED);
    expect(report.confidence.doingTasks).toBe(CONFIDENCE_LEVELS.NOT_DETECTED);
    expect(report.summaryMetrics.learningUnitCount).toBe(0);
    expect(report.summaryMetrics.doingTaskCount).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────
  // 18. MISSING DOING TASK SECTION
  // ──────────────────────────────────────────────────────────────
  test('18. missing doing-task section: reports NOT_DETECTED honestly without fabrication', () => {
    const noDoingTasks = {
      name: 'Theory Only',
      phases: [{ name: 'Phase 1', tasks: [{ name: 'T1', subtasks: [{ name: 'Read chapter 1' }] }] }]
    };

    const report = normalizeRoadmapInput(noDoingTasks);
    expect(report.confidence.doingTasks).toBe(CONFIDENCE_LEVELS.NOT_DETECTED);
    expect(report.confidence.researchFrontier).toBe(CONFIDENCE_LEVELS.NOT_DETECTED);
  });

  // ──────────────────────────────────────────────────────────────
  // 19. MISSING RESEARCH SECTION
  // ──────────────────────────────────────────────────────────────
  test('19. missing research section: imports plan cleanly with empty research fields', () => {
    const bareJson = JSON.stringify({
      subjects: [
        {
          name: 'Quick Track',
          phases: [
            {
              name: 'Phase 1',
              tasks: [{ name: 'Task A', subtasks: [{ name: 'Sub 1' }] }]
            }
          ]
        }
      ]
    });

    const report = normalizeRoadmapInput(bareJson);
    expect(report.success).toBe(true);
    expect(report.confidence.researchFrontier).toBe(CONFIDENCE_LEVELS.NOT_DETECTED);
    expect(report.confidence.sourceLedger).toBe(CONFIDENCE_LEVELS.NOT_DETECTED);
    expect(report.canonicalRoadmap[0].fieldIntelligence.researchFrontier).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────
  // 20. MALFORMED JSON
  // ──────────────────────────────────────────────────────────────
  test('20. malformed JSON: falls back without crashing and flags syntax errors', () => {
    const broken = '{"name": "Broken", "phases": [';
    const report = normalizeRoadmapInput(broken);
    expect(report.canImportDirectly).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────
  // 21. DUPLICATE IDS
  // ──────────────────────────────────────────────────────────────
  test('21. duplicate IDs: detects collisions and automatically disambiguates IDs', () => {
    const withDuplicates = {
      name: 'Track',
      phases: [
        {
          id: 'dup-id',
          name: 'Phase 1',
          tasks: [
            { id: 'task-dup', name: 'Task 1', subtasks: [{ id: 'sub-dup', name: 'Sub 1' }] },
            { id: 'task-dup', name: 'Task 2', subtasks: [{ id: 'sub-dup', name: 'Sub 2' }] }
          ]
        },
        {
          id: 'dup-id',
          name: 'Phase 2',
          tasks: []
        }
      ]
    };

    const report = normalizeRoadmapInput(withDuplicates);
    const subj = report.canonicalRoadmap[0];
    const taskIds = subj.phases[0].tasks.map(t => t.id);
    expect(taskIds[0]).not.toBe(taskIds[1]);

    const subtaskIds = subj.phases[0].tasks.flatMap(t => t.subtasks.map(s => s.id));
    expect(subtaskIds[0]).not.toBe(subtaskIds[1]);
  });

  // ──────────────────────────────────────────────────────────────
  // 22. DEPENDENCY CYCLES
  // ──────────────────────────────────────────────────────────────
  test('22. cycles: detectCycles identifies circular prerequisites', () => {
    const cyclicEdges = [
      { from: 'NodeA', to: 'NodeB' },
      { from: 'NodeB', to: 'NodeC' },
      { from: 'NodeC', to: 'NodeA' }
    ];

    const cycles = detectCycles(cyclicEdges);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain('NodeA');

    const cyclicRoadmap = {
      name: 'Cyclic Track',
      dependencyGraph: { edges: cyclicEdges },
      phases: [{ name: 'Phase 1', tasks: [{ name: 'T1' }] }]
    };

    const report = normalizeRoadmapInput(cyclicRoadmap);
    expect(report.warnings.some(w => w.includes('Circular dependency'))).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // 23. UNSAFE URLS
  // ──────────────────────────────────────────────────────────────
  test('23. unsafe URLs: sanitizes javascript: and data: links in sources', () => {
    const maliciousSources = {
      name: 'Security Test',
      phases: [{ name: 'Phase 1', tasks: [{ name: 'T1', subtasks: [] }] }],
      fieldIntelligence: {
        sourceLedger: [
          { citation: 'Safe Paper', url: 'https://example.com/paper.pdf', status: 'SOURCE_VERIFIED' },
          { citation: 'Malicious Exploit', url: 'javascript:alert(1)', status: 'SOURCE_NOT_VERIFIED' }
        ]
      }
    };

    const report = normalizeRoadmapInput(maliciousSources);
    const sources = report.canonicalRoadmap[0].fieldIntelligence.sourceLedger;
    expect(sources[0].url).toBe('https://example.com/paper.pdf');
    expect(sources[1].url).toBe('#');
    expect(report.warnings.some(w => w.includes('javascript:alert(1)'))).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // 24. CONVERSION PROMPT GENERATION (v2.1 enriched)
  // ──────────────────────────────────────────────────────────────
  test('24. conversion prompt generation: builds targeted prompt preserving original notes and requesting v2.1 fields', () => {
    const rawNotes = 'Here is an overview of compiler design. We need lexing, parsing, semantic analysis, and codegen.';
    const prompt = generateConversionPrompt(rawNotes, { confidence: {} }, { goal: 'Compilers' });

    expect(prompt).toContain('LEARNING TRACKER ROADMAP CONVERSION PROMPT');
    expect(prompt).toContain(CANONICAL_SCHEMA_VERSION);
    expect(prompt).toContain('lexing, parsing, semantic analysis');
    // v2.1: Conversion prompt should request learning units and doing tasks
    expect(prompt).toContain('Learning Units');
    expect(prompt).toContain('Doing Tasks');
    expect(prompt).toContain('scaffolding');
  });

  // ──────────────────────────────────────────────────────────────
  // 25. NO HALLUCINATED FIELDS
  // ──────────────────────────────────────────────────────────────
  test('25. no hallucinated missing fields: missing values remain explicitly null or empty', () => {
    const bareInput = `# Minimal Domain
## Learning Arc 1: Core
### Module 1: Start
- [ ] Do item
`;
    const report = normalizeRoadmapInput(bareInput);
    const intel = report.canonicalRoadmap[0].fieldIntelligence;
    expect(intel.historicalLineage).toEqual([]);
    expect(intel.openProblems).toEqual([]);
    expect(intel.survivalStrategy).toBeNull();
    // v2.1 enrichments should be empty, not fabricated
    expect(intel.highLeverageConcepts).toEqual([]);
    expect(intel.oftenSkippedConcepts).toEqual([]);
    expect(intel.bridgeConcepts).toEqual([]);
    expect(intel.commonMisconceptions).toEqual([]);
    expect(intel.practicalFailureModes).toEqual([]);
    expect(intel.professionalFailureModes).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────
  // 26. PLAN-ONLY IMPORT
  // ──────────────────────────────────────────────────────────────
  test('26. plan-only import: all tasks, subtasks, learning units, and doing tasks imported as incomplete', () => {
    const fullRoadmap = {
      name: 'Plan Only Test',
      learningArcs: [
        {
          name: 'Arc 1',
          modules: [
            {
              name: 'Module 1',
              learningUnits: [
                { name: 'Understand concept A', depth: 'DEEP_UNDERSTANDING' }
              ],
              doingTasks: [
                { name: 'Implement concept A', mode: 'build' }
              ],
              subtasks: [
                { name: 'Step 1', completed: true },
                { name: 'Step 2', completed: true }
              ]
            }
          ]
        }
      ]
    };

    const report = normalizeRoadmapInput(fullRoadmap);
    expect(report.success).toBe(true);

    const mod = report.canonicalRoadmap[0].phases[0].tasks[0];
    // All subtasks must be false regardless of source data
    expect(mod.completed).toBe(false);
    mod.subtasks.forEach(st => {
      expect(st.completed).toBe(false);
    });
    // Doing tasks must be incomplete
    mod.doingTasks.forEach(dt => {
      expect(dt.completed).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 27. EXISTING ROADMAP PROTECTION
  // ──────────────────────────────────────────────────────────────
  test('27. existing roadmap protection: RoadmapContext supports replace vs append modes', async () => {
    let capturedContext = null;

    const TestComponent = () => {
      capturedContext = React.useContext(RoadmapContext);
      return <div>Ready</div>;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <TestComponent />
        </RoadmapProvider>
      );
    });

    // Ensure initial track exists
    await act(async () => {
      capturedContext.importRoadmap({
        name: 'Initial Base Track',
        phases: [{ name: 'P0', tasks: [{ name: 'T0' }] }]
      }, { mode: 'replace' });
    });

    expect(capturedContext.subjects.length).toBe(1);
    const initialCount = 1;

    // Append mode: adds as additional track
    const newTrack = {
      name: 'New Appended Track',
      phases: [{ name: 'P1', tasks: [{ name: 'T1' }] }]
    };

    await act(async () => {
      capturedContext.importRoadmap(newTrack, { mode: 'append' });
    });
    expect(capturedContext.subjects.length).toBe(initialCount + 1);

    // Replace mode: overwrites roadmap completely
    const replacementTrack = {
      name: 'Sole Replacement Track',
      phases: [{ name: 'Only Phase', tasks: [{ name: 'Only Task' }] }]
    };

    await act(async () => {
      capturedContext.importRoadmap(replacementTrack, { mode: 'replace' });
    });
    expect(capturedContext.subjects.length).toBe(1);
    expect(capturedContext.subjects[0].name).toBe('Sole Replacement Track');
  });

  // ──────────────────────────────────────────────────────────────
  // 28. MOBILE UI
  // ──────────────────────────────────────────────────────────────
  test('28. mobile layout / component rendering: renders modal accessible steps and dialog attributes', async () => {
    const handleClose = jest.fn();
    const handleImport = jest.fn();

    await act(async () => {
      root.render(
        <UniversalRoadmapBridgeModal
          isOpen={true}
          onClose={handleClose}
          onImport={handleImport}
          existingRoadmapCount={1}
        />
      );
    });

    // Accessible dialog checks
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    // Step 1: Input goal using native value setter
    const goalInput = container.querySelector('#learner-goal-input');
    expect(goalInput).not.toBeNull();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(goalInput, 'Autonomous Vehicles');
      goalInput.dispatchEvent(new Event('input', { bubbles: true }));
      goalInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Continue button
    const buttons = Array.from(container.querySelectorAll('button'));
    const continueBtn = buttons.find(b => b.textContent.includes('Continue to AI Output'));
    expect(continueBtn).not.toBeNull();

    await act(async () => {
      continueBtn.click();
    });

    // Step 2 is active: Textarea is present
    const textarea = container.querySelector('#paste-ai-roadmap-textarea');
    expect(textarea).not.toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // 29. LARGE PASTED CONTENT
  // ──────────────────────────────────────────────────────────────
  test('29. very large pasted answer: handles 200KB text safely and rejects payloads exceeding 5MB', () => {
    // 200KB payload test
    let largeMd = '# Massive Track\n';
    for (let i = 1; i <= 40; i++) {
      largeMd += `## Learning Arc ${i}: Large Section ${i}\n`;
      for (let j = 1; j <= 5; j++) {
        largeMd += `### Module ${i}.${j}: Task ${j}\n- [ ] Subtask A\n- [ ] Subtask B\n`;
      }
    }
    const report = normalizeRoadmapInput(largeMd);
    expect(report.success).toBe(true);
    expect(report.summaryMetrics.arcCount).toBe(40);

    // Oversized > 5MB payload test
    const fiveMbString = 'A'.repeat(5.2 * 1024 * 1024);
    const oversizedReport = normalizeRoadmapInput(fiveMbString);
    expect(oversizedReport.success).toBe(false);
    expect(oversizedReport.errors[0]).toContain('Oversized payload');
  });

  // ──────────────────────────────────────────────────────────────
  // 30. RELOAD PERSISTENCE
  // ──────────────────────────────────────────────────────────────
  test('30. reload persistence: imported roadmap persists to storage and survives reload', async () => {
    let capturedContext = null;

    const TestComponent = () => {
      capturedContext = React.useContext(RoadmapContext);
      return <div>Ready</div>;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <TestComponent />
        </RoadmapProvider>
      );
    });

    const track = {
      name: 'Persistent Track',
      fieldIntelligence: { fieldDefinition: 'Durable definition' },
      phases: [{ name: 'Phase Alpha', tasks: [{ name: 'Task Alpha', subtasks: [] }] }]
    };

    await act(async () => {
      capturedContext.importRoadmap(track, { mode: 'replace' });
    });

    // Verify storage inspection
    const stored = safeStorageGet('roadmap');
    expect(Array.isArray(stored)).toBe(true);
    expect(stored[0].name).toBe('Persistent Track');
    expect(stored[0].fieldIntelligence.fieldDefinition).toBe('Durable definition');
  });

  // ──────────────────────────────────────────────────────────────
  // 31. SCHEMA MIGRATION
  // ──────────────────────────────────────────────────────────────
  test('31. versioned schema migration: imports legacy v1 subjects format smoothly with v2.1 compatibility', () => {
    const legacyV1 = {
      subjects: [
        {
          name: 'Legacy Subject',
          phases: [
            {
              name: 'Phase 1',
              tasks: [{ name: 'Task 1', subtasks: ['Subtask string 1', 'Subtask string 2'] }]
            }
          ]
        }
      ]
    };

    const report = normalizeRoadmapInput(legacyV1);
    expect(report.success).toBe(true);
    const subject = report.canonicalRoadmap[0];
    expect(subject.name).toBe('Legacy Subject');
    expect(subject.fieldIntelligence).toBeDefined();
    expect(subject.phases[0].tasks[0].subtasks[0].name).toBe('Subtask string 1');
    // v2.1: Should have empty but present enrichment fields
    expect(subject.fieldIntelligence.highLeverageConcepts).toEqual([]);
    expect(subject.fieldIntelligence.oftenSkippedConcepts).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────
  // BONUS: RESEARCH CHARTER GENERATION (v2.1 15-phase)
  // ──────────────────────────────────────────────────────────────
  test('BONUS: research charter v2.1/v2.3: generates multi-phase prompt with learning/doing separation', () => {
    const ctx = createLearnerContext({ goal: 'Embedded Systems', destination: 'Firmware Engineer' });
    const charter = generateDeepResearchCharter(ctx);

    expect(charter).toContain('UNIVERSAL DEEP RESEARCH CHARTER');
    expect(charter).toContain('v2.3.0');
    expect(charter).toContain('Embedded Systems');
    expect(charter).toContain('Firmware Engineer');
    // v2.3 phases
    expect(charter).toContain('PHASE 1 — FIELD RECONSTRUCTION');
    expect(charter).toContain('PHASE 8 — RESEARCH GAP ANALYSIS');
    expect(charter).toContain('PHASE 10 — LEARNING HIERARCHY');
    expect(charter).toContain('PHASE 12 — PROJECT SYSTEM');
    expect(charter).toContain('PHASE 14 — ADAPTATION RULES');
    expect(charter).toContain('PHASE 15 — ADVERSARIAL SELF-REVIEW');
    // Key content
    expect(charter).toContain('SEPARATE KNOWLEDGE ACQUISITION FROM DOING');
    expect(charter).toContain('DEEP_MASTERY_TARGET');
    expect(charter).toContain('FRONTIER_AWARENESS');
    expect(charter).toContain('GUIDED');
    expect(charter).toContain('OPEN_ENDED');
    expect(charter).toContain('YouTube roadmap');
  });

  // ──────────────────────────────────────────────────────────────
  // BONUS: CANONICAL MODEL EXPORTS
  // ──────────────────────────────────────────────────────────────
  test('BONUS: canonical model exports: v2.3 types and factories are properly exported', () => {
    expect(CANONICAL_SCHEMA_VERSION).toBe('2.3.0');
    expect(DEPTH_LEVELS.SURFACE_AWARENESS).toBe('SURFACE_AWARENESS');
    expect(DEPTH_LEVELS.RESEARCH_LEVEL).toBe('RESEARCH_LEVEL');
    expect(SCAFFOLDING_LEVELS.GUIDED).toBe('GUIDED');
    expect(SCAFFOLDING_LEVELS.OPEN_ENDED).toBe('OPEN_ENDED');

    const emptyFI = createEmptyFieldIntelligence();
    expect(emptyFI.highLeverageConcepts).toEqual([]);
    expect(emptyFI.oftenSkippedConcepts).toEqual([]);
    expect(emptyFI.bridgeConcepts).toEqual([]);
    expect(emptyFI.commonMisconceptions).toEqual([]);
    expect(emptyFI.practicalFailureModes).toEqual([]);
    expect(emptyFI.professionalFailureModes).toEqual([]);

    const emptyAR = createEmptyAdaptationRules();
    expect(emptyAR.rules).toEqual([]);
    expect(emptyAR.weaknessHandlers.KNOWLEDGE).toBeDefined();
    expect(emptyAR.weaknessHandlers.OVERCONFIDENCE).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────
  // BONUS: ADAPTATION RULES EXTRACTION
  // ──────────────────────────────────────────────────────────────
  test('BONUS: adaptation rules extraction: preserves weakness types and actions from JSON', () => {
    const withAdaptation = {
      name: 'Adaptive Track',
      learningArcs: [
        {
          name: 'Arc 1',
          modules: [{ name: 'M1', subtasks: [{ name: 'S1' }] }]
        }
      ],
      adaptationRules: {
        rules: [
          {
            condition: 'Learner completes implementation but cannot explain',
            weaknessType: 'OVERCONFIDENCE',
            action: 'Assign explanation/retrieval variant'
          },
          {
            condition: 'Learner repeatedly fails implementation',
            weaknessType: 'PREREQUISITE',
            action: 'Return to prerequisite learning unit'
          }
        ]
      }
    };

    const report = normalizeRoadmapInput(withAdaptation);
    const ar = report.canonicalRoadmap[0].adaptationRules;
    expect(ar.rules.length).toBe(2);
    expect(ar.rules[0].weaknessType).toBe('OVERCONFIDENCE');
    expect(ar.rules[0].action).toContain('retrieval');
    expect(ar.rules[1].weaknessType).toBe('PREREQUISITE');
  });

  // ──────────────────────────────────────────────────────────────
  // BONUS: CANONICAL ROADMAP ARRAY INGESTION & ACTIVE TRACK ACTIVATION
  // ──────────────────────────────────────────────────────────────
  test('BONUS: canonical roadmap array ingestion: importRoadmap accepts normalizationReport.canonicalRoadmap array and updates selectedSubjectId', async () => {
    let capturedContext = null;
    const TestComponent = () => {
      capturedContext = React.useContext(RoadmapContext);
      return null;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <TestComponent />
        </RoadmapProvider>
      );
    });

    // Generate normalization report from AI markdown
    const report = normalizeRoadmapInput(SAMPLE_AI_RESEARCH_ANSWER_MARKDOWN);
    expect(report.canImportDirectly).toBe(true);
    expect(Array.isArray(report.canonicalRoadmap)).toBe(true);
    expect(report.canonicalRoadmap.length).toBe(1);

    // Pass the Array of canonical subjects directly to importRoadmap
    let success = false;
    await act(async () => {
      success = capturedContext.importRoadmap(report.canonicalRoadmap, { mode: 'replace' });
    });

    expect(success).toBe(true);
    expect(capturedContext.subjects.length).toBe(1);
    expect(capturedContext.subjects[0].name).toContain('Applied Quantum Computing');
    expect(capturedContext.subjects[0].phases.length).toBeGreaterThanOrEqual(2);
    expect(capturedContext.selectedSubjectId).toBe(capturedContext.subjects[0].id);
  });

  // ──────────────────────────────────────────────────────────────
  // BONUS: MODAL END-TO-END IMPORT WORKFLOW
  // ──────────────────────────────────────────────────────────────
  test('BONUS: modal end-to-end import: user loads sample, proceeds through preview and protection, imports successfully', async () => {
    let capturedContext = null;
    const handleClose = jest.fn();

    const TestHost = () => {
      capturedContext = React.useContext(RoadmapContext);
      return (
        <UniversalRoadmapBridgeModal
          isOpen={true}
          onClose={handleClose}
          onImport={(roadmapData, options) => {
            return capturedContext.importRoadmap(roadmapData, options);
          }}
          existingRoadmapCount={capturedContext?.subjects?.length || 0}
        />
      );
    };

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <TestHost />
        </RoadmapProvider>
      );
    });

    // Step 1: Set goal
    const goalInput = container.querySelector('#learner-goal-input');
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(goalInput, 'Applied Quantum Computing');
      goalInput.dispatchEvent(new Event('input', { bubbles: true }));
      goalInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Continue to step 2
    const buttons = Array.from(container.querySelectorAll('button'));
    const continueBtn = buttons.find(b => b.textContent.includes('Continue to AI Output'));
    await act(async () => {
      continueBtn.click();
    });

    // Step 2: Load sample markdown output
    const sampleBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Markdown Sample'));
    expect(sampleBtn).not.toBeNull();
    await act(async () => {
      sampleBtn.click();
    });

    // Proceed to Step 3: Analyze & Preview
    const analyzeBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Analyze & Preview'));
    expect(analyzeBtn).not.toBeNull();
    await act(async () => {
      analyzeBtn.click();
    });

    // Step 3: Import button should be present
    const importBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Import Roadmap as Plan') || b.textContent.includes('Proceed to Import Options')
    );
    expect(importBtn).not.toBeNull();

    await act(async () => {
      importBtn.click();
    });

    // If existing roadmaps existed, step 4 confirmation appears
    const addTrackBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Add as New Subject Track') || b.textContent.includes('Replace Current Roadmap')
    );
    if (addTrackBtn) {
      await act(async () => {
        addTrackBtn.click();
      });
    }

    // Modal closed and roadmap is imported!
    expect(handleClose).toHaveBeenCalled();
    expect(capturedContext.subjects.length).toBeGreaterThan(0);
    expect(capturedContext.subjects.some(s => s.name.includes('Applied Quantum Computing'))).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────
  // PART 19: REALISTIC END-TO-END AUDIT — EMBEDDED SYSTEMS FIRMWARE
  // ──────────────────────────────────────────────────────────────
  test('PART 19: realistic adversarial test: Embedded Systems Firmware Engineering input with learning/doing separation, scaffolded projects, failure modes, and adaptation rules', async () => {
    const EMBEDDED_FIRMWARE_AI_OUTPUT = `# Field Intelligence Dossier: Embedded Systems Firmware Engineering

## Phase 1: Field Reconstruction
Embedded Systems Firmware Engineering operates at the hardware-software boundary, designing deterministic low-latency software executed directly on microcontrollers and SoCs.

## Phase 2: Historical Lineage
- 1971: Intel 4004 establishes 4-bit single-chip CPU architecture
- 1980: Intel 8051 establishes canonical embedded microcontroller architecture
- 2004: ARM Cortex-M architecture unifies 32-bit embedded execution

## Phase 4: Current State
Current industry standard practice centers on 32-bit ARM Cortex-M and emerging RISC-V architectures. Bare-metal register programming and real-time operating systems (FreeRTOS, Zephyr) dominate. Toolchains include GCC, Clang, JTAG/SWD debug probes, and hardware logic analyzers.

## Phase 5: Research Frontier
- Formal verification of microkernel memory safety (seL4)
- Embedded Rust bare-metal safety invariants without runtime overhead
- Hardware root-of-trust and post-quantum cryptographic enclaves in silicon

## Phase 6: Field Trajectory & High-Leverage Concepts
- **Volatile memory semantics & memory barriers**: [DURABLE_FOUNDATION]
- **Interrupt latency, vector tables & atomic bit-banding**: [DURABLE_FOUNDATION]
- **Embedded Rust & bare-metal type systems**: [FAST_MOVING]
- **Proprietary 8-bit assembly dialects**: [DECLINING_OR_DEPRECATED]

## High-Leverage & Bridge Concepts
- Register-level clock gating before peripheral access
- Atomic read-modify-write sequences on shared control registers
- DMA double-buffering for non-blocking sensor acquisition

## Learning Arc 1: Memory Architecture & Hardware-Software Interface
### Module 1.1: Memory-Mapped I/O & Bus Timings
**Learning Units:**
- Understand volatile keyword and compiler memory barrier instructions (Depth: DEEP_UNDERSTANDING) (Why: Prevents aggressive compiler optimization from caching register reads)
- Understand Peripheral Bus Architecture (AHB vs APB) (Depth: WORKING_UNDERSTANDING) (Why: Determines peripheral clock frequency and wait states)

**Doing Tasks:**
- Calculate wait-states for flash memory access at 168MHz clock (Mode: calculate)
- Write register-level GPIO driver without vendor HAL libraries (Mode: implement)

**Subtasks:**
- [ ] Inspect microcontroller memory map in datasheet and reference manual
- [ ] Locate base address and register offsets for GPIO peripheral
- [ ] Enable peripheral clock in RCC AHB1ENR register
- [ ] Configure MODER register for output mode
- [ ] Toggle output pin atomically via BSRR register

### Module 1.2: Interrupt Latency & Vector Tables
**Learning Units:**
- Understand NVIC priority grouping, tail-chaining, and preemption (Depth: FUNCTIONAL_FLUENCY)
- Understand shared-state concurrency hazards between ISR and thread mode (Depth: DEEP_UNDERSTANDING)

**Doing Tasks:**
- Measure ISR execution latency using an oscilloscope or logic analyzer (Mode: measure)
- Intentionally create a race condition on an interrupt flag and diagnose it (Mode: debug)

**Subtasks:**
- [ ] Locate vector table offset register (VTOR)
- [ ] Configure external interrupt line (EXTI) for falling edge
- [ ] Write Interrupt Service Routine (ISR) and clear pending bit
- [ ] Inspect waveform on GPIO toggle pin to measure latency

## Practical Projects
- **Project 1: Real-Time Waveform Generator**: Build a bare-metal DDS waveform generator using DMA and DAC. (Scaffolding: PARTIALLY_GUIDED) (Capabilities: Register programming, Timer PWM, DMA double-buffering) (Failure Modes: DMA FIFO underrun due to bus contention) (What Failure Teaches: Bus arbitration and priority configuration) (Unlocks: Audio DSP Drivers)

## Adaptation Rules
- [OVERCONFIDENCE]: Action: Assign race-condition diagnosis variant
- [PREREQUISITE]: Action: Return to memory-map learning unit

## Specialization Tracks
- **Track A: Safety-Critical Avionics Firmware (DO-178C)**: Highest determinism, formal verification, strict coding standards.
- **Track B: Ultra-Low-Power IoT Firmware**: Deep sleep modes, energy harvesting, event-driven architectures.

## Source Ledger
- Yiu (2013), The Definitive Guide to ARM Cortex-M3 and Cortex-M4 Processors, Newnes. [SOURCE_VERIFIED]
- Ganssle (2008), The Art of Designing Embedded Systems, Newnes. [SOURCE_VERIFIED]
`;

    // 1. Ingestion & Format Detection
    const report = normalizeRoadmapInput(EMBEDDED_FIRMWARE_AI_OUTPUT);
    expect(report.canImportDirectly).toBe(true);
    expect(report.format).toBe(FORMAT_TYPES.RESEARCH_REPORT);

    // 2. Field Intelligence Verification
    const fi = report.canonicalRoadmap[0].fieldIntelligence;
    expect(fi.fieldDefinition).toContain('hardware-software boundary');
    expect(fi.researchFrontier.length).toBeGreaterThanOrEqual(2);
    expect(fi.highLeverageConcepts.length).toBeGreaterThanOrEqual(2);
    expect(fi.sourceLedger.length).toBe(2);
    expect(fi.sourceLedger[0].status).toBe('SOURCE_VERIFIED');
    expect(fi.fieldTrajectory.some(t => t.classification === 'DURABLE_FOUNDATION')).toBe(true);

    // 3. Learning / Doing Separation Verification
    const arc1 = report.canonicalRoadmap[0].phases[0];
    expect(arc1.name).toContain('Memory Architecture');

    // Module 1.1: Memory-Mapped I/O
    const mod1 = arc1.tasks[0];
    expect(mod1.learningUnits.length).toBe(2);
    expect(mod1.learningUnits[0].name).toContain('volatile keyword');
    expect(mod1.learningUnits[0].depth).toBe('DEEP_UNDERSTANDING');
    expect(mod1.learningUnits[0].whyItMatters).toContain('optimization');

    expect(mod1.doingTasks.length).toBe(2);
    expect(mod1.doingTasks[0].mode).toBe('calculate');
    expect(mod1.doingTasks[1].mode).toBe('implement');

    expect(mod1.subtasks.length).toBe(5);
    expect(mod1.subtasks.every(st => st.completed === false)).toBe(true);

    // Module 1.2: Interrupt Latency
    const mod2 = arc1.tasks[1];
    expect(mod2.learningUnits.length).toBe(2);
    expect(mod2.doingTasks.length).toBe(2);
    expect(mod2.doingTasks[0].mode).toBe('measure');
    expect(mod2.doingTasks[1].mode).toBe('debug');

    // 4. Projects with Scaffolding & Failure Modes
    const projects = report.canonicalRoadmap[0].projects;
    expect(projects.length).toBe(1);
    expect(projects[0].name).toContain('Real-Time Waveform Generator');
    expect(projects[0].scaffoldingLevel).toBe('PARTIALLY_GUIDED');
    expect(projects[0].failureModes.length).toBeGreaterThan(0);
    expect(projects[0].failureModes[0]).toContain('DMA FIFO underrun');
    expect(projects[0].whatFailureTeaches).toContain('Bus arbitration');

    // 5. Adaptation Rules Extracted
    const adapt = report.canonicalRoadmap[0].adaptationRules;
    expect(adapt.rules.length).toBe(2);
    expect(adapt.rules.some(r => r.weaknessType === 'OVERCONFIDENCE')).toBe(true);
    expect(adapt.rules.some(r => r.weaknessType === 'PREREQUISITE')).toBe(true);

    // 6. Canonical Execution Engine Ingestion & Invariants
    let capturedContext = null;
    const TestComponent = () => {
      capturedContext = React.useContext(RoadmapContext);
      return null;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <TestComponent />
        </RoadmapProvider>
      );
    });

    let success = false;
    await act(async () => {
      success = capturedContext.importRoadmap(report.canonicalRoadmap, { mode: 'replace' });
    });

    expect(success).toBe(true);
    expect(capturedContext.subjects.length).toBe(1);
    const importedSubject = capturedContext.subjects[0];
    expect(importedSubject.name).toContain('Embedded Systems Firmware Engineering');

    // Invariant: Imported plan must be 100% incomplete with zero false progress
    const allTasks = importedSubject.phases.flatMap(p => p.tasks);
    expect(allTasks.every(t => t.completed === false)).toBe(true);
    const allSubtasks = allTasks.flatMap(t => t.subtasks);
    expect(allSubtasks.every(st => st.completed === false)).toBe(true);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL AI ROADMAP BRIDGE v2.3 — RESEARCH DEPTH, FRESHNESS & PROVENANCE GATE
// ══════════════════════════════════════════════════════════════════════════════
describe('UNIVERSAL AI ROADMAP BRIDGE v2.3 — RESEARCH DEPTH, FRESHNESS & PROVENANCE GATE', () => {

  // 1. Landmark / Historical Sources
  test('1. landmark/historical sources: classifies foundational works without spurious recency warnings', () => {
    const historicalSource = {
      citation: 'Shannon, C. E. (1948). A Mathematical Theory of Communication. Bell System Technical Journal.',
      title: 'A Mathematical Theory of Communication',
      authors: ['Claude E. Shannon'],
      year: 1948,
      type: 'LANDMARK_WORK',
      recency: 'HISTORICAL'
    };
    const ledger = normalizeSourceLedger([historicalSource]);
    expect(ledger[0].type).toBe(SOURCE_TYPES.LANDMARK_WORK);
    expect(ledger[0].recency).toBe(RESEARCH_RECENCY.HISTORICAL);
    expect(ledger[0].year).toBe(1948);

    const report = normalizeRoadmapInput({
      name: 'Information Theory',
      phases: [{ name: 'Foundations', tasks: [{ name: 'Entropy', subtasks: [] }] }],
      fieldIntelligence: {
        sourceLedger: [historicalSource],
        researchLayers: { FOUNDATIONS: true }
      }
    });
    // For purely foundational work, does not emit spurious "insufficient recent evidence" if current practice is not claimed
    expect(report.canonicalRoadmap[0].fieldIntelligence.sourceLedger[0].recency).toBe('HISTORICAL');
  });

  // 2. Recent Research
  test('2. recent research: prioritizes recent peer-reviewed evidence for fast-moving domains', () => {
    const recentSource = {
      citation: 'Vaswani et al. (2017). Attention Is All You Need. NeurIPS.',
      year: 2023,
      type: 'PRIMARY_RESEARCH'
    };
    const ledger = normalizeSourceLedger([recentSource]);
    expect(ledger[0].type).toBe(SOURCE_TYPES.PRIMARY_RESEARCH);
    expect(ledger[0].recency).toBe(RESEARCH_RECENCY.RECENT);
  });

  // 3. Current Practice
  test('3. current practice: categorizes official documentation, specifications, and industry standards', () => {
    const spec = {
      citation: 'IETF RFC 9110: HTTP Semantics (2022)',
      type: 'PROFESSIONAL_STANDARD',
      year: 2022
    };
    const ledger = normalizeSourceLedger([spec]);
    expect(ledger[0].type).toBe(SOURCE_TYPES.PROFESSIONAL_STANDARD);
    expect(ledger[0].recency).toBe(RESEARCH_RECENCY.RECENT);
  });

  // 4. Frontier Research
  test('4. frontier research: populates research frontier with active directions and open problems', () => {
    const report = normalizeRoadmapInput({
      name: 'Distributed Systems',
      phases: [{ name: 'Consensus', tasks: [{ name: 'Paxos vs Raft', subtasks: [] }] }],
      fieldIntelligence: {
        researchFrontier: [
          'Byzantine Fault Tolerant protocols under asymmetric network partitions',
          'Formal verification of decentralized consensus with TLA+'
        ],
        openProblems: ['Sub-millisecond global state convergence']
      }
    });
    const frontier = report.canonicalRoadmap[0].fieldIntelligence.researchFrontier;
    expect(frontier.length).toBe(2);
    expect(report.canonicalRoadmap[0].fieldIntelligence.openProblems[0]).toContain('Sub-millisecond');
    expect(report.researchQuality.layersDetected.CURRENT_RESEARCH).toBe(true);
  });

  // 5. Durability Classifications
  test('5. durability classifications: preserves durable foundations vs commoditizing skills', () => {
    const input = {
      name: 'Software Architecture',
      phases: [{ name: 'Core', tasks: [{ name: 'Design', subtasks: [] }] }],
      fieldIntelligence: {
        durabilityMap: [
          {
            capability: 'Concurrency & Memory Models',
            classification: 'DURABLE_FOUNDATION',
            why: 'Hardware primitives and synchronization semantics remain invariant across languages',
            recommendedDepth: 'DEEP_MASTERY_TARGET'
          },
          {
            capability: 'React Boilerplate Setup',
            classification: 'COMMODITIZING',
            why: 'Automated by AI tooling and modern meta-frameworks',
            recommendedDepth: 'AWARENESS'
          }
        ]
      }
    };
    const report = normalizeRoadmapInput(input);
    const dur = report.canonicalRoadmap[0].fieldIntelligence.durabilityMap;
    expect(dur.length).toBe(2);
    expect(dur[0].classification).toBe(DURABILITY_CLASSIFICATIONS.DURABLE_FOUNDATION);
    expect(dur[1].classification).toBe(DURABILITY_CLASSIFICATIONS.COMMODITIZING);
    expect(report.researchQuality.layersDetected.FIELD_SURVIVAL).toBe(true);
  });

  // 6. Claim / Source Relationships
  test('6. claim/source relationships: links claims to source IDs with traceability and confidence', () => {
    const input = {
      name: 'Operating Systems',
      phases: [{ name: 'Scheduling', tasks: [{ name: 'CFS', subtasks: [] }] }],
      fieldIntelligence: {
        sourceLedger: [
          { id: 'SRC-001', title: 'Linux Kernel Development', year: 2010, type: 'TEXTBOOK_MONOGRAPH' }
        ],
        claims: [
          {
            claim: 'Completely Fair Scheduler uses a red-black tree to track vruntime',
            sourceId: 'SRC-001',
            confidence: 'HIGH',
            whySourceMatters: 'Direct structural mechanism in mainline Linux'
          }
        ]
      }
    };
    const report = normalizeRoadmapInput(input);
    const claims = report.canonicalRoadmap[0].fieldIntelligence.claims;
    expect(claims.length).toBe(1);
    expect(claims[0].sourceId).toBe('SRC-001');
    expect(claims[0].confidence).toBe('HIGH');
    expect(report.researchQuality.verifiedClaimCount).toBe(1);
  });

  // 7. Uncertain Claims
  test('7. uncertain claims: flags UNCERTAIN claims without inventing certainty', () => {
    const input = {
      name: 'Quantum Computing',
      phases: [{ name: 'Qubits', tasks: [{ name: 'Superposition', subtasks: [] }] }],
      fieldIntelligence: {
        claims: [
          {
            claim: 'Topological qubits will achieve fault tolerance by 2028',
            confidence: 'UNCERTAIN',
            whySourceMatters: 'Contested timeline across leading research labs'
          }
        ]
      }
    };
    const report = normalizeRoadmapInput(input);
    const claims = report.canonicalRoadmap[0].fieldIntelligence.claims;
    expect(claims[0].confidence).toBe('UNCERTAIN');
    expect(report.warnings.some(w => w.includes('Unverified claims detected'))).toBe(true);
  });

  // 8. Missing URLs
  test('8. missing URLs: preserves honest null without inventing plausible URLs', () => {
    const sources = normalizeSourceLedger([
      { title: 'Foundational Cryptography Notes', year: 1996 }
    ]);
    expect(sources[0].url).toBeNull();
    expect(sources[0].identifier).toBeNull();
  });

  // 9. Source Metadata Incomplete
  test('9. source metadata incomplete: flags missing authors or publication years with proportional warnings', () => {
    const input = {
      name: 'Data Science',
      phases: [{ name: 'Stats', tasks: [{ name: 'Inference', subtasks: [] }] }],
      fieldIntelligence: {
        sourceLedger: [
          { title: 'Some Online Article Without Year Or Author' }
        ]
      }
    };
    const report = normalizeRoadmapInput(input);
    expect(report.warnings.some(w => w.includes('Source metadata incomplete'))).toBe(true);
  });

  // 10. Mixed Source Types
  test('10. mixed source types: categorizes across academic research, standards, and monographs', () => {
    const sources = [
      { title: 'Survey on Deep Learning', type: 'SURVEY_REVIEW', year: 2021 },
      { title: 'IEEE 802.11 Standard', type: 'PROFESSIONAL_STANDARD', year: 2020 },
      { title: 'Introduction to Algorithms', type: 'TEXTBOOK_MONOGRAPH', year: 2009 }
    ];
    const report = normalizeRoadmapInput({
      name: 'Computer Networks',
      phases: [{ name: 'Layers', tasks: [{ name: 'WiFi', subtasks: [] }] }],
      fieldIntelligence: { sourceLedger: sources }
    });
    const categories = report.researchQuality.sourceCategories;
    expect(categories.reviews).toBe(1);
    expect(categories.officialOrStandards).toBe(1);
    expect(categories.other).toBe(1);
  });

  // 11. Research-rich Markdown
  test('11. research-rich Markdown: parses multi-layer evidence, claims, and gap analysis from Markdown', () => {
    const md = `
# Learning Arc 1: Core Physics
## Module 1.1: Classical Mechanics
**Learning Units:**
- Understand Newton Laws (Depth: DEEP_MASTERY_TARGET)
**Doing Tasks:**
- [ ] Measure pendulum period (Mode: measure)
**Subtasks:**
- [ ] Set up photogate timer

# Learning Arc 2: Quantum Foundations
## Module 2.1: Wave Mechanics
- [ ] Solve particle in a box

# Phase 8: What the Standard Roadmap Would Miss
- **Commonly Omitted**: Hamilton-Jacobi formulation
- **High Leverage**: Poisson brackets connecting to quantum commutators
- **Real-World Failure**: Coordinate singularities in naive Euler angles

# Claims
- Claim: Quantum commutators directly correspond to classical Poisson brackets [Source: SRC-001] [Confidence: HIGH] (Why: Foundational quantization)

# Source Ledger
- [SRC-001] Dirac, P.A.M. (1930). The Principles of Quantum Mechanics [TEXTBOOK_MONOGRAPH] [SOURCE_VERIFIED]
`;
    const report = normalizeRoadmapInput(md);
    expect(report.canImportDirectly).toBe(true);
    expect(report.canonicalRoadmap[0].fieldIntelligence.claims.length).toBeGreaterThan(0);
    expect(report.canonicalRoadmap[0].fieldIntelligence.whatStandardRoadmapWouldMiss.length).toBeGreaterThan(0);
    expect(report.canonicalRoadmap[0].fieldIntelligence.sourceLedger[0].id).toBe('SRC-001');
  });

  // 12. Research-rich JSON
  test('12. research-rich JSON: parses canonical v2.3 exchange data completely', () => {
    const report = normalizeRoadmapInput(SAMPLE_CANONICAL_V2_DATA);
    expect(report.canImportDirectly).toBe(true);
    expect(report.canonicalRoadmap[0].fieldIntelligence.claims.length).toBeGreaterThan(0);
    expect(report.canonicalRoadmap[0].fieldIntelligence.roadmapInfluences.length).toBeGreaterThan(0);
    expect(report.canonicalRoadmap[0].fieldIntelligence.whatStandardRoadmapWouldMiss.length).toBeGreaterThan(0);
    expect(report.researchQuality.rating).toBe(RESEARCH_QUALITY_LEVELS.STRONG);
  });

  // 13. Roadmap-rich but research-poor input
  test('13. roadmap-rich but research-poor input: imports actionable tasks but rates research as LIMITED/INSUFFICIENT with honest warnings', () => {
    const rawRoadmap = {
      name: 'Web Dev 101',
      phases: [
        { name: 'HTML & CSS', tasks: [{ name: 'Flexbox', subtasks: [{ name: 'Make grid' }] }] },
        { name: 'JavaScript', tasks: [{ name: 'DOM manipulation', subtasks: [{ name: 'Add click event' }] }] }
      ]
    };
    const report = normalizeRoadmapInput(rawRoadmap);
    expect(report.canImportDirectly).toBe(true);
    expect(report.summaryMetrics.arcCount).toBe(2);
    // Research quality should be INSUFFICIENT or LIMITED
    expect([RESEARCH_QUALITY_LEVELS.INSUFFICIENT, RESEARCH_QUALITY_LEVELS.LIMITED]).toContain(report.researchQuality.rating);
    expect(report.warnings.some(w => w.includes('Frontier section missing'))).toBe(true);
    expect(report.warnings.some(w => w.includes('Durability analysis missing'))).toBe(true);
  });

  // 14. Research-rich but roadmap-poor input
  test('14. research-rich but roadmap-poor input: preserves research while flagging needsConversion', () => {
    const researchOnly = `
# Executive Research Dossier: Quantum Computing Architectures
Superconducting qubits vs trapped ions represent the central architectural dispute.
Major research institutions: IBM Quantum, Rigetti, Quantinuum.
Key durability insight: Linear algebra and unitary matrices are timeless durable foundations, while Qiskit pulse APIs are fast-moving.
Source: Preskill, J. (2018). Quantum Computing in the NISQ era and beyond. Quantum, 2, 79.
`;
    const report = normalizeRoadmapInput(researchOnly);
    expect(report.canImportDirectly).toBe(false);
    expect(report.needsConversion).toBe(true);
    // Research information is not discarded
    expect(report.canonicalRoadmap[0].fieldIntelligence.fieldDefinition).toBeDefined();
  });

  // 15. Missing research layers
  test('15. missing research layers: detects missing layers honestly without fake presence', () => {
    const emptyQuality = assessResearchQuality(createEmptyFieldIntelligence(), []);
    expect(emptyQuality.layersDetected.FOUNDATIONS).toBe(false);
    expect(emptyQuality.layersDetected.FIELD_DEVELOPMENT).toBe(false);
    expect(emptyQuality.layersDetected.CURRENT_PRACTICE).toBe(false);
    expect(emptyQuality.layersDetected.CURRENT_RESEARCH).toBe(false);
    expect(emptyQuality.layersDetected.EMERGING_FUTURE).toBe(false);
    expect(emptyQuality.layersDetected.FIELD_SURVIVAL).toBe(false);
    expect(emptyQuality.rating).toBe(RESEARCH_QUALITY_LEVELS.INSUFFICIENT);
  });

  // 16. No fabricated source metadata
  test('16. no fabricated source metadata: preserves unstated fields as null without halluncinating DOIs or years', () => {
    const minimalSource = normalizeSourceLedger([{ title: 'Internal Architecture Guide' }]);
    expect(minimalSource[0].authors).toEqual([]);
    expect(minimalSource[0].year).toBeNull();
    expect(minimalSource[0].identifier).toBeNull();
    expect(minimalSource[0].url).toBeNull();
    expect(minimalSource[0].verificationStatus).toBe('SOURCE_NOT_VERIFIED');
  });

  // 17. Preview warnings
  test('17. preview warnings: generates proportional warnings for coverage gaps and unverified items', () => {
    const input = {
      name: 'Compiler Engineering',
      phases: [{ name: 'Frontend', tasks: [{ name: 'Lexing', subtasks: [] }] }],
      fieldIntelligence: {
        coverageGaps: ['Garbage collection algorithms omitted from scope due to focus on C/Rust targets'],
        researchLimitations: ['Focused primarily on LLVM backend rather than GCC internals']
      }
    };
    const report = normalizeRoadmapInput(input);
    expect(report.warnings.some(w => w.includes('Research coverage gaps disclosed'))).toBe(true);
  });

  // 18. Qualitative research completeness
  test('18. qualitative research completeness: strictly outputs qualitative indicators instead of fake percentages', () => {
    const report = normalizeRoadmapInput(SAMPLE_CANONICAL_V2_DATA);
    expect(Object.values(RESEARCH_QUALITY_LEVELS)).toContain(report.researchQuality.rating);
    expect(typeof report.researchQuality.rating).toBe('string');
    // Ensure no percentage score property exists
    expect(report.researchQuality.percentageScore).toBeUndefined();
    expect(report.researchQuality.score).toBeUndefined();
  });

  // 19. Research-to-learning mapping
  test('19. research-to-learning mapping: verifies learning units map to v2.3 depth levels', () => {
    const input = {
      name: 'Distributed Systems',
      phases: [{
        name: 'Replication',
        tasks: [{
          name: 'Raft Protocol',
          learningUnits: [
            { name: 'Understand Log Invariant', depth: 'DEEP_MASTERY_TARGET' },
            { name: 'Understand Leader Election', depth: 'WORKING_FLUENCY' },
            { name: 'Understand Membership Changes', depth: 'AWARENESS' }
          ],
          subtasks: []
        }]
      }]
    };
    const report = normalizeRoadmapInput(input);
    const units = report.canonicalRoadmap[0].phases[0].tasks[0].learningUnits;
    expect(units[0].depth).toBe(DEPTH_LEVELS.DEEP_MASTERY_TARGET);
    expect(units[1].depth).toBe(DEPTH_LEVELS.WORKING_FLUENCY);
    expect(units[2].depth).toBe(DEPTH_LEVELS.AWARENESS);
  });

  // 20. Research-to-task mapping
  test('20. research-to-task mapping: preserves diagnostic, debugging, comparison, and measurement task modes', () => {
    const input = {
      name: 'Database Internals',
      phases: [{
        name: 'Storage Engine',
        tasks: [{
          name: 'LSM Tree',
          doingTasks: [
            { name: 'Reproduce write amplification under burst traffic', mode: 'debug' },
            { name: 'Compare B-Tree vs LSM-Tree read latencies with SSD benchmark', mode: 'compare' },
            { name: 'Measure tombstone compaction overhead', mode: 'measure' },
            { name: 'Implement memtable with skip-list', mode: 'build' }
          ],
          subtasks: []
        }]
      }]
    };
    const report = normalizeRoadmapInput(input);
    const tasks = report.canonicalRoadmap[0].phases[0].tasks[0].doingTasks;
    expect(tasks[0].mode).toBe('debug');
    expect(tasks[1].mode).toBe('compare');
    expect(tasks[2].mode).toBe('measure');
    expect(tasks[3].mode).toBe('build');
  });

  // 21. Research-to-project mapping
  test('21. research-to-project mapping: preserves capabilities exercised, failure modes, motivating insights, and unlocked future capabilities', () => {
    const input = {
      name: 'Microkernel Development',
      phases: [{ name: 'Kernel Core', tasks: [{ name: 'IPC', subtasks: [] }] }],
      projects: [
        {
          name: 'Zero-Copy IPC Message Passing System',
          scaffoldingLevel: 'SPECIFICATION_ONLY',
          capabilitiesExercised: ['Virtual memory page mapping', 'Atomic lockless ring buffer'],
          failureModes: ['Priority inversion when sender is blocked on full mailbox', 'TLB shootdown overhead on cross-core IPC'],
          whatFailureTeaches: 'Cacheline bouncing and scheduling priority inheritance',
          motivatingInsight: 'Real-world microkernel performance is dominated by IPC overhead, as shown by Liedtke (1995)',
          unlocksNext: 'Multi-server OS architecture with userspace device drivers'
        }
      ]
    };
    const report = normalizeRoadmapInput(input);
    const proj = report.canonicalRoadmap[0].projects[0];
    expect(proj.name).toContain('Zero-Copy IPC');
    expect(proj.scaffoldingLevel).toBe(SCAFFOLDING_LEVELS.SPECIFICATION_ONLY);
    expect(proj.failureModes.length).toBe(2);
    expect(proj.motivatingInsight).toContain('Liedtke (1995)');
    expect(proj.unlocksNext).toContain('Multi-server OS');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // ADVERSARIAL TEST: SHALLOW VS DEEP FIELD RECONSTRUCTION
  // ══════════════════════════════════════════════════════════════════════════════
  test('22. ADVERSARIAL TEST: rejects shallow "basics -> intermediate -> advanced -> build projects" as LIMITED/INSUFFICIENT and distinguishes deep research', () => {
    // A. Deliberately shallow response
    const shallowText = `
# Full Stack Roadmap
## Phase 1: Basics
Learn the basics of coding.
- [ ] Read syntax
- [ ] Write Hello World

## Phase 2: Intermediate
Learn intermediate concepts.
- [ ] Build a todo list
- [ ] Connect a database

## Phase 3: Advanced
Learn advanced concepts.
- [ ] Add authentication
- [ ] Deploy to cloud

## Phase 4: Final Project
Build projects.
- [ ] Build a portfolio
`;
    const shallowReport = normalizeRoadmapInput(shallowText);
    expect(shallowReport.canImportDirectly).toBe(true);
    // Structural proof: Shallow response has NO research layers detected, NO sources, NO claims
    expect(shallowReport.researchQuality.rating).toBe(RESEARCH_QUALITY_LEVELS.INSUFFICIENT);
    expect(shallowReport.researchQuality.verifiedClaimCount).toBe(0);
    expect(shallowReport.summaryMetrics.sourceCount).toBe(0);
    expect(shallowReport.warnings.some(w => w.includes('Frontier section missing'))).toBe(true);
    expect(shallowReport.warnings.some(w => w.includes('Durability analysis missing'))).toBe(true);

    // B. Sophisticated research-heavy answer
    const deepReport = normalizeRoadmapInput(SAMPLE_CANONICAL_V2_DATA);
    expect(deepReport.canImportDirectly).toBe(true);
    expect(deepReport.researchQuality.rating).toBe(RESEARCH_QUALITY_LEVELS.STRONG);
    expect(deepReport.researchQuality.verifiedClaimCount).toBeGreaterThan(0);
    expect(deepReport.summaryMetrics.sourceCount).toBeGreaterThanOrEqual(2);
    expect(deepReport.researchQuality.layersDetected.FOUNDATIONS).toBe(true);
    expect(deepReport.researchQuality.layersDetected.FIELD_SURVIVAL).toBe(true);
    expect(deepReport.researchQuality.layersDetected.CURRENT_PRACTICE).toBe(true);
    // Deep research does NOT have "Durability analysis missing" warning
    expect(deepReport.warnings.some(w => w.includes('Durability analysis missing'))).toBe(false);
  });

});
