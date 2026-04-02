import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

const PomodoroTimer = ({ 
  subtaskId: initialSubtaskId = null,
  subjectId: initialSubjectId = null,
  phaseId: initialPhaseId = null,
  taskId: initialTaskId = null,
  taskName: initialTaskName = '',
  phaseName: initialPhaseName = '',
  isOpen: initialIsOpen = true, 
  onClose: initialOnClose = null,
  closeTimer: initialCloseTimer = null,
  autoStart: initialAutoStart = false 
}) => {
  const { settings, addFocusSession, recordTaskCompletion } = useRoadmap();
  
  // State for timer
  const [subtaskId, setSubtaskId] = useState(initialSubtaskId);
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [phaseId, setPhaseId] = useState(initialPhaseId);
  const [taskId, setTaskId] = useState(initialTaskId);
  const [taskName, setTaskName] = useState(initialTaskName);
  const [phaseName, setPhaseName] = useState(initialPhaseName);
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [onClose, setOnClose] = useState(initialOnClose);
  const [closeTimer, setCloseTimer] = useState(initialCloseTimer);
  const [autoStart, setAutoStart] = useState(initialAutoStart);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('focus'); // focus, shortBreak, longBreak
  const [sessionCount, setSessionCount] = useState(0);
  const intervalRef = useRef(null);

  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Get duration based on mode and settings
  const getDuration = useCallback(() => {
    if (timerMode === 'focus') {
      return (settings?.pomodoroWorkDuration || 25) * 60;
    } else if (timerMode === 'shortBreak') {
      return (settings?.pomodoroBreakDuration || 5) * 60;
    } else if (timerMode === 'longBreak') {
      return (settings?.pomodoroLongBreakDuration || 15) * 60;
    }
    return 25 * 60; // Default fallback
  }, [timerMode, settings?.pomodoroWorkDuration, settings?.pomodoroBreakDuration, settings?.pomodoroLongBreakDuration]);

  // Update timer when settings or mode change
  useEffect(() => {
    if (timerMode === 'focus') {
      setTimeLeft(settings?.pomodoroWorkDuration * 60 || 25 * 60);
    } else if (timerMode === 'shortBreak') {
      setTimeLeft(settings?.pomodoroBreakDuration * 60 || 5 * 60);
    } else if (timerMode === 'longBreak') {
      setTimeLeft(settings?.pomodoroLongBreakDuration * 60 || 15 * 60);
    }
  }, [timerMode, settings?.pomodoroWorkDuration, settings?.pomodoroBreakDuration, settings?.pomodoroLongBreakDuration]);

  // Timer control functions
  const recordTimerSession = useCallback((actualDurationMinutes) => {
    addFocusSession({
      id: Date.now(),
      subtaskId,
      durationMinutes: actualDurationMinutes, // Use actual elapsed time
      type: "focus", // Add session type
      date: new Date().toISOString(),
      subjectId,
      phaseId,
      taskId,
      notes: 'Timer completed',
      difficulty: 'medium',
      completed: true
    });
  }, [addFocusSession, recordTaskCompletion, subtaskId, subjectId, phaseId, taskId]);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
        // Reset session saved flag for new timer
        setSessionSaved(false);
      }
    }
  }, [isRunning, sessionStartTime]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (sessionStartTime) {
      const elapsed = Date.now() - sessionStartTime;
      setElapsedTime(prev => prev + elapsed);
      setSessionStartTime(null);
    }
  }, [sessionStartTime]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(getDuration());
    if (sessionStartTime) {
      const elapsed = Date.now() - sessionStartTime;
      setElapsedTime(prev => prev + elapsed);
      setSessionStartTime(null);
    }
  }, [getDuration, sessionStartTime]);

  // Complete session and move to next
  const completeSession = useCallback(() => {
    try {
      pauseTimer();
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const modeLabel = timerMode === 'focus' ? 'Focus' : timerMode === 'shortBreak' ? 'Short Break' : 'Long Break';
        new Notification('Timer Finished', {
          body: `${modeLabel} session complete`,
          icon: '/favicon.ico'
        });
      }
      
      // Play sound
      try {
        // Try to load the audio file first
        const audio = new Audio('/timer.mp3');
        audio.addEventListener('error', () => {
          console.log('Timer sound file not found, using fallback beep');
          // Fallback: create a simple beep sound
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
          } catch (fallbackError) {
            console.log('Audio fallback failed:', fallbackError);
          }
        });
        
        audio.play().catch(() => {
          console.log('Audio play failed, using fallback beep');
          // Fallback: create a simple beep sound
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
        });
      } catch (error) {
        console.log('Audio playback failed:', error);
      }
      
      // Reset tab title
      document.title = 'Learning Tracker';
      
      // Record the session if it's a focus session
      if (timerMode === 'focus' && subtaskId) {
        const actualDurationMinutes = Math.floor((elapsedTime + (sessionStartTime ? Date.now() - sessionStartTime : 0)) / 60000);
        recordTimerSession(actualDurationMinutes || settings?.pomodoroWorkDuration || 25);
      }
      
      // Move to next mode or close
      if (timerMode === 'focus') {
        const newSessionCount = sessionCount + 1;
        setSessionCount(newSessionCount);
        
        // Every 4 focus sessions, take a long break
        if (newSessionCount % 4 === 0) {
          setTimerMode('longBreak');
        } else {
          setTimerMode('shortBreak');
        }
      } else {
        // After breaks, go back to focus
        setTimerMode('focus');
      }
      
      setTimeLeft(getDuration());
      setElapsedTime(0); // Reset elapsed time for next session
      setSessionStartTime(null);
      setSessionSaved(true); // Mark as saved to prevent re-execution
    } catch (error) {
      console.error('Error in completeSession:', error);
      // Ensure cleanup even if something fails
      setSessionSaved(true);
    }
  }, [timerMode, sessionCount, sessionStartTime, elapsedTime, subjectId, phaseId, taskId, subtaskId, taskName, phaseName, addFocusSession, pauseTimer, getDuration, sessionSaved, settings?.pomodoroWorkDuration, recordTaskCompletion, recordTimerSession]);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !sessionSaved) {
      try {
        completeSession();
      } catch (error) {
        console.error('Error completing session:', error);
        setSessionSaved(true); // Prevent infinite loop
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft, completeSession, sessionSaved]);

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

  // Auto-start effect
  useEffect(() => {
    if (autoStart && isOpen) {
      setIsRunning(true);
    }
  }, [autoStart, isOpen]);

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
            onClick={() => {
              setTimerMode(mode.id);
              setTimeLeft(getDuration());
              setIsRunning(false);
              setSessionSaved(false);
            }}
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
