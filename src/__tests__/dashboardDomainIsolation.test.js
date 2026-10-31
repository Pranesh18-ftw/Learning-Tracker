/**
 * dashboardDomainIsolation.test.js
 *
 * Verifies that the NOW view (DashboardTasks) strictly isolates task resolution,
 * hero focus card, guided path, proof evidence, and completion banners to the
 * currently selected domain (selectedSubjectId).
 *
 * Regression test for: Switching domain from Electronics to another domain (e.g. Creativity)
 * was retaining the Electronics task because currentLearningContext was checked unconditionally.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DashboardTasks from '../components/DashboardTasks';
import { RoadmapProvider, useRoadmap } from '../context/RoadmapContext';
import { safeStorageClear } from '../utils/storage';
import { saveIdentity } from '../utils/identityRealityResolver';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SAMPLE_MULTI_DOMAIN_SUBJECTS = [
  {
    id: 'subj-electronics',
    name: 'Electronics & Embedded Systems',
    phases: [
      {
        id: 'phase-circuits',
        name: 'Circuit Analysis',
        tasks: [
          {
            id: 'task-capacitors',
            name: 'Capacitors and RC Charging',
            time: 25,
            completed: false,
            subtasks: [
              { id: 'st-rc1', name: 'Derive RC time constant tau = R*C', completed: false }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'subj-creativity',
    name: 'Creativity & Lateral Thinking',
    phases: [
      {
        id: 'phase-creative-first-principles',
        name: 'Deconstruction and Recombination',
        tasks: [
          {
            id: 'task-divergent-thinking',
            name: 'First Principles Divergence',
            time: 30,
            completed: false,
            subtasks: [
              { id: 'st-div1', name: 'Generate 10 non-obvious combinatorial hypotheses', completed: false }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'subj-completed',
    name: 'Mastered Craft',
    phases: [
      {
        id: 'phase-done',
        name: 'Concluded Phase',
        tasks: [
          {
            id: 'task-done-1',
            name: 'Finished Mastery Milestone',
            time: 15,
            completed: true,
            subtasks: [
              { id: 'st-done-1', name: 'Step 1 complete', completed: true }
            ]
          }
        ]
      }
    ]
  }
];

describe('NOW View (DashboardTasks) Domain Scoping & Isolation', () => {
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

  test('Switching domain to Creativity immediately updates Today Focus to Creativity and NOT Electronics', async () => {
    let contextHandle = null;

    const TestHarness = () => {
      const roadmap = useRoadmap();
      contextHandle = roadmap;
      return <DashboardTasks />;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider initialSubjects={SAMPLE_MULTI_DOMAIN_SUBJECTS}>
          <TestHarness />
        </RoadmapProvider>
      );
    });

    // Explicitly set an active context in Electronics (e.g. from user clicking Focus in NOW previously)
    await act(async () => {
      contextHandle.selectLearningContext({
        id: 'st-rc1',
        taskId: 'task-capacitors',
        subtaskId: 'st-rc1',
        name: 'Derive RC time constant tau = R*C',
        taskName: 'Capacitors and RC Charging',
        subjectId: 'subj-electronics',
        subjectName: 'Electronics & Embedded Systems',
        phaseId: 'phase-circuits',
        phaseName: 'Circuit Analysis'
      });
    });

    // In All Domains or Electronics: should show Electronics
    expect(container.textContent).toContain('Electronics & Embedded Systems');
    expect(container.textContent).toContain('Derive RC time constant tau = R*C');

    // USER SELECTS CREATIVITY DOMAIN IN TOPBAR/NOW
    await act(async () => {
      contextHandle.setSelectedSubjectId('subj-creativity');
    });

    // MUST NOT SHOW ELECTRONICS
    expect(container.textContent).not.toContain('Derive RC time constant tau = R*C');
    expect(container.textContent).not.toContain('Capacitors and RC Charging');

    // MUST SHOW CREATIVITY TASK
    expect(container.textContent).toContain('Creativity & Lateral Thinking');
    expect(container.textContent).toContain('Generate 10 non-obvious combinatorial hypotheses');
  });

  test('Selecting a completed domain shows Concluded Arc without leaking tasks from other domains', async () => {
    let contextHandle = null;

    const TestHarness = () => {
      const roadmap = useRoadmap();
      contextHandle = roadmap;
      return <DashboardTasks />;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider initialSubjects={SAMPLE_MULTI_DOMAIN_SUBJECTS}>
          <TestHarness />
        </RoadmapProvider>
      );
    });

    // Set canonical context to Electronics
    await act(async () => {
      contextHandle.selectLearningContext({
        id: 'st-rc1',
        taskId: 'task-capacitors',
        subtaskId: 'st-rc1',
        name: 'Derive RC time constant tau = R*C',
        taskName: 'Capacitors and RC Charging',
        subjectId: 'subj-electronics',
        subjectName: 'Electronics & Embedded Systems',
        phaseId: 'phase-circuits',
        phaseName: 'Circuit Analysis'
      });
    });

    expect(container.textContent).toContain('Derive RC time constant tau = R*C');

    // Switch to completed domain
    await act(async () => {
      contextHandle.setSelectedSubjectId('subj-completed');
    });

    // Must show conclusion card, NOT Electronics tasks
    expect(container.textContent).toContain('You Have Concluded This Arc!');
    expect(container.textContent).not.toContain('Derive RC time constant tau = R*C');
    expect(container.textContent).not.toContain('Generate 10 non-obvious combinatorial hypotheses');
  });

  test('Completion reward banner and reflection archive are strictly filtered to selected domain', async () => {
    let contextHandle = null;

    const TestHarness = () => {
      const roadmap = useRoadmap();
      contextHandle = roadmap;
      return <DashboardTasks />;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider initialSubjects={SAMPLE_MULTI_DOMAIN_SUBJECTS}>
          <TestHarness />
        </RoadmapProvider>
      );
    });

    // Add a completed session and lastAction for Electronics
    await act(async () => {
      contextHandle.addFocusSession({
        subjectId: 'subj-electronics',
        phaseId: 'phase-circuits',
        taskId: 'task-capacitors',
        subtaskId: 'st-rc1',
        durationMinutes: 25,
        type: 'task-completion',
        notes: 'Multimeter measurement validated RC time constant tau.',
        difficulty: 'medium'
      });

      contextHandle.storeCompleteAction('st-rc1', 1, 1, {
        subjectId: 'subj-electronics',
        taskDetails: {
          name: 'RC Time Constant Verified',
          subjectId: 'subj-electronics'
        }
      });
    });

    // In Electronics domain, the banner and reflection appear
    await act(async () => {
      contextHandle.setSelectedSubjectId('subj-electronics');
    });
    expect(container.textContent).toContain('RC Time Constant Verified');
    expect(container.textContent).toContain('Multimeter measurement validated RC time constant tau.');

    // In Creativity domain, the Electronics completion banner and reflection MUST NOT appear
    await act(async () => {
      contextHandle.setSelectedSubjectId('subj-creativity');
    });
    expect(container.textContent).not.toContain('RC Time Constant Verified');
    expect(container.textContent).not.toContain('Multimeter measurement validated RC time constant tau.');
  });

  test('Changes in timing in Identity take effect immediately in NOW (DashboardTasks)', async () => {
    // 1. Initial Identity setting: user declared 50 minutes weekday capacity
    saveIdentity({
      timeReality: {
        weekdayMinutes: 50,
        saturdayHours: 2,
        sundayHours: 1
      }
    });

    let contextHandle = null;

    const TestHarness = () => {
      const roadmap = useRoadmap();
      contextHandle = roadmap;
      return <DashboardTasks />;
    };

    await act(async () => {
      root.render(
        <RoadmapProvider initialSubjects={SAMPLE_MULTI_DOMAIN_SUBJECTS}>
          <TestHarness />
        </RoadmapProvider>
      );
    });

    // Verify NOW displays the 50 Min duration from Identity
    expect(container.textContent).toContain('50 Min Focused Take');
    expect(container.textContent).toContain('START 50 MIN TAKE');

    // 2. User clicks "START 50 MIN TAKE" in NOW
    const startBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('START') && b.textContent.includes('TAKE')
    );
    expect(startBtn).toBeTruthy();

    await act(async () => {
      startBtn.click();
    });

    // 3. Focus Session launches with the exact 50 minutes from Identity
    expect(contextHandle.focusSession).toBeDefined();
    expect(contextHandle.focusSession.targetMinutes).toBe(50);
    expect(contextHandle.focusSession.timeLeftSeconds).toBe(3000);
  });
});

