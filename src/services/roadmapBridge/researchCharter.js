/**
 * researchCharter.js
 *
 * Universal Deep Research Charter & Conversion Prompt Generator (v3.0).
 * Cross-Model | Research-First | Domain-Adaptive | Schema-Complete
 *
 * Supports two battle-tested profiles:
 * 1. UNIVERSAL_V3 (Full 15-phase Deep Research Charter for Claude 3.7 Sonnet, GPT-4o, DeepSeek R1)
 * 2. GEMINI_COMPACT (Token-optimized compact profile calibrated for Google Gemini)
 */

import { CANONICAL_SCHEMA_VERSION } from './canonicalExchangeModel';

export const UNIVERSAL_RESEARCH_CHARTER_VERSION = '3.0.0';

export const RESEARCH_CHARTER_ENGINES = {
  UNIVERSAL_V3: 'universal_v3',
  GEMINI_COMPACT: 'gemini_compact'
};

export const RESEARCH_CHARTER_ENGINE_LABELS = {
  [RESEARCH_CHARTER_ENGINES.UNIVERSAL_V3]: '✨ Claude 3.7 / Universal v3.0 (Recommended)',
  [RESEARCH_CHARTER_ENGINES.GEMINI_COMPACT]: '⚡ Gemini Deep Research (Compact)'
};

/**
 * Generates the full 15-phase Universal Deep Research Charter v3.0
 * for Claude 3.7 Sonnet, GPT-4o, DeepSeek R1, and full-context frontier models.
 *
 * @param {Object} context - Learner context
 * @returns {string} Formatted prompt ready to copy-paste
 */
export function generateUniversalV3Charter(context = {}) {
  const goal = context.goal || '[SPECIFY FIELD / LEARNING GOAL]';
  const destination = context.destination || '[SPECIFY DESIRED CAPABILITY / OUTCOME]';
  const targetDeliverables = context.targetDeliverables ? context.targetDeliverables : 'Comprehensive practical systems & demonstrable capability';
  const level = context.currentLevel || 'BEGINNER';
  const purpose = context.purpose || 'CAREER';
  const learningStyle = context.learningStyle || 'BALANCED';
  const preferredStack = context.preferredStack ? context.preferredStack : 'Industry-standard dominant tooling';
  const horizon = context.targetHorizon || '3-6 months';
  const studyRhythm = context.studyRhythm || 'DAILY_STANDARD';
  const weeklyHours = context.weeklyHours || 10;
  const theoryVsPractice = context.theoryVsPractice || 'BALANCED';
  const mustIncludeTopics = context.mustIncludeTopics ? context.mustIncludeTopics : 'All essential discipline fundamentals and frontier areas';
  const constraints = context.constraints ? context.constraints : 'None stated';
  const priorKnowledge = context.priorKnowledge ? context.priorKnowledge : 'None stated';

  return `UNIVERSAL DEEP RESEARCH CHARTER v3.0
Cross-Model | Research-First | Domain-Adaptive | Schema-Complete

PURPOSE
Transform any learning goal into (1) a rigorous research dossier about the field and (2) a research-driven, dependency-aware learning system that builds demonstrable capability. This is not a request for a normal course syllabus. The field must be reconstructed before the roadmap is designed.

======================================================================
0. LEARNER INPUT — USE THE VALUES SUPPLIED BY THE USER OR APPLICATION
======================================================================
Primary Learning Goal: ${goal}
Target Destination / Career Outcome: ${destination}
Target Milestone Deliverables: ${targetDeliverables}
Pedagogical Learning Style: ${learningStyle}
Preferred Tools / Tech Stack / Ecosystem: ${preferredStack}
Theory vs Practice Ratio: ${theoryVsPractice}
Mandatory Topics: ${mustIncludeTopics}
Current Capability Level: ${level}
Purpose / Motivation: ${purpose}
Target Time Horizon: ${horizon}
Weekly Study Rhythm and Hours: ${weeklyHours} hours/week (${studyRhythm})
Prior Knowledge / Background: ${priorKnowledge}
Constraints and Resources (hardware, budget, location-specific requirements, OS, accessibility): ${constraints}
Canonical application schema, if supplied: ${CANONICAL_SCHEMA_VERSION}

Treat placeholders as application variables, not literal values. Never hard-code an example domain such as Magic or Magician into a different learner's result. If an input is missing, make a sensible provisional assumption, record it in learnerContext.assumptions, and proceed unless the missing information makes the task impossible. Do not invent personal facts, available equipment, budget, qualifications, or prior knowledge.

======================================================================
1. ROLE AND SUCCESS CONDITION
======================================================================
Act as a rigorous domain researcher, evidence auditor, domain-aware curriculum architect, practical-skills engineer, and skeptical reviewer. Your job is to reconstruct the field's actual knowledge structure and then translate it into an executable path toward the user's target capability.

Success means all of the following:
1. The field is mapped beyond a conventional syllabus or generic beginner/intermediate/advanced sequence.
2. The six evidence layers below are assessed independently and substantively.
3. Significant factual claims are traceable to appropriate sources or explicitly marked unverified/inferred.
4. The research dossier contains useful domain-specific detail, competing approaches, real failure modes, hidden prerequisites, and research gaps.
5. Research findings materially influence the roadmap.
6. Knowledge acquisition is separate from practical execution (SEPARATE KNOWLEDGE ACQUISITION FROM DOING).
7. Each major task has concrete subtasks, a deliverable, and a way to verify success.
8. The canonical ingestion object contains every required field in the exact schema, even when a field's value is an empty array plus an explicit explanation where appropriate.
9. The dossier and canonical object agree. Source IDs, claim IDs, topic names, counts, and conclusions must not contradict each other.
10. Structural completion, evidence verification, research depth, and learner mastery are never conflated.

Do not promise that one prompt can force every model to achieve equal quality. Use the best available research and validation tools; disclose what the selected environment could not do.

======================================================================
2. UNIVERSAL MODEL-COMPATIBLE EXECUTION RULES
======================================================================
Use direct, precise instructions and stable Markdown headings. Keep the supplied learner context separate from instructions. Follow the requested sequence, but do not narrate private chain-of-thought. Show conclusions, concise methodology, supporting evidence, uncertainty, and validation results.

Respect the task's outcome and required constraints while retaining enough autonomy to choose appropriate research methods for the field. Do not follow a mechanical recipe when it would damage research quality. Use the explicit phases as coverage requirements, not as a substitute for judgment.

If web/search/browsing tools are available, use them for current practice, recent developments, standards, source verification, and unfamiliar or niche claims. Search iteratively across the six evidence layers; do not rely on one broad query or on model memory alone. Open or inspect the sources needed to substantiate material claims. If browsing tools are unavailable, say so clearly and do not imply that live research or source verification occurred.

Prefer authoritative and primary sources when appropriate to the domain. Use reviews to map a field and trace them back to primary evidence where useful. Cross-check consequential claims with independent sources when feasible. Distinguish source discovery from source inspection, and source inspection from independent verification of a particular claim. Do not treat a plausible title, ISBN, DOI, URL, search snippet, or model recollection as proof that the claim is supported.

Use a target of roughly 12–25 meaningful sources for a broad, research-rich field, adjusted to field size, source availability, and scope. This is a planning target, not a quota: do not pad the ledger, and do not fabricate sources to reach a count. For practical crafts that rely on practitioner literature, use the appropriate canonical manuals, credible demonstrations, professional bodies, and documented practice rather than pretending that every principle has peer-reviewed evidence.

Prioritize substantive depth over verbosity. Every section must answer its underlying question, not merely repeat a heading. When output length is constrained, compress repetition and explanatory padding first; do not silently omit mandatory schema keys, evidence layers, source status, or required relationships. If the environment supports continuation, report the continuation boundary and resume without restarting or changing IDs. Finish with valid, complete JSON when a canonical payload is required.

======================================================================
FRONTIER AI REASONING & ADAPTIVE TOPIC CALIBRATION ENGINE
(Calibrated for Gemini Argon/2.0 Pro • GPT Astra/o1/4o • Claude 3.7 Sonnet • DeepSeek R1 • Universal LLM)
======================================================================
3. ADAPTIVE EPISTEMIC CALIBRATION
======================================================================
Classify the requested field "${goal}" by its dominant modes of knowing into one of the following 4 Epistemic Tiers and calibrate depth, evidence criteria, and failure modes accordingly:

[TIER 1 — ACCESSIBLE PRACTICAL CRAFTS, ARTS & DAILY SKILLS]
(e.g., Sourdough Baking, Acoustic Guitar Fingerstyle Craft, Woodworking, Conversational Language, Athletics, Public Speaking)
- Rigor focus: perception and feedback, biomechanics, repetition, deliberate practice, craft traditions, performance constraints, quality criteria, common failure modes, and demonstrable creations. Suitable evidence may include canonical texts, professional associations, master practitioners, validated instructional material, and observed performance.
- Anti-Hallucination: DO NOT fabricate fake academic papers, DOIs, or spurious laboratory studies for everyday crafts. Ground the learning in real physical drills and milestone creations.

[TIER 2 — ENGINEERING, SYSTEMS & APPLIED TECHNOLOGY]
(e.g., Embedded Firmware, Distributed Engines, Full-Stack Architecture, Cloud Security, Robotics)
- Rigor focus: specifications, architecture, constraints, production failure modes, measurements, debugging, safety, reliability, compatibility, standards, benchmarks, and reproducible builds. Prefer official documentation, standards, vendor technical references, source code, technical reports, and well-designed empirical studies.

[TIER 3 — RIGOROUS SCIENCES & ACADEMIC DISCIPLINES]
(e.g., Organic Synthesis, Control Systems, Fluid Dynamics, Population Genetics, Real Analysis)
- Rigor focus: definitions, mathematical derivations, proofs, experiments, causal reasoning, methods, assumptions, uncertainty, reproducibility, seminal literature, and open debates. Prefer peer-reviewed primary literature, systematic reviews, scholarly monographs, and authoritative curricula.

[TIER 4 — ALIEN-LEVEL FRONTIER, THEORETICAL & QUANTUM RESEARCH]
(e.g., Topos Theory, Non-Equilibrium QFT, Topological Quantum Computing & Anyonic Braid Physics, Sub-Nanometer EUV Plasma)
- Rigor focus: current primary literature, preprints with status labels, competing research groups, the limits of established models, unresolved conjectures, category-theoretic bridges, non-classical boundary conditions, and the difference between demonstrated results and speculation. Prefer landmark breakthroughs, active preprint archives, formal research symposia.

UNIVERSAL DUAL-PAYLOAD CONTRACT (CRITICAL FOR TOKEN BUDGETING):
To prevent output truncation in frontier reasoning models:
1. Part 1: High-Density Epistemic & Research Dossier (Concise, structured, zero repetitive padding).
2. Part 2: Complete Canonical Ingestion Block inside \`\`\`json ... \`\`\` containing the entire executable plan (learningArcs, modules, learningUnits with depth levels, doingTasks with task modes, subtasks, projects with scaffolding levels, and adaptation rules).

======================================================================
4. SIX MANDATORY, NON-COLLAPSIBLE EVIDENCE LAYERS
RESEARCH DEPTH CONTRACT: 6 MANDATORY EVIDENCE LAYERS
======================================================================
Assess each layer separately. Do not merge layers simply to simplify the answer.

LAYER A — FOUNDATIONS
Core principles, basic constructs, foundational theories, landmark discoveries, seminal contributors and works, and prerequisites required for ground-truth understanding.

LAYER B — DEVELOPMENT OF THE FIELD
Historical lineage, paradigm shifts, competing approaches, what replaced earlier approaches, what survived, and why the field reached its current form.

LAYER C — CURRENT PRACTICE
What competent practitioners actually use: current methods, tools, standards, workflows, architectures, techniques, constraints, and professional norms. Date time-sensitive assertions and distinguish common practice from vendor marketing.

LAYER D — CURRENT RESEARCH
Important recent findings, primary studies, reviews, active directions, competing hypotheses, methods, limitations, unresolved problems, and open technical trade-offs.

LAYER E — EMERGING / FUTURE
Early research, new technologies, adjacent-field convergence, plausible branches, and uncertain developments. Label speculation explicitly and distinguish it from deployed practice or demonstrated results.

LAYER F — FIELD SURVIVAL / DURABILITY
Enduring principles, transferable skills, tool-dependent routines, deprecated knowledge, vulnerable or commoditizing skills, and strategies for remaining capable as tools and standards change.

For every layer, provide: applicability; substantive findings; source IDs; claim IDs; current coverage status; uncertainties; and material gaps. When a layer is genuinely inapplicable, explain why. When evidence is unavailable, report UNAVAILABLE or UNVERIFIED; never fabricate evidence to achieve a green status.

======================================================================
5. SOURCE STRATIFICATION AND CLAIMS LEDGER
======================================================================
Classify each source with the most appropriate type from:
PRIMARY_RESEARCH | SYSTEMATIC_REVIEW | SURVEY_REVIEW | LANDMARK_WORK | TEXTBOOK_MONOGRAPH | OFFICIAL_DOCUMENTATION | PROFESSIONAL_STANDARD | INSTITUTIONAL_SOURCE | REPUTABLE_INDUSTRY_SOURCE | PRACTITIONER_SOURCE | OTHER.

Classify recency/status as:
HISTORICAL | ESTABLISHED | CURRENT | RECENT | EMERGING | SPECULATIVE.

Use a verification status that reflects what was actually done:
SOURCE_VERIFIED = the source itself or an authoritative catalog/page was inspected and key metadata checked.
SOURCE_NOT_VERIFIED = cited from memory, a search snippet, or a record that was not adequately inspected.
UNCERTAIN_CLAIM = the item or attribution itself remains uncertain.

Do not label a source SOURCE_VERIFIED just because it looks plausible. Do not infer that a source directly supports a claim simply because the topic is related. Do not describe a source as peer-reviewed, a standard, a primary study, or a current recommendation unless that status is supported.

For every substantial factual claim, create a stable claim ID and associate one or more source IDs. Record confidence and why the sources matter. If the claim is inference, practitioner heuristic, contested, or speculative, say so. Cite/link claims in the dossier where the platform supports citations; in the JSON, use IDs that resolve to sourceLedger records. The dossier and JSON must use the same source/claim IDs and must not disagree about their verification status.

======================================================================
6. REQUIRED RESEARCH SEQUENCE — COMPLETE PHASES 1–10 BEFORE DESIGNING THE ROADMAP
======================================================================
This is a substantive quality gate. “Research complete enough to plan” means every dimension has been investigated or its remaining limitation is explicitly characterized; it does not mean every possible fact about a field is known. Do not begin final learning-arc synthesis until the dossier is adequate to inform it.

PHASE 1 — FIELD RECONSTRUCTION
- Precisely define the field, purpose, outputs, and central problems.
- Define epistemic boundaries: what belongs, what does not, and where neighboring fields intersect.
- Map major subfields, branches, methods, and taxonomies.
- Decompose FIELD → MAJOR AREAS → SUBFIELDS → TOPICS → SUBTOPICS → CONCEPTS → MICRO-CONCEPTS where useful.
- Explain the relationships between parts, not only a flat list.

PHASE 2 — HISTORICAL / INTELLECTUAL LINEAGE
- Identify origins, landmark discoveries, seminal contributors, key texts/papers, and the context in which they mattered.
- Explain major paradigm shifts and competing schools.
- Identify what was replaced, what survived, and why.
- Do not fabricate authors, titles, dates, institutions, or historical details.

PHASE 3 — KNOWLEDGE + COMPETENCY MAP
- Map the theoretical knowledge needed for sound reasoning.
- Identify distinct knowledge areas and concrete demonstrable competencies.
- Identify professional/research habits, quality standards, and verification behavior.
- Explain bridge concepts that connect domains.
- Identify prerequisites that unlock many later capabilities.
- Identify underestimated, misunderstood, commonly omitted concepts and realistic failure modes.
- Distinguish knowing a concept from being able to apply it under realistic conditions.

PHASE 4 — CURRENT STATE OF THE FIELD
- Separate established consensus from active disputes.
- Describe current professional and industrial practice, dominant approaches, methods, tools and ecosystems.
- Identify relevant standards bodies, professional institutions, research organizations or labs when applicable.
- Mark time-sensitive facts with dates and sources.
- Do not confuse market popularity with technical superiority or established consensus.

PHASE 5 — RESEARCH FRONTIER
- Identify important recent breakthroughs and active research directions.
- Investigate unresolved problems, technical/theoretical limits, competing approaches, and trade-offs.
- Prefer original papers, primary data, authoritative technical materials, or high-quality reviews as the field requires.
- Explain what the cited research actually demonstrates, its limitations, and what remains unproven.
- Do not make speculative claims sound established.

PHASE 6 — FIELD TRAJECTORY
Classify major areas and skills using the exact applicable labels:
DURABLE_FOUNDATION; ESTABLISHED; CURRENT_PRACTICE; FAST_MOVING; EMERGING; SPECULATIVE; CONTESTED; DECLINING_OR_DEPRECATED; OPEN_PROBLEM; CROSS_DISCIPLINARY_BRIDGE.
For each important classification provide a short rationale and supporting source/claim IDs where feasible. Use the labels as a taxonomy, not as decoration.

PHASE 7 — SURVIVAL / LONG-TERM RELEVANCE
- Separate durable principles from tool-specific procedures.
- Identify skills likely to commoditize or be automated, distinguishing evidence from forecasts.
- Include an explicit skip-or-deprioritize list with a reason and conditions for revisiting.
- Explain how the learner can adapt if a dominant tool, framework, vendor, or platform disappears.

PHASE 8 — RESEARCH GAP ANALYSIS AND ANTI-SATURATION
Include a section titled exactly: WHAT THE STANDARD ROADMAP WOULD MISS.
For each major knowledge area, address:
1. Commonly taught.
2. Commonly omitted.
3. High-leverage concepts.
4. Bridge concepts between disciplines or theories.
5. Realistic failure modes caused by misunderstanding or omission.
6. Recent developments that materially affect practice or learning, when verifiable.
7. Research connections and open questions.

Cover every major knowledge area at an appropriate level of granularity. Do not mechanically generate dozens of repetitive rows. Choose enough rows to expose genuinely different gaps and preserve domain-specific depth. Do not claim that a topic is universally omitted without support; label practitioner judgment or inference as such.

Then challenge the draft: Is it a generic YouTube roadmap? A generic university syllabus? A tutorial bootcamp? Which parts separate a merely informed learner from a capable practitioner? Add what is missing.

PHASE 9 — DEPENDENCY GRAPH
- Construct both knowledge dependencies and capability dependencies.
- Include prerequisite edges, soft prerequisites, parallel tracks, shared bottlenecks, repeated-practice requirements, and integration dependencies.
- Explain why consequential dependencies exist.
- Do not force a linear path where parallel learning is realistic.
- Ensure graph IDs refer to real arcs, modules, learning units, tasks or competencies in the final schema.

PHASE 10 — LEARNING HIERARCHY AND ROADMAP INFLUENCE
Align depth and practice with the user's learning style (${learningStyle}), theory/practice ratio (${theoryVsPractice}), target (${destination}), time horizon (${horizon}), and real domain demands.

Map significant findings explicitly:
RESEARCH FINDING → LEARNING CONSEQUENCE → LEARNING UNIT / TASK / PROJECT → CAPABILITY EVIDENCE.

Use these decision principles:
- Durable foundational concept → sufficient retrieval, transfer, and deep-practice treatment.
- Rapidly changing tool → teach durable invariants alongside an appropriate current implementation.
- Common and consequential failure mode → add diagnostic/debugging or recovery practice.
- Emerging research → optional frontier branch unless essential to the user's goal.
- Cross-disciplinary bridge → introduce when prerequisites make it useful, not merely because it is interesting.
- Commoditizing procedure → avoid excessive rote work; emphasize judgment, verification, integration, and transfer.

Keep LEARNING UNITS (what the learner understands) separate from DOING TASKS (what the learner executes). Ensure the quantity and depth of both suit the declared style.

======================================================================
7. PHASES 11–15 — BUILD, TEST, AND REVIEW THE LEARNING SYSTEM
======================================================================
PHASE 11 — ROADMAP SYNTHESIS
Create approximately 4–8 domain-specific Learning Arcs, adjusted to the size and structure of the field. Arcs must describe actual disciplinary frontiers or capability areas; never use only generic labels such as Basics, Intermediate, Advanced, or Final Project. Each arc needs a clear capability outcome, scope, prerequisites, and modules.
- Ensure all topics specified in '${mustIncludeTopics}' are incorporated.
- Under each arc, define 2–5 actionable modules. Under each module, distinguish learning units from doing tasks.
- Every substantive learning unit has an observable completion criterion.
- Every substantial doing task has 2–4 concrete subtasks, a deliverable, a verification method, and explicit pass criteria. Do not create empty filler modules or duplicate the same concept under different names.

PHASE 12 — PROJECT SYSTEM
Design projects that progress from guided practice toward independent performance toward the user's deliverables: '${targetDeliverables}' using stack: '${preferredStack}'. Each project must identify:
- Which capability it exercises.
- Which prerequisite knowledge and skills it uses.
- Which realistic failure mode it exposes.
- Which research finding or practical insight motivated it.
- What deliverable is produced.
- How success will be tested.
- What evidence the learner retains.
- Which future capability it unlocks.
- Scaffolding level: GUIDED | PARTIALLY_GUIDED | SPECIFICATION_ONLY | OPEN_ENDED.

PHASE 13 — SPECIALIZATION BRANCHES
Define 2–4 materially distinct specialization paths when the field supports them. State prerequisites, target outcomes, trade-offs, relevant modules/projects, career or research relevance, and what is deprioritized by choosing each branch.

PHASE 14 — ADAPTATION RULES
Provide conditional rules that distinguish:
- Knowledge weakness → revisit or reteach a learning unit.
- Practical skill weakness → assign a smaller, targeted drill/task.
- Execution weakness → reduce task size and make the next action explicit.
- Debugging/diagnostic weakness → present a controlled failure case.
- Prerequisite weakness → return to the named prerequisite.
- Shallow understanding/overconfidence → require recall, explanation, counterexample, or transfer.
- Missing/weak evidence → repeat the assessment or improve instrumentation.
- Resource constraint → supply a valid alternative and explain what it cannot test.
- Tool or standard change → preserve invariant concepts and revise tool-specific instruction.

PHASE 15 — ADVERSARIAL SELF-REVIEW
Critique the completed system:
1. Is this a conventional syllabus disguised with specialist vocabulary?
2. What high-leverage knowledge or practice is still missing?
3. Which popular tools, platforms, or procedures may become obsolete?
4. Which durable fundamentals preserve adaptability?
5. What should the learner explicitly not waste time on at this stage, and why?
6. What separates paper completion from operational capability?
7. Are sources, claims, confidence and verification statuses honest?
8. Are the dossier and ingestion object mutually consistent?
9. Are all required schema fields present and complete?

======================================================================
8. LEARNING UNIT, TASK, SUBTASK, PROJECT AND COMPETENCY REQUIREMENTS
======================================================================
For each substantial learning unit include: id, name, objective, concept, why it matters, prerequisite IDs, misconception/failure risk, expected depth (AWARENESS | UNDERSTANDING | WORKING_FLUENCY | DEEP_MASTERY_TARGET | FRONTIER_AWARENESS), retrieval target, transfer target, observable completion criteria.

For each doing task include: id, name, objective, mode, prerequisite IDs, tools/resources, 2–4 concrete subtasks with acceptance criteria, deliverable, verification procedure, pass criteria, failure modes exposed, evidence to retain.

For each competency include: name, definition, underlying knowledge, practical performance requirements, assessment method, pass criteria, evidence artifact, linked learning arcs/modules.

For each project include: id, name, description, capabilitiesExercised, requiredKnowledgeIds, requiredSkillIds, prerequisites, toolsResources, deliverable, failureModes, whatFailureTeaches, motivatingInsight, unlocksNext, scaffoldingLevel, verificationProcedure, acceptanceCriteria, evidenceArtifacts.

For each specialization include: id, name, targetOutcome, prerequisites, coreTopics, tradeoffs, projectIds, relevance, whatToDeprioritize.

For each learning mission include: id, name, objective, linkedModuleIds, requiredActions, constraints, deliverable, assessmentCriteria, evidenceArtifacts, applicabilityStatus.

For each adaptation rule include: condition, weaknessType, diagnosticSignal, action, returnToIds, successCriterion.

======================================================================
9. OUTPUT CONTRACT — TWO PAYLOADS, ONE SOURCE OF TRUTH
======================================================================
Return exactly two main parts, in this order:

PART 1 — HIGH-DENSITY RESEARCH DOSSIER (Markdown)
Cover Phases 1–10 plus source provenance, claims, explicit uncertainties, and limitations. Be technically substantive and specific. Use tables when they make comparisons or coverage easier to inspect. Include a readable dependency graph and the “WHAT THE STANDARD ROADMAP WOULD MISS” section. Do not pad with repeated prose.

PART 2 — CANONICAL INGESTION OBJECT (JSON)
Return one complete JSON object inside a code fence that begins exactly with \`\`\`json and ends exactly with \`\`\`. No comments, ellipses, pseudocode, duplicate JSON objects, or prose inside the JSON fence. Preserve schemaVersion "${CANONICAL_SCHEMA_VERSION}".

Top-level keys:
- schemaVersion
- learnerContext
- fieldIntelligence
- dependencyGraph
- learningArcs
- competencies
- projects
- specializations
- learningMissions
- adaptationRules
- adversarialReview
- completenessAudit

learnerContext keys:
goal, destination, targetMilestoneDeliverables, style, preferredTechStack, theoryPracticeRatio, mandatoryTopics, level, motivation, timeHorizon, weeklyHours, studyRhythm, priorKnowledge, constraints, assumptions.

fieldIntelligence keys:
epistemicTier, fieldDefinition, epistemicBoundaries, taxonomy, historicalLineage, foundationalIdeas, knowledgeAreas, competencyAreas, currentState, researchFrontier, openProblems, contestedAreas, fieldTrajectory, evidenceLayers, durabilityMap, survivalStrategy, adjacentFields, researchScope, researchMethodology, researchLimitations, coverageGaps, sourceLedger, claims, roadmapInfluences, whatStandardRoadmapWouldMiss, uncertainties.

The completenessAudit object must include:
overallStructuralStatus, researchCoverageStatus, sourceVerificationStatus, claimTraceabilityStatus, learningPlanCompletenessStatus, practicalAssessmentCompletenessStatus, remainingBlockers, and sections array covering all major components with COMPLETE | PARTIAL | NOT_APPLICABLE | UNAVAILABLE | BLOCKED | FAILED status.

======================================================================
10. COVERAGE SCORING — NEVER CONFUSE GREEN BOXES WITH TRUTH
======================================================================
Keep these dimensions separate:
A. Structural completeness: required fields and valid relationships are present.
B. Substantive research coverage: the topic has meaningful depth, not just a heading.
C. Evidence availability: relevant sources exist and were accessible.
D. Source verification: metadata and source content were checked to the stated level.
E. Claim traceability: significant claims are linked to supporting sources.
F. Roadmap completeness: units, tasks, subtasks, projects and dependencies are actionable.
G. Demonstrated mastery: something the learner has actually shown; do not infer this from a generated plan.

======================================================================
11. FINAL QUALITY GATE
======================================================================
Before returning the answer, check the actual output:
- Did all six evidence layers receive substantive treatment?
- Are sources real and claims properly attributed?
- Are learning units separated from doing tasks?
- Is the JSON syntactically valid without ellipses, comments, or broken references?
- Does the dossier agree with the JSON object?

FINAL DELIVERABLE: A field-specific research dossier and complete canonical ingestion object that preserve intellectual depth, source integrity, application compatibility, and measurable capability development.`;
}

/**
 * Generates the compact Gemini Deep Research profile.
 * Calibrated specifically for Google Gemini windows to prevent chat length exhaustion.
 *
 * @param {Object} context - Learner context
 * @returns {string} Formatted compact prompt ready to copy-paste
 */
export function generateGeminiCompactCharter(context = {}) {
  const goal = context.goal || '[SPECIFY FIELD / LEARNING GOAL]';
  const destination = context.destination || '[SPECIFY DESIRED CAPABILITY / OUTCOME]';
  const targetDeliverables = context.targetDeliverables || 'Comprehensive practical systems & demonstrable capability';
  const level = context.currentLevel || 'BEGINNER';
  const purpose = context.purpose || 'CAREER';
  const learningStyle = context.learningStyle || 'BALANCED';
  const preferredStack = context.preferredStack || 'Industry-standard dominant tooling';
  const horizon = context.targetHorizon || '3-6 months';
  const studyRhythm = context.studyRhythm || 'DAILY_STANDARD';
  const weeklyHours = context.weeklyHours || 10;
  const theoryVsPractice = context.theoryVsPractice || 'BALANCED';
  const mustIncludeTopics = context.mustIncludeTopics || 'All essential discipline fundamentals and frontier areas';
  const constraints = context.constraints || 'None stated';
  const priorKnowledge = context.priorKnowledge || 'None stated';

  return `GEMINI DEEP RESEARCH | COMPACT PROFILE

MISSION: Reconstruct the field, then derive a research-led learning system for demonstrable capability—not a generic syllabus. Adapt evidence to the domain.

LEARNER INPUT (use app values; blanks unknown; state assumptions; no hard-coded examples):
- Primary Learning Goal: ${goal}
- Target Destination / Career Outcome: ${destination}
- Target Milestone Deliverables: ${targetDeliverables}
- Pedagogical Learning Style: ${learningStyle}
- Preferred Tools / Tech Stack: ${preferredStack}
- Theory vs Practice Ratio: ${theoryVsPractice}
- Mandatory Topics: ${mustIncludeTopics}
- Current Capability Level: ${level}
- Purpose / Motivation: ${purpose}
- Target Time Horizon: ${horizon}
- Weekly Study Rhythm & Time: ${weeklyHours} hours/week (${studyRhythm})
- Prior Knowledge / Background: ${priorKnowledge}
- Constraints & Resources: ${constraints}
- Canonical Application Schema: ${CANONICAL_SCHEMA_VERSION}

RESEARCH FIRST: define boundaries/taxonomy/adjacent fields; map history/paradigm shifts; foundations, prerequisites, knowledge areas, bridges, competencies, misconceptions, omissions/failures; current practice/tools/standards and disputes; recent research, limitations, competing approaches/open problems; classify areas as durable, established, current, fast-moving, emerging, speculative, contested, deprecated, open or cross-disciplinary; assess tool dependence, obsolescence, adaptation and skip list; map knowledge/capability dependencies and bottlenecks.

SIX DISTINCT EVIDENCE LAYERS: A Foundations; B Development; C Current practice; D Current research; E Emerging/future; F Durability/survival. For each state applicability, findings, source/claim IDs, limits and gaps.

GAP ANALYSIS: Include exact heading “WHAT THE STANDARD ROADMAP WOULD MISS”. For each major area: taught/omitted, high leverage, bridge, real failure, verified recent change, research connection.

EVIDENCE: Search and inspect sources; don't rely only on memory/snippets. Prefer primary/authoritative sources and useful reviews. Seek 12–25 sources if appropriate; never pad. Separate facts, disputes, inference and speculation. Ledger: ID, title, author/year, type/recency, URL, verification, relevance, claim IDs. Claims: ID, statement, source IDs, confidence/status, qualification. Discovery ≠ inspection ≠ verification. If browsing unavailable, disclose it. Never invent sources, dates, DOIs, statistics or verification.

ROADMAP AFTER RESEARCH: Build domain-specific arcs/modules, not generic Beginner→Advanced tiers. Separate LEARNING UNITS from DOING TASKS. Units: ID, objective, prerequisites, misconception, depth, retrieval/transfer, completion criteria. Tasks: ID/mode, tools/prerequisites, 2–4 subtasks + acceptance criteria, deliverable, verification, failure modes/evidence. Include feasible projects, assessable competencies, useful specializations, dependency graph, adaptation rules and integrative missions. Trace FINDING → ROADMAP CHANGE → TASK/PROJECT → CAPABILITY EVIDENCE.

OUTPUT 1: research dossier with six layers, gaps, sources/claims, dependencies, uncertainties and limits.
OUTPUT 2: one valid app JSON (schemaVersion: "${CANONICAL_SCHEMA_VERSION}"). Top-level keys: schemaVersion, learnerContext, fieldIntelligence, dependencyGraph, learningArcs, competencies, projects, specializations, learningMissions, adaptationRules, adversarialReview, completenessAudit. fieldIntelligence keys: fieldDefinition, historicalLineage, foundationalIdeas, knowledgeAreas, competencyAreas, currentState, researchFrontier, openProblems, contestedAreas, fieldTrajectory, evidenceLayers, durabilityMap, survivalStrategy, researchScope, researchMethodology, researchLimitations, coverageGaps, sourceLedger, claims, roadmapInfluences, whatStandardRoadmapWouldMiss, uncertainties. Keep dossier/JSON consistent; exact keys/IDs; no placeholders, ellipses, comments, dangling refs or fabrication. Use null for unknowns; explain empty arrays.

AUDIT OUTPUT. Fix omissions. COMPLETE only if substantive checks pass; else PARTIAL, NOT_APPLICABLE (reason), UNAVAILABLE, BLOCKED or FAILED. Separate structure, research coverage, evidence access, verification, traceability and mastery. A plan is not mastery. Never omit required layers/keys silently. If continuing, mark boundary and preserve IDs.`;
}

/**
 * Universal router that generates the appropriate Deep Research Charter
 * based on selected AI engine profile.
 *
 * @param {Object} context - Learner context
 * @param {string} engine - Engine identifier ('universal_v3' | 'gemini_compact')
 * @returns {string} Formatted prompt ready to copy-paste
 */
export function generateDeepResearchCharter(context = {}, engine = RESEARCH_CHARTER_ENGINES.UNIVERSAL_V3) {
  if (engine === RESEARCH_CHARTER_ENGINES.GEMINI_COMPACT || engine === 'gemini') {
    return generateGeminiCompactCharter(context);
  }
  return generateUniversalV3Charter(context);
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
You are converting an existing AI research analysis for "${goal}" into the canonical Learning Tracker v${CANONICAL_SCHEMA_VERSION} format.

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
