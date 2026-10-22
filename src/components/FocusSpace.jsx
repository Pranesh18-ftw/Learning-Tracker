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
  RefreshCw
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
  onAbandon
}) => {
  const {
    task,
    status = 'ready', // 'ready' | 'running' | 'paused' | 'reflection'
    targetMinutes = 25,
    timeLeftSeconds = 1500,
    sessionStartTime,
    sessionEndTime,
    elapsedMs = 0
  } = session;

  // Local state for interactive drawers and reflection inputs
  const [activeTool, setActiveTool] = useState(null); // 'notes' | 'reference' | null
  const [sessionNotes, setSessionNotes] = useState('');
  const [reflectionWhatLearned, setReflectionWhatLearned] = useState('');
  const [canExplainWithoutNotes, setCanExplainWithoutNotes] = useState('yes'); // 'yes' | 'partly' | 'no'
  const [reflectionDifficulty, setReflectionDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [currentTimeLeft, setCurrentTimeLeft] = useState(timeLeftSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const retryDelays = [0, 2500, 5000, 8000, 12000];

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
          setTelemetrySyncDiagnostic(null);
          setIsSyncing(false);

          if (attemptIndex + 1 < retryDelays.length) {
            const nextDelay = retryDelays[attemptIndex + 1] - retryDelays[attemptIndex];
            const timeoutId = setTimeout(() => {
              attemptSync(attemptIndex + 1);
            }, nextDelay);
            syncTimeoutsRef.current.push(timeoutId);
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
    } else if (status === 'reflection') {
      setTimerAnnouncement(`Focus session concluded. Opening reflection dialog.`);
    }
  }, [status, conceptName, targetMinutes]);

  // ── WALL-CLOCK MONOTONIC TIMER TICK (1000ms interval for render efficiency) ──
  const tickWallClock = useCallback(() => {
    if (!sessionEndTime) return;
    const remaining = Math.max(0, Math.ceil((sessionEndTime - Date.now()) / 1000));
    setCurrentTimeLeft(remaining);

    if (remaining <= 0 && !completedOnceRef.current) {
      completedOnceRef.current = true;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      onOpenReflection && onOpenReflection();
    }
  }, [sessionEndTime, onOpenReflection]);

  useEffect(() => {
    if (status === 'running' && sessionEndTime) {
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
  }, [status, onPause, onResume, onBeginRunning, onAbandon, activeTool, handleCommit]);

  // =========================================================================
  // STATE 1: READY (Quick, Tactile Preparation Screen)
  // =========================================================================
  if (status === 'ready') {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#0B0F19] text-white flex flex-col justify-between p-6 sm:p-12 anim-fade-in"
        role="region"
        aria-label="Focus Readiness Space"
      >
        {/* Top Minimal Bar */}
        <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-coral-500">●</span>
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
            <span className="text-xs font-mono font-black uppercase tracking-widest text-coral-500">
              {subjectName} · {phaseName}
            </span>
            <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-white">
              {conceptName}
            </h1>
          </div>

          {/* Schematic Symbol */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 border-2 border-coral-500/40 flex items-center justify-center text-coral-400 shadow-xl">
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
            <Clock className="w-3.5 h-3.5 text-coral-500" />
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
              className="w-full max-w-xs py-4 rounded-2xl bg-coral-500 hover:bg-coral-600 text-white font-display font-black text-base shadow-lg shadow-coral-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>START FOCUS</span>
            </button>
            <span className="text-[11px] font-mono text-slate-400">
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
  // STATE 2: REFLECTION (Post-Session Realization & Evidence Record)
  // =========================================================================
  if (status === 'reflection') {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#0B0F19] text-white flex items-center justify-center p-4 sm:p-6 overflow-y-auto anim-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Focus Reflection Space"
      >
        <div className="w-full max-w-lg bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">

          {/* 1. WHAT YOU WORKED ON */}
          <div className="text-center space-y-1.5 pb-3 border-b border-slate-800">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
              Session Concluded · {minutesSpent} Minutes
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

              {companionTelemetry.observedSeconds === 0 || companionTelemetry.observedSeconds === null ? (
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
                                  if (updated && updated.appBreakdown) setCompanionTelemetry(updated);
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
                                  if (updated && updated.appBreakdown) setCompanionTelemetry(updated);
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-400 underline font-sans"
                              >
                                Mark as distraction
                              </button>
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
                        {telemetrySyncDiagnostic || 'No telemetry observations recorded for this session'}
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
      className="fixed inset-0 z-50 bg-[#0B0F19] text-white flex flex-col justify-between p-4 sm:p-8 select-none transition-colors duration-300"
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

        {/* ── CALM SECONDARY TIMER PROJECTION ── */}
        <div className="space-y-1 pt-2">
          <div
            aria-hidden="true"
            className="font-mono font-bold text-3xl sm:text-4xl text-slate-300 tracking-tight flex items-center justify-center gap-2"
          >
            <span>{formatTimeStr(currentTimeLeft)}</span>
          </div>
          <div className="sr-only" role="status" aria-live="polite">
            {timerAnnouncement}
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            {isPaused ? 'Paused · Take a real break' : 'Remaining in this focus container'}
          </p>
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
            className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-display font-bold text-sm border border-emerald-500/40 flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>FINISH TAKE</span>
          </button>
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

    </div>
  );
};

export default FocusSpace;
