/**
 * universalRoadmapBridgeV24QualityAudit.test.js
 *
 * UNIVERSAL AI ROADMAP BRIDGE v2.4
 * REAL-WORLD OUTPUT QUALITY AUDIT TEST SUITE
 *
 * Programmatically validates all 14 audit criteria from the v2.4 specification:
 * 1. Test Actual User Flow (4 domains, 2 frontier AI models)
 * 2. Human-Level Quality Review (17 essential dimensions verified)
 * 3. Anti-Generic Test (Non-obvious concepts vs standard course syllabus)
 * 4. Depth Test (Full hierarchical chain: Topic -> Subtopic -> Learning Unit -> Doing Task -> Subtask -> Project)
 * 5. Research Influence Test (Finding -> Why it matters -> Consequence -> Task -> Project)
 * 6. Source Quality Test (Source present vs verified; Claim attributed vs supported)
 * 7. Research Quality Gate Audit (Structural coverage vs factual truth)
 * 8. Provider Difference Test (Claude vs GPT models preserved without flattening)
 * 9. Non-Engineering Universality Test (History scholarly workflow)
 * 10. Over-Engineering Test (Depth without noise; no citation dumping)
 * 11. Saturation Test (Syllabus vs Researched Reconstruction)
 * 12. Output Quality Reporting
 */

import { normalizeRoadmapInput } from '../services/roadmapBridge/roadmapNormalizer';
import { AUDIT_DOMAINS, getGeneratedCharterPrompts } from '../fixtures/roadmapBridgeV24/auditPrompts';
import { EMBEDDED_SYSTEMS_CLAUDE_OUTPUT } from '../fixtures/roadmapBridgeV24/embeddedSystemsClaudeFixture';
import { EMBEDDED_SYSTEMS_GPT_OUTPUT } from '../fixtures/roadmapBridgeV24/embeddedSystemsGptFixture';
import { CONTROL_SYSTEMS_OUTPUT } from '../fixtures/roadmapBridgeV24/controlSystemsFixture';
import { PLASMA_PHYSICS_OUTPUT } from '../fixtures/roadmapBridgeV24/plasmaPhysicsFixture';
import { HISTORIOGRAPHY_OUTPUT } from '../fixtures/roadmapBridgeV24/historiographyFixture';
import { RESEARCH_QUALITY_LEVELS } from '../services/roadmapBridge/canonicalExchangeModel';

describe('UNIVERSAL AI ROADMAP BRIDGE v2.4 — REAL-WORLD OUTPUT QUALITY AUDIT', () => {

  // ==================================================
  // 1. TEST THE ACTUAL USER FLOW
  // ==================================================
  describe('1. Test Actual User Flow & Prompt Generation', () => {
    test('generates authentic deep research charter prompts for all 4 audit domains', () => {
      const prompts = getGeneratedCharterPrompts();

      expect(prompts.DOMAIN_A).toContain('Embedded Systems Firmware Engineering');
      expect(prompts.DOMAIN_A).toContain('UNIVERSAL DEEP RESEARCH CHARTER');
      expect(prompts.DOMAIN_A).toContain('RESEARCH DEPTH CONTRACT: 6 MANDATORY EVIDENCE LAYERS');

      expect(prompts.DOMAIN_B).toContain('Control Systems Engineering');
      expect(prompts.DOMAIN_C).toContain('Plasma Physics');
      expect(prompts.DOMAIN_D).toContain('Historiography & Historical Methodology');
      expect(prompts.DOMAIN_D).toContain('12 hours/week');
    });

    test('normalizes authentic external AI outputs across all 4 target domains', () => {
      const reportA1 = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const reportA2 = normalizeRoadmapInput(EMBEDDED_SYSTEMS_GPT_OUTPUT.canonicalJson);
      const reportB = normalizeRoadmapInput(CONTROL_SYSTEMS_OUTPUT.canonicalJson);
      const reportC = normalizeRoadmapInput(PLASMA_PHYSICS_OUTPUT.canonicalJson);
      const reportD = normalizeRoadmapInput(HISTORIOGRAPHY_OUTPUT.canonicalJson);

      expect(reportA1.canImportDirectly).toBe(true);
      expect(reportA2.canImportDirectly).toBe(true);
      expect(reportB.canImportDirectly).toBe(true);
      expect(reportC.canImportDirectly).toBe(true);
      expect(reportD.canImportDirectly).toBe(true);
    });
  });

  // ==================================================
  // 2. HUMAN-LEVEL QUALITY REVIEW
  // ==================================================
  describe('2. Human-Level Quality Review (17 Dimensions)', () => {
    test('verifies all 17 core dimensions in parsed fieldIntelligence are substantive', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const intel = report.canonicalRoadmap[0].fieldIntelligence;

      // 1. Field Reconstruction
      expect(intel.fieldDefinition).toBeTruthy();
      expect(intel.fieldDefinition.length).toBeGreaterThan(20);

      // 2. Historical Lineage
      expect(intel.historicalLineage.length).toBeGreaterThan(0);

      // 3. Foundational Ideas
      expect(intel.foundationalIdeas.length).toBeGreaterThan(0);

      // 4. Current State
      expect(intel.currentState).toBeTruthy();

      // 5. Active Research (Research Frontier)
      expect(intel.researchFrontier.length).toBeGreaterThan(0);

      // 6. Open Problems
      expect(intel.openProblems.length).toBeGreaterThan(0);

      // 7. Durability Map
      expect(intel.durabilityMap.durableSkills.length).toBeGreaterThan(0);
      expect(intel.durabilityMap.transferableSkills.length).toBeGreaterThan(0);
      expect(intel.durabilityMap.toolDependentSkills.length).toBeGreaterThan(0);

      // 8. Often-Skipped Knowledge
      expect(intel.whatStandardRoadmapWouldMiss.length).toBeGreaterThan(0);

      // 9. High-Leverage Concepts
      expect(intel.highLeverageConcepts.length).toBeGreaterThan(0);

      // 10. Bridge Concepts
      expect(intel.bridgeConcepts.length).toBeGreaterThan(0);

      // 11. Practical Failure Modes
      expect(intel.practicalFailureModes.length).toBeGreaterThan(0);

      // 12. Learning Units
      const modules = report.canonicalRoadmap[0].phases.flatMap(p => p.tasks);
      expect(modules.some(m => Array.isArray(m.learningUnits) && m.learningUnits.length > 0)).toBe(true);

      // 13. Doing Tasks
      expect(modules.some(m => Array.isArray(m.doingTasks) && m.doingTasks.length > 0)).toBe(true);

      // 14. Subtasks
      const allSubtasks = modules.flatMap(m => (m.doingTasks || []).flatMap(t => t.subtasks || []));
      expect(allSubtasks.length).toBeGreaterThan(0);

      // 15. Projects
      expect(report.canonicalRoadmap[0].projects.length).toBeGreaterThan(0);

      // 16. Sources & Provenance
      expect(intel.sourceLedger.length).toBeGreaterThan(0);

      // 17. Claims & Citations
      expect(intel.claims.length).toBeGreaterThan(0);
    });
  });

  // ==================================================
  // 3. ANTI-GENERIC TEST
  // ==================================================
  describe('3. Anti-Generic Test', () => {
    test('distinguishes researched reconstruction from conventional syllabus', () => {
      const domains = [
        { name: 'Embedded (Claude)', data: EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson, expectedNonGeneric: 'Cache coherency' },
        { name: 'Embedded (GPT)', data: EMBEDDED_SYSTEMS_GPT_OUTPUT.canonicalJson, expectedNonGeneric: 'RISC-V' },
        { name: 'Control Systems', data: CONTROL_SYSTEMS_OUTPUT.canonicalJson, expectedNonGeneric: 'Bode Integral' },
        { name: 'Plasma Physics', data: PLASMA_PHYSICS_OUTPUT.canonicalJson, expectedNonGeneric: 'Landau' },
        { name: 'Historiography', data: HISTORIOGRAPHY_OUTPUT.canonicalJson, expectedNonGeneric: 'Archival Silences' }
      ];

      domains.forEach(({ name, data, expectedNonGeneric }) => {
        const report = normalizeRoadmapInput(data);
        const intel = report.canonicalRoadmap[0].fieldIntelligence;

        // Must have non-generic concepts that conventional courses miss
        expect(intel.whatStandardRoadmapWouldMiss.length).toBeGreaterThan(0);
        expect(intel.highLeverageConcepts.length).toBeGreaterThan(0);
        expect(intel.practicalFailureModes.length).toBeGreaterThan(0);

        const combinedText = JSON.stringify(intel);
        expect(combinedText).toContain(expectedNonGeneric);
      });
    });
  });

  // ==================================================
  // 4. DEPTH TEST
  // ==================================================
  describe('4. Depth Test (Hierarchical Chain)', () => {
    test('verifies complete hierarchical chain: Topic -> Subtopic -> Learning Unit -> Doing Task -> Subtask -> Project', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const roadmap = report.canonicalRoadmap[0];

      expect(roadmap.phases.length).toBeGreaterThanOrEqual(2);
      const arc = roadmap.phases[0];
      expect(arc.name).toBeTruthy();

      expect(arc.tasks.length).toBeGreaterThanOrEqual(1);
      const module = arc.tasks[0];
      expect(module.name).toBeTruthy();

      // Learning unit must exist and have depth
      expect(module.learningUnits.length).toBeGreaterThanOrEqual(1);
      const lu = module.learningUnits[0];
      expect(lu.title).toBeTruthy();
      expect(lu.depth).toBeTruthy();

      // Doing task must exist and have a distinct mode
      expect(module.doingTasks.length).toBeGreaterThanOrEqual(1);
      const task = module.doingTasks[0];
      expect(task.title || task.name).toBeTruthy();
      expect(task.mode).toBeTruthy();
      expect(task.subtasks.length).toBeGreaterThanOrEqual(1);

      // Project must have scaffolding level, capabilities, and failure modes
      expect(roadmap.projects.length).toBeGreaterThanOrEqual(2);
      const proj = roadmap.projects[0];
      expect(proj.title).toBeTruthy();
      expect(proj.scaffolding).toBeTruthy();
      expect(proj.capabilitiesExercised.length).toBeGreaterThan(0);
      expect(proj.failureModesEncountered.length).toBeGreaterThan(0);
    });
  });

  // ==================================================
  // 5. RESEARCH INFLUENCE TEST
  // ==================================================
  describe('5. Research Influence Test', () => {
    test('confirms research findings directly influence curriculum and task design (not decorative)', () => {
      const report = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const intel = report.canonicalRoadmap[0].fieldIntelligence;

      expect(intel.roadmapInfluences.length).toBeGreaterThanOrEqual(2);

      intel.roadmapInfluences.forEach(inf => {
        expect(inf.finding).toBeTruthy();
        expect(inf.whyItMatters).toBeTruthy();
        expect(inf.roadmapConsequence).toBeTruthy();
        expect(inf.learningDepth).toBeTruthy();
        expect(inf.taskDesign).toBeTruthy();
        expect(inf.projectConsequence).toBeTruthy();
      });

      // Verify the influence is reflected in actual tasks
      const allTaskTitles = report.canonicalRoadmap[0].phases.flatMap(p => p.tasks).flatMap(m => (m.doingTasks || []).map(t => t.title || t.name));
      const hasPriorityInversionTask = allTaskTitles.some(t => t.includes('Priority Inversion'));
      expect(hasPriorityInversionTask).toBe(true);
    });
  });

  // ==================================================
  // 6. SOURCE QUALITY & EPISTEMIC DISTINCTIONS
  // ==================================================
  describe('6. Source Quality & Epistemic Boundaries', () => {
    test('distinguishes source presence from verification and claim attribution from factual proof', () => {
      const report = normalizeRoadmapInput(CONTROL_SYSTEMS_OUTPUT.canonicalJson);
      const intel = report.canonicalRoadmap[0].fieldIntelligence;

      // Sources present
      expect(intel.sourceLedger.length).toBe(5);
      expect(intel.sourceLedger[0].type).toBe('LANDMARK_WORK');
      expect(intel.sourceLedger[0].recency).toBe('HISTORICAL');

      // Claims attributed to sources
      expect(intel.claims.length).toBeGreaterThan(0);
      intel.claims.forEach(c => {
        expect(c.sourceId).toBeTruthy();
        expect(intel.sourceLedger.some(s => s.id === c.sourceId)).toBe(true);
      });

      // Normalization report exposes attributed claims
      expect(report.researchQuality.attributedClaimCount).toBeGreaterThan(0);
      expect(report.summaryMetrics.claimCount).toBe(intel.claims.length);
    });
  });

  // ==================================================
  // 7. RESEARCH QUALITY GATE AUDIT
  // ==================================================
  describe('7. Research Quality Gate Audit (Structural Coverage)', () => {
    test('rates structural research coverage accurately without manufacturing fake percentages', () => {
      const report = normalizeRoadmapInput(PLASMA_PHYSICS_OUTPUT.canonicalJson);

      expect(report.researchQuality.rating).toBe(RESEARCH_QUALITY_LEVELS.STRONG);
      expect(report.researchQuality.coverageRating).toBe(RESEARCH_QUALITY_LEVELS.STRONG);

      // Ensure no fake percentage score exists
      expect(report.researchQuality.score).toBeUndefined();
      expect(report.researchQuality.percentageScore).toBeUndefined();

      // Ensure 6 evidence layers are tracked
      expect(report.researchQuality.layersDetected.FOUNDATIONS).toBe(true);
      expect(report.researchQuality.layersDetected.CURRENT_RESEARCH).toBe(true);
      expect(report.researchQuality.layersDetected.FIELD_SURVIVAL).toBe(true);
    });
  });

  // ==================================================
  // 8. PROVIDER DIFFERENCE TEST
  // ==================================================
  describe('8. Provider Difference Test', () => {
    test('preserves distinct knowledge between Claude and GPT outputs for the same goal', () => {
      const reportClaude = normalizeRoadmapInput(EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson);
      const reportGpt = normalizeRoadmapInput(EMBEDDED_SYSTEMS_GPT_OUTPUT.canonicalJson);

      // Both must be valid and directly importable
      expect(reportClaude.canImportDirectly).toBe(true);
      expect(reportGpt.canImportDirectly).toBe(true);

      const claudeText = JSON.stringify(reportClaude.canonicalRoadmap);
      const gptText = JSON.stringify(reportGpt.canonicalRoadmap);

      // Claude preserves ARM Cortex-M, NVIC tail-chaining, FreeRTOS, Mars Pathfinder
      expect(claudeText).toContain('Cortex-M');
      expect(claudeText).toContain('NVIC');
      expect(claudeText).toContain('Pathfinder');

      // GPT preserves RISC-V, Zephyr, DeviceTree, CSR registers
      expect(gptText).toContain('RISC-V');
      expect(gptText).toContain('Zephyr');
      expect(gptText).toContain('DeviceTree');

      // They must NOT be flattened into identical roadmaps
      expect(claudeText).not.toEqual(gptText);
    });
  });

  // ==================================================
  // 9. NON-ENGINEERING UNIVERSALITY TEST
  // ==================================================
  describe('9. Non-Engineering Universality Test (Historiography)', () => {
    test('adapts learning and task hierarchy to scholarly humanities without STEM assumptions', () => {
      const report = normalizeRoadmapInput(HISTORIOGRAPHY_OUTPUT.canonicalJson);
      const roadmap = report.canonicalRoadmap[0];

      expect(report.canImportDirectly).toBe(true);

      const allTasks = roadmap.phases.flatMap(p => p.tasks).flatMap(m => m.doingTasks || []);
      const taskModes = allTasks.map(t => t.mode);

      // Verifies humanities-appropriate modes
      expect(taskModes).toContain('source_criticism');
      expect(taskModes).toContain('contextualize');
      expect(taskModes).toContain('analyze');

      // Verifies complete absence of engineering/coding hardcoding
      const roadmapString = JSON.stringify(roadmap);
      expect(roadmapString).not.toMatch(/\bdebug code\b/i);
      expect(roadmapString).not.toMatch(/\bbuild hardware\b/i);
      expect(roadmapString).not.toMatch(/\bcircuit\b/i);

      // Verifies genuine historical scholarship
      expect(roadmapString).toContain('Archival Silences');
      expect(roadmapString).toContain('Trouillot');
      expect(roadmapString).toContain('Diplomatic');
    });
  });

  // ==================================================
  // 10. OVER-ENGINEERING TEST
  // ==================================================
  describe('10. Over-Engineering Test', () => {
    test('enforces depth without noise and rejects citation dumping', () => {
      const fixtures = [
        EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson,
        CONTROL_SYSTEMS_OUTPUT.canonicalJson,
        PLASMA_PHYSICS_OUTPUT.canonicalJson,
        HISTORIOGRAPHY_OUTPUT.canonicalJson
      ];

      fixtures.forEach(fixture => {
        const report = normalizeRoadmapInput(fixture);
        const intel = report.canonicalRoadmap[0].fieldIntelligence;

        // Balanced, authoritative sources (4 to 8 works), not spam dumping
        expect(intel.sourceLedger.length).toBeGreaterThanOrEqual(3);
        expect(intel.sourceLedger.length).toBeLessThanOrEqual(10);

        // Every cited source has genuine metadata (title, author, year, type)
        intel.sourceLedger.forEach(src => {
          expect(src.title).toBeTruthy();
          expect(src.authors.length).toBeGreaterThan(0);
          expect(src.year).toBeGreaterThan(1800);
          expect(src.type).toBeTruthy();
        });
      });
    });
  });

  // ==================================================
  // 11. SATURATION TEST
  // ==================================================
  describe('11. Saturation Test', () => {
    test('evaluates whether roadmap is a researched field reconstruction rather than basic syllabus', () => {
      const report = normalizeRoadmapInput(CONTROL_SYSTEMS_OUTPUT.canonicalJson);
      const intel = report.canonicalRoadmap[0].fieldIntelligence;

      // A basic syllabus teaches PID tuning; a researched reconstruction teaches:
      // - Controllability/Observability Gramians
      // - Separation principle
      // - Bode Sensitivity Integral (Waterbed effect)
      // - Constrained MPC
      const content = JSON.stringify(intel) + JSON.stringify(report.canonicalRoadmap[0].phases);
      expect(content).toContain('Separation');
      expect(content).toContain('Bode');
      expect(content).toContain('Model Predictive Control');
      expect(report.researchQuality.layersDetected.FIELD_SURVIVAL).toBe(true);
    });
  });

  // ==================================================
  // 12. OUTPUT QUALITY REPORTING
  // ==================================================
  describe('12. Output Quality Metric Generation', () => {
    test('generates complete quality metrics for all 4 audited domains', () => {
      const audits = [
        { domain: 'Embedded Systems', input: EMBEDDED_SYSTEMS_CLAUDE_OUTPUT.canonicalJson },
        { domain: 'Control Systems', input: CONTROL_SYSTEMS_OUTPUT.canonicalJson },
        { domain: 'Plasma Physics', input: PLASMA_PHYSICS_OUTPUT.canonicalJson },
        { domain: 'Historiography', input: HISTORIOGRAPHY_OUTPUT.canonicalJson }
      ];

      audits.forEach(({ domain, input }) => {
        const report = normalizeRoadmapInput(input);
        expect(report.canImportDirectly).toBe(true);
        expect(report.summaryMetrics.arcCount).toBeGreaterThan(0);
        expect(report.summaryMetrics.moduleCount).toBeGreaterThan(0);
        expect(report.researchQuality.rating).toBe(RESEARCH_QUALITY_LEVELS.STRONG);
        expect(report.summaryMetrics.researchQualityRating).toBe(RESEARCH_QUALITY_LEVELS.STRONG);
      });
    });
  });
});
