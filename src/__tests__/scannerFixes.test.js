import React, { useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { RoadmapContext, RoadmapProvider } from '../context/RoadmapContext';
import PomodoroTimer from '../components/PomodoroTimer';
import TaskCompletionModal from '../components/TaskCompletionModal';
import { safeStorageSet } from '../utils/storage';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Deep Scanner Fixes Verification', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    window.localStorage.clear();
    jest.useRealTimers();
  });

  test('PomodoroTimer: pausing preserves remaining seconds and does NOT reset to starting duration', () => {
    jest.useFakeTimers();

    act(() => {
      root.render(
        <RoadmapProvider>
          <PomodoroTimer isOpen={true} />
        </RoadmapProvider>
      );
    });

    const buttons = container.querySelectorAll('button');
    const startPauseBtn = Array.from(buttons).find(b => b.textContent === 'Start');
    expect(startPauseBtn).toBeDefined();

    const display = container.querySelector('.text-6xl');
    expect(display.textContent).toBe('25:00');

    // 1. Click Start
    act(() => {
      startPauseBtn.click();
    });

    // 2. Advance time by 45 seconds
    act(() => {
      jest.advanceTimersByTime(45000);
    });

    // Display should have counted down to 24:15
    expect(display.textContent).toBe('24:15');

    // 3. Click Pause
    const pauseBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Pause');
    expect(pauseBtn).toBeDefined();

    act(() => {
      pauseBtn.click();
    });

    // CRITICAL BUG CHECK: It must REMAIN at 24:15 and NOT reset to 25:00!
    expect(display.textContent).toBe('24:15');

    // Advance time while paused: should remain 24:15
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(display.textContent).toBe('24:15');

    // 4. Resume
    const resumeBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Start');
    act(() => {
      resumeBtn.click();
    });

    // Advance 15 more seconds
    act(() => {
      jest.advanceTimersByTime(15000);
    });
    expect(display.textContent).toBe('24:00');
  });

  test('PomodoroTimer: mode switching changes duration cleanly', () => {
    act(() => {
      root.render(
        <RoadmapProvider>
          <PomodoroTimer isOpen={true} />
        </RoadmapProvider>
      );
    });

    const display = container.querySelector('.text-6xl');
    expect(display.textContent).toBe('25:00');

    // Click Short Break
    const shortBreakBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Short Break');
    act(() => {
      shortBreakBtn.click();
    });
    expect(display.textContent).toBe('05:00');

    // Click Long Break
    const longBreakBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Long Break');
    act(() => {
      longBreakBtn.click();
    });
    expect(display.textContent).toBe('15:00');
  });

  test('PomodoroTimer: autoStart triggers only once and does not prevent pausing', () => {
    jest.useFakeTimers();

    act(() => {
      root.render(
        <RoadmapProvider>
          <PomodoroTimer isOpen={true} autoStart={true} />
        </RoadmapProvider>
      );
    });

    // Auto-started, button should be 'Pause'
    const pauseBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Pause');
    expect(pauseBtn).toBeDefined();

    // Advance 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Click Pause
    act(() => {
      pauseBtn.click();
    });

    // Must remain paused! Button should be 'Start'
    const startBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Start');
    expect(startBtn).toBeDefined();
  });

  test('TaskCompletionModal: passes subtaskId to onComplete and onPostpone', () => {
    let completedPayload = null;
    let postponedPayload = null;

    act(() => {
      root.render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          taskName="Algebra"
          subjectId="sub-1"
          phaseId="ph-1"
          taskId="task-1"
          subtaskId="st-123"
          onComplete={(data) => { completedPayload = data; }}
          onPostpone={(data) => { postponedPayload = data; }}
        />
      );
    });

    // Click Finish
    const finishBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Finish'));
    act(() => {
      finishBtn.click();
    });

    expect(completedPayload).not.toBeNull();
    expect(completedPayload.subtaskId).toBe('st-123');
    expect(completedPayload.taskId).toBe('task-1');

    // Render modal for postpone
    act(() => {
      root.render(
        <TaskCompletionModal
          isOpen={true}
          onClose={() => {}}
          taskName="Algebra"
          subjectId="sub-1"
          phaseId="ph-1"
          taskId="task-1"
          subtaskId="st-456"
          onComplete={(data) => { completedPayload = data; }}
          onPostpone={(data) => { postponedPayload = data; }}
        />
      );
    });

    const postponeBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Postpone'));
    act(() => {
      postponeBtn.click();
    });

    expect(postponedPayload).not.toBeNull();
    expect(postponedPayload.subtaskId).toBe('st-456');
  });

  test('RoadmapContext: updateSettings synchronizes aliases for break durations and daily goals', () => {
    let context = null;
    const TestConsumer = () => {
      context = useContext(RoadmapContext);
      return null;
    };

    act(() => {
      root.render(
        <RoadmapProvider>
          <TestConsumer />
        </RoadmapProvider>
      );
    });

    expect(context).not.toBeNull();

    act(() => {
      context.updateSettings({
        pomodoroShortBreak: 7,
        pomodoroLongBreak: 20,
        dailyLearningHours: 3.5
      });
    });

    expect(context.settings.pomodoroBreakDuration).toBe(7);
    expect(context.settings.pomodoroShortBreak).toBe(7);
    expect(context.settings.pomodoroLongBreakDuration).toBe(20);
    expect(context.settings.pomodoroLongBreak).toBe(20);
    expect(context.settings.dailyGoalHours).toBe(3.5);
    expect(context.settings.dailyLearningHours).toBe(3.5);
  });
});
