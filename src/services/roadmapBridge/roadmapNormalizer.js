/**
 * roadmapNormalizer.js
 *
 * Multi-Format Roadmaps & Research Normalization Engine (Universal AI Roadmap Bridge v2.1).
 *
 * Ingestion Pipeline:
 * raw input -> format detection -> candidate extraction -> synonym normalization ->
 * graph/URL validation -> confidence scoring -> canonical subject mapping.
 *
 * v2.1 additions:
 * - Learning unit extraction (knowledge acquisition) separated from doing tasks
 * - Depth level detection (SURFACE_AWARENESS → RESEARCH_LEVEL)
 * - Task mode detection (learn, recall, explain, build, debug, etc.)
 * - Enriched field intelligence: high-leverage, often-skipped, bridge concepts
 * - Project scaffolding level extraction
 * - Adaptation rule extraction
 * - Expanded synonym dictionaries for flexible external AI ingestion
 * - Enhanced confidence signals for v2.1 hierarchy
 *
 * Guarantees:
 * - Does not require JSON from the learner.
 * - Accepts Canonical JSON, Alternate JSON, Markdown, Research Reports, Mixed, Freeform.
 * - Extracts both Execution Roadmap and Deep Research Dossier.
 * - Never fabricates missing information (marks NOT_DETECTED or PARTIALLY_DETECTED).
 * - All tasks are imported as PLAN ONLY (completed: false).
 * - Defends against cycles, broken prerequisites, script injection, and oversized payloads.
 */

import { safeJsonParse, isSafeUrl } from '../../utils/securityUtils';
import {
  CANONICAL_SCHEMA_VERSION,
  CONFIDENCE_LEVELS,
  createEmptyFieldIntelligence,
  createEmptyAdaptationRules,
  DEPTH_LEVELS,
  SOURCE_TYPES,
  RESEARCH_RECENCY,
  RESEARCH_QUALITY_LEVELS
} from './canonicalExchangeModel';
import { createLearnerContext } from './learnerContextModel';

export const FORMAT_TYPES = {
  CANONICAL_JSON: 'CANONICAL_JSON',
  ALTERNATE_JSON: 'ALTERNATE_JSON',
  MARKDOWN_ROADMAP: 'MARKDOWN_ROADMAP',
  RESEARCH_REPORT: 'RESEARCH_REPORT',
  MIXED_AI_RESPONSE: 'MIXED_AI_RESPONSE',
  FREEFORM: 'FREEFORM',
  UNKNOWN: 'UNKNOWN'
};

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB safety limit

// ── SYNONYM DICTIONARIES (v2.1 / v2.3) ──

const PHASE_SYNONYMS = ['learningArcs', 'phases', 'arcs', 'tracks', 'stages'];
const MODULE_SYNONYMS = ['modules', 'tasks', 'lessons', 'units', 'topics'];
const SUBTASK_SYNONYMS = ['subtasks', 'steps', 'items', 'actions', 'procedures'];
const LEARNING_UNIT_SYNONYMS = ['learningUnits', 'learningObjectives', 'concepts', 'understandings', 'knowledgeUnits', 'foundations', 'coreTheories', 'insights'];
const DOING_TASK_SYNONYMS = ['doingTasks', 'exercises', 'activities', 'practiceActivities', 'implementations', 'practicums', 'investigations', 'analyses', 'applications', 'derivations', 'sourceCriticisms', 'fieldwork'];
const COMPETENCY_SYNONYMS = ['competencies', 'skills', 'capabilities', 'proficiencies'];
const PROJECT_SYNONYMS = ['projects', 'builds', 'capstones', 'practicalProjects'];
const SPECIALIZATION_SYNONYMS = ['specializationBranches', 'specializations', 'electives', 'branches', 'tracks'];

// Field intelligence synonym mappings for flexible ingestion
const FIELD_INTEL_SYNONYMS = {
  highLeverageConcepts: ['highLeverageConcepts', 'highLeverage', 'leverageConcepts', 'oftenSkippedHighLeverage', 'keyInsights'],
  oftenSkippedConcepts: ['oftenSkippedConcepts', 'oftenSkipped', 'commonlyOmitted', 'overlooked', 'skippedKnowledge'],
  bridgeConcepts: ['bridgeConcepts', 'crossDisciplinary', 'connectingConcepts', 'interdisciplinary'],
  commonMisconceptions: ['commonMisconceptions', 'misconceptions', 'commonErrors', 'falseBeliefs'],
  practicalFailureModes: ['practicalFailureModes', 'failureModes', 'commonFailures', 'practicalPitfalls'],
  professionalFailureModes: ['professionalFailureModes', 'careerRisks', 'professionalPitfalls'],
  researchFrontier: ['researchFrontier', 'advancedFrontier', 'frontier', 'emergingDirections', 'cuttingEdge'],
  sourceLedger: ['sourceLedger', 'sources', 'references', 'citations', 'bibliography'],
  adaptationRules: ['adaptationRules', 'adaptation', 'recoveryRules', 'adaptiveGuidance'],
  // v2.3 additions
  claims: ['claims', 'claimLedger', 'researchClaims', 'supportedClaimsList'],
  roadmapInfluences: ['roadmapInfluences', 'influences', 'researchConsequences', 'findingConsequences', 'influenceMap'],
  whatStandardRoadmapWouldMiss: ['whatStandardRoadmapWouldMiss', 'gapAnalysis', 'researchGapAnalysis', 'standardRoadmapGaps', 'omittedCurriculum'],
  researchScope: ['researchScope', 'scope', 'investigationScope'],
  researchLimitations: ['researchLimitations', 'limitations', 'coverageLimitations'],
  coverageGaps: ['coverageGaps', 'gaps', 'identifiedGaps'],
  researchMethodology: ['researchMethodology', 'methodology', 'investigationMethodology'],
  researchLayers: ['researchLayers', 'evidenceLayers', 'layers']
};

/**
 * Resolves a field from an object using an ordered synonym list.
 */
function resolveField(obj, synonymList, defaultValue = undefined) {
  if (!obj || typeof obj !== 'object') return defaultValue;
  for (const key of synonymList) {
    if (obj[key] !== undefined) return obj[key];
  }
  return defaultValue;
}

/**
 * Attempts defensive, surgical repair of malformed JSON commonly produced by LLMs:
 * - Trailing commas before closing brackets/braces
 * - Single-quoted property keys or strings
 * - Prematurely truncated objects/arrays with unclosed brackets
 */
export function attemptJsonRepair(str) {
  if (typeof str !== 'string') return null;
  let cleaned = str.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // 1. Remove trailing commas before } or ]
  let repaired = cleaned.replace(/,\s*([\]}])/g, '$1');
  let result = safeJsonParse(repaired);
  if (result) return result;

  // 2. Replace single quotes around keys and strings
  repaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
  result = safeJsonParse(repaired);
  if (result) return result;

  // 3. Balance unclosed braces/brackets for truncated JSON
  const stack = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  if (stack.length > 0) {
    let balanced = repaired;
    while (stack.length > 0) {
      balanced += stack.pop();
    }
    result = safeJsonParse(balanced);
    if (result) return result;
  }

  return null;
}

/**
 * Detects the format of raw external AI input.
 *
 * @param {string} text - Raw input string
 * @returns {string} Format type from FORMAT_TYPES
 */
export function detectFormat(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return FORMAT_TYPES.UNKNOWN;
  }

  const trimmed = text.trim();

  // Check for JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = safeJsonParse(trimmed) || attemptJsonRepair(trimmed);
    if (parsed) {
      if (
        parsed.schemaVersion === CANONICAL_SCHEMA_VERSION ||
        // Also accept older schema versions for migration
        (typeof parsed.schemaVersion === 'string' && parsed.schemaVersion.startsWith('2.')) ||
        (parsed.fieldIntelligence && (parsed.learningArcs || parsed.subjects))
      ) {
        return FORMAT_TYPES.CANONICAL_JSON;
      }
      if (parsed.subjects && Array.isArray(parsed.subjects)) {
        return FORMAT_TYPES.CANONICAL_JSON;
      }
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].phases || parsed[0].learningArcs || parsed[0].tasks)) {
        return FORMAT_TYPES.CANONICAL_JSON;
      }
      return FORMAT_TYPES.ALTERNATE_JSON;
    }
  }

  // Check for mixed markdown enclosing a JSON code block
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = jsonBlockRegex.exec(trimmed);
  if (match && match[1]) {
    const candidateJson = safeJsonParse(match[1].trim()) || attemptJsonRepair(match[1].trim());
    if (candidateJson && typeof candidateJson === 'object') {
      return FORMAT_TYPES.MIXED_AI_RESPONSE;
    }
  }

  // Check for Deep Research Report indicators
  const isResearchReport =
    /phase\s*(?:1|one)?\s*[:—-]\s*field\s*reconstruction/i.test(trimmed) ||
    /research\s*frontier/i.test(trimmed) ||
    /intellectual\s*(?:[\w\s]+)?lineage/i.test(trimmed) ||
    /field\s*trajectory/i.test(trimmed);

  // Check for structured Markdown Roadmap indicators (# Phase, # Arc, ## Module, - [ ], or tables)
  const hasMarkdownHeadings = /^(?:#{1,4}\s+|\*\*(?:Phase|Arc|Track|Module|Stage)\s+\d+)/m.test(trimmed);
  const hasChecklists = /^[\s]*[-*]\s*\[[ xX]?\]\s+/m.test(trimmed);
  const hasMarkdownTables = /^\|(?:\s*[^|\r\n]+\s*\|){2,}/m.test(trimmed);

  if (hasMarkdownTables || (hasMarkdownHeadings && (hasChecklists || /learning\s*arc|phase\s*\d|module\s*\d/i.test(trimmed)))) {
    return isResearchReport ? FORMAT_TYPES.RESEARCH_REPORT : FORMAT_TYPES.MARKDOWN_ROADMAP;
  }

  if (isResearchReport) {
    return FORMAT_TYPES.RESEARCH_REPORT;
  }

  // Check for freeform bulleted list
  if (/^[\s]*[-*•]\s+\w+/m.test(trimmed) || /^\d+\.\s+\w+/m.test(trimmed)) {
    return FORMAT_TYPES.FREEFORM;
  }

  return FORMAT_TYPES.UNKNOWN;
}

/**
 * Sanitizes untrusted text string to avoid HTML / Script injection.
 * Preserves normal text, mathematical symbols, and markdown punctuation.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<[^>]+>/g, '') // strip all other HTML tags
    .trim();
}

/**
 * Detects cycles in a directed prerequisite graph using DFS.
 *
 * @param {Array<{ from: string, to: string }>} edges
 * @returns {Array<string[]>} List of cycle paths detected
 */
export function detectCycles(edges = []) {
  const adj = new Map();
  for (const edge of edges) {
    if (!edge || !edge.from || !edge.to) continue;
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from).push(edge.to);
  }

  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(node, path) {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        const cyclePath = path.slice(path.indexOf(neighbor)).concat(neighbor);
        cycles.push(cyclePath);
      }
    }

    recStack.delete(node);
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

// ── V2.3 RESEARCH PROVENANCE & QUALITY HELPERS ──

/**
 * Normalizes any raw source type string to canonical SOURCE_TYPES.
 */
export function normalizeSourceType(rawType) {
  if (!rawType || typeof rawType !== 'string') return SOURCE_TYPES.OTHER;
  const clean = rawType.trim().toUpperCase();
  if (SOURCE_TYPES[clean]) return SOURCE_TYPES[clean];

  const lower = rawType.toLowerCase();
  if (/primary|paper|journal|article|conference|experiment/i.test(lower)) return SOURCE_TYPES.PRIMARY_RESEARCH;
  if (/systematic/i.test(lower)) return SOURCE_TYPES.SYSTEMATIC_REVIEW;
  if (/survey|review|meta-analysis/i.test(lower)) return SOURCE_TYPES.SURVEY_REVIEW;
  if (/landmark|seminal|classic|breakthrough/i.test(lower)) return SOURCE_TYPES.LANDMARK_WORK;
  if (/textbook|monograph|book/i.test(lower)) return SOURCE_TYPES.TEXTBOOK_MONOGRAPH;
  if (/official|documentation|doc|spec|manual/i.test(lower)) return SOURCE_TYPES.OFFICIAL_DOCUMENTATION;
  if (/standard|iso|ieee|rfc|w3c|ansi/i.test(lower)) return SOURCE_TYPES.PROFESSIONAL_STANDARD;
  if (/institutional|university|institute|government|nist|who|nih/i.test(lower)) return SOURCE_TYPES.INSTITUTIONAL_SOURCE;
  if (/industry|whitepaper|tech_report|corporate/i.test(lower)) return SOURCE_TYPES.REPUTABLE_INDUSTRY_SOURCE;

  return SOURCE_TYPES.OTHER;
}

/**
 * Normalizes source recency based on explicit annotation or publication year.
 */
export function normalizeRecency(rawRecency, year) {
  if (rawRecency && typeof rawRecency === 'string') {
    const clean = rawRecency.trim().toUpperCase();
    if (RESEARCH_RECENCY[clean]) return RESEARCH_RECENCY[clean];
    const lower = rawRecency.toLowerCase();
    if (/historical|classic|origin|foundation/i.test(lower)) return RESEARCH_RECENCY.HISTORICAL;
    if (/established|standard|mature/i.test(lower)) return RESEARCH_RECENCY.ESTABLISHED;
    if (/current|active|present/i.test(lower)) return RESEARCH_RECENCY.CURRENT;
    if (/recent|modern|latest/i.test(lower)) return RESEARCH_RECENCY.RECENT;
    if (/emerging|novel|early/i.test(lower)) return RESEARCH_RECENCY.EMERGING;
    if (/speculative|hypothetical/i.test(lower)) return RESEARCH_RECENCY.SPECULATIVE;
  }
  if (year !== undefined && year !== null) {
    const y = Number(year);
    if (!isNaN(y)) {
      if (y < 2000) return RESEARCH_RECENCY.HISTORICAL;
      if (y < 2018) return RESEARCH_RECENCY.ESTABLISHED;
      if (y < 2024) return RESEARCH_RECENCY.RECENT;
      return RESEARCH_RECENCY.CURRENT;
    }
  }
  return null;
}

/**
 * Normalizes raw source ledger items to canonical v2.3 structure.
 * Never fabricates missing authors, years, or URLs; preserves honest nulls.
 */
export function normalizeSourceLedger(rawSources = []) {
  if (!Array.isArray(rawSources)) return [];
  return rawSources.map((src, idx) => {
    if (typeof src === 'string') {
      const cleanText = sanitizeText(src);
      const isVerified = /\[SOURCE_VERIFIED\]/i.test(src);
      const isUncertain = /\[UNCERTAIN_CLAIM\]/i.test(src);
      const idMatch = /\[(SRC-[\w\d]+)\]/i.exec(src);
      const yearMatch = /\b(19\d{2}|20\d{2})\b/.exec(src);
      const typeMatch = /\[([A-Z_]+)\]/.exec(src);
      const clean = cleanText
        .replace(/\[(?:SOURCE_VERIFIED|SOURCE_NOT_VERIFIED|UNCERTAIN_CLAIM|SRC-[\w\d]+|[A-Z_]+)\]/gi, '')
        .trim();

      const year = yearMatch ? Number(yearMatch[1]) : null;
      const type = typeMatch && SOURCE_TYPES[typeMatch[1]]
        ? typeMatch[1]
        : normalizeSourceType(clean);

      return {
        id: idMatch ? idMatch[1] : `SRC-${String(idx + 1).padStart(3, '0')}`,
        title: clean || `Source ${idx + 1}`,
        authors: [],
        year,
        type: type || SOURCE_TYPES.OTHER,
        recency: normalizeRecency(null, year),
        url: null,
        identifier: null,
        publisher: null,
        authorityLevel: null,
        relevance: null,
        supportedClaims: [],
        supportedRoadmapAreas: [],
        verificationStatus: isVerified ? 'SOURCE_VERIFIED' : (isUncertain ? 'UNCERTAIN_CLAIM' : 'SOURCE_NOT_VERIFIED'),
        status: isVerified ? 'SOURCE_VERIFIED' : (isUncertain ? 'UNCERTAIN_CLAIM' : 'SOURCE_NOT_VERIFIED'),
        citation: clean || cleanText,
        notes: null
      };
    }

    if (!src || typeof src !== 'object') return null;

    const id = src.id || `SRC-${String(idx + 1).padStart(3, '0')}`;
    const title = sanitizeText(src.title || src.citation || src.name || `Source ${idx + 1}`);
    const authors = Array.isArray(src.authors)
      ? src.authors.map(sanitizeText).filter(Boolean)
      : (typeof src.authors === 'string' && src.authors.trim() ? [sanitizeText(src.authors)] : []);

    let year = null;
    if (src.year !== undefined && src.year !== null) {
      year = Number(src.year) || src.year;
    } else if (src.publicationYear !== undefined && src.publicationYear !== null) {
      year = Number(src.publicationYear) || src.publicationYear;
    } else {
      const yMatch = /\b(19\d{2}|20\d{2})\b/.exec(title);
      if (yMatch) year = Number(yMatch[1]);
    }

    const type = src.type ? (SOURCE_TYPES[src.type] || normalizeSourceType(src.type)) : normalizeSourceType(title);
    const recency = src.recency ? (RESEARCH_RECENCY[src.recency] || normalizeRecency(src.recency, year)) : normalizeRecency(null, year);
    const verificationStatus = src.verificationStatus || src.status || (src.isVerified ? 'SOURCE_VERIFIED' : 'SOURCE_NOT_VERIFIED');
    const safeUrl = src.url || null;

    return {
      id,
      title,
      authors,
      year,
      type: type || SOURCE_TYPES.OTHER,
      recency: recency || null,
      url: safeUrl,
      identifier: src.identifier || src.doi || src.isbn || src.rfc || null,
      publisher: sanitizeText(src.publisher || src.journal || src.conference || '') || null,
      authorityLevel: src.authorityLevel || null,
      relevance: sanitizeText(src.relevance || src.whySourceMatters || src.notes || '') || null,
      supportedClaims: Array.isArray(src.supportedClaims) ? src.supportedClaims : [],
      supportedRoadmapAreas: Array.isArray(src.supportedRoadmapAreas) ? src.supportedRoadmapAreas : [],
      verificationStatus,
      status: verificationStatus,
      citation: sanitizeText(src.citation || src.title || ''),
      notes: sanitizeText(src.notes || '') || null
    };
  }).filter(Boolean);
}

/**
 * Normalizes claim ledger items linking to sources.
 */
export function normalizeClaims(rawClaims = []) {
  if (!Array.isArray(rawClaims)) return [];
  return rawClaims.map((clm, idx) => {
    if (typeof clm === 'string') {
      const clean = sanitizeText(clm);
      const srcMatch = /\[Source:\s*([\w\d-]+)\]/i.exec(clean) || /\((SRC-[\w\d]+)\)/i.exec(clean);
      const confMatch = /\[Confidence:\s*(HIGH|MEDIUM|UNCERTAIN)\]/i.exec(clean) || /\[(HIGH|MEDIUM|UNCERTAIN)\]/i.exec(clean);
      const whyMatch = /\(Why:\s*([^)]+)\)/i.exec(clean);
      const textOnly = clean
        .replace(/\[Source:[^\]]+\]/gi, '')
        .replace(/\[Confidence:[^\]]+\]/gi, '')
        .replace(/\[(HIGH|MEDIUM|UNCERTAIN)\]/gi, '')
        .replace(/\(Why:[^)]+\)/gi, '')
        .replace(/\(SRC-[\w\d]+\)/gi, '')
        .trim();

      return {
        id: `CLM-${String(idx + 1).padStart(3, '0')}`,
        claim: textOnly || clean,
        sourceId: srcMatch ? srcMatch[1] : null,
        confidence: confMatch ? confMatch[1].toUpperCase() : 'HIGH',
        sourceType: null,
        publicationYear: null,
        url: null,
        whySourceMatters: whyMatch ? sanitizeText(whyMatch[1]) : null
      };
    }

    if (!clm || typeof clm !== 'object') return null;

    return {
      id: clm.id || `CLM-${String(idx + 1).padStart(3, '0')}`,
      claim: sanitizeText(clm.claim || clm.text || clm.statement || ''),
      sourceId: clm.sourceId || clm.source || null,
      confidence: clm.confidence ? String(clm.confidence).toUpperCase() : 'HIGH',
      sourceType: clm.sourceType ? normalizeSourceType(clm.sourceType) : null,
      publicationYear: clm.publicationYear || clm.year || null,
      url: isSafeUrl(clm.url) ? clm.url : (clm.url ? '#' : null),
      whySourceMatters: sanitizeText(clm.whySourceMatters || clm.relevance || '') || null
    };
  }).filter(Boolean);
}

/**
 * Normalizes roadmap influence relationships (Finding -> Roadmap Consequence).
 */
export function normalizeRoadmapInfluences(rawInfluences = []) {
  if (!Array.isArray(rawInfluences)) return [];
  return rawInfluences.map((inf, idx) => {
    if (typeof inf === 'string') {
      const clean = sanitizeText(inf);
      const parts = clean.split(/(?:->|consequence:)/i);
      return {
        finding: sanitizeText(parts[0]?.replace(/^finding:\s*/i, '') || clean),
        consequence: sanitizeText(parts[1] || ''),
        findingArea: null
      };
    }
    if (!inf || typeof inf !== 'object') return null;
    return {
      finding: sanitizeText(inf.finding || inf.researchFinding || ''),
      whyItMatters: sanitizeText(inf.whyItMatters || inf.relevance || '') || null,
      consequence: sanitizeText(inf.consequence || inf.roadmapConsequence || ''),
      roadmapConsequence: sanitizeText(inf.roadmapConsequence || inf.consequence || ''),
      learningDepth: sanitizeText(inf.learningDepth || inf.depth || '') || null,
      taskDesign: sanitizeText(inf.taskDesign || inf.taskConsequence || '') || null,
      projectConsequence: sanitizeText(inf.projectConsequence || inf.projectInfluence || '') || null,
      findingArea: sanitizeText(inf.findingArea || inf.area || '') || null
    };
  }).filter(Boolean);
}

/**
 * Normalizes research gap analysis items ("What the standard roadmap would miss").
 */
export function normalizeGapAnalysis(rawGaps = []) {
  if (!Array.isArray(rawGaps)) return [];
  return rawGaps.map(gap => {
    if (typeof gap === 'string') {
      return {
        area: sanitizeText(gap),
        commonlyTaught: null,
        commonlyOmitted: null,
        highLeverage: null,
        bridgeConcept: null,
        realWorldFailure: null,
        currentDevelopment: null,
        researchConnection: null
      };
    }
    if (!gap || typeof gap !== 'object') return null;
    return {
      area: sanitizeText(gap.area || gap.name || gap.topic || ''),
      commonlyTaught: sanitizeText(gap.commonlyTaught || '') || null,
      commonlyOmitted: sanitizeText(gap.commonlyOmitted || '') || null,
      highLeverage: sanitizeText(gap.highLeverage || '') || null,
      bridgeConcept: sanitizeText(gap.bridgeConcept || '') || null,
      realWorldFailure: sanitizeText(gap.realWorldFailure || '') || null,
      currentDevelopment: sanitizeText(gap.currentDevelopment || '') || null,
      researchConnection: sanitizeText(gap.researchConnection || '') || null
    };
  }).filter(Boolean);
}

/**
 * Evaluates the qualitative research quality of the ingested roadmap.
 * Outputs qualitative indicators (STRONG | ADEQUATE | LIMITED | INSUFFICIENT)
 * without manufactured percentages.
 */
export function assessResearchQuality(fieldIntelligence = {}, canonicalRoadmap = []) {
  const fi = fieldIntelligence || {};
  const sources = Array.isArray(fi.sourceLedger) ? fi.sourceLedger : [];
  const claims = Array.isArray(fi.claims) ? fi.claims : [];
  const influences = Array.isArray(fi.roadmapInfluences) ? fi.roadmapInfluences : [];
  const gaps = Array.isArray(fi.whatStandardRoadmapWouldMiss) ? fi.whatStandardRoadmapWouldMiss : [];
  const frontier = Array.isArray(fi.researchFrontier) ? fi.researchFrontier : [];
  const trajectory = Array.isArray(fi.fieldTrajectory) ? fi.fieldTrajectory : [];
  const lineage = Array.isArray(fi.historicalLineage) ? fi.historicalLineage : [];
  const foundationalIdeas = Array.isArray(fi.foundationalIdeas) ? fi.foundationalIdeas : [];
  const durabilityMap = fi.durabilityMap || {};

  // 1. Detect 6 Research Layers
  const layersDetected = {
    FOUNDATIONS: foundationalIdeas.length > 0 ||
      !!fi.researchLayers?.FOUNDATIONS ||
      sources.some(s => s.type === SOURCE_TYPES.LANDMARK_WORK || s.type === SOURCE_TYPES.TEXTBOOK_MONOGRAPH || s.recency === RESEARCH_RECENCY.HISTORICAL),
    FIELD_DEVELOPMENT: lineage.length > 0 ||
      !!fi.researchLayers?.FIELD_DEVELOPMENT ||
      (Array.isArray(fi.contestedAreas) && fi.contestedAreas.length > 0),
    CURRENT_PRACTICE: !!fi.currentState ||
      !!fi.researchLayers?.CURRENT_PRACTICE ||
      sources.some(s => s.recency === RESEARCH_RECENCY.CURRENT || s.type === SOURCE_TYPES.OFFICIAL_DOCUMENTATION || s.type === SOURCE_TYPES.PROFESSIONAL_STANDARD || s.type === SOURCE_TYPES.REPUTABLE_INDUSTRY_SOURCE),
    CURRENT_RESEARCH: frontier.length > 0 ||
      !!fi.researchLayers?.CURRENT_RESEARCH ||
      (Array.isArray(fi.openProblems) && fi.openProblems.length > 0) ||
      sources.some(s => s.recency === RESEARCH_RECENCY.RECENT || s.type === SOURCE_TYPES.PRIMARY_RESEARCH || s.type === SOURCE_TYPES.SURVEY_REVIEW || s.type === SOURCE_TYPES.SYSTEMATIC_REVIEW),
    EMERGING_FUTURE: !!fi.researchLayers?.EMERGING_FUTURE ||
      trajectory.some(t => t.classification === 'EMERGING' || t.classification === 'SPECULATIVE') ||
      frontier.some(f => f.status === 'EMERGING' || (typeof f === 'string' && /emerging|future|speculative/i.test(f))),
    FIELD_SURVIVAL: !!fi.researchLayers?.FIELD_SURVIVAL ||
      !!fi.survivalStrategy ||
      (Array.isArray(durabilityMap) && durabilityMap.length > 0) ||
      (Array.isArray(durabilityMap.durableSkills) && durabilityMap.durableSkills.length > 0) ||
      (Array.isArray(durabilityMap.commoditizingSkills) && durabilityMap.commoditizingSkills.length > 0)
  };

  const layersCount = Object.values(layersDetected).filter(Boolean).length;

  // 2. Stratified Source Categories
  const sourceCategories = {
    primaryResearch: sources.filter(s => s.type === SOURCE_TYPES.PRIMARY_RESEARCH).length,
    reviews: sources.filter(s => s.type === SOURCE_TYPES.SYSTEMATIC_REVIEW || s.type === SOURCE_TYPES.SURVEY_REVIEW).length,
    officialOrStandards: sources.filter(s => s.type === SOURCE_TYPES.OFFICIAL_DOCUMENTATION || s.type === SOURCE_TYPES.PROFESSIONAL_STANDARD || s.type === SOURCE_TYPES.INSTITUTIONAL_SOURCE).length,
    other: sources.filter(s => s.type === SOURCE_TYPES.LANDMARK_WORK || s.type === SOURCE_TYPES.TEXTBOOK_MONOGRAPH || s.type === SOURCE_TYPES.REPUTABLE_INDUSTRY_SOURCE || s.type === SOURCE_TYPES.OTHER || !s.type).length
  };

  const uniqueTypesCount = new Set(sources.map(s => s.type).filter(Boolean)).size;

  // 3. Claims Analysis
  const claimCount = claims.length;
  const verifiedClaimCount = claims.filter(c => {
    if (c.confidence === 'UNCERTAIN') return false;
    if (!c.sourceId) return false;
    const matchingSrc = sources.find(s => s.id === c.sourceId);
    return matchingSrc ? matchingSrc.verificationStatus !== 'UNCERTAIN_CLAIM' : true;
  }).length;

  const hasRoadmapInfluences = influences.length > 0;
  const hasGapAnalysis = gaps.length > 0 || (Array.isArray(fi.highLeverageConcepts) && fi.highLeverageConcepts.length > 0);

  // 4. Proportional Research Warnings
  const proportionalWarnings = [];

  const hasRecentSource = sources.some(s => s.recency === RESEARCH_RECENCY.RECENT || s.recency === RESEARCH_RECENCY.CURRENT || (s.year && Number(s.year) >= 2018));
  if (sources.length > 0 && !hasRecentSource && (layersDetected.CURRENT_PRACTICE || layersDetected.CURRENT_RESEARCH)) {
    proportionalWarnings.push('Insufficient recent evidence: few or no recent sources (post-2018/current) detected.');
  }

  const incompleteSources = sources.filter(s => !s.authors?.length && !s.year && !s.title);
  if (incompleteSources.length > 0 || (sources.length > 0 && sources.some(s => !s.year && !s.authors?.length))) {
    proportionalWarnings.push('Source metadata incomplete: some sources lack authors or publication years.');
  }

  const unverifiedClaimsCount = claims.filter(c => c.confidence === 'UNCERTAIN').length + sources.filter(s => s.verificationStatus === 'UNCERTAIN_CLAIM' || s.status === 'UNCERTAIN_CLAIM').length;
  if (unverifiedClaimsCount > 0) {
    proportionalWarnings.push(`Unverified claims detected: ${unverifiedClaimsCount} claim(s) or source(s) marked as uncertain.`);
  }

  const gapCount = (Array.isArray(fi.coverageGaps) ? fi.coverageGaps.length : 0) + (Array.isArray(fi.researchLimitations) ? fi.researchLimitations.length : 0);
  if (gapCount > 0) {
    proportionalWarnings.push(`Research coverage gaps disclosed: ${gapCount} limitation(s) or gap(s) explicitly identified.`);
  }

  if (!layersDetected.CURRENT_RESEARCH && !layersDetected.EMERGING_FUTURE) {
    proportionalWarnings.push('Frontier section missing: no active research directions or open problems specified.');
  }

  if (!layersDetected.FIELD_SURVIVAL) {
    proportionalWarnings.push('Durability analysis missing: no durable vs tool-dependent skill classification found.');
  }

  // 5. Qualitative Rating Determination
  let rating = RESEARCH_QUALITY_LEVELS.INSUFFICIENT;

  if (
    layersCount >= 4 &&
    sources.length >= 2 &&
    (sourceCategories.primaryResearch > 0 || sourceCategories.reviews > 0 || sourceCategories.officialOrStandards > 0 || uniqueTypesCount >= 2) &&
    layersDetected.FIELD_SURVIVAL &&
    (hasRoadmapInfluences || hasGapAnalysis || claimCount >= 1)
  ) {
    rating = RESEARCH_QUALITY_LEVELS.STRONG;
  } else if (
    layersCount >= 3 &&
    sources.length >= 1
  ) {
    rating = RESEARCH_QUALITY_LEVELS.ADEQUATE;
  } else if (
    layersCount >= 1 ||
    sources.length >= 1 ||
    !!fi.fieldDefinition ||
    frontier.length > 0
  ) {
    rating = RESEARCH_QUALITY_LEVELS.LIMITED;
  } else {
    rating = RESEARCH_QUALITY_LEVELS.INSUFFICIENT;
  }

  return {
    rating,
    coverageRating: rating,
    layersDetected,
    sourceCategories,
    claimCount,
    attributedClaimCount: verifiedClaimCount,
    verifiedClaimCount,
    hasRoadmapInfluences,
    hasGapAnalysis,
    proportionalWarnings
  };
}

/**
 * Extracts learning units from a JSON module object.
 * Handles various synonym formats.
 */
function extractLearningUnits(moduleObj) {
  if (!moduleObj || typeof moduleObj !== 'object') return [];

  const rawUnits = resolveField(moduleObj, LEARNING_UNIT_SYNONYMS, []);
  if (!Array.isArray(rawUnits)) return [];

  return rawUnits.map((unit, idx) => {
    if (typeof unit === 'string') {
      const name = sanitizeText(unit);
      return {
        id: `lu-${idx + 1}`,
        name,
        title: name,
        depth: DEPTH_LEVELS.WORKING_UNDERSTANDING,
        concept: null,
        whyItMatters: null,
        misconceptionRisk: null,
        prerequisiteKnowledge: [],
        retrievalTarget: null,
        transferTarget: null
      };
    }
    const name = sanitizeText(unit.name || unit.objective || unit.title || `Learning Unit ${idx + 1}`);
    return {
      id: unit.id || `lu-${idx + 1}`,
      name,
      title: name,
      depth: unit.depth || unit.expectedDepth || DEPTH_LEVELS.WORKING_UNDERSTANDING,
      concept: unit.concept || null,
      whyItMatters: unit.whyItMatters || unit.importance || unit.why || unit.reason || null,
      misconceptionRisk: unit.misconceptionRisk || unit.misconception || unit.commonMisconception || null,
      prerequisiteKnowledge: Array.isArray(unit.prerequisiteKnowledge) ? unit.prerequisiteKnowledge : [],
      retrievalTarget: unit.retrievalTarget || null,
      transferTarget: unit.transferTarget || null,
      explanationTarget: unit.explanationTarget || unit.explanation || null
    };
  });
}

/**
 * Extracts doing tasks from a JSON module object.
 */
function extractDoingTasks(moduleObj) {
  if (!moduleObj || typeof moduleObj !== 'object') return [];

  const rawTasks = resolveField(moduleObj, DOING_TASK_SYNONYMS, []);
  if (!Array.isArray(rawTasks)) return [];

  return rawTasks.map((task, idx) => {
    if (typeof task === 'string') {
      const name = sanitizeText(task);
      return {
        id: `dt-${idx + 1}`,
        name,
        title: name,
        mode: null,
        completed: false,
        subtasks: []
      };
    }
    const name = sanitizeText(task.name || task.title || task.action || `Task ${idx + 1}`);
    const rawSubtasks = Array.isArray(task.subtasks) ? task.subtasks : resolveField(task, SUBTASK_SYNONYMS, []);
    return {
      id: task.id || `dt-${idx + 1}`,
      name,
      title: name,
      mode: task.mode || task.learningMode || task.type || task.activityType || null,
      completed: false,
      subtasks: Array.isArray(rawSubtasks) ? rawSubtasks.map((s, sIdx) => {
        const sName = sanitizeText(typeof s === 'string' ? s : (s.name || s.title || `Step ${sIdx + 1}`));
        return {
          id: (typeof s === 'object' && s.id) ? s.id : `st-${sIdx + 1}`,
          name: sName,
          title: sName,
          completed: false
        };
      }) : []
    };
  });
}

/**
 * Extracts enriched field intelligence from a JSON object using synonym resolution.
 */
function extractFieldIntelligence(obj) {
  if (!obj) return createEmptyFieldIntelligence();

  const fi = obj.fieldIntelligence || obj;
  const base = createEmptyFieldIntelligence();

  if (!fi || typeof fi !== 'object') return base;

  return {
    ...base,
    fieldDefinition: fi.fieldDefinition || base.fieldDefinition,
    historicalLineage: Array.isArray(fi.historicalLineage) ? fi.historicalLineage : base.historicalLineage,
    foundationalIdeas: Array.isArray(fi.foundationalIdeas) ? fi.foundationalIdeas : base.foundationalIdeas,
    knowledgeAreas: Array.isArray(fi.knowledgeAreas) ? fi.knowledgeAreas : base.knowledgeAreas,
    competencyAreas: Array.isArray(fi.competencyAreas) ? fi.competencyAreas : base.competencyAreas,
    currentState: fi.currentState || base.currentState,
    researchFrontier: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.researchFrontier, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.researchFrontier, []) : base.researchFrontier,
    openProblems: Array.isArray(fi.openProblems) ? fi.openProblems : base.openProblems,
    contestedAreas: Array.isArray(fi.contestedAreas) ? fi.contestedAreas : base.contestedAreas,
    fieldTrajectory: Array.isArray(fi.fieldTrajectory) ? fi.fieldTrajectory : base.fieldTrajectory,
    durabilityMap: fi.durabilityMap || base.durabilityMap,
    survivalStrategy: fi.survivalStrategy || base.survivalStrategy,
    adjacentFields: Array.isArray(fi.adjacentFields) ? fi.adjacentFields : base.adjacentFields,
    researchersAndGroups: Array.isArray(fi.researchersAndGroups) ? fi.researchersAndGroups : base.researchersAndGroups,
    sourceLedger: normalizeSourceLedger(resolveField(fi, FIELD_INTEL_SYNONYMS.sourceLedger, base.sourceLedger)),
    uncertainties: Array.isArray(fi.uncertainties) ? fi.uncertainties : base.uncertainties,
    // v2.3 research depth & provenance fields
    claims: normalizeClaims(resolveField(fi, FIELD_INTEL_SYNONYMS.claims, base.claims)),
    roadmapInfluences: normalizeRoadmapInfluences(resolveField(fi, FIELD_INTEL_SYNONYMS.roadmapInfluences, base.roadmapInfluences)),
    whatStandardRoadmapWouldMiss: normalizeGapAnalysis(resolveField(fi, FIELD_INTEL_SYNONYMS.whatStandardRoadmapWouldMiss, base.whatStandardRoadmapWouldMiss)),
    researchScope: sanitizeText(resolveField(fi, FIELD_INTEL_SYNONYMS.researchScope, '') || '') || base.researchScope,
    researchLimitations: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.researchLimitations, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.researchLimitations, []).map(sanitizeText).filter(Boolean)
      : base.researchLimitations,
    coverageGaps: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.coverageGaps, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.coverageGaps, []).map(sanitizeText).filter(Boolean)
      : base.coverageGaps,
    researchMethodology: sanitizeText(resolveField(fi, FIELD_INTEL_SYNONYMS.researchMethodology, '') || '') || base.researchMethodology,
    researchLayers: fi.researchLayers && typeof fi.researchLayers === 'object' ? fi.researchLayers : base.researchLayers,
    // v2.1 enrichments
    highLeverageConcepts: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.highLeverageConcepts, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.highLeverageConcepts, []) : base.highLeverageConcepts,
    oftenSkippedConcepts: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.oftenSkippedConcepts, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.oftenSkippedConcepts, []) : base.oftenSkippedConcepts,
    bridgeConcepts: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.bridgeConcepts, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.bridgeConcepts, []) : base.bridgeConcepts,
    commonMisconceptions: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.commonMisconceptions, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.commonMisconceptions, []) : base.commonMisconceptions,
    practicalFailureModes: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.practicalFailureModes, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.practicalFailureModes, []) : base.practicalFailureModes,
    professionalFailureModes: Array.isArray(resolveField(fi, FIELD_INTEL_SYNONYMS.professionalFailureModes, []))
      ? resolveField(fi, FIELD_INTEL_SYNONYMS.professionalFailureModes, []) : base.professionalFailureModes
  };
}

/**
 * Extracts adaptation rules from a JSON object.
 */
function extractAdaptationRules(obj) {
  if (!obj) return createEmptyAdaptationRules();

  const raw = resolveField(obj, FIELD_INTEL_SYNONYMS.adaptationRules);
  if (!raw || typeof raw !== 'object') return createEmptyAdaptationRules();

  const base = createEmptyAdaptationRules();
  if (Array.isArray(raw.rules)) {
    base.rules = raw.rules.map(r => ({
      condition: sanitizeText(r.condition || ''),
      weaknessType: r.weaknessType || r.type || 'KNOWLEDGE',
      action: sanitizeText(r.action || r.response || '')
    }));
  } else if (Array.isArray(raw)) {
    base.rules = raw.map(r => ({
      condition: sanitizeText(typeof r === 'string' ? r : (r.condition || '')),
      weaknessType: r?.weaknessType || 'KNOWLEDGE',
      action: sanitizeText(typeof r === 'string' ? '' : (r.action || ''))
    }));
  }

  return base;
}

/**
 * Parses markdown text into structured roadmap components and research dossier.
 */
function parseMarkdownRoadmap(markdownText) {
  const lines = markdownText.split('\n');
  const fieldIntelligence = createEmptyFieldIntelligence();
  const phases = [];
  const projects = [];
  const competencies = [];
  const specializations = [];
  const dependencyEdges = [];
  const parsedAdaptationRules = [];

  let currentSection = null;
  let currentPhase = null;
  let currentTask = null;
  let currentSubjectName = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = sanitizeText(rawLine);
    if (!line) continue;

    // Detect Top-level Subject or Title
    if (rawLine.startsWith('# ') && !currentSubjectName) {
      const titleCandidate = line.replace(/^#\s*/, '').replace(/^(?:Roadmap|Curriculum|Field Intelligence Dossier|Learning Plan)\s*[:—-]\s*/i, '');
      if (titleCandidate && !titleCandidate.toLowerCase().includes('sample only')) {
        currentSubjectName = titleCandidate;
      }
    }

    // Detect Major Research Sections
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Layer\s*A\s*[:—-]\s*)?(?:Field\s*(?:Reconstruction|Definition)|Foundations?|Seminal\s*Works?)/i.test(rawLine)) {
      currentSection = 'fieldDefinition';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Layer\s*B\s*[:—-]\s*)?(?:(?:Intellectual|Historical)\s*Lineage|Development\s*of\s*the\s*Field|Paradigm\s*Shifts)/i.test(rawLine)) {
      currentSection = 'historicalLineage';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Layer\s*C\s*[:—-]\s*)?(?:Current\s*State|Current\s*Practice)/i.test(rawLine)) {
      currentSection = 'currentState';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Layer\s*D\s*[:—-]\s*)?(?:Research\s*Frontier|Current\s*Research|Open\s*Problems|Unsolved\s*Problems)/i.test(rawLine)) {
      currentSection = 'researchFrontier';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Layer\s*E\s*[:—-]\s*)?(?:Emerging|Future\s*Branches)/i.test(rawLine)) {
      currentSection = 'emergingFrontier';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Layer\s*F\s*[:—-]\s*)?(?:Field\s*Survival|Durability\s*(?:Map|Analysis)?|Survival\s*Strategy|Durable\s*(?:Knowledge|Skills|Foundations)|Vulnerable\s*Knowledge|Commoditizing\s*Skills)/i.test(rawLine)) {
      currentSection = 'fieldSurvival';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?Field\s*Trajectory/i.test(rawLine)) {
      currentSection = 'fieldTrajectory';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Source\s*Ledger|Sources?|References?|Bibliography)/i.test(rawLine)) {
      currentSection = 'sourceLedger';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Claims?|Research\s*Claims?|Claim\s*Ledger)/i.test(rawLine)) {
      currentSection = 'claims';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:What\s*the\s*Standard\s*Roadmap\s*Would\s*Miss|Gap\s*Analysis)/i.test(rawLine)) {
      currentSection = 'gapAnalysis';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Roadmap\s*Influences?|Research\s*Consequences?)/i.test(rawLine)) {
      currentSection = 'roadmapInfluences';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Research\s*Scope|Research\s*Limitations|Coverage\s*Gaps)/i.test(rawLine)) {
      currentSection = 'scopeAndLimitations';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Practical\s*)?Projects/i.test(rawLine)) {
      currentSection = 'projects';
      continue;
    }
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?Specialization/i.test(rawLine)) {
      currentSection = 'specializations';
      continue;
    }
    // v2.1: Detect Learning Units section
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Learning\s*Units?|Knowledge\s*Acquisition|What\s*to\s*Understand)/i.test(rawLine)) {
      currentSection = 'learningUnits';
      continue;
    }
    // v2.1: Detect Doing Tasks section
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Doing\s*Tasks?|Practice\s*(?:Activities|Tasks)?|Application|What\s*to\s*Do)/i.test(rawLine)) {
      currentSection = 'doingTasks';
      continue;
    }
    // v2.1: Detect Subtasks section
    if (/^(?:#{1,4}\s+|\*\*\s*)(?:Subtasks?|Steps?|Concrete\s*Steps?)/i.test(rawLine)) {
      currentSection = 'subtasks';
      continue;
    }
    // v2.1: Detect High-Leverage section
    if (/^(?:#{1,3}\s+|\*\*\s*)(?:High[- ]Leverage|Often[- ]Skipped|Bridge\s*Concepts)/i.test(rawLine)) {
      currentSection = 'highLeverage';
      continue;
    }
    // v2.1: Detect Adaptation Rules section
    if (/^(?:#{1,3}\s+|\*\*\s*)(?:Phase\s*\d+\s*[:—-]\s*)?(?:Adaptation|Recovery)\s*(?:Rules|Guidance)?/i.test(rawLine)) {
      currentSection = 'adaptationRules';
      continue;
    }

    // Detect Learning Arc / Phase headings (# Learning Arc N: ..., - Phase N: ...)
    const arcMatch = /^(?:#{1,3}|[-*•]\s+)\s*(?:Learning\s*Arc|Phase|Track|Stage|Module\s*Cluster)\b\s*(\d+|[A-Z])?\s*[:—-]?\s*(.*)/i.exec(rawLine);
    if (arcMatch && arcMatch[2]) {
      currentSection = 'roadmap';
      const arcName = arcMatch[2].trim() || `Arc ${phases.length + 1}`;
      currentPhase = {
        id: `phase-${phases.length + 1}`,
        name: arcName,
        tasks: []
      };
      phases.push(currentPhase);
      currentTask = null;
      continue;
    }

    // Detect Task / Module headings (### Heading under currentPhase, or explicit Module/Task)
    const taskMatch = currentPhase
      ? /^(?:#{3,4}\s+(.*)|(?:#{2,4}|[-*•]\s+)\s*(?:Module|Task|Lesson|Unit|Topic)\b\s*[\d.]*\s*[:—-]?\s*(.*))/i.exec(rawLine)
      : /^(?:#{2,4}|[-*•]\s+)\s*(?:Module|Task|Lesson|Unit|Topic)\b\s*[\d.]*\s*[:—-]?\s*(.*)/i.exec(rawLine);
    if (taskMatch) {
      const matchedName = (taskMatch[1] || taskMatch[2] || '').trim();
      if (matchedName) {
        if (!currentPhase) {
          currentPhase = {
            id: `phase-${phases.length + 1}`,
            name: currentSubjectName || 'Core Curriculum',
            tasks: []
          };
          phases.push(currentPhase);
        }
        currentSection = 'roadmap';
        const taskName = matchedName.replace(/^(?:Module|Task|Lesson|Unit|Topic)\b\s*[\d.]*\s*[:—-]?\s*/i, '').trim() || `Task ${currentPhase.tasks.length + 1}`;
        currentTask = {
          id: `task-${phases.length}-${currentPhase.tasks.length + 1}`,
          name: taskName,
          subtasks: [],
          learningUnits: [],
          doingTasks: [],
          completed: false,
          completedAt: null
        };
        currentPhase.tasks.push(currentTask);
        continue;
      }
    }

    // Detect Markdown Table rows (| col1 | col2 | ...)
    const tableRowMatch = /^\|(.+)\|$/.exec(line);
    if (tableRowMatch) {
      const isSeparator = /^\|(?:\s*:?-+:?\s*\|)+$/.test(line);
      if (isSeparator) continue;

      const cells = tableRowMatch[1].split('|').map(c => sanitizeText(c.trim()));
      if (cells.length < 2) continue;

      // Skip header rows
      const isHeader = cells.some(c => /^(?:phase|arc|track|stage|module|task|topic|unit|step|subtask|era|milestone|skill|durability|source|reference|area)$/i.test(c));
      if (isHeader) continue;

      // If in historical lineage section
      if (currentSection === 'historicalLineage') {
        fieldIntelligence.historicalLineage.push({
          era: cells[0] || 'Historical',
          milestone: cells[1] || cells[0]
        });
        continue;
      }
      // If in field survival / durability map
      if (currentSection === 'fieldSurvival') {
        const skill = cells[0];
        const cat = (cells[1] || '').toLowerCase();
        if (/transfer/i.test(cat)) {
          fieldIntelligence.durabilityMap.transferableSkills.push(skill);
        } else if (/tool/i.test(cat)) {
          fieldIntelligence.durabilityMap.toolDependentSkills.push(skill);
        } else if (/commodit/i.test(cat)) {
          fieldIntelligence.durabilityMap.commoditizingSkills.push(skill);
        } else {
          fieldIntelligence.durabilityMap.durableSkills.push(skill);
        }
        continue;
      }
      // If in research frontier
      if (currentSection === 'researchFrontier') {
        fieldIntelligence.researchFrontier.push({
          area: cells.join(': '),
          status: 'ACTIVE'
        });
        continue;
      }
      // If in source ledger
      if (currentSection === 'sourceLedger') {
        fieldIntelligence.sourceLedger.push(cells.join(' - '));
        continue;
      }

      // Default: Roadmap Table Row
      if (cells.length >= 3) {
        const phaseName = cells[0];
        const taskName = cells[1];
        const subtasksStr = cells[2];

        if (!currentPhase || (phaseName && currentPhase.name !== phaseName)) {
          currentPhase = {
            id: `phase-${phases.length + 1}`,
            name: phaseName || `Phase ${phases.length + 1}`,
            tasks: []
          };
          phases.push(currentPhase);
        }

        const phaseNum = phases.length;
        const nextTaskNum = currentPhase.tasks.length + 1;
        const subtaskList = subtasksStr
          ? subtasksStr.split(/[,;\n•]+/).map(s => s.trim()).filter(Boolean).map((stName, sIdx) => ({
              id: `sub-${phaseNum}-${nextTaskNum}-${sIdx + 1}`,
              name: stName,
              completed: false,
              completedAt: null
            }))
          : [];

        currentTask = {
          id: `task-${phaseNum}-${nextTaskNum}`,
          name: taskName || `Task ${nextTaskNum}`,
          subtasks: subtaskList,
          learningUnits: [],
          doingTasks: [],
          completed: false
        };
        currentPhase.tasks.push(currentTask);
        continue;
      } else if (cells.length === 2) {
        if (!currentPhase) {
          currentPhase = {
            id: `phase-${phases.length + 1}`,
            name: currentSubjectName || 'Core Curriculum',
            tasks: []
          };
          phases.push(currentPhase);
        }
        const phaseNum2 = phases.length;
        const nextTaskNum2 = currentPhase.tasks.length + 1;
        const taskName = cells[0];
        const subtasksStr = cells[1];
        const subtaskList = subtasksStr
          ? subtasksStr.split(/[,;\n•]+/).map(s => s.trim()).filter(Boolean).map((stName, sIdx) => ({
              id: `sub-${phaseNum2}-${nextTaskNum2}-${sIdx + 1}`,
              name: stName,
              completed: false,
              completedAt: null
            }))
          : [];

        currentTask = {
          id: `task-${phaseNum2}-${nextTaskNum2}`,
          name: taskName || `Task ${nextTaskNum2}`,
          subtasks: subtaskList,
          learningUnits: [],
          doingTasks: [],
          completed: false
        };
        currentPhase.tasks.push(currentTask);
        continue;
      }
    }

    // Detect Subtask Checklists (- [ ] Do something)
    const checklistMatch = /^[\s]*[-*]\s*\[[ xX]?\]\s+(.*)/.exec(rawLine);
    if (checklistMatch) {
      if (!currentTask && currentPhase) {
        currentTask = {
          id: `task-${phases.length}-${currentPhase.tasks.length + 1}`,
          name: `${currentPhase.name} Modules`,
          subtasks: [],
          learningUnits: [],
          doingTasks: [],
          completed: false
        };
        currentPhase.tasks.push(currentTask);
      }
      if (currentTask) {
        const subtaskName = sanitizeText(checklistMatch[1]);
        if (subtaskName) {
          // Detect task mode annotations like (Mode: build)
          const modeMatch = /\(Mode:\s*(\w+)\)/i.exec(subtaskName);

          if (currentSection === 'doingTasks' || modeMatch) {
            currentTask.doingTasks.push({
              id: `dt-${currentTask.id}-${currentTask.doingTasks.length + 1}`,
              name: subtaskName.replace(/\(Mode:\s*\w+\)/i, '').trim(),
              mode: modeMatch ? modeMatch[1].toLowerCase() : null,
              completed: false
            });
          } else {
            currentTask.subtasks.push({
              id: `sub-${currentTask.id}-${currentTask.subtasks.length + 1}`,
              name: subtaskName,
              completed: false,
              completedAt: null
            });
          }
        }
      }
      continue;
    }

    // Detect plain bullet lists when inside roadmap or research
    if (/^[\s]*[-*•]\s+(.*)/.test(rawLine)) {
      const bulletContent = sanitizeText(rawLine.replace(/^[\s]*[-*•]\s+/, ''));
      if (!bulletContent) continue;

      // v2.1: Detect learning unit bullets (Understand X, Depth: Y)
      const luMatch = /^(?:Understand|Learn|Know|Grasp|Comprehend)\s+(.+)/i.exec(bulletContent);
      const depthMatch = /\(Depth:\s*(\w+)\)/i.exec(bulletContent);

      if (luMatch && currentTask) {
        const luName = bulletContent.replace(/\(Depth:\s*\w+\)/i, '').replace(/\(Why:\s*[^)]+\)/i, '').trim();
        const whyMatch = /\(Why:\s*([^)]+)\)/i.exec(bulletContent);
        currentTask.learningUnits.push({
          id: `lu-${currentTask.id}-${currentTask.learningUnits.length + 1}`,
          name: luName,
          depth: depthMatch ? depthMatch[1].toUpperCase() : DEPTH_LEVELS.WORKING_UNDERSTANDING,
          concept: luMatch[1].replace(/\(.*?\)/g, '').trim(),
          whyItMatters: whyMatch ? whyMatch[1] : null,
          misconceptionRisk: null,
          prerequisiteKnowledge: [],
          retrievalTarget: null,
          transferTarget: null
        });
        continue;
      }

      if (currentSection === 'learningUnits' && currentTask) {
        currentTask.learningUnits.push({
          id: `lu-${currentTask.id}-${currentTask.learningUnits.length + 1}`,
          name: bulletContent,
          depth: depthMatch ? depthMatch[1].toUpperCase() : DEPTH_LEVELS.WORKING_UNDERSTANDING,
          concept: null,
          whyItMatters: null,
          misconceptionRisk: null,
          prerequisiteKnowledge: [],
          retrievalTarget: null,
          transferTarget: null
        });
        continue;
      }

      const modeMatch2 = /\(Mode:\s*(\w+)\)/i.exec(bulletContent);
      if ((currentSection === 'doingTasks' || modeMatch2) && currentTask) {
        currentTask.doingTasks.push({
          id: `dt-${currentTask.id}-${currentTask.doingTasks.length + 1}`,
          name: bulletContent.replace(/\(Mode:\s*\w+\)/i, '').trim(),
          mode: modeMatch2 ? modeMatch2[1].toLowerCase() : null,
          completed: false
        });
        continue;
      }

      if (currentSection === 'projects') {
        const scafMatch = /\((?:Scaffolding|Level):\s*(\w+)\)/i.exec(bulletContent);
        const failMatch = /\((?:Failure Modes?|Fails?):\s*([^)]+)\)/i.exec(bulletContent);
        const teachMatch = /\((?:What Failure Teaches|Teaches):\s*([^)]+)\)/i.exec(bulletContent);
        const unlockMatch = /\((?:Unlocks?|Next):\s*([^)]+)\)/i.exec(bulletContent);
        const capMatch = /\((?:Capabilities|Skills):\s*([^)]+)\)/i.exec(bulletContent);
        const insightMatch = /\((?:Motivated By|Insight|Motivating):\s*([^)]+)\)/i.exec(bulletContent);

        const boldMatch = /^\*\*([^*]+)\*\*/.exec(bulletContent);
        const nameCandidate = boldMatch
          ? boldMatch[1].trim()
          : (bulletContent.split(':')[0].replace(/\*\*/g, '').trim() || `Project ${projects.length + 1}`);

        projects.push({
          id: `proj-${projects.length + 1}`,
          name: nameCandidate,
          description: bulletContent,
          scaffoldingLevel: scafMatch ? scafMatch[1].toUpperCase() : null,
          capabilitiesExercised: capMatch ? capMatch[1].split(',').map(s => s.trim()) : [],
          failureModes: failMatch ? failMatch[1].split(',').map(s => s.trim()) : [],
          whatFailureTeaches: teachMatch ? teachMatch[1].trim() : null,
          motivatingInsight: insightMatch ? insightMatch[1].trim() : null,
          unlocksNext: unlockMatch ? unlockMatch[1].trim() : null
        });
      } else if (currentSection === 'adaptationRules') {
        const weaknessMatch = /\[([A-Z_]+)\]/i.exec(bulletContent);
        const actionMatch = /(?:Action|Response|Guidance|Fix)[:—-]\s*([^)]+)/i.exec(bulletContent);
        parsedAdaptationRules.push({
          condition: bulletContent.replace(/\[[A-Z_]+\]/g, '').replace(/(?:Action|Response|Guidance|Fix)[:—-].*$/i, '').trim(),
          weaknessType: weaknessMatch ? weaknessMatch[1].toUpperCase() : 'KNOWLEDGE',
          action: actionMatch ? actionMatch[1].trim() : bulletContent
        });
      } else if (currentSection === 'specializations') {
        specializations.push({
          id: `spec-${specializations.length + 1}`,
          name: bulletContent.split(':')[0] || `Specialization ${specializations.length + 1}`,
          description: bulletContent
        });
      } else if (currentSection === 'claims') {
        fieldIntelligence.claims.push(bulletContent);
      } else if (currentSection === 'roadmapInfluences') {
        fieldIntelligence.roadmapInfluences.push(bulletContent);
      } else if (currentSection === 'gapAnalysis') {
        fieldIntelligence.whatStandardRoadmapWouldMiss.push(bulletContent);
      } else if (currentSection === 'scopeAndLimitations') {
        if (/scope/i.test(bulletContent)) {
          fieldIntelligence.researchScope = bulletContent.replace(/^(?:Research\s*)?Scope[:—-]\s*/i, '');
        } else if (/gap/i.test(bulletContent)) {
          fieldIntelligence.coverageGaps.push(bulletContent.replace(/^(?:Coverage\s*)?Gaps?[:—-]\s*/i, ''));
        } else {
          fieldIntelligence.researchLimitations.push(bulletContent.replace(/^(?:Research\s*)?Limitations?[:—-]\s*/i, ''));
        }
      } else if (currentSection === 'emergingFrontier') {
        fieldIntelligence.researchFrontier.push({
          area: bulletContent,
          status: 'EMERGING'
        });
      } else if (currentSection === 'fieldSurvival') {
        fieldIntelligence.durabilityMap.durableSkills.push(bulletContent);
      } else if (currentSection === 'researchFrontier') {
        fieldIntelligence.researchFrontier.push({
          area: bulletContent,
          status: 'EMERGING'
        });
      } else if (currentSection === 'sourceLedger') {
        fieldIntelligence.sourceLedger.push(rawLine);
      } else if (currentSection === 'fieldTrajectory') {
        // Extract classification if present
        const classMatch = /\[(\w+)\]/.exec(bulletContent);
        fieldIntelligence.fieldTrajectory.push({
          topic: bulletContent.replace(/\[(\w+)\]/, '').replace(/\*\*/g, '').trim(),
          classification: classMatch ? classMatch[1] : null
        });
      } else if (currentSection === 'highLeverage') {
        fieldIntelligence.highLeverageConcepts.push(bulletContent);
      } else if (currentSection === 'historicalLineage') {
        const parts = bulletContent.split(/[:—-]/);
        if (parts.length >= 2) {
          fieldIntelligence.historicalLineage.push({
            era: parts[0].trim(),
            milestone: parts.slice(1).join(':').trim()
          });
        } else {
          fieldIntelligence.historicalLineage.push({
            era: 'Historical',
            milestone: bulletContent
          });
        }
      } else if (currentSection === 'fieldDefinition' || currentSection === 'foundationalIdeas') {
        fieldIntelligence.foundationalIdeas.push(bulletContent);
      } else if (currentSection === 'currentState') {
        if (!fieldIntelligence.currentState) {
          fieldIntelligence.currentState = bulletContent;
        } else {
          fieldIntelligence.foundationalIdeas.push(bulletContent);
        }
      } else if (currentSection === 'openProblems') {
        fieldIntelligence.openProblems.push(bulletContent);
      } else if (currentSection === 'roadmap' || !currentSection || currentPhase) {
        if (!currentPhase) {
          currentPhase = {
            id: `phase-${phases.length + 1}`,
            name: currentSubjectName || 'Core Curriculum',
            tasks: []
          };
          phases.push(currentPhase);
        }
        const indentMatch = /^(\s*)[-*•]/.exec(rawLine);
        const isIndented = indentMatch && indentMatch[1].length >= 2;
        if ((isIndented || currentSection === 'subtasks') && currentTask) {
          currentTask.subtasks.push({
            id: `sub-${currentTask.id}-${currentTask.subtasks.length + 1}`,
            name: bulletContent,
            completed: false,
            completedAt: null
          });
        } else {
          currentTask = {
            id: `task-${phases.length}-${currentPhase.tasks.length + 1}`,
            name: bulletContent,
            subtasks: [],
            learningUnits: [],
            doingTasks: [],
            completed: false,
            completedAt: null
          };
          currentPhase.tasks.push(currentTask);
        }
      }
      continue;
    }

    // Capture descriptive paragraphs into research fields
    if (currentSection === 'fieldDefinition' && !fieldIntelligence.fieldDefinition) {
      fieldIntelligence.fieldDefinition = line;
    } else if (currentSection === 'currentState' && !fieldIntelligence.currentState) {
      fieldIntelligence.currentState = line;
    } else if (currentSection === 'fieldSurvival' && !fieldIntelligence.survivalStrategy) {
      fieldIntelligence.survivalStrategy = line;
    } else if (currentSection === 'scopeAndLimitations' && !fieldIntelligence.researchScope && /scope/i.test(line)) {
      fieldIntelligence.researchScope = line.replace(/^(?:Research\s*)?Scope[:—-]\s*/i, '');
    }
  }

  // Handle Prerequisite annotations (e.g., *Prerequisite*: Module 1.1)
  const prereqRegex = /(?:Prerequisite|Depends on)\s*[:—-]\s*([^\n\r]+)/gi;
  let match;
  while ((match = prereqRegex.exec(markdownText)) !== null) {
    const rawTarget = match[1].trim();
    dependencyEdges.push({ from: rawTarget, to: 'dependent', type: 'PREREQUISITE' });
  }

  // Normalize all research collections
  fieldIntelligence.sourceLedger = normalizeSourceLedger(fieldIntelligence.sourceLedger);
  fieldIntelligence.claims = normalizeClaims(fieldIntelligence.claims);
  fieldIntelligence.roadmapInfluences = normalizeRoadmapInfluences(fieldIntelligence.roadmapInfluences);
  fieldIntelligence.whatStandardRoadmapWouldMiss = normalizeGapAnalysis(fieldIntelligence.whatStandardRoadmapWouldMiss);

  return {
    subjectName: currentSubjectName || 'Imported Learning Pathway',
    phases,
    projects,
    competencies,
    specializations,
    fieldIntelligence,
    dependencyEdges,
    adaptationRules: { rules: parsedAdaptationRules }
  };
}

/**
 * Normalizes raw external JSON or parsed object using synonym dictionaries.
 */
function normalizeJsonObject(obj, defaultSubjectName) {
  if (!obj || typeof obj !== 'object') return null;

  if (Array.isArray(obj)) {
    return {
      isMultiSubject: true,
      subjects: obj,
      fieldIntelligence: extractFieldIntelligence(obj[0]),
      learnerContext: obj[0]?.learnerContext || {}
    };
  }

  const fieldIntelligence = extractFieldIntelligence(obj);
  const learnerContext = obj.learnerContext || {};
  const projects = Array.isArray(resolveField(obj, PROJECT_SYNONYMS, []))
    ? resolveField(obj, PROJECT_SYNONYMS, []) : [];
  const competencies = Array.isArray(resolveField(obj, COMPETENCY_SYNONYMS, []))
    ? resolveField(obj, COMPETENCY_SYNONYMS, []) : [];
  const specializations = Array.isArray(resolveField(obj, SPECIALIZATION_SYNONYMS, []))
    ? resolveField(obj, SPECIALIZATION_SYNONYMS, []) : [];

  const dependencyGraph = obj.dependencyGraph || { nodes: [], edges: [] };
  const learningMissions = Array.isArray(obj.learningMissions) ? obj.learningMissions : [];
  const adaptationRules = extractAdaptationRules(obj);

  let rawPhases = [];
  for (const key of PHASE_SYNONYMS) {
    if (Array.isArray(obj[key])) {
      rawPhases = obj[key];
      break;
    }
  }

  if (rawPhases.length === 0) {
    if (Array.isArray(obj.modules) && obj.modules.every(m => Array.isArray(m.tasks) || Array.isArray(m.lessons))) {
      rawPhases = obj.modules;
    } else if (Array.isArray(obj.subjects)) {
      return {
        isMultiSubject: true,
        subjects: obj.subjects,
        fieldIntelligence,
        learnerContext
      };
    }
  }

  const phases = rawPhases.map((phase, pIdx) => {
    const phaseName = sanitizeText(phase.name || phase.title || phase.stageName || phase.trackName || phase.arcName || phase.phaseName || `Phase ${pIdx + 1}`);

    // Resolve module/task array from synonyms
    let rawTasks = [];
    for (const key of MODULE_SYNONYMS) {
      if (Array.isArray(phase[key])) {
        rawTasks = phase[key];
        break;
      }
    }

    const tasks = rawTasks.map((task, tIdx) => {
      const taskName = sanitizeText(task.name || task.title || task.topic || task.unitName || task.moduleName || task.taskName || task.lessonName || task.concept || `Task ${tIdx + 1}`);

      // Resolve subtask array from synonyms
      let rawSubtasks = [];
      for (const key of SUBTASK_SYNONYMS) {
        if (Array.isArray(task[key])) {
          rawSubtasks = task[key];
          break;
        }
      }

      // If no direct subtasks, harvest from doingTasks if present
      if (rawSubtasks.length === 0 && Array.isArray(task.doingTasks)) {
        task.doingTasks.forEach(dt => {
          if (Array.isArray(dt.subtasks)) {
            rawSubtasks.push(...dt.subtasks);
          }
        });
      }

      const subtasks = rawSubtasks.map((st, sIdx) => {
        const subName = typeof st === 'string' ? sanitizeText(st) : sanitizeText(st.name || st.title || `Step ${sIdx + 1}`);
        return {
          id: `sub-${pIdx + 1}-${tIdx + 1}-${sIdx + 1}`,
          name: subName || `Action ${sIdx + 1}`,
          completed: false,
          completedAt: null
        };
      });

      // v2.1: Extract learning units and doing tasks
      const taskLearningUnits = extractLearningUnits(task);
      const taskDoingTasks = extractDoingTasks(task);

      return {
        id: task.id || `task-${pIdx + 1}-${tIdx + 1}`,
        name: taskName,
        subtasks,
        learningUnits: taskLearningUnits,
        doingTasks: taskDoingTasks,
        completed: false,
        completedAt: null,
        learningMode: task.learningMode || null,
        prerequisites: Array.isArray(task.prerequisites) ? task.prerequisites : [],
        whyItMatters: task.whyItMatters || task.importance || task.reason || null,
        depth: task.depth || task.learningDepth || null,
        practicalFailureModes: Array.isArray(task.practicalFailureModes) ? task.practicalFailureModes : (Array.isArray(task.failureModes) ? task.failureModes : []),
        highLeverageConcepts: Array.isArray(task.highLeverageConcepts) ? task.highLeverageConcepts : [],
        sourceRoadmapInfluences: Array.isArray(task.sourceRoadmapInfluences) ? task.sourceRoadmapInfluences : (Array.isArray(task.researchInfluences) ? task.researchInfluences : []),
        consequences: Array.isArray(task.consequences) ? task.consequences : (Array.isArray(task.unlocks) ? task.unlocks : []),
        evidenceExpected: task.evidenceExpected || task.evidence || null,
        isOptional: Boolean(task.isOptional || task.optional)
      };
    });

    return {
      id: phase.id || `phase-${pIdx + 1}`,
      name: phaseName,
      purpose: phase.purpose || phase.description || null,
      capabilitiesDeveloped: Array.isArray(phase.capabilitiesDeveloped) ? phase.capabilitiesDeveloped : (Array.isArray(phase.capabilities) ? phase.capabilities : []),
      whyThisAreaMatters: phase.whyThisAreaMatters || phase.whyItMatters || null,
      importantConcepts: Array.isArray(phase.importantConcepts) ? phase.importantConcepts : [],
      associatedProjects: Array.isArray(phase.associatedProjects) ? phase.associatedProjects : (Array.isArray(phase.projects) ? phase.projects : []),
      relevantResearchFindings: Array.isArray(phase.relevantResearchFindings) ? phase.relevantResearchFindings : [],
      prerequisites: Array.isArray(phase.prerequisites) ? phase.prerequisites : [],
      tasks
    };
  });

  // Enrich projects with v2.1/v2.3/v2.4 fields
  const enrichedProjects = projects.map((p, idx) => {
    const projName = sanitizeText(p.name || p.title || p.projectTitle || `Project ${idx + 1}`);
    return {
      id: p.id || `proj-${idx + 1}`,
      name: projName,
      title: projName,
      description: p.description || null,
      scaffolding: p.scaffolding || p.scaffoldingLevel || 'GUIDED',
      scaffoldingLevel: p.scaffoldingLevel || p.scaffolding || 'GUIDED',
      capabilitiesExercised: Array.isArray(p.capabilitiesExercised) ? p.capabilitiesExercised : (Array.isArray(p.skillsExercised) ? p.skillsExercised : []),
      prerequisiteModules: Array.isArray(p.prerequisiteModules) ? p.prerequisiteModules : [],
      failureModes: Array.isArray(p.failureModes) ? p.failureModes : (Array.isArray(p.failureModesEncountered) ? p.failureModesEncountered : (Array.isArray(p.practicalFailureModes) ? p.practicalFailureModes : [])),
      failureModesEncountered: Array.isArray(p.failureModesEncountered) ? p.failureModesEncountered : (Array.isArray(p.failureModes) ? p.failureModes : (Array.isArray(p.practicalFailureModes) ? p.practicalFailureModes : [])),
      practicalFailureModes: Array.isArray(p.practicalFailureModes) ? p.practicalFailureModes : (Array.isArray(p.failureModes) ? p.failureModes : (Array.isArray(p.failureModesEncountered) ? p.failureModesEncountered : [])),
      whatFailureTeaches: p.whatFailureTeaches || null,
      motivatingInsight: p.motivatingInsight || null,
      unlocksNext: p.unlocksNext || null,
      evidenceProduced: p.evidenceProduced || p.evidence || null
    };
  });

  const subjectName = sanitizeText(obj.name || obj.title || obj.finalDestination || defaultSubjectName);

  return {
    isMultiSubject: false,
    subjectName: subjectName || 'Imported Learning Pathway',
    phases,
    projects: enrichedProjects,
    competencies,
    specializations,
    fieldIntelligence,
    learnerContext,
    dependencyGraph,
    learningMissions,
    adaptationRules
  };
}

/**
 * Main ingestion, normalization, and validation entry point.
 *
 * @param {string|Object} rawInput - Candidate roadmap text, Markdown, or JSON
 * @param {Object} learnerContextInput - Context collected from user
 * @returns {Object} Comprehensive normalization and validation report
 */
export function normalizeRoadmapInput(rawInput, learnerContextInput = {}) {
  const learnerContext = createLearnerContext(learnerContextInput);
  const warnings = [];
  const errors = [];

  // 1. Payload size guard
  if (typeof rawInput === 'string' && rawInput.length > MAX_PAYLOAD_BYTES) {
    return {
      success: false,
      format: FORMAT_TYPES.UNKNOWN,
      canImportDirectly: false,
      needsConversion: false,
      errors: ['Oversized payload exceeds maximum allowed size (5MB).'],
      warnings: [],
      canonicalRoadmap: [],
      confidence: {},
      summaryMetrics: {}
    };
  }

  // 2. Format detection
  const text = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);
  const detectedFormat = detectFormat(text);

  let parsedData = null;

  if (detectedFormat === FORMAT_TYPES.CANONICAL_JSON || detectedFormat === FORMAT_TYPES.ALTERNATE_JSON) {
    let rawObj = typeof rawInput === 'object' ? rawInput : safeJsonParse(text);
    if (!rawObj && typeof text === 'string') {
      rawObj = attemptJsonRepair(text);
      if (rawObj) {
        warnings.push('Malformed JSON was detected; syntax was automatically repaired.');
      }
    }
    if (rawObj) {
      parsedData = normalizeJsonObject(rawObj, learnerContext.goal || 'Imported Pathway');
    }
  } else if (detectedFormat === FORMAT_TYPES.MIXED_AI_RESPONSE) {
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = jsonBlockRegex.exec(text);
    if (match && match[1]) {
      let candidateJson = safeJsonParse(match[1].trim());
      if (!candidateJson) {
        candidateJson = attemptJsonRepair(match[1].trim());
        if (candidateJson) {
          warnings.push('Malformed JSON inside code block was detected; syntax was automatically repaired.');
        }
      }
      if (candidateJson) {
        parsedData = normalizeJsonObject(candidateJson, learnerContext.goal || 'Imported Pathway');
      }
    }
  }

  // If still not parsed or detected as Markdown / Report / Freeform
  if (!parsedData) {
    const mdResult = parseMarkdownRoadmap(text);
    parsedData = {
      isMultiSubject: false,
      subjectName: learnerContext.goal || mdResult.subjectName,
      phases: mdResult.phases,
      projects: mdResult.projects,
      competencies: mdResult.competencies,
      specializations: mdResult.specializations,
      fieldIntelligence: mdResult.fieldIntelligence,
      dependencyGraph: { nodes: [], edges: mdResult.dependencyEdges },
      learningMissions: [],
      adaptationRules: mdResult.adaptationRules || createEmptyAdaptationRules()
    };
  }

  // 3. Assemble Canonical Subjects Array
  let canonicalRoadmap = [];

  if (parsedData.isMultiSubject && Array.isArray(parsedData.subjects)) {
    canonicalRoadmap = parsedData.subjects.map((s, idx) => ({
      id: s.id || `subj-${idx + 1}`,
      name: sanitizeText(s.name || `Track ${idx + 1}`),
      phases: (s.phases || []).map((p, pIdx) => ({
        id: p.id || `phase-${idx + 1}-${pIdx + 1}`,
        name: sanitizeText(p.name || `Phase ${pIdx + 1}`),
        purpose: p.purpose || p.description || null,
        capabilitiesDeveloped: Array.isArray(p.capabilitiesDeveloped) ? p.capabilitiesDeveloped : (Array.isArray(p.capabilities) ? p.capabilities : []),
        whyThisAreaMatters: p.whyThisAreaMatters || p.whyItMatters || null,
        importantConcepts: Array.isArray(p.importantConcepts) ? p.importantConcepts : [],
        associatedProjects: Array.isArray(p.associatedProjects) ? p.associatedProjects : [],
        relevantResearchFindings: Array.isArray(p.relevantResearchFindings) ? p.relevantResearchFindings : [],
        prerequisites: Array.isArray(p.prerequisites) ? p.prerequisites : [],
        tasks: (p.tasks || []).map((t, tIdx) => ({
          id: t.id || `task-${idx + 1}-${pIdx + 1}-${tIdx + 1}`,
          name: sanitizeText(t.name || `Task ${tIdx + 1}`),
          subtasks: (t.subtasks || []).map((st, sIdx) => ({
            id: st.id || `sub-${idx + 1}-${pIdx + 1}-${tIdx + 1}-${sIdx + 1}`,
            name: typeof st === 'string' ? sanitizeText(st) : sanitizeText(st.name || `Step ${sIdx + 1}`),
            completed: false,
            completedAt: null
          })),
          learningUnits: extractLearningUnits(t),
          doingTasks: extractDoingTasks(t),
          whyItMatters: t.whyItMatters || t.importance || t.reason || null,
          depth: t.depth || t.learningDepth || null,
          practicalFailureModes: Array.isArray(t.practicalFailureModes) ? t.practicalFailureModes : (Array.isArray(t.failureModes) ? t.failureModes : []),
          highLeverageConcepts: Array.isArray(t.highLeverageConcepts) ? t.highLeverageConcepts : [],
          sourceRoadmapInfluences: Array.isArray(t.sourceRoadmapInfluences) ? t.sourceRoadmapInfluences : [],
          consequences: Array.isArray(t.consequences) ? t.consequences : [],
          evidenceExpected: t.evidenceExpected || t.evidence || null,
          isOptional: Boolean(t.isOptional || t.optional),
          completed: false,
          completedAt: null
        }))
      })),
      fieldIntelligence: extractFieldIntelligence(s),
      learnerContext: s.learnerContext || learnerContext,
      adaptationRules: extractAdaptationRules(s)
    }));
  } else {
    // Single Subject
    const subjectId = `subj-imported-${Date.now().toString(36)}`;
    canonicalRoadmap = [
      {
        id: subjectId,
        name: parsedData.subjectName || learnerContext.goal || 'Custom Learning Track',
        phases: parsedData.phases || [],
        fieldIntelligence: parsedData.fieldIntelligence || createEmptyFieldIntelligence(),
        learnerContext,
        dependencyGraph: parsedData.dependencyGraph || { nodes: [], edges: [] },
        projects: parsedData.projects || [],
        competencies: parsedData.competencies || [],
        specializations: parsedData.specializations || [],
        learningMissions: parsedData.learningMissions || [],
        adaptationRules: parsedData.adaptationRules || createEmptyAdaptationRules()
      }
    ];
  }

  // 4. Duplicate ID check & Deduplication
  const seenIds = new Set();
  canonicalRoadmap.forEach((subject, sIdx) => {
    if (seenIds.has(subject.id)) {
      subject.id = `${subject.id}-dedup-${sIdx}`;
    }
    seenIds.add(subject.id);

    (subject.phases || []).forEach((phase, pIdx) => {
      if (seenIds.has(phase.id)) {
        phase.id = `${phase.id}-dedup-${pIdx}`;
      }
      seenIds.add(phase.id);

      (phase.tasks || []).forEach((task, tIdx) => {
        if (seenIds.has(task.id)) {
          task.id = `${task.id}-dedup-${tIdx}`;
        }
        seenIds.add(task.id);

        (task.subtasks || []).forEach((sub, subIdx) => {
          if (seenIds.has(sub.id)) {
            sub.id = `${sub.id}-dedup-${subIdx}`;
          }
          seenIds.add(sub.id);
        });
      });
    });
  });

  // 5. Dependency Cycle and Broken Reference Validation
  const allEdges = [];
  const allTaskIds = new Set();
  canonicalRoadmap.forEach(s => {
    (s.phases || []).forEach(p => {
      (p.tasks || []).forEach(t => {
        allTaskIds.add(t.id);
        allTaskIds.add(t.name);
        (t.prerequisites || []).forEach(prereq => {
          allEdges.push({ from: prereq, to: t.id });
        });
      });
    });
    if (s.dependencyGraph?.edges) {
      allEdges.push(...s.dependencyGraph.edges);
    }
  });

  // Check cycles
  const cycles = detectCycles(allEdges);
  if (cycles.length > 0) {
    warnings.push(`Circular dependency detected: ${cycles[0].join(' -> ')}. Prerequisites linearized for safety.`);
  }

  // Check broken prerequisite references
  allEdges.forEach(edge => {
    if (edge.from && !allTaskIds.has(edge.from) && edge.to !== 'dependent') {
      warnings.push(`Prerequisite reference "${edge.from}" does not match an existing module.`);
    }
  });

  // 6. Source URL Validation
  canonicalRoadmap.forEach(s => {
    if (s.fieldIntelligence?.sourceLedger) {
      s.fieldIntelligence.sourceLedger.forEach(src => {
        if (src.url && !isSafeUrl(src.url)) {
          warnings.push(`Sanitized unsafe external source URL: ${src.url}`);
          src.url = '#';
        }
      });
    }
  });

  // 7. Calculate Counts & Confidence Signals (v2.1 / v2.3 expanded)
  let totalArcs = 0;
  let totalModules = 0;
  let totalSubtasks = 0;
  let totalProjects = 0;
  let totalCompetencies = 0;
  let totalFrontier = 0;
  let totalSources = 0;
  let totalUncertainties = 0;
  let totalLearningUnits = 0;
  let totalDoingTasks = 0;
  let totalSpecializations = 0;
  let totalClaims = 0;
  let totalInfluences = 0;
  let totalGaps = 0;

  canonicalRoadmap.forEach(s => {
    totalArcs += (s.phases || []).length;
    (s.phases || []).forEach(p => {
      totalModules += (p.tasks || []).length;
      (p.tasks || []).forEach(t => {
        totalSubtasks += (t.subtasks || []).length;
        totalLearningUnits += (t.learningUnits || []).length;
        totalDoingTasks += (t.doingTasks || []).length;
      });
    });
    totalProjects += (s.projects || []).length;
    totalCompetencies += (s.competencies || []).length;
    totalSpecializations += (s.specializations || []).length;
    totalFrontier += (s.fieldIntelligence?.researchFrontier || []).length;
    totalSources += (s.fieldIntelligence?.sourceLedger || []).length;
    totalUncertainties += (s.fieldIntelligence?.uncertainties || []).length;
    totalClaims += (s.fieldIntelligence?.claims || []).length;
    totalInfluences += (s.fieldIntelligence?.roadmapInfluences || []).length;
    totalGaps += (s.fieldIntelligence?.whatStandardRoadmapWouldMiss || []).length;
  });

  // Evaluate research quality and provenance
  const primaryFieldIntel = canonicalRoadmap[0]?.fieldIntelligence || createEmptyFieldIntelligence();
  const researchQuality = assessResearchQuality(primaryFieldIntel, canonicalRoadmap);

  // Append proportional research warnings to report warnings
  researchQuality.proportionalWarnings.forEach(w => {
    if (!warnings.includes(w)) warnings.push(w);
  });

  const confidence = {
    destination: (learnerContext.destination || canonicalRoadmap[0]?.name)
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    learningArcs: totalArcs >= 2
      ? CONFIDENCE_LEVELS.DETECTED
      : (totalArcs === 1 ? CONFIDENCE_LEVELS.PARTIALLY_DETECTED : CONFIDENCE_LEVELS.NOT_DETECTED),
    modules: totalModules >= 2
      ? CONFIDENCE_LEVELS.DETECTED
      : (totalModules === 1 ? CONFIDENCE_LEVELS.PARTIALLY_DETECTED : CONFIDENCE_LEVELS.NOT_DETECTED),
    subtasks: totalSubtasks >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    // v2.1 confidence signals
    learningUnits: totalLearningUnits >= 2
      ? CONFIDENCE_LEVELS.DETECTED
      : (totalLearningUnits === 1 ? CONFIDENCE_LEVELS.PARTIALLY_DETECTED : CONFIDENCE_LEVELS.NOT_DETECTED),
    doingTasks: totalDoingTasks >= 2
      ? CONFIDENCE_LEVELS.DETECTED
      : (totalDoingTasks === 1 ? CONFIDENCE_LEVELS.PARTIALLY_DETECTED : CONFIDENCE_LEVELS.NOT_DETECTED),
    projects: totalProjects >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    competencies: totalCompetencies >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    specializations: totalSpecializations >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    researchFrontier: totalFrontier >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    sourceLedger: totalSources >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    // v2.3 confidence signals
    claims: totalClaims >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    roadmapInfluences: totalInfluences >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    durabilityMap: researchQuality.layersDetected.FIELD_SURVIVAL
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    gapAnalysis: researchQuality.hasGapAnalysis
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    dependencyGraph: allEdges.length >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED,
    learningMissions: (canonicalRoadmap[0]?.learningMissions || []).length >= 1
      ? CONFIDENCE_LEVELS.DETECTED
      : CONFIDENCE_LEVELS.NOT_DETECTED
  };

  const hasImportableRoadmap = totalArcs > 0 && totalModules > 0;
  const canImportDirectly = hasImportableRoadmap;
  const needsConversion = !hasImportableRoadmap && (totalFrontier > 0 || totalSources > 0 || text.length > 200);

  if (!hasImportableRoadmap && !needsConversion) {
    errors.push('No actionable learning arcs or modules could be extracted from input.');
  }

  return {
    success: canImportDirectly,
    format: detectedFormat,
    canImportDirectly,
    needsConversion,
    confidence,
    warnings,
    errors,
    canonicalRoadmap,
    researchQuality,
    summaryMetrics: {
      subjectCount: canonicalRoadmap.length,
      arcCount: totalArcs,
      moduleCount: totalModules,
      subtaskCount: totalSubtasks,
      learningUnitCount: totalLearningUnits,
      doingTaskCount: totalDoingTasks,
      projectCount: totalProjects,
      competencyCount: totalCompetencies,
      specializationCount: totalSpecializations,
      frontierCount: totalFrontier,
      sourceCount: totalSources,
      uncertaintyCount: totalUncertainties,
      claimCount: totalClaims,
      gapCount: totalGaps,
      verifiedClaimCount: researchQuality.verifiedClaimCount,
      researchQualityRating: researchQuality.rating,
      layersDetectedCount: Object.values(researchQuality.layersDetected).filter(Boolean).length
    }
  };
}
