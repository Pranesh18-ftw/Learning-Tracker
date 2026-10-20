/**
 * OpenInContextLinks.jsx
 *
 * Reusable "Open in Context" Action Strip (Prompt #20)
 *
 * Connects any learning object across the 8 application surfaces:
 * [ Launch in Now ] · [ View in World ] · [ View in Path ] · [ View Evidence ] · [ Check Trajectory ]
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Map, Compass, Award, Target } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

const OpenInContextLinks = ({
  item,
  compact = false,
  showNow = true,
  showWorld = true,
  showPath = true,
  showArchive = true,
  showTrajectory = true,
  onAfterNavigate
}) => {
  const navigate = useNavigate();
  const roadmapContext = useRoadmap();
  const selectLearningContext = roadmapContext?.selectLearningContext;

  if (!item) return null;

  const handleAction = (route, setContext = false) => {
    if (setContext && selectLearningContext) {
      selectLearningContext({
        id: item.id || item.taskId || item.subtaskId,
        subtaskId: item.subtaskId || (item.taskId && item.id !== item.taskId ? item.id : null),
        taskId: item.taskId || item.id,
        name: item.name || item.taskName,
        taskName: item.taskName || item.name,
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        phaseId: item.phaseId,
        phaseName: item.phaseName
      });
    }

    if (onAfterNavigate) {
      onAfterNavigate();
    }
    navigate(route);
  };

  const btnBaseClass = compact
    ? "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 border shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
    : "px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border shadow-2xs hover:scale-105 active:scale-95 cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {showNow && (
        <button
          type="button"
          onClick={() => handleAction('/', true)}
          className={`${btnBaseClass} bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500`}
          title="Launch this concept in the Now workspace"
        >
          <Zap className="w-3 h-3 text-amber-300 fill-current" />
          <span>Launch in Now</span>
        </button>
      )}

      {showWorld && (
        <button
          type="button"
          onClick={() => handleAction('/roadmap', true)}
          className={`${btnBaseClass} bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-violet-600 border-slate-200 dark:border-slate-700 hover:border-violet-400`}
          title="Locate this concept inside the World landscape"
        >
          <Map className="w-3 h-3 text-violet-500" />
          <span>View in World</span>
        </button>
      )}

      {showPath && (
        <button
          type="button"
          onClick={() => handleAction('/learning-plan', true)}
          className={`${btnBaseClass} bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-electric-600 border-slate-200 dark:border-slate-700 hover:border-electric-400`}
          title="View scheduled route in Path"
        >
          <Compass className="w-3 h-3 text-electric-500" />
          <span>View in Path</span>
        </button>
      )}

      {showArchive && (
        <button
          type="button"
          onClick={() => handleAction('/achievements', false)}
          className={`${btnBaseClass} bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 border-slate-200 dark:border-slate-700 hover:border-emerald-400`}
          title="Inspect evidence in Archive"
        >
          <Award className="w-3 h-3 text-emerald-500" />
          <span>View Evidence</span>
        </button>
      )}

      {showTrajectory && (
        <button
          type="button"
          onClick={() => handleAction('/trajectory', false)}
          className={`${btnBaseClass} bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 border-slate-200 dark:border-slate-700 hover:border-amber-400`}
          title="Connect capability to career trajectory"
        >
          <Target className="w-3 h-3 text-amber-500" />
          <span>Trajectory</span>
        </button>
      )}
    </div>
  );
};

export default OpenInContextLinks;
