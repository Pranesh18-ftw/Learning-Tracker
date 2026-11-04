/**
 * ArchivePinnedShelf.jsx
 *
 * "MY IMPORTANT WORK"
 * Dedicated shelf for the learner's most prized and pinned artifacts.
 */

import React from 'react';
import { Star, Pin, ArrowRight, Cpu, Award, BookOpen, Repeat } from 'lucide-react';

const ArchivePinnedShelf = ({ pinnedArtifacts = [], onSelectArtifact, onUnpinArtifact }) => {
  if (!pinnedArtifacts || pinnedArtifacts.length === 0) return null;

  const resolveTypeIcon = (type) => {
    switch (type) {
      case 'project': return Cpu;
      case 'evidence': return Award;
      case 'concept': return BookOpen;
      case 'recovery': return Repeat;
      default: return Pin;
    }
  };

  return (
    <section className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-300 dark:border-amber-700/60 rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm anim-fade-in">

      {/* Shelf Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-current" />
          <h2 className="font-display font-black text-lg sm:text-xl text-slate-900 dark:text-white uppercase tracking-tight">
            My Important Work
          </h2>
          <span className="text-xs font-mono text-amber-700 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg">
            {pinnedArtifacts.length} Kept
          </span>
        </div>

        <span className="text-xs font-mono text-slate-500 hidden sm:block">
          Personal highlights pinned to hold onto
        </span>
      </div>

      {/* Pinned Artifacts Horizontal Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pinnedArtifacts.map((art) => {
          const Icon = resolveTypeIcon(art.type);

          return (
            <div
              key={art.id}
              role="button"
              tabIndex={0}
              aria-label={`View artifact: ${art.title}`}
              onClick={() => onSelectArtifact && onSelectArtifact(art)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectArtifact && onSelectArtifact(art);
                }
              }}
              className="group relative bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 space-y-3 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Top metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    <span>{art.type}</span>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpinArtifact && onUnpinArtifact(art.id);
                    }}
                    title="Unpin from Important Work"
                    aria-label={`Unpin ${art.title} from Important Work`}
                    className="text-amber-400 hover:text-slate-400 text-xs transition-colors p-1"
                  >
                    ★
                  </button>
                </div>

                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                  {art.title}
                </h3>
              </div>

              {/* Bottom snippet and date */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">
                  {art.displayDate.split(' ').slice(0, 2).join(' ')}
                </span>

                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Inspect <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
};

export default ArchivePinnedShelf;
