/**
 * TrajectoryDestinationHero.jsx
 *
 * Top Centerpiece of TRAJECTORY:
 *
 * Features:
 * - Dynamic Interest Addition (User Request):
 *   Add multiple custom interests, secondary targets, and concepts (e.g. 10 concepts)
 * - Strict Primary vs Secondary Invariant:
 *   Exactly ONE interest is marked Primary. All other interests are classified as Secondary.
 *   One-click promotion ("★ Mark as Primary") automatically moves the former Primary to Secondary.
 * - Quick Roadmap Concept Suggestions:
 *   Pre-populates concepts and topics directly from the learner's active roadmap tasks.
 * - Multi-Trajectory Selector:
 *   Covers All (UNIFIED) vs Primary Goal vs Secondary Targets with clear visual badges.
 * - Fully User-Owned Destination:
 *   Editable Target Role, Target Organization, Target Industry, Timeframe, and Reason ("Why").
 * - Honest grounded metrics (Prompts #3, #6):
 *   Capabilities developing, demonstrated with real evidence.
 * - Extensible Intent Modes (Prompt #15):
 *   Career, Academic, Research, Project, Mastery, Exploration.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Edit3,
  Check,
  Calendar,
  Building2,
  Globe,
  Star,
  Compass,
  Layers,
  Plus,
  X,
  Trash2,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { TRAJECTORY_MODES, DEFAULT_TRAJECTORIES } from '../utils/trajectoryResolver';

const ROLE_PRESETS = [
  'Embedded Systems Engineer',
  'Firmware & IoT Specialist',
  'Robotics & Motion Control Engineer',
  'Hardware Systems Architect',
  'Digital Signal Processing Engineer',
  'FPGA & Digital Systems Designer',
  'Computer Vision & Edge AI Specialist',
  'Master\'s Candidate in Electronics'
];

const TIMELINE_PRESETS = ['1 Month', '3 Months', '6 Months', 'June 2027', 'Continuous Mastery'];

const TrajectoryDestinationHero = ({
  destination = {},
  metrics = {},
  roadmap = [],
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
  const [promoteToPrimary, setPromoteToPrimary] = useState(false);

  // Modal State for Adding New Interest / Goal
  const [isAddingInterest, setIsAddingInterest] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newStatement, setNewStatement] = useState('');
  const [newTimeline, setNewTimeline] = useState('6 Months');
  const [newIndustry, setNewIndustry] = useState('Consumer Hardware & Robotics');
  const [newOrg, setNewOrg] = useState('Tier-1 Core Engineering');
  const [newMode, setNewMode] = useState('career');
  const [newIsPrimary, setNewIsPrimary] = useState(false);

  // Keep state in sync if parent changes active trajectory
  useEffect(() => {
    setPrimaryRole(destination.primaryRole || 'Embedded Systems Internship');
    setStatement(destination.statement || 'I want to become genuinely capable of building embedded systems.');
    setTargetTimeline(destination.targetTimeline || '2027 Placement');
    setOrganization(destination.organization || 'Tier-1 Core Engineering');
    setIndustry(destination.industry || 'Consumer Hardware & Robotics');
    setMode(destination.mode || 'career');
    setPromoteToPrimary(false);
  }, [destination]);

  const { demonstratedCount = 0, developingCount = 0 } = metrics;

  // Extract roadmap concepts for quick 1-click additions (e.g. 10 concepts)
  const roadmapConcepts = useMemo(() => {
    if (!Array.isArray(roadmap) || roadmap.length === 0) return [];
    const concepts = [];
    roadmap.forEach((subj) => {
      (subj.phases || []).forEach((ph) => {
        (ph.tasks || []).forEach((tk) => {
          if (tk.name) {
            concepts.push({
              name: tk.name,
              domain: subj.name || 'Core Domain',
              subjectId: subj.id
            });
          }
        });
      });
      (subj.competencies || []).forEach((comp) => {
        if (comp.name) {
          concepts.push({
            name: comp.name,
            domain: subj.name || 'Core Domain',
            subjectId: subj.id
          });
        }
      });
    });

    const seen = new Set();
    return concepts
      .filter((c) => {
        const lower = c.name.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .slice(0, 10);
  }, [roadmap]);

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
      mode,
      setAsPrimary: promoteToPrimary
    });
    setIsEditing(false);
    setPromoteToPrimary(false);
  };

  const handleSwitchTrajectory = (trajId) => {
    const selected = trajectories.find((t) => t.id === trajId);
    if (selected) {
      setPrimaryRole(selected.role);
      setStatement(selected.statement);
      setTargetTimeline(selected.timeline);
      setOrganization(selected.organization || 'Tier-1 Core Engineering');
      setIndustry(selected.industry || 'Consumer Hardware & Robotics');
      setMode(selected.mode || 'career');
      setPromoteToPrimary(false);

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

  const handleSetAsPrimary = (trajId) => {
    onUpdateDestination({
      action: 'SET_PRIMARY',
      setPrimaryId: trajId
    });
  };

  const handleRemoveTrajectory = (trajId) => {
    onUpdateDestination({
      action: 'REMOVE_TRAJECTORY',
      removeTrajectoryId: trajId
    });
  };

  const handleAddInterestSubmit = (e) => {
    if (e) e.preventDefault();
    if (!newRole.trim()) return;

    onUpdateDestination({
      action: 'ADD_TRAJECTORY',
      newTrajectory: {
        role: newRole.trim(),
        statement: newStatement.trim() || `Develop genuine capability and first-principles mastery in ${newRole.trim()}.`,
        timeline: newTimeline.trim() || 'Flexible Horizon',
        industry: newIndustry.trim() || 'Applied Engineering',
        organization: newOrg.trim() || 'Self-Directed Lab',
        mode: newMode,
        setAsPrimary: newIsPrimary
      }
    });

    setIsAddingInterest(false);
    setNewRole('');
    setNewStatement('');
    setNewTimeline('6 Months');
    setNewIndustry('Consumer Hardware & Robotics');
    setNewOrg('Tier-1 Core Engineering');
    setNewMode('career');
    setNewIsPrimary(false);
  };

  const handleSelectConceptSuggestion = (concept) => {
    setNewRole(concept.name);
    setNewStatement(`Develop verified unassisted capability and first-principles mastery in ${concept.name}.`);
    setNewIndustry(concept.domain || 'Applied Engineering');
  };

  const activeTraj = trajectories.find((t) => t.id === activeTrajectoryId) || trajectories[0];
  const isCurrentTrajPrimary = activeTraj?.type === 'PRIMARY';
  const isCurrentTrajSecondary = activeTraj?.type === 'SECONDARY' || activeTraj?.type === 'CURRENT' || activeTraj?.type === 'TRACK';

  return (
    <section className="relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden anim-fade-in space-y-6">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-500/10 via-electric-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── MULTI-TRAJECTORY SELECTOR TABS ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-violet-500" />
            Trajectory Scope:
          </span>

          {trajectories.map((traj) => {
            const isActive = traj.id === activeTrajectoryId;
            const isPrimary = traj.type === 'PRIMARY';
            const isUnified = traj.type === 'UNIFIED';

            return (
              <div
                key={traj.id}
                className={`group inline-flex items-center rounded-xl transition-all ${
                  isActive
                    ? isPrimary
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/40'
                      : 'bg-violet-600 text-white shadow-sm ring-2 ring-violet-500/30'
                    : isPrimary
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSwitchTrajectory(traj.id)}
                  className="px-3 py-1.5 text-xs font-sans font-semibold flex items-center gap-1.5"
                >
                  {isUnified && <Layers className="w-3.5 h-3.5 text-cyan-300" />}
                  {isPrimary && <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />}
                  {traj.type === 'CURRENT' && <Target className="w-3.5 h-3.5 text-emerald-400" />}
                  {traj.type === 'SECONDARY' && <Compass className="w-3.5 h-3.5 text-electric-400" />}
                  {traj.type === 'TRACK' && <Compass className="w-3.5 h-3.5 text-blue-400" />}

                  <span
                    className={`text-xs font-sans font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-black/25 text-white'
                        : isPrimary
                        ? 'bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isUnified ? 'COVERS ALL' : isPrimary ? 'PRIMARY' : 'SECONDARY'}
                  </span>

                  <span className="opacity-95 font-sans font-medium max-w-[180px] sm:max-w-[220px] truncate">
                    {traj.role}
                  </span>
                </button>

                {/* Remove button for user-added secondary interests */}
                {traj.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTrajectory(traj.id);
                    }}
                    className={`pr-2 pl-0.5 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'text-white/70 hover:text-white'
                        : 'text-slate-400 hover:text-rose-500 dark:hover:text-rose-400'
                    }`}
                    title="Remove interest from scope"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* + Add Interest Button */}
          <button
            type="button"
            onClick={() => setIsAddingInterest(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-sans font-semibold bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-dashed border-violet-300 dark:border-violet-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Add new secondary interest or concept to scope"
          >
            <Plus className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Add Interest</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (isEditing) handleSave();
            else setIsEditing(true);
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all flex items-center gap-1.5 ${
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

      {/* ── SCOPE CONTEXT BANNER ── */}
      <div className="relative z-10 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5 text-slate-700 dark:text-slate-300">
          {activeTrajectoryId === 'unified' ? (
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Layers className="w-4 h-4" />
            </div>
          ) : isCurrentTrajPrimary ? (
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-electric-500/10 text-electric-600 dark:text-electric-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Compass className="w-4 h-4" />
            </div>
          )}

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white">
                {activeTrajectoryId === 'unified' && 'All Tracks (Unified Synthesis)'}
                {isCurrentTrajPrimary && 'Primary Target (Master Vision)'}
                {!isCurrentTrajPrimary && activeTrajectoryId !== 'unified' && 'Secondary Target Scope'}
              </span>

              <span
                className={`text-xs font-sans px-2.5 py-0.5 rounded-md font-semibold tracking-wide ${
                  isCurrentTrajPrimary
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                    : 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                }`}
              >
                {activeTrajectoryId === 'unified'
                  ? 'Cross-Domain'
                  : isCurrentTrajPrimary
                  ? 'Single Primary Vision'
                  : 'Secondary Pursuit'}
              </span>
            </div>

            <p className="text-xs font-sans text-slate-500 dark:text-slate-400 leading-snug">
              {activeTrajectoryId === 'unified' &&
                'Synthesizing capabilities, milestones, and evidence across all active domains simultaneously. Covers your whole learning trajectory.'}
              {isCurrentTrajPrimary &&
                `Your single primary destination (${primaryRole}). Only 1 primary goal is active; all other interests fall under secondary.`}
              {!isCurrentTrajPrimary &&
                activeTrajectoryId !== 'unified' &&
                `Focused capability map for "${primaryRole}". Classified under secondary interests to keep your primary vision clear.`}
            </p>
          </div>
        </div>

        {/* Action Controls for Active Trajectory */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* If viewing a secondary interest, offer 1-click promotion to Primary */}
          {isCurrentTrajSecondary && (
            <button
              type="button"
              onClick={() => handleSetAsPrimary(activeTrajectoryId)}
              className="px-3 py-1.5 rounded-xl text-xs font-sans font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Promote this interest to your single Primary vision"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>Mark as Primary</span>
            </button>
          )}

          {/* Delete custom secondary interest */}
          {activeTraj?.isCustom && (
            <button
              type="button"
              onClick={() => handleRemoveTrajectory(activeTrajectoryId)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-sans font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1"
              title="Remove this interest from scope"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}

          {activeTrajectoryId !== 'unified' && trajectories.some((t) => t.id === 'unified') && (
            <button
              type="button"
              onClick={() => handleSwitchTrajectory('unified')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-sans font-semibold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 border border-violet-300 dark:border-violet-700/50 transition-colors"
            >
              Switch to Covers All →
            </button>
          )}
        </div>
      </div>

      {/* ── DESTINATION DETAILS ROW ── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 max-w-2xl flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans font-semibold text-slate-500 dark:text-slate-400">
              {isCurrentTrajPrimary ? 'Primary Target Vision' : 'Secondary Pursuit Focus'}
            </span>
            {!isCurrentTrajPrimary && (
              <span className="text-xs font-sans font-semibold px-2.5 py-0.5 rounded-md bg-electric-50 dark:bg-electric-950/40 text-electric-700 dark:text-electric-300 border border-electric-200 dark:border-electric-800">
                Secondary
              </span>
            )}
          </div>

          {/* Role Header */}
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 block mb-1">
                    Target Role or Concept
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
                        className="px-2.5 py-1 rounded-lg text-xs font-sans font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-violet-400 border border-slate-200 dark:border-slate-700"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason "Why" (Prompt #4) */}
                <div>
                  <label className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 block mb-1">
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
                    <label className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Timeframe:
                    </label>
                    <input
                      type="text"
                      value={targetTimeline}
                      onChange={(e) => setTargetTimeline(e.target.value)}
                      placeholder="e.g. June 2027"
                      className="w-full text-xs font-sans px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Target Organization:
                    </label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. Core Engineering / Tier-1"
                      className="w-full text-xs font-sans px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Target Industry:
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Consumer Hardware & Robotics"
                      className="w-full text-xs font-sans px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {/* Promote to Primary Checkbox in Edit Mode */}
                {!isCurrentTrajPrimary && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-sans font-semibold text-amber-900 dark:text-amber-200">
                      <input
                        type="checkbox"
                        checked={promoteToPrimary}
                        onChange={(e) => setPromoteToPrimary(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-400"
                      />
                      <span>Mark as Primary Target (demotes current primary to secondary)</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight uppercase">
                  {primaryRole}
                </h1>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 font-serif italic leading-relaxed">
                  "{statement}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Badges & Metrics */}
        {!isEditing && (
          <div className="relative z-10 shrink-0 flex flex-col items-start md:items-end gap-2 text-xs font-sans">
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
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{demonstratedCount} Demonstrated</span>
              <span>·</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{developingCount} Developing</span>
            </div>
          </div>
        )}
      </div>

      {/* ── INTENT MODE SWITCHER (Prompt #15) ── */}
      <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-sans font-medium text-slate-500 dark:text-slate-400 shrink-0">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-sans font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── ADD INTEREST / CONCEPT MODAL ── */}
      {isAddingInterest && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 anim-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">
                    Add Interest to Trajectory Scope
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Track multiple secondary interests or concepts. Exactly 1 goal remains Primary.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingInterest(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestions from Roadmap Concepts */}
            {roadmapConcepts.length > 0 && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs font-sans font-semibold text-slate-700 dark:text-slate-300">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Quick-Add from Active Roadmap Concepts:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {roadmapConcepts.map((concept, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectConceptSuggestion(concept)}
                      className="px-2.5 py-1 rounded-lg text-xs font-sans font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-violet-400 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 active:scale-95"
                    >
                      <span>{concept.name}</span>
                      <span className="text-xs font-serif italic text-slate-400">({concept.domain})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleAddInterestSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-sans font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Interest / Target Role / Concept Name *
                </label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. FPGA & RTL Digital Design, Robotics Motion Control"
                  className="w-full text-sm font-sans font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-sans font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Why this matters (Context & Purpose)
                </label>
                <textarea
                  rows={2}
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  placeholder="e.g. Master digital state machines, timing closure, and authentic hardware synthesis..."
                  className="w-full text-xs font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-sans font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Target Timeframe
                  </label>
                  <input
                    type="text"
                    value={newTimeline}
                    onChange={(e) => setNewTimeline(e.target.value)}
                    placeholder="e.g. 6 Months, Dec 2026"
                    className="w-full text-xs font-sans px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {TIMELINE_PRESETS.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewTimeline(t)}
                        className="text-xs font-sans px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-sans font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Industry / Domain
                  </label>
                  <input
                    type="text"
                    value={newIndustry}
                    onChange={(e) => setNewIndustry(e.target.value)}
                    placeholder="e.g. Consumer Hardware & Robotics"
                    className="w-full text-xs font-sans px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Intent Mode Selection */}
              <div>
                <label className="text-xs font-sans font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                  Intent Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TRAJECTORY_MODES.map((m) => {
                    const isSelected = newMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNewMode(m.id)}
                        className={`p-2 rounded-xl text-left border transition-all text-xs font-sans ${
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-500 text-violet-900 dark:text-violet-200 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span>{m.icon}</span>
                          <span className="font-bold">{m.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* The Single Primary Toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsPrimary}
                    onChange={(e) => setNewIsPrimary(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                      Mark as Primary Target
                    </span>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300/80 block">
                      If checked, this interest becomes your single Primary vision. Your current Primary will automatically move under Secondary.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingInterest(false)}
                  className="px-4 py-2 rounded-xl text-xs font-sans font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRole.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-sans font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                >
                  <span>Add to Scope</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default TrajectoryDestinationHero;
