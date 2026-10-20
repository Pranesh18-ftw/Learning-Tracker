/**
 * IdentityDestinationCard.jsx
 *
 * First Section: DESTINATION
 * "WHAT ARE YOU BUILDING TOWARD?"
 * Natural phrasing: "I am currently working toward [X] because [Y]"
 * Dominant primary goal + supporting secondary goals + career context.
 */

import React, { useState } from 'react';
import { Compass, Edit3, Check, Plus, X, Briefcase } from 'lucide-react';

const GOAL_PRESETS = [
  'Embedded Systems Internship',
  'Campus Engineering Placement',
  'Master\'s Degree Preparation',
  'Physical Hardware Build Project',
  'Signals & Systems Exam Mastery',
  'Autonomous Robotics Research',
  'Hardware Startup Prototype',
  'Personal First-Principles Mastery'
];

const IdentityDestinationCard = ({
  destination = {},
  onUpdateDestination
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [primaryGoal, setPrimaryGoal] = useState(destination.primaryGoal || 'Embedded Systems Internship');
  const [statement, setStatement] = useState(destination.statement || 'I want to become genuinely capable of building embedded systems.');
  const [targetRole, setTargetRole] = useState(destination.targetRole || 'Embedded Systems Engineer');
  const [industry, setIndustry] = useState(destination.industry || 'Consumer & Industrial Hardware');
  const [targetTimeline, setTargetTimeline] = useState(destination.targetTimeline || '2027 Placement');
  const [secondaryGoals, setSecondaryGoals] = useState(destination.secondaryGoals || [
    'Build real physical hardware',
    'Understand electronics deeply from first principles'
  ]);
  const [newSecondaryInput, setNewSecondaryInput] = useState('');
  const [showCareerDetails, setShowCareerDetails] = useState(false);

  const handleSave = () => {
    onUpdateDestination({
      ...destination,
      primaryGoal,
      statement,
      targetRole,
      industry,
      targetTimeline,
      secondaryGoals
    });
    setIsEditing(false);
  };

  const handleAddSecondary = () => {
    if (!newSecondaryInput.trim()) return;
    setSecondaryGoals([...secondaryGoals, newSecondaryInput.trim()]);
    setNewSecondaryInput('');
  };

  const handleRemoveSecondary = (index) => {
    setSecondaryGoals(secondaryGoals.filter((_, idx) => idx !== index));
  };

  const handleSelectPreset = (preset) => {
    setPrimaryGoal(preset);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-electric-500/10 text-electric-600 dark:text-electric-400 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Section 01 · Destination
            </span>
            <h2 className="font-display font-black text-xl text-slate-900 dark:text-white tracking-tight">
              What are you building toward?
            </h2>
          </div>
        </div>

        <button
          onClick={() => {
            if (isEditing) handleSave();
            else setIsEditing(true);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
            isEditing
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save Goal</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Goal</span>
            </>
          )}
        </button>
      </div>

      {/* Natural Phrasing Display / Edit Container */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">

        {/* Natural Phrasing: "I am currently working toward..." */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            I am currently working toward:
          </label>
          {isEditing ? (
            <input
              type="text"
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value)}
              className="w-full text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-electric-500 rounded-xl px-4 py-2 focus:outline-none"
              placeholder="e.g. Embedded Systems Internship"
            />
          ) : (
            <div className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {primaryGoal}
            </div>
          )}
        </div>

        {/* Natural Phrasing: "because..." */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            because:
          </label>
          {isEditing ? (
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={2}
              className="w-full text-sm font-sans text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-electric-500"
              placeholder="What makes this goal genuinely meaningful to you?"
            />
          ) : (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 font-sans italic leading-relaxed">
              "{statement}"
            </p>
          )}
        </div>

        {/* Preset suggestions in edit mode */}
        {isEditing && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                    primaryGoal === preset
                      ? 'bg-electric-500 text-white font-bold'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-electric-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Secondary Goals (Supporting Desires) */}
      <div className="space-y-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Supporting Goals & Capabilities:
        </span>
        <div className="flex flex-wrap gap-2">
          {secondaryGoals.map((sec, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-2"
            >
              <span>{sec}</span>
              {isEditing && (
                <button
                  onClick={() => handleRemoveSecondary(idx)}
                  className="text-slate-400 hover:text-coral-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))}

          {isEditing && (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newSecondaryInput}
                onChange={(e) => setNewSecondaryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSecondary();
                  }
                }}
                placeholder="+ Add supporting goal"
                className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-electric-500"
              />
              <button
                type="button"
                onClick={handleAddSecondary}
                className="p-1.5 rounded-xl bg-electric-50 dark:bg-electric-950/40 text-electric-600 dark:text-electric-400 border border-electric-300 dark:border-electric-700/60"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Optional Career Context Accordion */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowCareerDetails(!showCareerDetails)}
          className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5"
        >
          <Briefcase className="w-3.5 h-3.5 text-violet-500" />
          <span>{showCareerDetails ? 'Hide Career & Timeline Context' : 'Show Career & Timeline Context (Optional)'}</span>
        </button>

        {showCareerDetails && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-violet-50/40 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Target Role
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full text-xs font-mono p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              ) : (
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{targetRole}</span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Industry Field
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full text-xs font-mono p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              ) : (
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{industry}</span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Target Milestone
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={targetTimeline}
                  onChange={(e) => setTargetTimeline(e.target.value)}
                  className="w-full text-xs font-mono p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
              ) : (
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{targetTimeline}</span>
              )}
            </div>
          </div>
        )}
      </div>

    </section>
  );
};

export default IdentityDestinationCard;
