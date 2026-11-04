import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { loadIdentity } from '../utils/identityRealityResolver';
import Onboarding from '../onboarding/Onboarding';
import { normalizeRoadmapInput, detectFormat } from '../services/roadmapBridge/roadmapNormalizer';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ children }) => <div>{children}</div>,
  Link: ({ children }) => <div>{children}</div>,
  NavLink: ({ children }) => <div>{children}</div>
}), { virtual: true });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('User AI Response Interpretation Test', () => {
  const inputJson = `{
  "schemaVersion": "2.3.0",
  "learnerContext": {
    "primaryLearningGoal": "Creativity",
    "targetDestination": "Creative Human",
    "targetMilestoneDeliverables": "Comprehensive practical systems & demonstrable capability",
    "pedagogicalStyle": "BALANCED",
    "theoryVsPracticeRatio": "BALANCED",
    "currentCapabilityLevel": "BEGINNER",
    "targetTimeHorizon": "3-6 months",
    "weeklyStudyRhythmHours": 10
  },
  "fieldIntelligence": {
    "epistemicTier": "TIER_3_RIGOROUS_SCIENCES_AND_APPLIED_COGNITIVE_DISCIPLINE",
    "fieldDefinition": "Formal study and systematic application of cognitive, structural, and computational mechanisms by which novel, high-value, and non-obvious solutions, artifacts, or paradigms are generated under constraints.",
    "researchScope": "Cognitive mechanics, TRIZ contradiction elimination, Structure Mapping Theory, Zwicky morphological search, Geneplore preinventive structures, and high-dimensional semantic vector search.",
    "researchLimitations": [
      "fMRI connectivity data represents macro-level network dynamics rather than single-neuron generative tracing.",
      "LLM semantic vector spaces mirror corpus associative structures rather than biological neural tissue constraints."
    ],
    "coverageGaps": [
      "Long-term temporal incubation dynamics in real-world professional environments."
    ],
    "uncertainties": [
      "Exact mathematical formulation for predicting human aesthetic surprise in non-textual modalities."
    ]
  },
  "learningArcs": [
    {
      "id": "arc-1",
      "name": "Structural Problem Deconstruction & Boundary Analysis",
      "modules": [
        {
          "id": "mod-1-1",
          "name": "Latent Constraint & Assumption Mapping",
          "learningUnits": [
            {
              "name": "Understand Latent Constraint Identification",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "Problems are bounded by explicit parameters and unstated implicit constraints.",
              "whyItMatters": "Prevents solving within hidden self-imposed boundaries.",
              "misconceptionRisk": "Assuming all presented constraints are immutable physical facts.",
              "retrievalTarget": "Explain difference between physical vs secondary assumed constraints.",
              "transferTarget": "Audit an ambiguous brief and isolate 5 hidden assumptions."
            }
          ],
          "doingTasks": [
            {
              "task": "Deconstruct a failed product/service and map its unstated core assumptions.",
              "mode": "diagnostic"
            }
          ],
          "subtasks": [
            { "name": "List explicit constraints stated in the brief." },
            { "name": "Identify 5 unstated latent assumptions." },
            { "name": "Classify assumptions as Immutable Physical or Mutable Conceptual." }
          ]
        },
        {
          "id": "mod-1-2",
          "name": "First-Principles Problem Reframing",
          "learningUnits": [
            {
              "name": "Understand Functional Abstraction",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "Stripping a problem down to fundamental functional goals independent of current implementations.",
              "whyItMatters": "Prevents functional fixedness and copying legacy forms.",
              "misconceptionRisk": "Defining functional goals using existing product noun-forms.",
              "retrievalTarget": "State core objective without using industry-specific product terms.",
              "transferTarget": "Re-frame an everyday utility into an abstract functional spec."
            }
          ],
          "doingTasks": [
            {
              "task": "Re-frame an everyday utility into an abstract functional requirement spec.",
              "mode": "build"
            }
          ],
          "subtasks": [
            { "name": "Write 1-sentence abstract functional definition." },
            { "name": "Map required inputs, transformations, and output states." },
            { "name": "Generate 3 alternative functional boundaries." }
          ]
        }
      ]
    },
    {
      "id": "arc-2",
      "name": "Morphological Divergence & State-Space Traversal",
      "modules": [
        {
          "id": "mod-2-1",
          "name": "Zwicky Morphological Analysis",
          "learningUnits": [
            {
              "name": "Understand Morphological Field Construction",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "Decomposing a system into independent parameters and populating all variations.",
              "whyItMatters": "Guarantees systematic combinatorial search bypassing cognitive availability bias.",
              "misconceptionRisk": "Believing morphological matrices apply only to mechanical hardware.",
              "retrievalTarget": "Construct parameter matrix for service design problem.",
              "transferTarget": "Build 4x5 matrix for complex domain challenge."
            }
          ],
          "doingTasks": [
            {
              "task": "Build a 4x5 Zwicky Morphological Matrix for urban logistics.",
              "mode": "measurement"
            }
          ],
          "subtasks": [
            { "name": "Identify 4 critical independent dimensions." },
            { "name": "Populate each dimension with 5 distinct operational modes." },
            { "name": "Perform systematic traversal to extract 3 orthogonal configurations." }
          ]
        }
      ]
    },
    {
      "id": "arc-3",
      "name": "Cross-Domain Isomorphism & Structural Analogy Mapping",
      "modules": [
        {
          "id": "mod-3-1",
          "name": "Structure Mapping Theory (Gentner)",
          "learningUnits": [
            {
              "name": "Understand Relational vs Surface Similarity",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "High-value analogies preserve relational systems while ignoring surface attributes.",
              "whyItMatters": "High-surface/low-structural analogies produce superficial copying.",
              "misconceptionRisk": "Equating visual or superficial similarity with structural analogy.",
              "retrievalTarget": "Define structural isomorphism using graph nodes and relational edges.",
              "transferTarget": "Map relational structures between biological and software domains."
            }
          ],
          "doingTasks": [
            {
              "task": "Compare Biological Immune System vs Cybersecurity Network using graph mapping.",
              "mode": "comparison"
            }
          ],
          "subtasks": [
            { "name": "Map core nodes and edges of Source Domain A." },
            { "name": "Map corresponding elements in Target Domain B." },
            { "name": "Identify structural gaps revealing feature opportunities." }
          ]
        }
      ]
    },
    {
      "id": "arc-4",
      "name": "Systemic Contradiction Resolution & TRIZ Mechanics",
      "modules": [
        {
          "id": "mod-4-1",
          "name": "Technical & Physical Contradiction Mapping",
          "learningUnits": [
            {
              "name": "Understand Contradiction Formulations",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "Innovation occurs when system trade-offs are eliminated rather than compromised.",
              "whyItMatters": "Standard design settles for trade-offs; creative mechanics eliminate them.",
              "misconceptionRisk": "Confusing a trade-off compromise with a true contradiction resolution.",
              "retrievalTarget": "Formulate a physical contradiction statement centered on a single variable.",
              "transferTarget": "Convert a complex engineering bottleneck into a formal TRIZ statement."
            }
          ],
          "doingTasks": [
            {
              "task": "Formulate battery system trade-off into a TRIZ Physical Contradiction.",
              "mode": "diagnostic"
            }
          ],
          "subtasks": [
            { "name": "Identify primary parameter being optimized." },
            { "name": "Identify secondary parameter that deteriorates." },
            { "name": "Re-write as physical contradiction statement." }
          ]
        }
      ]
    },
    {
      "id": "arc-5",
      "name": "Convergent Metric Filtering & Failure-Driven Stress Testing",
      "modules": [
        {
          "id": "mod-5-1",
          "name": "Consensual Assessment Technique (CAT) & Metric Design",
          "learningUnits": [
            {
              "name": "Understand Multi-Dimensional Evaluation Design",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "Standardizing objective evaluation using expert panel metrics and Pareto frontiers.",
              "whyItMatters": "Prevents subjective bias and loudest-voice decision failure.",
              "misconceptionRisk": "Treating voting dot-democracy as objective evaluation.",
              "retrievalTarget": "Define 3 orthogonal evaluation metrics with anchored rubrics.",
              "transferTarget": "Construct CAT matrix and isolate Pareto optimal frontier."
            }
          ],
          "doingTasks": [
            {
              "task": "Construct CAT Matrix for 10 candidate concepts and plot Pareto frontier.",
              "mode": "measurement"
            }
          ],
          "subtasks": [
            { "name": "Define Novelty, Feasibility, and Domain Value metrics." },
            { "name": "Normalize scoring across 5-point rubric." },
            { "name": "Plot candidates on trade-off space." }
          ]
        }
      ]
    },
    {
      "id": "arc-6",
      "name": "Human-AI Co-Creative Architecture & Vector Search Systems",
      "modules": [
        {
          "id": "mod-6-1",
          "name": "Vector Space Latent Navigation & Multi-Agent Engines",
          "learningUnits": [
            {
              "name": "Understand Semantic Vector Distance & Multi-Agent Loops",
              "depth": "DEEP_MASTERY_TARGET",
              "concept": "Using vector embeddings for concept search and multi-agent loops for dialectical synthesis.",
              "whyItMatters": "Overcomes human memory availability bias and automates thesis-antithesis synthesis.",
              "misconceptionRisk": "Believing LLM outputs are inherently creative without structural constraints.",
              "retrievalTarget": "Explain cosine distance measurement in high-dimensional concept embeddings.",
              "transferTarget": "Build Python multi-agent pipeline for ideation."
            }
          ],
          "doingTasks": [
            {
              "task": "Program Python multi-agent pipeline using LangChain/API calls.",
              "mode": "build"
            }
          ],
          "subtasks": [
            { "name": "Configure Agent A (Proposer) with high creativity params." },
            { "name": "Configure Agent B (Skeptic) with TRIZ contradiction prompts." },
            { "name": "Configure Agent C (Synthesizer) to output final system architectures." }
          ]
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "Deconstruction & Re-Framing Engine",
      "scaffoldingLevel": "GUIDED",
      "capabilitiesExercised": ["Problem boundary deconstruction", "Latent constraint mapping"],
      "failureModes": ["Solving wrong problem due to unstated constraints"],
      "whatFailureTeaches": "Unstated assumptions dictate 90% of design failure.",
      "motivatingInsight": "Breakthroughs alter problem definitions rather than answering old questions.",
      "unlocksNext": "TRIZ Morphological Synthesis Engine"
    },
    {
      "name": "Autonomous Human-AI Dialectical Co-Creator",
      "scaffoldingLevel": "OPEN_ENDED",
      "capabilitiesExercised": ["Vector semantic navigation", "Multi-agent LLM orchestration", "TRIZ resolution"],
      "failureModes": ["Generic high-probability clichés"],
      "whatFailureTeaches": "AI requires explicit structural constraints to transcend corpus averages.",
      "motivatingInsight": "Human value lies in framing, constraint design, and empirical stress testing.",
      "unlocksNext": "Professional Master Practitioner Level"
    }
  ],
  "adaptationRules": {
    "rules": [
      {
        "condition": "Confusing surface vs structural similarity",
        "weaknessType": "KNOWLEDGE",
        "action": "Revisit Learning Unit 3.1; perform node-edge diagramming."
      },
      {
        "condition": "Claiming idea is revolutionary without validation",
        "weaknessType": "OVERCONFIDENCE",
        "action": "Assign immediate Pre-Mortem stress testing task (Module 5.2)."
      }
    ]
  }
}`;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('Inspect user json normalization', () => {
    const res = normalizeRoadmapInput(inputJson, { goal: '' });
    expect(res.success).toBe(true);
    expect(res.canImportDirectly).toBe(true);
    expect(res.canonicalRoadmap).toHaveLength(1);

    const subject = res.canonicalRoadmap[0];
    expect(subject.name).toBe('Creativity');
    expect(subject.learnerContext.primaryLearningGoal).toBe('Creativity');
    expect(subject.learnerContext.targetDestination).toBe('Creative Human');
    expect(subject.learnerContext.pedagogicalStyle).toBe('BALANCED');

    expect(subject.phases).toHaveLength(6);
    expect(subject.phases[0].name).toBe('Structural Problem Deconstruction & Boundary Analysis');
    expect(subject.phases[0].tasks).toHaveLength(2);

    const firstTask = subject.phases[0].tasks[0];
    expect(firstTask.name).toBe('Latent Constraint & Assumption Mapping');
    expect(firstTask.subtasks).toHaveLength(3);
    expect(firstTask.subtasks[0].name).toBe('List explicit constraints stated in the brief.');

    expect(firstTask.learningUnits).toHaveLength(1);
    expect(firstTask.learningUnits[0].name).toBe('Understand Latent Constraint Identification');

    expect(firstTask.doingTasks).toHaveLength(1);
    expect(firstTask.doingTasks[0].name).toBe('Deconstruct a failed product/service and map its unstated core assumptions.');
    expect(firstTask.doingTasks[0].mode).toBe('diagnostic');

    expect(subject.projects).toHaveLength(2);
    expect(subject.projects[0].name).toBe('Deconstruction & Re-Framing Engine');
    expect(subject.projects[1].name).toBe('Autonomous Human-AI Dialectical Co-Creator');

    expect(subject.adaptationRules.rules).toHaveLength(2);
  });

  test('RoadmapProvider importRoadmap handles raw user JSON and updates identity destination', async () => {
    let contextHandle;
    const TestConsumer = () => {
      contextHandle = useRoadmap();
      return null;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    await act(async () => {
      const success = contextHandle.importRoadmap(inputJson);
      expect(success).toBe(true);
    });

    const activeSubjects = contextHandle.subjects;
    expect(activeSubjects).toHaveLength(1);
    expect(activeSubjects[0].name).toBe('Creativity');

    const updatedIdentity = loadIdentity();
    expect(updatedIdentity.destination.primaryGoal).toBe('Creativity');
    expect(updatedIdentity.destination.targetRole).toBe('Creative Human');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test('Onboarding step 2 presents custom pathway as primary choice for any discipline', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <Onboarding onComplete={() => {}} onStepChange={() => {}} />
        </RoadmapProvider>
      );
    });

    // Click setup path button
    const setupBtn = document.querySelector('#onboarding-setup-path-btn');
    if (setupBtn) {
      await act(async () => {
        setupBtn.click();
      });
    }

    const pathSetupContainer = document.querySelector('#onboarding-step-path-setup');
    expect(pathSetupContainer).not.toBeNull();
    expect(pathSetupContainer.textContent).toMatch(/Creativity, Psychology, Arts/i);
    expect(document.querySelector('#onboarding-build-with-ai-btn')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
    const portals = document.querySelectorAll('#onboarding-overlay-container');
    portals.forEach(p => p.remove());
    document.body.style.overflow = '';
  });
});
