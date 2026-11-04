/**
 * frontierAiReasoningBridge.test.js
 *
 * Dedicated test suite verifying next-gen frontier AI reasoning models
 * (Gemini Argon / 2.0 Pro, GPT Astra / o1 / 4o, Claude 3.7 Sonnet, DeepSeek R1)
 * across the 4-Tier Epistemic Scale (from Simple Practical Craft to Alien-Level Physics).
 */

import { generateDeepResearchCharter } from '../services/roadmapBridge/researchCharter';
import {
  normalizeRoadmapInput,
  detectFormat,
  extractBestJsonFromText,
  FORMAT_TYPES
} from '../services/roadmapBridge/roadmapNormalizer';
import { createLearnerContext } from '../services/roadmapBridge/learnerContextModel';

describe('FRONTIER AI REASONING & 4-TIER EPISTEMIC BRIDGE', () => {

  describe('1. Epistemic Auto-Calibration in Universal Prompt Generator', () => {
    test('Charter embeds 4-Tier Epistemic Scale contract and Frontier AI Calibration', () => {
      const context = createLearnerContext({
        goal: 'Acoustic Guitar Fingerstyle Craft',
        destination: 'Master Fingerstyle Arranger',
        targetDeliverables: '3 multi-voice arrangements with percussive body tapping',
        learningStyle: 'HANDS_ON',
        purpose: 'CRAFT',
        level: 'BEGINNER'
      });
      const charter = generateDeepResearchCharter(context);

      expect(charter).toContain('FRONTIER AI REASONING & ADAPTIVE TOPIC CALIBRATION ENGINE');
      expect(charter).toContain('Gemini Argon/2.0 Pro');
      expect(charter).toContain('GPT Astra/o1/4o');
      expect(charter).toContain('Claude 3.7 Sonnet');
      expect(charter).toContain('DeepSeek R1');
      expect(charter).toContain('[TIER 1 — ACCESSIBLE PRACTICAL CRAFTS, ARTS & DAILY SKILLS]');
      expect(charter).toContain('[TIER 2 — ENGINEERING, SYSTEMS & APPLIED TECHNOLOGY]');
      expect(charter).toContain('[TIER 3 — RIGOROUS SCIENCES & ACADEMIC DISCIPLINES]');
      expect(charter).toContain('[TIER 4 — ALIEN-LEVEL FRONTIER, THEORETICAL & QUANTUM RESEARCH]');
      expect(charter).toContain('UNIVERSAL DUAL-PAYLOAD CONTRACT');
    });

    test('Charter adapts to alien-level quantum computing without degradation', () => {
      const context = createLearnerContext({
        goal: 'Topological Quantum Computing & Anyonic Braid Physics',
        destination: 'Theoretical Quantum Information Physicist',
        targetDeliverables: 'Unitary braid simulator for Fibonacci anyons',
        learningStyle: 'THEORY_FIRST',
        purpose: 'RESEARCH',
        level: 'ADVANCED'
      });
      const charter = generateDeepResearchCharter(context);

      expect(charter).toContain('Topological Quantum Computing & Anyonic Braid Physics');
      expect(charter).toContain('Unitary braid simulator for Fibonacci anyons');
      expect(charter).toContain('Topos Theory, Non-Equilibrium QFT, Topological Quantum Computing');
    });
  });

  describe('2. Omnivorous Decoding Engine (Multi-block & Un-fenced JSON)', () => {
    test('Extracts best roadmap JSON when preceded by ASCII diagram and code blocks (Gemini Argon style)', () => {
      const geminiArgonMixedOutput = `
# Executive Field Reconstruction: Distributed Raft Storage

Here is the architectural state machine:
\`\`\`text
[Follower] ---> Candidate ---> Leader
    ^               |
    +---------------+
\`\`\`

Here is a sample heartbeat in Rust:
\`\`\`rust
fn send_append_entries() {
    println!("heartbeat");
}
\`\`\`

Here is the canonical executable roadmap for the Learning Tracker:
\`\`\`json
{
  "schemaVersion": "2.3.0",
  "subjectName": "Distributed Consensus & Raft Storage",
  "learningArcs": [
    {
      "name": "State Machine Replication Foundations",
      "purpose": "Master synchronous & asynchronous consensus models",
      "modules": [
        {
          "name": "Raft Leader Election & Log Replication",
          "whyItMatters": "Core invariants preventing split-brain",
          "learningUnits": [
            { "name": "Term monotonicity and randomized election timers", "depth": "DEEP_MECHANISMS" }
          ],
          "doingTasks": [
            { "name": "Implement 3-node in-memory election simulator in Rust", "mode": "BUILD" }
          ],
          "subtasks": [
            { "name": "Write unit tests for split-vote recovery" }
          ]
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "Production-grade Raft Cluster with RocksDB WAL",
      "scaffoldingLevel": "OPEN_ENDED"
    }
  ]
}
\`\`\`
Follow this exact sequence for maximum retention.
`;
      const detected = detectFormat(geminiArgonMixedOutput);
      expect(detected).toBe(FORMAT_TYPES.MIXED_AI_RESPONSE);

      const report = normalizeRoadmapInput(geminiArgonMixedOutput);
      expect(report.success).toBe(true);
      expect(report.canImportDirectly).toBe(true);
      expect(report.canonicalRoadmap.length).toBe(1);
      expect(report.canonicalRoadmap[0].name).toBe('Distributed Consensus & Raft Storage');
      expect(report.canonicalRoadmap[0].phases.length).toBe(1);
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].name).toBe('Raft Leader Election & Log Replication');
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].learningUnits.length).toBe(1);
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].doingTasks.length).toBe(1);
      expect(report.canonicalRoadmap[0].projects.length).toBe(1);
    });

    test('Decodes un-fenced raw JSON embedded inside conversational text (GPT Astra / streaming edge case)', () => {
      const unfencedText = `
Certainly! I have generated your comprehensive roadmap according to the dual-payload contract.

{
  "schemaVersion": "2.3.0",
  "name": "Sourdough Bread Craft & Microbial Fermentation",
  "phases": [
    {
      "name": "Microbial Cultivation & Starter Kinetics",
      "tasks": [
        {
          "name": "Wild Yeast & Lactic Acid Bacteria Ecology",
          "learningUnits": [
            { "name": "Homo- vs hetero-fermentative LAB acidity curves", "depth": "INTUITION" }
          ],
          "doingTasks": [
            { "name": "Build starter hydration feeding schedule tracking pH", "mode": "MEASUREMENT" }
          ],
          "subtasks": [
            { "name": "Perform float test on peak starter" }
          ]
        }
      ]
    }
  ]
}

Let me know if you would like me to unpack any of the fermentation kinetics!
`;
      const best = extractBestJsonFromText(unfencedText);
      expect(best).not.toBeNull();
      expect(best.name).toBe('Sourdough Bread Craft & Microbial Fermentation');

      const report = normalizeRoadmapInput(unfencedText);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].name).toBe('Sourdough Bread Craft & Microbial Fermentation');
      expect(report.canonicalRoadmap[0].phases.length).toBe(1);
    });
  });

  describe('3. Cross-Tier Roadmap Ingestion Diversity', () => {
    test('Tier 1: Everyday Physical Craft (Acoustic Guitar) maps sensory drills, feedback, and takes', () => {
      const craftMarkdown = `
# Phase 1: Biomechanics & Thumb Independence
## Module 1: Alternating Bass Mechanics
- Practice: Slow metronome thumb-index alternation on strings 6 and 3 (60 BPM)
- Drill: Travis picking pattern over open C and G major chords
- Sensory Feedback: Feel thumb pad striking down without pulling forearm muscles
- Failure Mode: Tense thumb tendon leading to timing wobble
- [ ] Record 60-second clean voice memo at 80 BPM without rhythm hitch
- [ ] Practice mute-tap body percussion coordinate with thumb downbeat
`;
      const report = normalizeRoadmapInput(craftMarkdown, { goal: 'Acoustic Guitar' });
      // console.log('DEBUG PHASE 1 TASKS:', JSON.stringify(report.canonicalRoadmap[0]?.phases[0]?.tasks, null, 2));
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].phases.length).toBeGreaterThanOrEqual(1);
      const phase1 = report.canonicalRoadmap[0].phases[0];
      expect(phase1.tasks.length).toBeGreaterThanOrEqual(1);
      const totalSubtasks = phase1.tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
      expect(totalSubtasks).toBeGreaterThanOrEqual(2);
    });

    test('Tier 4: Alien-Level Physics (Topological Quantum Computing) maps non-abelian anyon proof arcs', () => {
      const frontierJson = {
        schemaVersion: '2.3.0',
        subjectName: 'Topological Quantum Computing & Anyons',
        learningArcs: [
          {
            name: 'Chern-Simons TQFT & Fractional Quantum Hall Effect',
            modules: [
              {
                name: 'Modular Tensor Categories & Non-Abelian Braid Groups',
                whyItMatters: 'Anyonic braiding operations form unitary quantum gates intrinsically protected from decoherence',
                learningUnits: [
                  { name: 'Fibonacci anyon fusion algebra and Yang-Baxter relation', depth: 'DEEP_MECHANISMS' },
                  { name: 'Majorana zero mode non-locality in p-wave superconductors', depth: 'GROUND_TRUTH_THEORY' }
                ],
                doingTasks: [
                  { name: 'Derive the 5-strand braid matrix representation for universal Hadamard gate synthesis', mode: 'DERIVATION' },
                  { name: 'Numerically simulate Kitaev surface code syndrome extraction using Monte Carlo sampling', mode: 'SIMULATION' }
                ],
                subtasks: [
                  { name: 'Verify unitary braid invariants with automated symbolic check' }
                ]
              }
            ]
          }
        ],
        fieldIntelligence: {
          researchFrontier: [
            {
              topic: 'Experimental validation of non-Abelian topological order in quantum Hall states',
              status: 'ACTIVE_INVESTIGATION'
            }
          ]
        }
      };

      const report = normalizeRoadmapInput(frontierJson);
      expect(report.success).toBe(true);
      expect(report.canonicalRoadmap[0].name).toBe('Topological Quantum Computing & Anyons');
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].learningUnits.length).toBe(2);
      expect(report.canonicalRoadmap[0].phases[0].tasks[0].doingTasks.length).toBe(2);
      expect(report.canonicalRoadmap[0].fieldIntelligence.researchFrontier.length).toBe(1);
    });
  });

});
