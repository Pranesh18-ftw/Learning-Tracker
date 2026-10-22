/**
 * researchCharter.js
 *
 * Versioned Universal Deep Research Charter & Conversion Prompt Generator (v2.1).
 *
 * Instructs external frontier AI to reconstruct the field through 15 rigorous phases
 * before synthesizing a learning roadmap.
 *
 * v2.1 additions:
 * - 15 phases (was 12): adds Anti-Saturation Test, Learning Hierarchy, Adaptation
 * - Explicit learning/doing separation in output requirements
 * - Learning unit depth levels
 * - Task mode vocabulary
 * - Project scaffolding progression
 * - Anti-generic saturation test
 *
 * Enforces the Research Evidence Contract and outputs importable formats.
 */

import { CANONICAL_SCHEMA_VERSION } from './canonicalExchangeModel';

export const UNIVERSAL_RESEARCH_CHARTER_VERSION = '2.3.0';

/**
 * Generates the full 15-phase Universal Deep Research Charter prompt for external AIs (v2.3).
 * Enforces the Research Depth, Freshness & Provenance Gate.
 *
 * @param {Object} context - Learner context
 * @returns {string} Formatted prompt ready to copy-paste
 */
export function generateDeepResearchCharter(context = {}) {
  const goal = context.goal || '[SPECIFY FIELD / LEARNING GOAL]';
  const destination = context.destination || '[SPECIFY DESIRED CAPABILITY / OUTCOME]';
  const level = context.currentLevel || 'BEGINNER';
  const purpose = context.purpose || 'CAREER';
  const horizon = context.targetHorizon || '3-6 months';
  const weeklyHours = context.weeklyHours || 10;
  const constraints = context.constraints ? `Learner Constraints: ${context.constraints}` : 'None stated';
  const priorKnowledge = context.priorKnowledge ? `Learner Prior Knowledge: ${context.priorKnowledge}` : 'None stated';

  return `UNIVERSAL DEEP RESEARCH CHARTER (v${UNIVERSAL_RESEARCH_CHARTER_VERSION})
================================================================================
CRITICAL INSTRUCTION FOR EXTERNAL AI:
DO NOT START BY WRITING A NORMAL COURSE SYLLABUS.
FIRST RECONSTRUCT THE FIELD DEEPLY USING THE RESEARCH DEPTH CONTRACT.
STRICT GATEKEEPING: DO NOT OUTPUT PHASES 11-14 (ROADMAP, PROJECTS, MISSIONS) UNTIL PHASES 1 THROUGH 10 ARE FULLY SATISFIED.
ANY ROADMAP THAT USES GENERIC TIERS LIKE "Fundamentals -> Intermediate -> Advanced -> Final Project" IS REJECTED.
ALL LEARNING ARCS MUST BE DOMAIN-SPECIFIC DISCIPLINE FRONTIERS.
DO NOT FABRICATE CITATIONS, DOIs, RESEARCHERS, PAPERS, YEARS, OR ORGANIZATIONS.
WHEN UNCERTAIN, EXPLICITLY MARK UNCERTAIN.
SEPARATE ESTABLISHED FACTS FROM UNCERTAIN CLAIMS AND LINK MAJOR CLAIMS TO GENUINE SOURCES.
SEPARATE KNOWLEDGE ACQUISITION FROM DOING (Separate Learning Units from Tasks).
================================================================================

LEARNER CONTEXT:
- Primary Learning Goal: ${goal}
- Target Destination / Outcome: ${destination}
- Current Capability Level: ${level}
- Purpose / Motivation: ${purpose}
- Target Time Horizon: ${horizon}
- Realistic Weekly Time: ${weeklyHours} hours/week
- Prior Knowledge: ${priorKnowledge}
- Constraints & Resources: ${constraints}

================================================================================
RESEARCH DEPTH CONTRACT: 6 MANDATORY EVIDENCE LAYERS (DO NOT COLLAPSE)
================================================================================

LAYER A — FOUNDATIONS
- Foundational concepts, landmark discoveries, seminal works, foundational theories, major historical contributors.

LAYER B — DEVELOPMENT OF THE FIELD
- Major paradigm shifts, important technologies, competing approaches, what replaced earlier approaches, what survived.

LAYER C — CURRENT PRACTICE
- What practitioners actually use, important tools, standards, methodologies, dominant architectures, current workflows.

LAYER D — CURRENT RESEARCH
- Important recent research, major active directions, competing research approaches, unresolved problems, important recent papers/reviews.

LAYER E — EMERGING / FUTURE
- Emerging technologies, early research directions, adjacent fields converging, uncertain technologies, plausible future branches.

LAYER F — FIELD SURVIVAL
- Durable knowledge, transferable skills, tool-dependent skills, knowledge at risk of becoming obsolete, commoditizing areas, skills valuable under technological change.

================================================================================
SOURCE STRATIFICATION & RECENCY CONTRACT
================================================================================
Classify every source in your Source Ledger into:
- Source Types: PRIMARY_RESEARCH | SYSTEMATIC_REVIEW | SURVEY_REVIEW | LANDMARK_WORK | TEXTBOOK_MONOGRAPH | OFFICIAL_DOCUMENTATION | PROFESSIONAL_STANDARD | INSTITUTIONAL_SOURCE | REPUTABLE_INDUSTRY_SOURCE | OTHER
- Recency: HISTORICAL | ESTABLISHED | CURRENT | RECENT | EMERGING | SPECULATIVE
- Never treat a blog, SEO article, forum answer, or unsourced summary as equivalent to primary research or authoritative documentation.
- Never pretend an old source establishes current practice unless justified.
- Link important claims to source IDs: { "claim": "...", "sourceId": "SRC-001", "confidence": "HIGH"|"MEDIUM"|"UNCERTAIN", "whySourceMatters": "..." }

================================================================================
HONESTY & SEARCH-COMPLETENESS CONTRACT
================================================================================
- Do NOT claim "I reviewed the literature" unless your actual process supports that.
- State: researchScope, researchLimitations, coverageGaps, uncertainties.
- Under NO circumstances invent fake DOIs, fictitious authors, or phantom papers.

================================================================================
REQUIRED RESEARCH SEQUENCE (EXECUTE ALL 15 PHASES IN ORDER)
================================================================================

PHASE 1 — FIELD RECONSTRUCTION
- Precise definition of the field and its core purpose.
- Clear epistemic boundaries (what is inside vs outside this field).
- Neighboring disciplines and boundary intersections.
- Major subfields, branches, and taxonomies.
- Decompose: FIELD → MAJOR AREAS → SUBFIELDS → TOPICS → SUBTOPICS → CONCEPTS → MICRO-CONCEPTS where useful.

PHASE 2 — HISTORICAL / INTELLECTUAL LINEAGE
- Historical origins and seminal discoveries that founded the discipline.
- Key foundational researchers, scientists, and engineers.
- Influential seminal papers, monographs, and textbooks.
- Major paradigm shifts, successor frameworks, and what was permanently replaced.

PHASE 3 — KNOWLEDGE + COMPETENCY MAP
- Foundational theoretical knowledge required for ground-truth reasoning.
- Knowledge areas (distinct core conceptual domains).
- Concrete competencies and practical, demonstrable capabilities.
- Professional and research dispositions (habits of mind, verification rigor).
- Bridge concepts connecting multiple areas.
- Prerequisite concepts that unlock many later capabilities.
- Concepts that are easy to underestimate.
- Commonly misunderstood concepts.
- Commonly omitted concepts.
- Practical and professional failure modes.

PHASE 4 — CURRENT STATE OF THE FIELD
- Established consensus knowledge vs ongoing disputes.
- Current professional and industrial standard practice.
- Dominant tools, platforms, programming frameworks, and hardware ecosystems.
- Active standards bodies, major research institutions, and laboratories.

PHASE 5 — RESEARCH FRONTIER
- High-impact recent breakthroughs and active research directions.
- Open, unsolved problems and theoretical limits.
- Competing approaches and technical trade-offs currently under active debate.
- High-leverage, emerging techniques reshaping the discipline.

PHASE 6 — FIELD TRAJECTORY
Classify all major areas and skills into the following exact taxonomy:
- [DURABLE_FOUNDATION]: Timeless mathematical, physical, or logical primitives.
- [ESTABLISHED]: Mature, industry-standard knowledge with high stability.
- [CURRENT_PRACTICE]: Modern workflows that may evolve over 3-5 years.
- [FAST_MOVING]: Rapidly changing areas requiring continuous monitoring.
- [EMERGING]: Promising early-stage paradigms with potential high leverage.
- [SPECULATIVE]: Unproven hypotheses or hype-sensitive techniques.
- [CONTESTED]: Areas with active disagreement among leading researchers.
- [DECLINING_OR_DEPRECATED]: Legacy practices being phased out.
- [OPEN_PROBLEM]: Fundamental unresolved questions.
- [CROSS_DISCIPLINARY_BRIDGE]: Connective concepts linking to adjacent disciplines.

PHASE 7 — SURVIVAL / LONG-TERM RELEVANCE
- Durable and transferable principles vs tool-dependent mechanics.
- Commoditizing or vulnerable skills likely to be automated.
- Explicit skip list: What the learner should INTENTIONALLY SKIP or learn lightly.
- Adaptability strategy: How the learner remains resilient if today's dominant tools disappear.

PHASE 8 — RESEARCH GAP ANALYSIS & ANTI-SATURATION (v2.3)
Require an explicit section: "WHAT THE STANDARD ROADMAP WOULD MISS".
For each major knowledge area, identify:
1. Commonly Taught: Conventional syllabus coverage.
2. Commonly Omitted: Critical practical or theoretical material standard courses skip.
3. High Leverage: Concepts where deep understanding unlocks many other areas.
4. Bridge Concept: Connective concepts linking two domains or theories.
5. Real-World Failure: Realistic engineering, clinical, mathematical, or professional failure mode.
6. Current Development: Active shifts in standard practice over the last 1-3 years.
7. Research Connection: Active frontier problems that connect directly to this concept.

Then self-test:
- Would this look like a common YouTube roadmap? → If yes, add depth.
- Would this look like a generic university syllabus? → If yes, add practice.
- Would this resemble a typical bootcamp curriculum? → If yes, add research.
- Which parts distinguish an actually capable practitioner from someone who merely completed tutorials?

PHASE 9 — DEPENDENCY GRAPH
- Construct a realistic prerequisite and dependency graph.
- Model BOTH knowledge dependencies and capability dependencies.
- Model parallel learning tracks and bottlenecks (do NOT force artificial linear order).

PHASE 10 — LEARNING HIERARCHY & ROADMAP INFLUENCE TEST (v2.3)
Explicitly separate KNOWLEDGE ACQUISITION from DOING.
Map every major finding to a concrete learning consequence:
RESEARCH FINDING → ROADMAP CONSEQUENCE
- Concept is foundational & durable → DEEP_MASTERY_TARGET treatment
- Tool/technology is rapidly changing → teach underlying invariant principles + current tool
- Skill is becoming commoditized → reduce repetitive procedural training
- Research area is emerging → optional frontier branch
- Bridge concept connects disciplines → introduce earlier than conventional syllabus

Required hierarchy:
FIELD → KNOWLEDGE AREA → TOPIC → SUBTOPIC → LEARNING UNITS → PRACTICE / APPLICATION → DOING TASKS → SUBTASKS → PROJECTS → CAPABILITY / EVIDENCE

For every substantial subtopic, provide:
LEARNING UNITS — what the learner must understand:
- learning objective
- concept
- why it matters
- misconception risk
- prerequisite knowledge
- expected depth: AWARENESS | UNDERSTANDING | WORKING_FLUENCY | DEEP_MASTERY_TARGET | FRONTIER_AWARENESS
- retrieval target
- transfer target

DOING TASKS — what the learner must use knowledge for:
Choose appropriate task modes:
- diagnostic/debugging tasks (failure modes)
- comparison tasks (competing approaches)
- explain/recall tasks (foundational reasoning)
- measurement/simulation tasks (empirical verification)
- build/design tasks (practical synthesis)
- critique/reproduce/investigate tasks (research literacy)

SUBTASKS — concrete decomposition of complex tasks.

PHASE 11 — ROADMAP SYNTHESIS
- Synthesize 4 to 8 sequential Learning Arcs (Phases).
- ANTI-LOOPHOLE CONSTRAINT: Every Learning Arc name must reflect actual technical discipline content (e.g., "Memory-Mapped I/O & Bus Timings", NOT "Phase 1: Basics").
- Under each Arc, define 2 to 5 actionable Modules (Tasks).
- Under each Module, define learning units (knowledge to understand) and doing tasks (activities to execute).
- Under each doing task, define 2 to 4 concrete, actionable subtasks.
- Every unit must have clear, observable completion criteria.

PHASE 12 — PROJECT SYSTEM (v2.3)
Each project must specify:
- Which field capability does this project exercise?
- Which important failure mode does it expose?
- Which research or practical insight motivated it?
- Which future capability does it unlock?
- scaffolding level: GUIDED → PARTIALLY_GUIDED → SPECIFICATION_ONLY → OPEN_ENDED

PHASE 13 — SPECIALIZATION BRANCHES
- Define 2 to 4 elective specialization paths with prerequisites and trade-offs.

PHASE 14 — ADAPTATION RULES (v2.1 / v2.3)
Provide adaptation rules distinguishing:
- Knowledge weakness → revisit learning unit
- Skill weakness → assign smaller practical task
- Execution weakness → provide subtask decomposition
- Debugging weakness → present intentional failure case
- Prerequisite weakness → return to prerequisite
- Overconfidence/shallow understanding → assign explanation/retrieval variant
- Resource constraint → provide alternative approach

PHASE 15 — ADVERSARIAL SELF-REVIEW
Critique your own proposed roadmap:
1. Is this just a conventional course syllabus in disguise?
2. What high-leverage concepts would a standard bootcamp or course omit?
3. Which currently popular tools in this plan might become obsolete soon?
4. Which durable fundamentals ensure the learner cannot be commoditized?
5. What should the learner explicitly NOT waste time on?
6. What distinguishes paper completion from true operational capability?

================================================================================
RESEARCH EVIDENCE & PROVENANCE CONTRACT
================================================================================
You must compile a Source Ledger with genuine citations:
- Prefer seminal papers, authoritative monographs, peer-reviewed surveys, and official standards.
- For each source provide:
  - id (e.g. "SRC-001")
  - title
  - authors
  - year
  - type: PRIMARY_RESEARCH | SYSTEMATIC_REVIEW | SURVEY_REVIEW | LANDMARK_WORK | TEXTBOOK_MONOGRAPH | OFFICIAL_DOCUMENTATION | PROFESSIONAL_STANDARD | INSTITUTIONAL_SOURCE | REPUTABLE_INDUSTRY_SOURCE | OTHER
  - recency: HISTORICAL | ESTABLISHED | CURRENT | RECENT | EMERGING | SPECULATIVE
  - verificationStatus: [SOURCE_VERIFIED] | [SOURCE_NOT_VERIFIED] | [UNCERTAIN_CLAIM]
  - url or identifier (DOI, ISBN, RFC, ISO) where available
  - whySourceMatters / relevance
  - supportedClaims
- Under NO circumstances invent fake DOIs, fictitious authors, phantom papers, or false publication dates.

================================================================================
OUTPUT FORMAT INSTRUCTIONS FOR EXTERNAL AI
================================================================================
You may provide your answer in either of two formats:

OPTION A: STRUCTURED MARKDOWN (Readable and importable)
- Use # for Major Sections (e.g., # Phase 1: Field Reconstruction)
- Use # Learning Arc [N]: [Name] for phases
- Use ## Module [N].[M]: [Name] for tasks
- Under each module, separate:
  **Learning Units:**
  - Understand [concept] (Depth: [level])
  - Understand [concept] (Why: [reason])
  **Doing Tasks:**
  - [ ] [Actionable task] (Mode: [mode])
  **Subtasks:**
  - [ ] [Concrete step]
- Use - **Project [N]: [Name]**: Description for practical builds
- Include What the Standard Roadmap Would Miss section, Source Ledger, and Claims.

OPTION B: CANONICAL JSON v2.3
Output a valid JSON object matching:
{
  "schemaVersion": "${CANONICAL_SCHEMA_VERSION}",
  "learnerContext": { ... },
  "fieldIntelligence": {
    "fieldDefinition": "...",
    "historicalLineage": [ ... ],
    "foundationalIdeas": [ ... ],
    "knowledgeAreas": [ ... ],
    "competencyAreas": [ ... ],
    "currentState": "...",
    "researchFrontier": [ ... ],
    "openProblems": [ ... ],
    "contestedAreas": [ ... ],
    "fieldTrajectory": [ ... ],
    "durabilityMap": { ... },
    "survivalStrategy": "...",
    "adjacentFields": [ ... ],
    "researchScope": "...",
    "researchLimitations": [ ... ],
    "coverageGaps": [ ... ],
    "sourceLedger": [
      {
        "id": "SRC-001",
        "title": "...",
        "authors": [ "..." ],
        "year": 2020,
        "type": "PRIMARY_RESEARCH",
        "recency": "RECENT",
        "verificationStatus": "SOURCE_VERIFIED",
        "url": "https://...",
        "identifier": "DOI:...",
        "whySourceMatters": "..."
      }
    ],
    "claims": [
      {
        "id": "CLM-001",
        "claim": "...",
        "sourceId": "SRC-001",
        "confidence": "HIGH",
        "whySourceMatters": "..."
      }
    ],
    "roadmapInfluences": [
      {
        "finding": "...",
        "consequence": "...",
        "findingArea": "..."
      }
    ],
    "whatStandardRoadmapWouldMiss": [
      {
        "area": "...",
        "commonlyTaught": "...",
        "commonlyOmitted": "...",
        "highLeverage": "...",
        "bridgeConcept": "...",
        "realWorldFailure": "...",
        "currentDevelopment": "...",
        "researchConnection": "..."
      }
    ],
    "uncertainties": [ ... ]
  },
  "learningArcs": [
    {
      "id": "arc-1",
      "name": "Arc Name",
      "modules": [
        {
          "id": "mod-1-1",
          "name": "Module Name",
          "learningUnits": [
            {
              "name": "Understand X",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "...",
              "whyItMatters": "...",
              "misconceptionRisk": "...",
              "retrievalTarget": "...",
              "transferTarget": "..."
            }
          ],
          "subtasks": [
            { "name": "Actionable subtask name" }
          ],
          "learningMode": "build",
          "prerequisites": []
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "scaffoldingLevel": "GUIDED",
      "capabilitiesExercised": [ ... ],
      "failureModes": [ ... ],
      "whatFailureTeaches": "...",
      "motivatingInsight": "...",
      "unlocksNext": "..."
    }
  ],
  "specializations": [ ... ],
  "adaptationRules": {
    "rules": [
      {
        "condition": "...",
        "weaknessType": "KNOWLEDGE",
        "action": "..."
      }
    ]
  }
}
`;
}

/**
 * Generates a targeted Conversion / Repair prompt when raw external AI output
 * has useful research or syllabus content but requires canonical normalization.
 *
 * @param {string} rawInput - The original text or AI response
 * @param {Object} status - Extraction status and confidence report
 * @param {Object} context - Learner context
 * @returns {string} The repair prompt to paste into external AI
 */
export function generateConversionPrompt(rawInput = '', status = {}, context = {}) {
  const goal = context.goal || 'the specified learning field';
  const missingItems = [];
  if (status.confidence?.learningArcs !== 'DETECTED') missingItems.push('Structured Learning Arcs (Phases)');
  if (status.confidence?.modules !== 'DETECTED') missingItems.push('Actionable Modules with Subtasks');
  if (status.confidence?.learningUnits !== 'DETECTED') missingItems.push('Learning Units (knowledge acquisition with depth levels)');
  if (status.confidence?.doingTasks !== 'DETECTED') missingItems.push('Doing Tasks (application with task modes)');
  if (status.confidence?.projects !== 'DETECTED') missingItems.push('Concrete Project Builds with scaffolding levels');
  if (status.confidence?.sourceLedger !== 'DETECTED') missingItems.push('Source Ledger with verified citations and provenance');
  if (status.confidence?.specializations !== 'DETECTED') missingItems.push('Specialization Branches');
  if (!status.fieldIntelligence?.claims?.length) missingItems.push('Traceable Claims linked to sources');
  if (!status.fieldIntelligence?.roadmapInfluences?.length) missingItems.push('Roadmap Influences (Finding -> Consequence)');

  const missingNotice = missingItems.length > 0
    ? `The previous response is missing or unclear on:\n- ${missingItems.join('\n- ')}\n`
    : '';

  return `LEARNING TRACKER ROADMAP CONVERSION PROMPT (v${UNIVERSAL_RESEARCH_CHARTER_VERSION})
================================================================================
You are converting an existing AI research analysis for "${goal}" into the canonical Learning Tracker v2.3 format.

RULES:
1. Preserve ALL meaningful concepts, research findings, historical lineage, frontier topics, claims, sources, and projects from the source text below.
2. DO NOT invent missing empirical facts, researchers, papers, or fake DOIs. When uncertain, mark UNCERTAIN.
3. SEPARATE knowledge acquisition (learning units) from doing (tasks).
4. Structure the learning journey into actionable Learning Arcs (Phases), Modules (Tasks), Learning Units, Doing Tasks, and Subtasks.
5. Mark every action as uncompleted (this is imported as a PLAN ONLY).
6. Preserve: field research layers, history, researchers, sources (id, authors, year, type, recency), claims, roadmap influences, what the standard roadmap would miss, topics, subtopics, learning units, tasks, subtasks, projects, dependencies, specializations, research frontier, adaptation rules, uncertainties.
7. Do NOT summarize away useful detail.
8. Do NOT invent missing information.
${missingNotice}

TARGET FORMAT:
Provide the output as either clean Structured Markdown (# Learning Arc, ## Module, Learning Units, - [ ] Subtask) or Canonical JSON (schemaVersion: "${CANONICAL_SCHEMA_VERSION}") containing:
- fieldIntelligence (fieldDefinition, researchFrontier, openProblems, sourceLedger with types/recency, claims, roadmapInfluences, whatStandardRoadmapWouldMiss, durabilityMap, researchScope, researchLimitations, coverageGaps)
- learningArcs with modules, learning units (knowledge), and doing tasks/subtasks (application)
- practical projects with scaffolding levels, failure modes, and motivating insights
- adaptation rules

SOURCE TEXT TO CONVERT:
"""
${rawInput.trim().slice(0, 10000)}
"""
================================================================================
Output the converted roadmap now:`;
}
