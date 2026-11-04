import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Pause,
  Play,
  CheckCircle2,
  X,
  FileText,
  BookOpen,
  Clock,
  Zap,
  Smartphone,
  RefreshCw,
  Coffee,
  Plus
} from 'lucide-react';
import { ConceptSchematicGlyph } from './ConceptObject';
import { resolveWhyItMatters } from '../utils/conceptRelationshipResolver';
import {
  isCompanionPaired,
  isCompanionReachable,
  isCompanionConnected,
  getTelemetryForSession,
  getTelemetryStatusForSession,
  reconcileLateTelemetry,
  formatDuration,
  correctAppClassification,
  getLastSessionRelayStatus,
  subscribeToSessionRelay
} from '../services/focusIntegrityService';
import { APP_CATEGORIES, TELEMETRY_STATUS } from '../shared/focusIntegrityProtocol';
import TemporalInstrumentTimer from './TemporalInstrumentTimer';

/**
 * FocusSpace
 *
 * Implements the redesigned FOCUS state:
 * "FOCUS is not another page. It is a different state of the application.
 * When Focus begins, the application should deliberately reduce stimulation.
 * The product should become quieter, simpler and more intentional."
 *
 * Supports:
 * - READY -> RUNNING -> PAUSED -> REFLECTION -> COMPLETE
 * - Wall-clock monotonic accuracy (no drift, tab-switch safe)
 * - The Core Question defines the work and remains visible
 * - Calm, secondary timer (measures container, doesn't shout)
 * - Minimal expandable tool drawer (Notes & Reference)
 * - Lightweight evidence-based reflection (under 1-2 min)
 * - Full keyboard shortcuts (Space, Esc, N, R)
 */
const FocusSpace = ({
  session,
  onBeginRunning,
  onPause,
  onResume,
  onOpenReflection,
  onCommitEvidence,
  onAbandon,
  onExtendTime = () => {},
  onStartBreak = () => {},
  onResumeFromBreak = () => {}
}) => {
  const {
    task,
    status = 'ready', // 'ready' | 'running' | 'paused' | 'break' | 'break-paused' | 'reflection'
    targetMinutes = 25,
    timeLeftSeconds = 1500,
    sessionStartTime,
    sessionEndTime,
    elapsedMs = 0,
    pomodoroCycle = 1,
    breakDurationMinutes = 5
  } = session;

  // Local state for interactive drawers and reflection inputs
  const [activeTool, setActiveTool] = useState(null); // 'notes' | 'reference' | null
  const [sessionNotes, setSessionNotes] = useState('');
  const [reflectionWhatLearned, setReflectionWhatLearned] = useState('');
  const [canExplainWithoutNotes, setCanExplainWithoutNotes] = useState('yes'); // 'yes' | 'partly' | 'no'
  const [reflectionDifficulty, setReflectionDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [currentTimeLeft, setCurrentTimeLeft] = useState(timeLeftSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntervalCheckIn, setShowIntervalCheckIn] = useState(false);
  const [showBreakOverModal, setShowBreakOverModal] = useState(false);
  const [timeAddedNotice, setTimeAddedNotice] = useState(null);

  // Focus Integrity Companion Integration (Prompts #4, #25, #35)
  const sessionId = session.sessionId || session.id;
  const companionPaired = typeof isCompanionPaired === 'function' ? isCompanionPaired() : isCompanionConnected();
  const companionReachable = typeof isCompanionReachable === 'function' ? isCompanionReachable() : false;
  const [sessionRelayStatus, setSessionRelayStatus] = useState(() => (
    typeof getLastSessionRelayStatus === 'function' ? getLastSessionRelayStatus() : null
  ));

  useEffect(() => {
    if (typeof subscribeToSessionRelay === 'function') {
      return subscribeToSessionRelay((status) => {
        setSessionRelayStatus(status);
      });
    }
  }, []);

  const [companionTelemetry, setCompanionTelemetry] = useState(() => getTelemetryForSession(sessionId));
  const [telemetryStatus, setTelemetryStatus] = useState(() => getTelemetryStatusForSession(sessionId));
  const [telemetrySyncState, setTelemetrySyncState] = useState(() => {
    const existing = getTelemetryForSession(sessionId);
    if (existing) return 'reconciled';
    if (!companionPaired) return 'idle';
    return 'pending';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [telemetrySyncDiagnostic, setTelemetrySyncDiagnostic] = useState(null);
  const syncTimeoutsRef = useRef([]);

  // Bounded retries for late-arriving companion upload (at t=0s, 2.5s, 5s, 8s, 12s)
  useEffect(() => {
    const existing = getTelemetryForSession(sessionId);
    setCompanionTelemetry(existing);
    setTelemetryStatus(getTelemetryStatusForSession(sessionId));

    syncTimeoutsRef.current.forEach(clearTimeout);
    syncTimeoutsRef.current = [];

    if (existing) {
      setTelemetrySyncState('reconciled');
      setTelemetrySyncDiagnostic(null);
      setIsSyncing(false);
      return;
    }

    if (!companionPaired || status !== 'reflection' || !sessionId) {
      setTelemetrySyncState('idle');
      setTelemetrySyncDiagnostic(null);
      setIsSyncing(false);
      return;
    }

    let isCancelled = false;
    setTelemetrySyncState('pending');
    setTelemetrySyncDiagnostic(null);

    const retryDelays = [0, 2000, 4500, 7500, 11000, 15000, 20000, 26000, 33000, 42000, 55000];

    const attemptSync = async (attemptIndex) => {
      if (isCancelled) return;
      setIsSyncing(true);
      try {
        const result = await reconcileLateTelemetry(sessionId);
        if (isCancelled) return;

        if (result?.success && result.reconciled && result.telemetry) {
          setCompanionTelemetry(result.telemetry);
          setTelemetryStatus(TELEMETRY_STATUS.SOURCE_CONNECTED_WITH_DATA);
          setTelemetrySyncState('reconciled');
          setTelemetrySyncDiagnostic(null);
          setIsSyncing(false);
          return;
        }

        if (result?.success && !result.reconciled) {
          setTelemetrySyncState('pending');
          setIsSyncing(false);

          if (attemptIndex + 1 < retryDelays.length) {
            setTelemetrySyncDiagnostic('No telemetry observations recorded yet. Waiting for companion phone upload...');
            const nextDelay = retryDelays[attemptIndex + 1] - retryDelays[attemptIndex];
            const timeoutId = setTimeout(() => {
              attemptSync(attemptIndex + 1);
            }, nextDelay);
            syncTimeoutsRef.current.push(timeoutId);
          } else {
            setTelemetrySyncDiagnostic('No telemetry observations recorded for this session');
          }
          return;
        }

        // Unsuccessful (e.g. auth, 403, 404, 422, network)
        setIsSyncing(false);
        setTelemetrySyncState('error');
        setTelemetrySyncDiagnostic(result?.error || 'Companion telemetry retrieval failed.');
      } catch (err) {
        if (isCancelled) return;
        setIsSyncing(false);
        setTelemetrySyncState('error');
        setTelemetrySyncDiagnostic('Network connection unavailable.');
      }
    };

    attemptSync(0);

    return () => {
      isCancelled = true;
      syncTimeoutsRef.current.forEach(clearTimeout);
      syncTimeoutsRef.current = [];
    };
  }, [sessionId, status, companionPaired]);

  const handleManualSyncCheck = async () => {
    if (!sessionId || !companionPaired || isSyncing) return;
    setIsSyncing(true);
    setTelemetrySyncDiagnostic(null);
    try {
      const result = await reconcileLateTelemetry(sessionId);
      if (result?.success && result.reconciled && result.telemetry) {
        setCompanionTelemetry(result.telemetry);
        setTelemetryStatus(TELEMETRY_STATUS.SOURCE_CONNECTED_WITH_DATA);
        setTelemetrySyncState('reconciled');
        setTelemetrySyncDiagnostic(null);
      } else if (result?.success && !result.reconciled) {
        setTelemetrySyncState('pending');
        setTelemetrySyncDiagnostic('No telemetry summary uploaded by companion phone yet.');
      } else {
        setTelemetrySyncState('error');
        setTelemetrySyncDiagnostic(result?.error || 'Companion telemetry retrieval failed.');
      }
    } catch (err) {
      setTelemetrySyncState('error');
      setTelemetrySyncDiagnostic('Network connection unavailable.');
    } finally {
      setIsSyncing(false);
    }
  };

  const timerIntervalRef = useRef(null);
  const completedOnceRef = useRef(false);
  const currentSessionIdRef = useRef(sessionId);
  if (currentSessionIdRef.current !== sessionId) {
    currentSessionIdRef.current = sessionId;
    completedOnceRef.current = false;
  }

  // Concept & pedagogical context
  const conceptName = task?.taskName || task?.name || 'STEM Milestone';
  const subtaskTitle = task?.subtaskName || (task?.subtaskId ? task.name : null);
  const phaseName = task?.phaseName || 'Core Region';
  const subjectName = task?.subjectName || 'Engineering Domain';
  const glyph = task?.glyph || 'capacitor';

  // The Question / Objective that defines the work
  const mainQuestion = subtaskTitle || task?.whyItMatters || resolveWhyItMatters(conceptName, task?.name, phaseName);

  // Time format: MM:SS
  const formatTimeStr = (totalSecs) => {
    const mins = Math.floor(Math.max(0, totalSecs) / 60);
    const secs = Math.floor(Math.max(0, totalSecs) % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Screen reader meaningful transition announcement (not every second)
  const [timerAnnouncement, setTimerAnnouncement] = useState(() =>
    `Focus space ready for ${conceptName}. Planned duration: ${targetMinutes} minutes.`
  );

  useEffect(() => {
    if (status === 'ready') {
      setTimerAnnouncement(`Focus space ready for ${conceptName}. Planned duration: ${targetMinutes} minutes.`);
    } else if (status === 'running') {
      setTimerAnnouncement(`Focus timer started. ${targetMinutes} minutes planned.`);
    } else if (status === 'paused') {
      setTimerAnnouncement(`Focus timer paused.`);
    } else if (status === 'break') {
      setTimerAnnouncement(`Restorative break started. Relax and step away from the screen.`);
    } else if (status === 'reflection') {
      setTimerAnnouncement(`Focus session concluded. Opening reflection dialog.`);
    }
  }, [status, conceptName, targetMinutes]);

  const handleAddTime = useCallback((minutes) => {
    completedOnceRef.current = false;
    setShowIntervalCheckIn(false);
    setShowBreakOverModal(false);
    setTimeAddedNotice(`+${minutes}m added`);
    setTimeout(() => setTimeAddedNotice(null), 3000);
    setCurrentTimeLeft(prev => prev + minutes * 60);
    if (onExtendTime) {
      onExtendTime(minutes);
    }
  }, [onExtendTime]);

  // ── WALL-CLOCK MONOTONIC TIMER TICK (1000ms interval for render efficiency) ──
  const tickWallClock = useCallback(() => {
    if (!sessionEndTime) return;
    const remaining = Math.max(0, Math.ceil((sessionEndTime - Date.now()) / 1000));
    setCurrentTimeLeft(remaining);

    if (remaining <= 0 && !completedOnceRef.current) {
      completedOnceRef.current = true;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (status === 'break') {
        setShowBreakOverModal(true);
      } else {
        setShowIntervalCheckIn(true);
      }
    }
  }, [sessionEndTime, status]);

  useEffect(() => {
    if ((status === 'running' || status === 'break') && sessionEndTime) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(tickWallClock, 1000);
      tickWallClock();
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status, sessionEndTime, tickWallClock]);

  // Page visibility & focus resync: prevent throttled background timer drift
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === 'visible' && status === 'running') {
        tickWallClock();
      }
    };
    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [status, tickWallClock]);

  // Keep currentTimeLeft synced when status is paused or ready
  useEffect(() => {
    if (status !== 'running') {
      setCurrentTimeLeft(timeLeftSeconds);
    }
  }, [status, timeLeftSeconds]);

  // Calculate actual session minutes spent strictly bounded by container
  const maxSessionMs = (targetMinutes || 25) * 60 * 1000;
  const currentSegmentMaxMs = sessionEndTime && sessionStartTime ? Math.max(0, sessionEndTime - sessionStartTime) : maxSessionMs;
  const currentSegmentElapsed = sessionStartTime && status === 'running'
    ? Math.min(Date.now() - sessionStartTime, currentSegmentMaxMs)
    : 0;
  const totalElapsedMs = Math.min(maxSessionMs, (elapsedMs || 0) + currentSegmentElapsed);
  const minutesSpent = Math.max(1, Math.min(targetMinutes || 25, Math.round(totalElapsedMs / 60000)));

  const handleCommit = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onCommitEvidence && onCommitEvidence({
      notes: reflectionWhatLearned.trim() || sessionNotes.trim() || '',
      difficulty: reflectionDifficulty,
      explainWithoutNotes: canExplainWithoutNotes,
      durationMinutes: minutesSpent
    });
  }, [isSubmitting, onCommitEvidence, reflectionWhatLearned, sessionNotes, reflectionDifficulty, canExplainWithoutNotes, minutesSpent]);

  // ── KEYBOARD SHORTCUTS ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'running') {
          onPause && onPause();
        } else if (status === 'paused') {
          onResume && onResume();
        } else if (status === 'ready') {
          onBeginRunning && onBeginRunning();
        } else if (status === 'break') {
          completedOnceRef.current = false;
          setShowBreakOverModal(false);
          onResumeFromBreak ? onResumeFromBreak() : (onResume && onResume());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (activeTool) {
          setActiveTool(null);
        } else if (status === 'reflection') {
          if (window.confirm("Exit Focus mode? Your completed session time will be recorded.")) {
            handleCommit();
          }
        } else {
          if (status === 'running') {
            onPause && onPause();
          }
          if (window.confirm("Discard this Focus session? Unsaved session time will not be recorded.")) {
            onAbandon && onAbandon();
          }
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setActiveTool(prev => (prev === 'notes' ? null : 'notes'));
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setActiveTool(prev => (prev === 'reference' ? null : 'reference'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onPause, onResume, onBeginRunning, onAbandon, onResumeFromBreak, activeTool, handleCommit]);

  // =========================================================================
  // STATE 1: READY (Quick, Tactile Preparation Screen)
  // =========================================================================
  if (status === 'ready') {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#0B0D12] text-white flex flex-col justify-between p-6 sm:p-12 anim-fade-in"
        role="region"
        aria-label="Focus Readiness Space"
      >
        {/* Top Minimal Bar */}
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">●</span>
            <span>INTENTIONAL FOCUS TRANSITION</span>
          </div>
          <button
            onClick={onAbandon}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Esc to Return
          </button>
        </div>

        {/* Center Readiness Card */}
        <div className="max-w-md mx-auto text-center space-y-8 my-auto">
          <div className="space-y-2">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
              {subjectName} · {phaseName}
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-white">
              {conceptName}
            </h1>
          </div>

          {/* Schematic Symbol */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900/90 border border-white/20 flex items-center justify-center text-white shadow-xl">
            <ConceptSchematicGlyph glyph={glyph} className="w-10 h-10" isCurrent={true} />
          </div>

          {/* Work Definition */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
              Target Challenge:
            </span>
            <p className="text-base sm:text-lg font-medium text-slate-200 leading-relaxed">
              "{mainQuestion}"
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Planned Duration: {targetMinutes} minutes</span>
          </div>

          {/* Focus Integrity Status (Prompt #25 & #35) */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono">
            {companionPaired ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300"
                title={sessionRelayStatus?.diagnostic || undefined}
              >
                <Smartphone className={`w-3.5 h-3.5 ${companionReachable ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className={`w-1.5 h-1.5 rounded-full ${companionReachable ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span>Focus Integrity: Phone Paired</span>
                {companionReachable && (
                  <span className="text-[10px] text-emerald-400 font-sans font-medium">(Active)</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                <span>Focus Integrity unavailable</span>
              </div>
            )}
          </div>

          {/* Start CTA */}
          <div className="pt-4 flex flex-col items-center gap-3">
            <button
              onClick={onBeginRunning}
              className="w-full max-w-xs py-3.5 px-6 rounded-2xl btn-liquid-pearl font-mono font-bold text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>START FOCUS</span>
            </button>
            <span className="text-[11px] font-mono text-stone-500">
              Press [Space] to begin
            </span>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="text-center text-xs font-mono text-slate-500">
          Stimulation reduced · Close secondary tabs for highest attention integrity
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE: BREAK (Serene Restorative Pomodoro Interval)
  // =========================================================================
  if (status === 'break' || status === 'break-paused') {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#07090E] text-stone-100 flex flex-col justify-between p-4 sm:p-8 select-none transition-colors duration-300"
        role="region"
        aria-label="Pomodoro Restorative Break"
      >
        {/* TOP ATTENTION BAR */}
        <header className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300">Restorative Break</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">Cycle {pomodoroCycle} Complete</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm("Discard this Focus session? Unsaved session time will not be recorded.")) {
                  onAbandon && onAbandon();
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Leave Focus"
              aria-label="Exit Focus"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* CENTER RESTORATIVE STAGE */}
        <main className="max-w-xl mx-auto w-full text-center space-y-6 my-auto px-4 z-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-2xl shadow-cyan-500/10">
            <Coffee className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 block">
              Cycle {pomodoroCycle} Completed · Rest & Consolidate
            </span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Step away from the screen
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Diffused thinking consolidates neural pathways while you rest. Stretch, hydrate, look into the distance, and let your subconscious work on <span className="text-slate-200 font-medium font-mono">"{conceptName}"</span>.
            </p>
          </div>

          {/* Break Countdown Timer */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-inner max-w-xs mx-auto space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block font-bold">
              Rest Time Remaining
            </span>
            <div className="font-mono text-4xl sm:text-5xl font-black text-cyan-300 tracking-tight">
              {formatTimeStr(currentTimeLeft)}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Next focus interval will resume on the same task
            </div>
          </div>

          {/* Break Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                completedOnceRef.current = false;
                setShowBreakOverModal(false);
                onResumeFromBreak ? onResumeFromBreak() : (onResume && onResume());
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-black text-sm tracking-wide shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME WORK (CYCLE {pomodoroCycle + 1})</span>
            </button>

            <button
              onClick={() => handleAddTime(2)}
              className="w-full sm:w-auto px-4 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono font-bold text-xs border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+2m More Rest</span>
            </button>
          </div>

          {/* Finished early escape hatch */}
          <div className="pt-2">
            <button
              onClick={onOpenReflection}
              className="text-xs font-mono text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Finished earlier than expected? Open reflection & log evidence →
            </button>
          </div>
        </main>

        <footer className="text-center text-xs font-mono text-slate-600">
          Adapted Pomodoro Cycle · Continuous task focus with honest cognitive pacing
        </footer>

        {/* Break Over Modal */}
        {showBreakOverModal && (
          <div
            className="fixed inset-0 z-50 bg-[#0B0D12]/90 backdrop-blur-md text-stone-100 flex items-center justify-center p-4 anim-pop"
            role="dialog"
            aria-modal="true"
            aria-label="Break Finished"
          >
            <div className="w-full max-w-md obsidian-liquid-card p-6 sm:p-8 space-y-6 shadow-2xl relative border border-cyan-500/30">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <Coffee className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                  Break Over · Refreshed & Ready
                </span>
                <h2 className="font-display font-black text-2xl text-white">
                  Ready for Next Interval?
                </h2>
                <p className="text-xs text-slate-300">
                  Resuming work on: <span className="text-white font-semibold font-mono">"{conceptName}"</span> (Cycle {pomodoroCycle + 1})
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    completedOnceRef.current = false;
                    setShowBreakOverModal(false);
                    onResumeFromBreak ? onResumeFromBreak() : (onResume && onResume());
                  }}
                  className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-black text-sm tracking-wide shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START CYCLE {pomodoroCycle + 1} FOCUS</span>
                </button>

                <button
                  onClick={() => {
                    setShowBreakOverModal(false);
                    onOpenReflection && onOpenReflection();
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Task is Finished (Reflect & Save)</span>
                </button>

                <button
                  onClick={() => handleAddTime(3)}
                  className="w-full py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  +3m More Break
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STATE 2: REFLECTION (Post-Session Realization & Evidence Record)
  // =========================================================================
  if (status === 'reflection') {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#0B0D12]/90 backdrop-blur-md text-stone-100 flex items-center justify-center p-4 sm:p-6 overflow-y-auto anim-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Focus Reflection Space"
      >
        <div className="w-full max-w-lg obsidian-liquid-card p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="glass-sheen-line" aria-hidden="true" />
          <div className="glass-noise-material absolute inset-0 pointer-events-none rounded-[inherit]" aria-hidden="true" />

          {/* 1. WHAT YOU WORKED ON */}
          <div className="text-center space-y-1.5 pb-3 border-b border-slate-800">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
              Session Concluded · {minutesSpent} Minutes{pomodoroCycle > 1 ? ` (${pomodoroCycle} Pomodoro Cycles)` : ''}
            </span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
              {conceptName}
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {subjectName ? `${subjectName} · ` : ''}{phaseName || 'Core Region'}
            </p>
          </div>

          {/* 2. WHAT YOU LEARNED (Primary Reflection Input) */}
          <div className="space-y-4">

            {/* Realization Text */}
            <div className="space-y-1.5">
              <label htmlFor="focus-reflection-what-learned" className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                What changed in your understanding?
              </label>
              <textarea
                id="focus-reflection-what-learned"
                value={reflectionWhatLearned}
                onChange={(e) => setReflectionWhatLearned(e.target.value)}
                placeholder="e.g. Derived the charging equation; realized that voltage lags current by 90 degrees."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-sans"
              />
            </div>

            {/* Can you explain without notes? */}
            <div className="space-y-1.5">
              <span className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Can you explain it without notes?
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'yes', label: '✓ Confidently' },
                  { id: 'partly', label: '△ Partly' },
                  { id: 'no', label: '○ Needs Revisit' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCanExplainWithoutNotes(opt.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      canExplainWithoutNotes === opt.id
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-black'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resistance / Difficulty */}
            <div className="space-y-1.5">
              <label htmlFor="focus-reflection-difficulty" className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Recall Resistance
              </label>
              <select
                id="focus-reflection-difficulty"
                value={reflectionDifficulty}
                onChange={(e) => setReflectionDifficulty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="easy">Smooth Recall (Fluid)</option>
                <option value="medium">Moderate Effort (Active retrieval)</option>
                <option value="hard">High Resistance (Breakthrough)</option>
              </select>
            </div>

          </div>

          {/* 3. WHAT ACTUALLY HAPPENED (Truthful Phone & Session Reality Evidence) */}
          {telemetryStatus === TELEMETRY_STATUS.SOURCE_CONNECTED_WITH_DATA && companionTelemetry ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>FOCUS INTEGRITY EVIDENCE</span>
                </div>
                <span className="text-slate-500 text-[10px]">
                  {companionTelemetry.provenance === 'REAL_EXTERNAL_SOURCE' ? 'Verified Server Telemetry' : 'Verified Locally'}
                </span>
              </div>

              {companionTelemetry.collectionStatus === 'PERMISSION_REQUIRED' ? (
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-between">
                  <span>Telemetry unavailable because Usage Access permission is missing on phone</span>
                  <span className="text-slate-400 text-[11px]">Permission required</span>
                </div>
              ) : companionTelemetry.observedSeconds === 0 || companionTelemetry.observedSeconds === null ? (
                /* Honest display when 0s or missing observation window */
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-between">
                  <span>No phone usage observations recorded during session window</span>
                  <span className="text-slate-400 text-[11px]">0s observed</span>
                </div>
              ) : companionTelemetry.interruptionCount === 0 ? (
                /* Quiet line when zero interruptions detected */
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-emerald-400 flex items-center justify-between">
                  <span>✓ {formatDuration(companionTelemetry.longestUninterruptedSeconds ?? companionTelemetry.intendedSeconds ?? companionTelemetry.observedSeconds)} uninterrupted</span>
                  <span className="text-slate-400 text-[11px]">Zero phone interruptions observed</span>
                </div>
              ) : (
                /* Honest Evidence Grid - No Fake Focus Score! */
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Intended</div>
                      <div className="text-xs font-mono font-black text-white">
                        {companionTelemetry.intendedSeconds != null
                          ? `${Math.round(companionTelemetry.intendedSeconds / 60)} min`
                          : `${targetMinutes} min`}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Uninterrupted</div>
                      <div className="text-xs font-mono font-black text-emerald-400">
                        {formatDuration(companionTelemetry.longestUninterruptedSeconds || 0)}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Interruptions</div>
                      <div className="text-xs font-mono font-black text-amber-400">
                        {companionTelemetry.interruptionCount || 0} detected
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Time Away</div>
                      <div className="text-xs font-mono font-black text-slate-300">
                        {formatDuration(companionTelemetry.interruptionSeconds || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Categorized Interruption Breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      {companionTelemetry.referenceSeconds > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-electric-500/10 border border-electric-500/30 text-electric-300">
                          📖 {formatDuration(companionTelemetry.referenceSeconds)} Reference (Docs/Tools)
                        </span>
                      )}
                      {companionTelemetry.distractionSeconds > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300">
                          ⚡ {formatDuration(companionTelemetry.distractionSeconds)} Distraction
                        </span>
                      )}
                      {companionTelemetry.unknownSeconds > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400">
                          ⚪ {formatDuration(companionTelemetry.unknownSeconds)} Unknown
                        </span>
                      )}
                    </div>

                    {/* App item list with inline correction */}
                    {Array.isArray(companionTelemetry.appBreakdown) && companionTelemetry.appBreakdown.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {companionTelemetry.appBreakdown.map((app, aIdx) => (
                          <div key={aIdx} className="flex items-center justify-between text-[11px] font-mono p-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80">
                            <span className="text-slate-300">
                              {app.category === APP_CATEGORIES.REFERENCE ? '📖 Reference' : app.category === APP_CATEGORIES.DISTRACTION ? '⚡ Distraction' : '⚪ Unknown'}: {app.packageName.replace('com.', '')} · {formatDuration(app.durationSeconds)}
                            </span>
                            {app.category === APP_CATEGORIES.DISTRACTION && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = correctAppClassification(app.packageName, APP_CATEGORIES.REFERENCE, { updateHistory: true, sessionId });
                                  if (updated && updated.record) setCompanionTelemetry(updated.record);
                                  else if (updated && updated.appBreakdown) setCompanionTelemetry(updated);
                                }}
                                className="text-[10px] text-electric-400 hover:text-electric-300 underline font-sans"
                              >
                                Change to reference
                              </button>
                            )}
                            {app.category === APP_CATEGORIES.REFERENCE && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = correctAppClassification(app.packageName, APP_CATEGORIES.DISTRACTION, { updateHistory: true, sessionId });
                                  if (updated && updated.record) setCompanionTelemetry(updated.record);
                                  else if (updated && updated.appBreakdown) setCompanionTelemetry(updated);
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-400 underline font-sans"
                              >
                                Mark as distraction
                              </button>
                            )}
                            {app.category !== APP_CATEGORIES.REFERENCE && app.category !== APP_CATEGORIES.DISTRACTION && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = correctAppClassification(app.packageName, APP_CATEGORIES.REFERENCE, { updateHistory: true, sessionId });
                                    if (updated && updated.record) setCompanionTelemetry(updated.record);
                                    else if (updated && updated.appBreakdown) setCompanionTelemetry(updated);
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-sans font-medium"
                                >
                                  + Mark Reference
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = correctAppClassification(app.packageName, APP_CATEGORIES.DISTRACTION, { updateHistory: true, sessionId });
                                    if (updated && updated.record) setCompanionTelemetry(updated.record);
                                    else if (updated && updated.appBreakdown) setCompanionTelemetry(updated);
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-sans font-medium"
                                >
                                  + Mark Distraction
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="text-[10px] text-slate-500 font-sans italic">
                Observed phone events verified locally. No surveillance feed. Phone use is classified honestly without arbitrary focus scores.
              </div>
            </div>
          ) : companionPaired ? (
            /* Companion phone paired - show truthful sync state */
            telemetrySyncState === 'error' ? (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-rose-500/30 flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                  <span>Companion phone paired</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-400 font-mono">
                    {telemetrySyncDiagnostic || 'Telemetry retrieval failed'}
                  </span>
                  <button
                    type="button"
                    onClick={handleManualSyncCheck}
                    disabled={isSyncing}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            ) : (
              /* pending / waiting for upload / no observations recorded yet */
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <Smartphone className={`w-3.5 h-3.5 ${isSyncing ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                  <span>Companion phone paired</span>
                </div>
                <div className="flex items-center gap-2">
                  {isSyncing ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                      <span>Syncing telemetry from phone...</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {telemetrySyncDiagnostic || 'No telemetry observations recorded yet. Waiting for companion phone upload...'}
                      </span>
                      <button
                        type="button"
                        onClick={handleManualSyncCheck}
                        disabled={isSyncing}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                        title="Check if companion phone has uploaded session telemetry"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Check status</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>Phone not connected (Phone not paired)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Phone telemetry unavailable</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={onAbandon}
              className="text-xs font-mono font-bold text-slate-500 hover:text-slate-300 transition-colors"
            >
              Discard Session
            </button>

            <button
              type="button"
              onClick={handleCommit}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-display font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'RECORDING EVIDENCE...' : 'RECORD EVIDENCE & RETURN'}</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 3: RUNNING & PAUSED (Serene Work Sanctuary)
  // =========================================================================
  const isPaused = status === 'paused';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0B0D12] text-stone-100 flex flex-col justify-between p-4 sm:p-8 select-none transition-colors duration-300"
      role="region"
      aria-label="Active Focus Space"
    >

      {/* ── TOP ATTENTION SHIELD BAR ── */}
      <header className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 z-20">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-coral-500 animate-pulse'}`} />
          <span className="text-slate-300">{subjectName}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{phaseName}</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-coral-300">
            Cycle {pomodoroCycle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] text-slate-500">
            {isPaused ? 'Session Paused' : 'Shield Active'}
          </span>
          {companionPaired && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${companionReachable ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>{companionReachable ? 'Phone Paired (Active)' : 'Phone Paired'}</span>
            </span>
          )}
          <button
            onClick={() => {
              if (status === 'running') {
                onPause && onPause();
              }
              if (window.confirm("Discard this Focus session? Unsaved session time will not be recorded.")) {
                onAbandon && onAbandon();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Leave Focus (Esc)"
            aria-label="Exit Focus"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── CENTER WORKSPACE: THE QUESTION IS CENTRAL ── */}
      <main className="max-w-2xl mx-auto w-full text-center space-y-6 my-auto px-4 z-10">

        {/* Concept Domain Header */}
        <div className="space-y-1">
          <span className="text-xs font-mono font-black uppercase tracking-widest text-coral-500">
            Current Concept
          </span>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            {conceptName}
          </h2>
        </div>

        {/* Schematic Micro-Object */}
        <div className="p-3 w-16 h-16 mx-auto rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-slate-300">
          <ConceptSchematicGlyph
            glyph={glyph}
            className="w-8 h-8"
            isCurrent={!isPaused}
            isCompleted={false}
          />
        </div>

        {/* ── THE QUESTION (Front & Center) ── */}
        <div className="py-2 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-slate-400 block">
            Objective Challenge
          </span>
          <h1 className="font-display font-medium text-lg sm:text-2xl text-slate-100 max-w-xl mx-auto leading-relaxed">
            "{mainQuestion}"
          </h1>
        </div>

        {/* ── 2.5D CINEMATIC TEMPORAL INSTRUMENT TIMER ── */}
        <div className="space-y-2 pt-2">
          <TemporalInstrumentTimer
            timeLeftSeconds={currentTimeLeft}
            targetMinutes={targetMinutes}
            isPaused={isPaused}
            status={status}
          />
          <div className="sr-only" role="status" aria-live="polite">
            {timerAnnouncement} · {formatTimeStr(currentTimeLeft)} remaining
          </div>
        </div>

        {/* ── PAUSE / RESUME / FINISH CONTROLS ── */}
        <div className="pt-4 flex items-center justify-center gap-3">
          {isPaused ? (
            <button
              onClick={onResume}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-display font-black text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME WORK [Space]</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-display font-bold text-sm border border-slate-700 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Pause className="w-4 h-4" />
              <span>PAUSE [Space]</span>
            </button>
          )}

          <button
            onClick={onOpenReflection}
            className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-display font-bold text-sm border border-emerald-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>FINISH TAKE</span>
          </button>
        </div>

        {/* ── ON-THE-FLY TIME EXTENSION TOOLBAR ── */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Add time:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddTime(5)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all font-mono font-bold text-[11px] cursor-pointer"
                title="Add 5 minutes to this session"
              >
                +5m
              </button>
              <button
                type="button"
                onClick={() => handleAddTime(10)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all font-mono font-bold text-[11px] cursor-pointer"
                title="Add 10 minutes to this session"
              >
                +10m
              </button>
              <button
                type="button"
                onClick={() => handleAddTime(15)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all font-mono font-bold text-[11px] cursor-pointer"
                title="Add 15 minutes to this session"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => handleAddTime(25)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/60 transition-all font-mono font-bold text-[11px] cursor-pointer"
                title="Add 25-minute Pomodoro block"
              >
                +25m
              </button>
            </div>
          </div>

          {timeAddedNotice && (
            <div className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full animate-fade-in shadow-lg">
              ✓ {timeAddedNotice}
            </div>
          )}
        </div>

      </main>

      {/* ── BOTTOM DRAWER & INTEGRITY FOOTER ── */}
      <footer className="max-w-2xl mx-auto w-full space-y-4 z-20">

        {/* Tool Drawer Toggle Tabs */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTool(prev => (prev === 'notes' ? null : 'notes'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-colors ${
                activeTool === 'notes'
                  ? 'border-coral-500 bg-coral-500/20 text-coral-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Scratchpad (N)</span>
            </button>

            <button
              onClick={() => setActiveTool(prev => (prev === 'reference' ? null : 'reference'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-colors ${
                activeTool === 'reference'
                  ? 'border-electric-500 bg-electric-500/20 text-electric-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Reference (R)</span>
            </button>
          </div>

          <div className="text-[11px] font-mono flex items-center gap-1.5">
            {companionPaired ? (
              <span className={`flex items-center gap-1.5 font-medium ${companionReachable ? 'text-slate-300' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${companionReachable ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span>{companionReachable ? '● Paired (Active)' : '● Paired'}</span>
              </span>
            ) : (
              <span className="text-slate-500 font-medium">Focus Integrity unavailable</span>
            )}
          </div>
        </div>

        {/* ── EXPANDABLE SUPPORTING TOOL DRAWER (Default: Closed) ── */}
        {activeTool === 'notes' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 anim-slide-up">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
              <span>Distraction-Free Scratchpad</span>
              <button onClick={() => setActiveTool(null)} className="hover:text-white">✕</button>
            </div>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Keep working derivations, scratch equations, or questions here..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600 font-mono"
            />
          </div>
        )}

        {activeTool === 'reference' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs anim-slide-up">
            <div className="flex items-center justify-between font-mono font-bold text-slate-400">
              <span>Theoretical Mental Model: {conceptName}</span>
              <button onClick={() => setActiveTool(null)} className="hover:text-white">✕</button>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              {resolveWhyItMatters(conceptName, task?.name, phaseName)}
            </p>
          </div>
        )}

      </footer>

      {/* ── INTERVAL CHECK-IN POP-UP (Adapted Pomodoro Flow) ── */}
      {showIntervalCheckIn && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0D12]/90 backdrop-blur-md text-stone-100 flex items-center justify-center p-4 anim-pop"
          role="dialog"
          aria-modal="true"
          aria-label="Focus Interval Check-In"
        >
          <div className="w-full max-w-lg obsidian-liquid-card p-6 sm:p-8 space-y-6 shadow-2xl relative border border-emerald-500/30">
            {/* Header */}
            <div className="text-center space-y-2 pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400 block">
                Focus Interval Complete · Cycle {pomodoroCycle} ({targetMinutes}m)
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
                Is this task finished?
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto font-mono">
                "{conceptName}"
              </p>
            </div>

            {/* Action Choices */}
            <div className="space-y-3">
              {/* 1. Finished -> Reflection */}
              <button
                type="button"
                onClick={() => {
                  setShowIntervalCheckIn(false);
                  onOpenReflection && onOpenReflection();
                }}
                className="w-full p-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-left transition-all shadow-lg shadow-emerald-500/20 group flex items-start gap-3.5 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-950/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-950">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-black text-sm tracking-wide">
                    Yes, Task is Finished
                  </div>
                  <div className="text-xs text-slate-900 font-sans font-medium mt-0.5">
                    Log what changed in your understanding and commit evidence to roadmap.
                  </div>
                </div>
              </button>

              {/* 2. Take a Break */}
              <button
                type="button"
                onClick={() => {
                  setShowIntervalCheckIn(false);
                  completedOnceRef.current = false;
                  onStartBreak && onStartBreak(breakDurationMinutes || 5);
                }}
                className="w-full p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-cyan-500/40 text-left transition-all text-slate-200 group flex items-start gap-3.5 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-cyan-300">
                    Take a Restorative Break ({breakDurationMinutes || 5}m)
                  </div>
                  <div className="text-xs text-slate-400 font-sans mt-0.5">
                    Step away, recharge, and return to this exact same task for Cycle {pomodoroCycle + 1}.
                  </div>
                </div>
              </button>

              {/* 3. Add more time to same task without break */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Not finished yet — add more time:</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddTime(10)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  >
                    +10 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTime(15)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  >
                    +15 Min
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTime(25)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-amber-300 border border-amber-500/40 hover:border-amber-500 transition-colors cursor-pointer"
                  >
                    +25 Min Block
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FocusSpace;
