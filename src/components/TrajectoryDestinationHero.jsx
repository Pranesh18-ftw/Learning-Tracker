/**
 * TrajectoryDestinationHero.jsx
 *
 * Top Centerpiece of TRAJECTORY:
 *
 * Features:
 * - Multi-Trajectory Selector (Prompt #14):
 *   Primary vs Secondary vs Project with visual prominence
 * - Fully User-Owned Destination (Prompt #4):
 *   Editable Target Role, Target Organization, Target Industry, Timeframe, and Reason ("Why")
 * - Honest grounded metrics (Prompts #3, #6):
 *   Capabilities developing, demonstrated with real evidence
 * - Extensible Intent Modes (Prompt #15):
 *   Career, Academic, Research, Project, Mastery, Exploration
 */

import React, { useState, useEffect } from 'react';
import { Target, Edit3, Check, Calendar, Building2, Globe, Star, Sparkles } from 'lucide-react';
import { TRAJECTORY_MODES, DEFAULT_TRAJECTORIES } from '../utils/trajectoryResolver';

const ROLE_PRESETS = [
  'Embedded Systems Engineer',
  'Firmware & IoT Specialist',
  'Robotics & Motion Control Engineer',
  'Hardware Systems Architect',
  'Digital Signal Processing Engineer',
  'Master\'s Candidate in Electronics'
];

const TrajectoryDestinationHero = ({
  destination = {},
  metrics = {},
  onUpdateDestination
}) => {
  const trajectories = destination.trajectories || DEFAULT_TRAJECTORIES;
  const activeTrajectoryId = destination.activeTrajectoryId || 'primary';

  const [isEditing, setIsEditing] = useState(false);
  const [primaryRole, setPrimaryRole] = useState(destination.primaryRole || 'Embedded Systems Internship');
  const [statement, setStatement] = useState(destination.statement || 'I want to become genuinely capable of building embedded systems.');
  const [targetTimeline, setTargetTimeline] = useState(destination.targetTimeline || '2027 Placement');
  const [organization, setOrganization] = useState(destination.organization || 'Tier-1 Core Engineering');
  const [industry, setIndustry] = useState(destination.industry || 'Consumer Hardware & Robotics');
  const [mode, setMode] = useState(destination.mode || 'career');

  // Keep state in sync if parent changes active trajectory
  useEffect(() => {
    setPrimaryRole(destination.primaryRole || 'Embedded Systems Internship');
    setStatement(destination.statement || 'I want to become genuinely capable of building embedded systems.');
    setTargetTimeline(destination.targetTimeline || '2027 Placement');
    setOrganization(destination.organization || 'Tier-1 Core Engineering');
    setIndustry(destination.industry || 'Consumer Hardware & Robotics');
    setMode(destination.mode || 'career');
  }, [destination]);

  const { demonstratedCount = 0, developingCount = 0 } = metrics;

  const handleSave = () => {
    onUpdateDestination({
      activeTrajectoryId,
      primaryRole,
      role: primaryRole,
      statement,
      targetTimeline,
      timeline: targetTimeline,
      organization,
      industry,
      mode
    });
    setIsEditing(false);
  };

  const handleSwitchTrajectory = (trajId) => {
    const selected = trajectories.find(t => t.id === trajId);
    if (selected) {
      setPrimaryRole(selected.role);
      setStatement(selected.statement);
      setTargetTimeline(selected.timeline);
      setOrganization(selected.organization || 'Tier-1 Core Engineering');
      setIndustry(selected.industry || 'Consumer Hardware & Robotics');
      setMode(selected.mode || 'career');

      onUpdateDestination({
        activeTrajectoryId: selected.id,
        primaryRole: selected.role,
        role: selected.role,
        statement: selected.statement,
        targetTimeline: selected.timeline,
        timeline: selected.timeline,
        organization: selected.organization,
        industry: selected.industry,
        mode: selected.mode
      });
    }
  };

  return (
    <section className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden anim-fade-in space-y-6">

      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/10 via-electric-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── MULTI-TRAJECTORY SELECTOR TABS (Prompt #14) ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Target className="w-3 h-3 text-violet-500" />
            Trajectory Scope:
          </span>

          {trajectories.map((traj) => {
            const isActive = traj.id === activeTrajectoryId;
            return (
              <button
                key={traj.id}
                type="button"
                onClick={() => handleSwitchTrajectory(traj.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-sm ring-2 ring-violet-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {traj.type === 'PRIMARY' && <Star className="w-3 h-3 text-amber-300 fill-amber-300" />}
                {traj.type === 'SECONDARY' && <Sparkles className="w-3 h-3 text-electric-400" />}
                {traj.type === 'PROJECT' && <Target className="w-3 h-3 text-emerald-400" />}
                <span className="text-[10px] font-black uppercase">{traj.type}</span>
                <span className="opacity-90">· {traj.role}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            if (isEditing) handleSave();
            else setIsEditing(true);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
            isEditing
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Destination</span>
            </>
          )}
        </button>
      </div>

      {/* ── DESTINATION DETAILS ROW ── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">

        <div className="space-y-3 max-w-2xl flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">
              Where are you trying to go?
            </span>
          </div>

          {/* Role Header */}
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Target Role or Destination
                  </label>
                  <input
                    type="text"
                    value={primaryRole}
                    onChange={(e) => setPrimaryRole(e.target.value)}
                    className="w-full text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border-2 border-violet-500 rounded-2xl px-4 py-2 focus:outline-none"
                    placeholder="e.g. Embedded Systems Engineer"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {ROLE_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrimaryRole(p)}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-violet-400 border border-slate-200 dark:border-slate-700"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason "Why" (Prompt #4) */}
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Why (Gives the system context):
                  </label>
                  <textarea
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    rows={2}
                    placeholder="I want to build real embedded systems and be ready for interviews..."
                    className="w-full text-xs font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Timeline, Organization, Industry in Edit Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Timeframe:
                    </label>
                    <input
                      type="text"
                      value={targetTimeline}
                      onChange={(e) => setTargetTimeline(e.target.value)}
                      placeholder="e.g. June 2027"
                      className="w-full text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Target Organization:
                    </label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. Core Engineering / Tier-1"
                      className="w-full text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Target Industry:
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Consumer Hardware & Robotics"
                      className="w-full text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-2">
                <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight uppercase">
                  {primaryRole}
                </h1>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 font-sans italic leading-relaxed">
                  "{statement}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Badges & Metrics */}
        {!isEditing && (
          <div className="relative z-10 shrink-0 flex flex-col items-start md:items-end gap-2 text-xs font-mono">

            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-violet-500" />
              <span>Target: {targetTimeline}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-electric-500" />
              <span>{organization}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>{industry}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 mt-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{demonstratedCount} Demonstrated</span>
              <span>·</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{developingCount} Developing</span>
            </div>

          </div>
        )}

      </div>

      {/* ── INTENT MODE SWITCHER (Prompt #15) ── */}
      <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0">
          Intent Mode:
        </span>
        {TRAJECTORY_MODES.map((m) => {
          const isSelected = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                if (!isEditing) {
                  onUpdateDestination({ mode: m.id });
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

    </section>
  );
};

export default TrajectoryDestinationHero;
