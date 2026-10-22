/**
 * StatisticsPage.jsx
 *
 * LEARNING TRACKER — GROWTH REDESIGN
 *
 * Purpose:
 * GROWTH is the learner's development mirror answering:
 * "What is actually changing because I've been doing this?"
 *
 * Core Philosophy:
 * 1. Growth is NOT statistics (not a wall of arbitrary percentages).
 * 2. Primary experience: BEFORE → EVIDENCE → NOW.
 * 3. Never invent psychological scores (no fake "Brain Score" or "Focus IQ").
 * 4. Distinct from Archive: Growth interprets change; Archive preserves activity records.
 */

import React, { useState, useRef } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import {
  Flame,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  Archive
} from 'lucide-react';
import { getLocalDateKey, parseLocalDateKey, compareDateKeys } from '../utils/dateUtils';
import {
  resolveDevelopmentSummary,
  buildDevelopmentTimeline,
  resolveBeforeAndAfter,
  resolveProofOfGrowth,
  resolveFocusGrowthSignals,
  resolveRecoverySignal,
  resolveIndependenceSignals,
  resolveProjectProgression
} from '../utils/growthEvidenceResolver';

import GrowthDevelopmentHero from '../components/GrowthDevelopmentHero';
import GrowthTimeline from '../components/GrowthTimeline';
import GrowthBeforeAfter from '../components/GrowthBeforeAfter';
import GrowthProofCards from '../components/GrowthProofCards';
import GrowthSignalsBar from '../components/GrowthSignalsBar';
import GrowthProjectProgression from '../components/GrowthProjectProgression';
import GrowthEvidenceModal from '../components/GrowthEvidenceModal';

const StatisticsPage = () => {
  const {
    subjects,
    roadmap,
    sessions,
    taskCompletions,
    learningPlan,
    getStats,
    calculateStreak,
    getDailyGoalStats,
    getDailyFocusMinutes,
    adaptiveState
  } = useRoadmap();

  // Active view mode: 'growth' (Development Mirror) or 'archive' (Activity Archive)
  const [viewMode, setViewMode] = useState('growth');

  // Selected domain filter ('all' or subjectId)
  const [selectedDomainId, setSelectedDomainId] = useState('all');

  // Selected evidence for deep-dive modal
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const timelineRef = useRef(null);

  const effectiveRoadmap = roadmap && roadmap.length > 0 ? roadmap : subjects;

  // Resolve truthful developmental data
  const summary = resolveDevelopmentSummary(sessions, taskCompletions, effectiveRoadmap, selectedDomainId);
  const timelineEvents = buildDevelopmentTimeline(sessions, taskCompletions, effectiveRoadmap, selectedDomainId);
  const beforeAfterData = resolveBeforeAndAfter(effectiveRoadmap, taskCompletions, sessions, selectedDomainId);
  const proofCards = resolveProofOfGrowth(taskCompletions, sessions, effectiveRoadmap, selectedDomainId);
  const focusSignals = resolveFocusGrowthSignals(sessions);
  const recoverySignal = resolveRecoverySignal(sessions);
  const independenceSignal = resolveIndependenceSignals(learningPlan, sessions);
  const projectProgression = resolveProjectProgression(effectiveRoadmap);

  // Archive data calculation for the secondary Activity Archive view
  const stats = getStats();
  const streak = calculateStreak();
  const dailyGoalStats = getDailyGoalStats();

  const totalFocusMinutes = stats?.totalFocusMinutes ?? (sessions?.reduce((sum, session) => {
    if (session.type !== 'focus' && session.type) return sum;
    const minutes = Number(session.durationMinutes || session.duration || 0);
    return sum + minutes;
  }, 0) || 0);

  const totalHours = Math.floor(totalFocusMinutes / 60);
  const totalMinutes = Math.round(totalFocusMinutes % 60);

  const calculateWeeklyHours = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return weekDays.map((day, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);

      const dayKey = getLocalDateKey(dayDate);
      const totalMins = typeof getDailyFocusMinutes === 'function'
        ? getDailyFocusMinutes(sessions, dayKey)
        : (sessions?.filter(s => (s.date ? getLocalDateKey(s.date) : (s.startedAt ? getLocalDateKey(s.startedAt) : null)) === dayKey)
            .reduce((sum, s) => sum + Number(s.durationMinutes || s.duration || 0), 0) || 0);

      const hours = totalMins / 60;
      return {
        day,
        date: dayDate,
        hours: Math.round(hours * 10) / 10,
        isToday: dayKey === todayKey,
        isFuture: compareDateKeys(dayKey, todayKey) > 0
      };
    });
  };

  const weeklyHours = calculateWeeklyHours();
  const maxWeeklyHours = Math.max(...weeklyHours.map(d => d.hours), 1);

  const scrollToTimeline = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8 pb-16">

      {/* ── TOP HERO & SCRIPTED IDENTITY ── */}
      <GrowthDevelopmentHero
        summary={summary}
        roadmap={effectiveRoadmap}
        selectedDomainId={selectedDomainId}
        onSelectDomain={setSelectedDomainId}
        onExploreTimeline={scrollToTimeline}
        activeViewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 1: GROWTH MIRROR (DEVELOPMENT OVER TIME)
          ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'growth' ? (
        <div className="space-y-8 anim-fade-in">

          {/* Section 1: Before → After Transformation Scrubber */}
          <GrowthBeforeAfter beforeAfterData={beforeAfterData} />

          {/* Section 2: Concrete Proof of Growth Cards */}
          <GrowthProofCards
            proofs={proofCards}
            onInspectEvidence={(proof) => {
              setSelectedEvidence({
                title: proof.title,
                conceptName: proof.conceptName,
                displayDate: 'Recorded Session',
                durationMinutes: proof.durationMinutes,
                explainWithoutNotes: 'yes',
                notes: proof.evidenceSnippet,
                worldConnection: 'Foundations → Core Principles'
              });
            }}
          />

          {/* Section 3: Truthful Developmental Signals (No Fake IQ) */}
          <GrowthSignalsBar
            focusSignals={focusSignals}
            recoverySignal={recoverySignal}
            independenceSignal={independenceSignal}
          />

          {/* Section 3.5: Observed Behavioral Patterns (Prompt #21 & #40) */}
          {adaptiveState?.hypotheses?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-coral-500 bg-coral-500/10 px-2.5 py-0.5 rounded-full border border-coral-500/20">
                    Observed Behavioral Patterns
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-mono text-slate-500">
                    Empirical Working Hypotheses
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  Non-diagnostic · Evidence-derived
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {adaptiveState.hypotheses.filter(h => h.status === 'supported' || h.status === 'candidate').map(h => (
                  <div key={h.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {h.statement}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                        {h.status === 'supported' ? 'Supported' : 'Candidate'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                      {h.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Practical Project Progression */}
          <GrowthProjectProgression
            projects={projectProgression}
            onInspectProject={(proj) => {
              setSelectedEvidence({
                title: `Build Progress: ${proj.name}`,
                conceptName: proj.name,
                displayDate: 'Practical Milestone',
                durationMinutes: 45,
                explainWithoutNotes: 'no',
                notes: `Advanced to ${proj.currentStage} stage in roadmap progression.`,
                worldConnection: `${proj.subjectName} → Hardware Engineering`
              });
            }}
          />

          {/* Section 5: Primary Development Timeline */}
          <div ref={timelineRef}>
            <GrowthTimeline
              events={timelineEvents}
              onSelectEvent={setSelectedEvidence}
            />
          </div>

        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           VIEW 2: ACTIVITY ARCHIVE ("WHAT HAVE I DONE?")
           Historical logs, weekly hours, and raw task metrics
           ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-8 anim-fade-in">

          <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Archive className="w-4 h-4 text-slate-500" />
              <span>
                Activity Archive preserves historical time records and numerical task tallies.
              </span>
            </div>
            <button
              onClick={() => setViewMode('growth')}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              ← Return to Growth Mirror
            </button>
          </div>

          {/* Key Numerical Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Flame className="w-8 h-8 text-orange-500" />
                <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{streak}</span>
              </div>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Learning Streak (days)</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <Clock className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{totalHours}h {totalMinutes}m</span>
              </div>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Total Study Time</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-green-500" />
                <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{stats.completedSubtasks}</span>
              </div>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Completed Tasks</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-purple-500" />
                <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{stats.completionRate}%</span>
              </div>
              <div className="text-sm font-bold text-slate-600 dark:text-slate-400">Completion Rate</div>
            </div>
          </div>

          {/* Daily Goals Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-500" />
              Daily Goal Performance
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-3xl font-black text-indigo-600 font-mono">{dailyGoalStats.currentStreak}</div>
                <div className="text-xs font-mono text-slate-500 mt-1">Current Goal Streak</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-3xl font-black text-emerald-600 font-mono">{dailyGoalStats.recentRate}%</div>
                <div className="text-xs font-mono text-slate-500 mt-1">Last 7 Days</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-3xl font-black text-blue-600 font-mono">{dailyGoalStats.achievementRate}%</div>
                <div className="text-xs font-mono text-slate-500 mt-1">All Time Target Met</div>
              </div>
            </div>

            {/* Last 7 Days Chart */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Last 7 Days Performance</h3>
              <div className="space-y-2">
                {dailyGoalStats.recent7Days.map((day) => {
                  const date = parseLocalDateKey(day.date) || new Date(day.date);
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const percentage = day.targetMinutes > 0 ? Math.round((day.actualMinutes / day.targetMinutes) * 100) : 0;

                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-12 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{dayName}</div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-5 relative overflow-hidden">
                        <div
                          className={`h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                            day.achieved ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        >
                          {percentage > 20 && `${percentage}%`}
                        </div>
                      </div>
                      <div className="w-16 text-xs font-mono text-slate-500 text-right">
                        {Math.round(day.actualMinutes / 60 * 10) / 10}h
                      </div>
                      {day.achieved && (
                        <div className="w-5 h-5 text-emerald-500">
                          <Target className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weekly Hours Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Weekly Study Hours
            </h3>

            <div className="space-y-3">
              {weeklyHours.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                    {day.day}
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-5 relative overflow-hidden">
                    {!day.isFuture && (
                      <div
                        className="bg-blue-600 h-5 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${maxWeeklyHours > 0 ? (day.hours / maxWeeklyHours) * 100 : 0}%` }}
                      >
                        <span className="text-[10px] font-mono text-white font-bold">{day.hours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Total this week:</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {weeklyHours.filter(d => !d.isFuture).reduce((sum, day) => sum + day.hours, 0)} hours
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ── EVIDENCE DEEP-DIVE MODAL ── */}
      {selectedEvidence && (
        <GrowthEvidenceModal
          event={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}

    </div>
  );
};

export default StatisticsPage;
