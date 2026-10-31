import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ScheduleTreeSelector from '../components/ScheduleTreeSelector';
import LearningPlanPage from '../pages/LearningPlanPage';
import { RoadmapProvider } from '../context/RoadmapContext';
import { getLocalDateKey, addDaysToDateKey } from '../utils/dateUtils';
import { safeStorageSet, safeStorageClear } from '../utils/storage';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/learning-plan' })
}), { virtual: true });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Manual Scheduling from Tree in Schedule Grid', () => {
  let container = null;
  let root = null;
  const today = getLocalDateKey();

  const mockSubject = {
    id: 'subj-robotics',
    name: 'Autonomous Robotics',
    phases: [
      {
        id: 'phase-1',
        name: 'Kinematics & Actuation',
        tasks: [
          {
            id: 'task-motors',
            name: 'DC & Stepper Motor Control',
            completed: false,
            subtasks: [
              { id: 'st-pwm', name: 'PWM Frequency Modulation', completed: true },
              { id: 'st-hbridge', name: 'H-Bridge Driver Wiring', completed: false }
            ]
          },
          {
            id: 'task-atomic',
            name: 'Mathematical Forward Kinematics',
            completed: false
          }
        ]
      },
      {
        id: 'phase-2',
        name: 'Sensors & Perception',
        tasks: [
          {
            id: 'task-lidar',
            name: '2D LiDAR Point Cloud Ingestion',
            completed: false,
            subtasks: [
              { id: 'st-lidar-uart', name: 'UART Packet Parsing', completed: false }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    safeStorageClear();
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

  test('ScheduleTreeSelector renders phases, tasks, subtasks and triggers onScheduleMilestone', async () => {
    const handleSchedule = jest.fn();
    const handleUnschedule = jest.fn();
    const handleClose = jest.fn();

    await act(async () => {
      root.render(
        <ScheduleTreeSelector
          subject={mockSubject}
          learningPlan={[]}
          onScheduleMilestone={handleSchedule}
          onUnscheduleMilestone={handleUnschedule}
          onClose={handleClose}
          today={today}
        />
      );
    });

    expect(container.textContent).toContain('Roadmap Tree · Manual Scheduler');
    expect(container.textContent).toContain('Autonomous Robotics');
    expect(container.textContent).toContain('Kinematics & Actuation');
    expect(container.textContent).toContain('DC & Stepper Motor Control');
    expect(container.textContent).toContain('Mathematical Forward Kinematics');

    // Click "Expand All" to expand all phases and tasks
    const expandAllButton = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.trim() === 'Expand All'
    );
    expect(expandAllButton).toBeTruthy();

    await act(async () => {
      expandAllButton.click();
    });

    // Subtasks are now visible
    expect(container.textContent).toContain('PWM Frequency Modulation');
    expect(container.textContent).toContain('H-Bridge Driver Wiring');

    // Completed subtask has "Done" label
    expect(container.textContent).toContain('Done');

    // For incomplete subtask, click "Schedule"
    const scheduleButtons = Array.from(container.querySelectorAll('button')).filter(
      btn => btn.textContent.trim() === 'Schedule'
    );
    expect(scheduleButtons.length).toBeGreaterThan(0);

    await act(async () => {
      scheduleButtons[0].click();
    });

    expect(handleSchedule).toHaveBeenCalled();
    const [subjId, phaseId, taskId, subtaskId, scheduledDate] = handleSchedule.mock.calls[0];
    expect(subjId).toBe('subj-robotics');
    expect(phaseId).toBe('phase-1');
    expect(scheduledDate).toBe(today);
  });

  test('ScheduleTreeSelector identifies already-scheduled milestones and allows moving or unscheduling', async () => {
    const tomorrow = addDaysToDateKey(today, 1);
    const existingPlan = [
      {
        id: 'plan-existing-1',
        subjectId: 'subj-robotics',
        phaseId: 'phase-1',
        taskId: 'task-atomic',
        subtaskId: null,
        scheduledDate: tomorrow,
        isAutoAssigned: false
      }
    ];

    const handleSchedule = jest.fn();
    const handleUnschedule = jest.fn();

    await act(async () => {
      root.render(
        <ScheduleTreeSelector
          subject={mockSubject}
          learningPlan={existingPlan}
          onScheduleMilestone={handleSchedule}
          onUnscheduleMilestone={handleUnschedule}
          today={today}
        />
      );
    });

    // Atomic task in phase 1 should show Scheduled badge with tomorrow's date
    expect(container.textContent).toContain(`Scheduled: ${tomorrow}`);
    expect(container.textContent).toContain('Move Date');

    // Click the trash button to unschedule
    const trashButtons = container.querySelectorAll('button[title="Remove from schedule"]');
    expect(trashButtons.length).toBeGreaterThan(0);

    await act(async () => {
      trashButtons[0].click();
    });

    expect(handleUnschedule).toHaveBeenCalledWith(
      'subj-robotics',
      'phase-1',
      'task-atomic',
      null
    );
  });

  test('Schedule Grid exposes Manual Schedule from Tree button and updates learningPlan', async () => {
    safeStorageSet('roadmap', [mockSubject]);
    safeStorageSet('selectedSubjectId', 'subj-robotics');
    safeStorageSet('learningPlan', []);

    await act(async () => {
      root.render(
        <RoadmapProvider>
          <LearningPlanPage />
        </RoadmapProvider>
      );
    });

    // Switch to Schedule Grid view
    const gridViewButton = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Schedule Grid')
    );
    expect(gridViewButton).toBeTruthy();

    await act(async () => {
      gridViewButton.click();
    });

    // In Schedule Grid, verify the new manual option exists right next to Auto-Assign
    const manualTreeButton = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Manual Schedule from Tree')
    );
    expect(manualTreeButton).toBeTruthy();

    const autoAssignButton = Array.from(container.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Auto-Assign Sequential Days')
    );
    expect(autoAssignButton).toBeTruthy();

    // Click "Manual Schedule from Tree" to toggle the tree selector
    await act(async () => {
      manualTreeButton.click();
    });

    expect(container.textContent).toContain('Roadmap Tree · Manual Scheduler');
    expect(container.textContent).toContain('Close Tree Selector');

    // Click "Schedule" on the atomic task
    const scheduleButtons = Array.from(container.querySelectorAll('button')).filter(
      btn => btn.textContent.trim() === 'Schedule'
    );
    expect(scheduleButtons.length).toBeGreaterThan(0);

    await act(async () => {
      scheduleButtons[0].click();
    });

    // Scheduled task should now be displayed in the Date-grouped Tasks below
    expect(container.textContent).toContain('Self-scheduled');
    expect(container.textContent).toContain('Mathematical Forward Kinematics');
    expect(container.textContent).toContain('Today · Scheduled');
  });
});
