/**
 * ArchiveLivingTimeline.jsx
 *
 * Living chronological stream of curated artifacts.
 * Groups artifacts by Month and Year, preserving personal history.
 */

import React from 'react';
import { Calendar, Compass, PlusCircle } from 'lucide-react';
import ArchiveArtifactCard from './ArchiveArtifactCard';

const ArchiveLivingTimeline = ({
  artifacts = [],
  onSelectArtifact,
  onTogglePin,
  onStartSomething
}) => {
  // Empty State (Section 26: inviting, not depressing)
  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm anim-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500 mx-auto">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
            Your first meaningful work will appear here.
          </h3>
          <p className="text-xs text-slate-500 font-mono max-w-md mx-auto leading-relaxed">
            Your first meaningful builds, reflections, and conceptual milestones will automatically be preserved here.
          </p>
        </div>

        {onStartSomething && (
          <div className="pt-2">
            <button
              onClick={onStartSomething}
              className="btn-tactile-coral px-6 py-2.5 text-xs font-mono font-bold flex items-center gap-2 mx-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>START SOMETHING</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Group artifacts by monthGroup
  const groups = artifacts.reduce((acc, art) => {
    const grp = art.monthGroup || 'EARLIER';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(art);
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      {Object.entries(groups).map(([monthGroup, groupArtifacts]) => (
        <section key={monthGroup} className="space-y-6">

          {/* Month Marker Banner */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-black tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>{monthGroup}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({groupArtifacts.length} artifact{groupArtifacts.length === 1 ? '' : 's'})
            </span>
          </div>

          {/* Living Stream Grid */}
          <div className="space-y-6">
            {groupArtifacts.map((art) => (
              <ArchiveArtifactCard
                key={art.id}
                artifact={art}
                onInspect={onSelectArtifact}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>

        </section>
      ))}
    </div>
  );
};

export default ArchiveLivingTimeline;
