import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

const PomodoroTimer = ({ 
  subtaskId = null,
  subjectId = null,
  phaseId = null,
  taskId = null,
  taskName = '',
  phaseName = '',
  isOpen = true, 
  onClose = null,
  autoStart = false 
}) => {
  const { settings, addFocusSession } = useRoadmap();
  
  // Timer settings & mode
  const [timerMode, setTimerMode] = useState('focus'); // focus, shortBreak, longBreak
  const [sessionCount, setSessionCount] = useState(0);

  // Helper to get duration based on mode and settings
  const getDuration = useCallback((mode = timerMode) => {
    if (mode === 'focus') {
      return (settings?.pomodoroWorkDuration || 25) * 60;
    } else if (mode === 'shortBreak') {
      return (settings?.pomodoroBreakDuration || settings?.pomodoroShortBreak || 5) * 60;
    } else if (mode === 'longBreak') {
      return (settings?.pomodoroLongBreakDuration || settings?.pomodoroLongBreak || 15) * 60;
    }
    return 25 * 60;
  }, [timerMode, settings?.pomodoroWorkDuration, settings?.pomodoroBreakDuration, settings?.pomodoroShortBreak, settings?.pomodoroLongBreakDuration, settings?.pomodoroLongBreak]);

  // Wall-clock refs & state
  const endTimeRef = useRef(null);
  const completedRef = useRef(false);
  const hasAutoStartedRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState(() => getDuration('focus'));
  const [isRunning, setIsRunning] = useState(false);

  // Session tracking across pauses
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Synchronize initial duration if settings change while timer is untouched/idle
  const prevDefaultDurationRef = useRef(getDuration('focus'));
  useEffect(() => {
    const currentDur = getDuration(timerMode);
    if (currentDur !== prevDefaultDurationRef.current) {
      prevDefaultDurationRef.current = currentDur;
      // Only adjust timeLeft if timer is completely idle (not started or paused mid-session)
      if (!isRunning && elapsedTime === 0 && !sessionStartTime) {
        setTimeLeft(currentDur);
      }
    }
  }, [getDuration, timerMode, isRunning, elapsedTime, sessionStartTime]);

  // Complete session and advance mode
  const completeSession = useCallback(() => {
    setIsRunning(false);
    endTimeRef.current = null;

    // Record the session if it's a focus session
    if (timerMode === 'focus') {
      const totalElapsedMs = elapsedTime + (sessionStartTime ? Date.now() - sessionStartTime : 0);
      const actualMinutes = Math.round(totalElapsedMs / 60000) || Math.floor(settings?.pomodoroWorkDuration || 25);

      addFocusSession({
        subtaskId: subtaskId || null,
        durationMinutes: Math.max(1, actualMinutes),
        type: 'focus',
        subjectId: subjectId || null,
        phaseId: phaseId || null,
        taskId: taskId || null,
        notes: 'Timer completed',
        difficulty: 'medium'
      });
    }

    // Reset tab title
    document.title = 'Learning Tracker';

    // Move to next mode
    let nextMode = 'focus';
    if (timerMode === 'focus') {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      nextMode = newSessionCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    }
    setTimerMode(nextMode);
    setTimeLeft(getDuration(nextMode));

    // Reset session timing
    setElapsedTime(0);
    setSessionStartTime(null);

    // Optional Notification (layer 2)
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const modeLabel =
          timerMode === 'focus'
            ? 'Focus'
            : timerMode === 'shortBreak'
            ? 'Short Break'
            : 'Long Break';
        new Notification('Timer Finished', {
          body: `${modeLabel} session complete`,
          icon: '/favicon.ico'
        });
      }
    } catch {
      // Notification failure must never affect timer truth.
    }

    // Optional Audio (layer 3)
    try {
      const audio = new Audio('/timer.mp3');
      audio.play().catch(() => {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch {
          // Audio fallback ignored
        }
      });
    } catch {
      // Audio failure must never affect timer truth.
    }
  }, [
    timerMode,
    elapsedTime,
    sessionStartTime,
    settings?.pomodoroWorkDuration,
    addFocusSession,
    subtaskId,
    subjectId,
    phaseId,
    taskId,
    sessionCount,
    getDuration
  ]);

  // Synchronize timer with wall-clock time
  const syncTimer = useCallback(() => {
    if (!endTimeRef.current) {
      return;
    }

    const remaining = Math.max(
      0,
      Math.ceil((endTimeRef.current - Date.now()) / 1000)
    );

    setTimeLeft(remaining);

    if (remaining <= 0 && !completedRef.current) {
      completedRef.current = true;
      completeSession();
    }
  }, [completeSession]);

  // Start / Resume timer
  const startTimer = useCallback(() => {
    if (isRunning) return;

    const remainingToRun = timeLeft > 0 ? timeLeft : getDuration();
    if (timeLeft <= 0) {
      setTimeLeft(remainingToRun);
    }

    // Set start time for current interval
    setSessionStartTime(Date.now());
    // NOTE: do NOT reset elapsedTime! Preserves time spent before previous pause.

    endTimeRef.current = Date.now() + remainingToRun * 1000;
    completedRef.current = false;
    setIsRunning(true);
  }, [isRunning, timeLeft, getDuration]);

  // Pause timer preserving remaining duration
  const pauseTimer = useCallback(() => {
    if (!isRunning) return;

    let remaining = timeLeft;
    if (endTimeRef.current) {
      remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    }
    setTimeLeft(remaining);
    setIsRunning(false);

    if (sessionStartTime) {
      setElapsedTime(prev => prev + (Date.now() - sessionStartTime));
      setSessionStartTime(null);
    }

    endTimeRef.current = null;
  }, [isRunning, timeLeft, sessionStartTime]);

  // Reset timer back to full duration of current mode
  const resetTimer = useCallback(() => {
    setIsRunning(false);
    endTimeRef.current = null;
    completedRef.current = false;
    setSessionStartTime(null);
    setElapsedTime(0);
    setTimeLeft(getDuration(timerMode));
  }, [getDuration, timerMode]);

  // Switch mode explicitly
  const handleModeChange = useCallback((modeId) => {
    if (modeId === timerMode && !isRunning) return;
    setTimerMode(modeId);
    setIsRunning(false);
    endTimeRef.current = null;
    completedRef.current = false;
    setSessionStartTime(null);
    setElapsedTime(0);
    setTimeLeft(getDuration(modeId));
  }, [timerMode, isRunning, getDuration]);

  // Timer interval effect for UI refresh
  useEffect(() => {
    if (!isRunning) return undefined;

    syncTimer();
    const interval = window.setInterval(syncTimer, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRunning, syncTimer]);

  // Visibility recovery: immediately sync wall-clock time when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncTimer]);

  // Update browser tab title while timer runs
  useEffect(() => {
    if (isRunning) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} Focus`;
    } else {
      document.title = 'Learning Tracker';
    }

    return () => {
      document.title = 'Learning Tracker';
    };
  }, [isRunning, timeLeft]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-start effect: triggers ONCE on initial open if requested, never re-triggers upon pause!
  useEffect(() => {
    if (autoStart && isOpen && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startTimer();
    }
  }, [autoStart, isOpen, startTimer]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timerModes = [
    { id: 'focus', label: 'Focus', className: 'bg-blue-600 text-white' },
    { id: 'shortBreak', label: 'Short Break', className: 'bg-green-600 text-white' },
    { id: 'longBreak', label: 'Long Break', className: 'bg-purple-600 text-white' }
  ];

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Pomodoro Timer</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Timer Mode Selection */}
      <div className="flex gap-2 mb-6">
        {timerModes.map(mode => (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timerMode === mode.id
                ? mode.className
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="text-6xl font-bold text-gray-800 mb-2">
          {formatTime(timeLeft)}
        </div>
        <div className="text-sm text-gray-500">
          {timerModes.find(m => m.id === timerMode)?.label}
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex gap-3">
        <button
          onClick={isRunning ? pauseTimer : startTimer}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Session Info */}
      {(subjectId || taskId) && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium">Current Task:</div>
            <div>{taskName || 'Unnamed Task'}</div>
            {phaseName && <div className="text-blue-600">{phaseName}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
