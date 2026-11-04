/**
 * domainSelectorAndRoadmapResilience.test.js
 *
 * Verifies that:
 * 1. Topbar domain dropdown renders cleanly and enforces max width constraints with long domain names,
 *    preventing suppression or horizontal squishing of navigation menus.
 * 2. RoadmapPage renders safely and gracefully without throwing 'Objects are not valid as a React child'
 *    when fieldIntelligence.currentState is an object (v2.3.0 schema from AI prompt).
 * 3. RoadmapPage renders the empty state when no subjects are loaded without ReferenceError on CURATED_ROADMAPS.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Topbar from '../components/Topbar';
import RoadmapPage from '../pages/RoadmapPage';
import UniversalRoadmapBridgeModal from '../components/UniversalRoadmapBridgeModal';
import { RoadmapProvider } from '../context/RoadmapContext';
import { safeStorageClear } from '../utils/storage';
import {
  generateDeepResearchCharter,
  RESEARCH_CHARTER_ENGINES
} from '../services/roadmapBridge/researchCharter';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/roadmap' }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SUBJECT_WITH_OBJECT_FIELD_INTEL = {
  id: 'subj-creativity-ai',
  name: 'Formal study and systematic application of cognitive mechanisms',
  learnerContext: {
    primaryLearningGoal: 'Creativity',
    targetDestination: 'Creative Human',
    targetMilestoneDeliverables: 'Comprehensive practical systems & demonstrable capability',
    pedagogicalStyle: 'BALANCED',
    theoryVsPracticeRatio: 'BALANCED',
    currentCapabilityLevel: 'BEGINNER',
    targetCapabilities: ['Combinatorial reasoning', 'Cross-domain analogy']
  },
  fieldIntelligence: {
    epistemicTier: 'TIER_3_RIGOROUS_SCIENCES_AND_APPLIED_COGNITIVE_DISCIPLINE',
    fieldDefinition: 'Formal study and systematic application of cognitive mechanisms.',
    currentState: {
      overallMaturity: 'DYNAMIC_EVOLVING',
      foundationalConsensus: 'Core cognitive heuristics established in dual-process literature.',
      activeFrontiers: ['Neurocomputational creativity models', 'Synthetic lateral synthesis']
    }
  },
  phases: [
    {
      id: 'p1',
      name: 'Phase 1: Creative Foundations',
      purpose: 'Establish cognitive search breadth',
      whyThisAreaMatters: 'Foundational for non-obvious solution finding',
      capabilitiesDeveloped: [
        { name: 'Remote Association Mapping' },
        'First Principles Disassembly'
      ],
      tasks: [
        {
          id: 't1',
          name: 'Combinatorial Exploration Heuristics',
          time: 25,
          completed: false,
          whyItMatters: { reason: 'Crucial for exploring expansive parameter spaces' },
          capabilities: [
            { id: 'c1', name: 'Morphological Matrix Analysis' },
            'Bisociative Recombination'
          ],
          prerequisites: [{ id: 'p0', title: 'Basic Propositional Logic' }],
          consequences: ['Domain Heuristic Inversion'],
          subtasks: [
            { id: 'st1', name: 'Construct 5x5 morphological synthesis grid', completed: false }
          ]
        }
      ]
    }
  ]
};

describe('Topbar Domain Selector & RoadmapPage Resilience', () => {
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
    act(() => {
      if (root) root.unmount();
    });
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  test('Topbar domain selector truncates ultra-long subject names and maintains nav menu visibility', async () => {
    const longNameSubject = {
      id: 'subj-long-name',
      name: 'Very Long Discipline Name That Could Potentially Push Layout Offscreen And Suppress Nav Items',
      phases: []
    };

    await act(async () => {
      root.render(
        <RoadmapProvider initialSubjects={[longNameSubject]}>
          <Topbar activeTab="dashboard" setActiveTab={jest.fn()} />
        </RoadmapProvider>
      );
    });

    // Check that nav items are rendered
    const navElement = container.querySelector('nav[aria-label="Main navigation"]');
    expect(navElement).toBeTruthy();
    expect(container.querySelector('#dashboard-nav-item')).toBeTruthy();
    expect(container.querySelector('#roadmap-nav-item')).toBeTruthy();
    expect(container.querySelector('#learning-plan-nav-item')).toBeTruthy();

    // Check desktop select has truncation classes
    const select = container.querySelector('select[aria-label="Select learning domain"]');
    expect(select).toBeTruthy();
    expect(select.className).toContain('truncate');
    expect(select.className).toContain('max-w-[');

    // Option text should be truncated
    const option = select.querySelector('option[value="subj-long-name"]');
    expect(option).toBeTruthy();
    expect(option.textContent.endsWith('…')).toBe(true);
    expect(option.textContent.length).toBeLessThanOrEqual(23);
  });

  test('RoadmapPage renders subject with object fieldIntelligence.currentState without crashing', async () => {
    let caughtError = null;

    try {
      await act(async () => {
        root.render(
          <RoadmapProvider initialSubjects={[SUBJECT_WITH_OBJECT_FIELD_INTEL]}>
            <RoadmapPage />
          </RoadmapProvider>
        );
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeNull();

    // Verify headline and subheadline rendered cleanly
    expect(container.textContent).toContain('Creative Human');
    expect(container.textContent).toContain('Core cognitive heuristics established in dual-process literature.');
    expect(container.textContent).toContain('Combinatorial Exploration Heuristics');
  });

  test('RoadmapPage renders empty state with CURATED_ROADMAPS when no subjects loaded', async () => {
    let caughtError = null;

    try {
      await act(async () => {
        root.render(
          <RoadmapProvider initialSubjects={[]}>
            <RoadmapPage />
          </RoadmapProvider>
        );
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeNull();
    expect(container.textContent).toContain('Your Knowledge World Awaits');
    expect(container.textContent).toContain('Or mount a curated foundational path:');
  });

  test('generateDeepResearchCharter adapts topic and context into Universal v3.0 and Gemini Compact profiles', () => {
    const learnerInput = {
      goal: 'Neurocomputational Creativity',
      destination: 'Cognitive Systems Architect',
      targetDeliverables: 'Biomimetic neural search engine',
      learningStyle: 'FIRST_PRINCIPLES',
      preferredStack: 'Python, PyTorch, Jax',
      theoryVsPractice: 'BALANCED',
      mustIncludeTopics: 'Dual-process cognition, Attractor networks',
      currentLevel: 'INTERMEDIATE',
      purpose: 'CAREER',
      targetHorizon: '6 months',
      weeklyHours: 15,
      studyRhythm: 'DAILY_DEEP',
      priorKnowledge: 'Linear algebra, cognitive neuroscience',
      constraints: 'Single GPU machine'
    };

    // 1. Universal v3.0
    const universalPrompt = generateDeepResearchCharter(learnerInput, RESEARCH_CHARTER_ENGINES.UNIVERSAL_V3);
    expect(universalPrompt).toContain('UNIVERSAL DEEP RESEARCH CHARTER v3.0');
    expect(universalPrompt).toContain('Primary Learning Goal: Neurocomputational Creativity');
    expect(universalPrompt).toContain('Target Destination / Career Outcome: Cognitive Systems Architect');
    expect(universalPrompt).toContain('Target Milestone Deliverables: Biomimetic neural search engine');
    expect(universalPrompt).toContain('Dual-process cognition, Attractor networks');
    expect(universalPrompt).toContain('OUTPUT CONTRACT — TWO PAYLOADS, ONE SOURCE OF TRUTH');

    // 2. Gemini Compact Profile
    const geminiPrompt = generateDeepResearchCharter(learnerInput, RESEARCH_CHARTER_ENGINES.GEMINI_COMPACT);
    expect(geminiPrompt).toContain('GEMINI DEEP RESEARCH | COMPACT PROFILE');
    expect(geminiPrompt).toContain('Primary Learning Goal: Neurocomputational Creativity');
    expect(geminiPrompt).toContain('Target Destination / Career Outcome: Cognitive Systems Architect');
    expect(geminiPrompt).toContain('Target Milestone Deliverables: Biomimetic neural search engine');
    expect(geminiPrompt).toContain('SIX DISTINCT EVIDENCE LAYERS');
    expect(geminiPrompt).toContain('OUTPUT 2: one valid app JSON');
  });

  test('UniversalRoadmapBridgeModal provides working engine selector between Claude v3.0 and Gemini Compact', async () => {
    await act(async () => {
      root.render(
        <RoadmapProvider initialSubjects={[]}>
          <UniversalRoadmapBridgeModal
            isOpen={true}
            initialStep={1}
            onClose={jest.fn()}
            onImport={jest.fn()}
          />
        </RoadmapProvider>
      );
    });

    expect(container.textContent).toContain('Target AI Engine & Prompt Profile');
    expect(container.textContent).toContain('Claude 3.7 / Universal v3.0');
    expect(container.textContent).toContain('Gemini Deep Research (Compact)');

    // Default is Universal v3.0
    expect(container.textContent).toContain('Generated Curriculum Specification (Universal v3.0)');

    // Switch to Gemini Compact
    const geminiBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Gemini Deep Research'));
    expect(geminiBtn).toBeTruthy();

    await act(async () => {
      geminiBtn.click();
    });

    expect(container.textContent).toContain('Generated Curriculum Specification (Gemini Compact)');
  });
});
