/**
 * AchievementsPage.jsx
 *
 * LEARNING TRACKER — ARCHIVE REDESIGN
 *
 * Purpose:
 * ARCHIVE is the user's personal record of work and transformation.
 * It is not an achievement list, an XP history, or a database table.
 *
 * "After six months, the user should be able to open Archive and think:
 * 'I remember doing this.'
 * 'I couldn't do this back then.'
 * 'This is becoming part of who I am.'"
 */

import React, { useState, useMemo } from 'react';
import { useRoadmap } from '../context/RoadmapContext';
import {
  Award,
  Target,
  Clock,
  Flame,
  Lock,
  CheckCircle,
  Archive as ArchiveIcon
} from 'lucide-react';
import { ACHIEVEMENTS } from '../services/achievementService';
import { safeStorageGet, safeStorageSet } from '../utils/storage';
import {
  buildArchiveArtifacts,
  filterArchiveArtifacts,
  calculateArchiveSummary
} from '../utils/archiveEvidenceResolver';
import { useNavigate } from 'react-router-dom';

import ArchiveIdentityHeader from '../components/ArchiveIdentityHeader';
import ArchivePinnedShelf from '../components/ArchivePinnedShelf';
import ArchiveLivingTimeline from '../components/ArchiveLivingTimeline';
import ArchiveMemoryMomentModal from '../components/ArchiveMemoryMomentModal';

const iconMap = {
  target: Target,
  clock: Clock,
  flame: Flame,
  award: Award,
  'check-circle': CheckCircle
};

const AchievementsPage = () => {
  const navigate = useNavigate();
  const {
    roadmap,
    subjects,
    sessions,
    taskCompletions,
    notes,
    unlockedAchievements,
    getStats,
    calculateStreak,
    getTotalLearningTime
  } = useRoadmap();

  // Active view: 'archive' (Living Museum) vs 'badges' (Legacy Badges)
  const [viewTab, setViewTab] = useState('archive');

  // Filter and search state
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');

  // Selected artifact for in-place "Memory Moment" modal
  const [selectedArtifact, setSelectedArtifact] = useState(null);

  // Pinned artifacts state with localStorage persistence (no fabricated default IDs)
  const [pinnedIds, setPinnedIds] = useState(() => {
    const stored = safeStorageGet('pinnedArchiveArtifactIds', []);
    return Array.isArray(stored) ? stored.filter(id => !id.startsWith('art-default-')) : [];
  });

  // Post-facto user annotations state with localStorage persistence
  const [annotations, setAnnotations] = useState(() => {
    return safeStorageGet('archiveAnnotations', {});
  });

  const effectiveRoadmap = roadmap && roadmap.length > 0 ? roadmap : subjects;

  // 1. Build all curated archive artifacts
  const allArtifacts = useMemo(() => {
    return buildArchiveArtifacts({
      roadmap: effectiveRoadmap,
      sessions,
      taskCompletions,
      notes,
      pinnedIds,
      annotations
    });
  }, [effectiveRoadmap, sessions, taskCompletions, notes, pinnedIds, annotations]);

  // 2. Filter artifacts
  const filteredArtifacts = useMemo(() => {
    return filterArchiveArtifacts(allArtifacts, {
      filter: activeFilter,
      searchQuery,
      domainFilter
    });
  }, [allArtifacts, activeFilter, searchQuery, domainFilter]);

  // 3. Pinned artifacts for the "MY IMPORTANT WORK" shelf
  const pinnedArtifacts = useMemo(() => {
    return allArtifacts.filter(a => a.isPinned);
  }, [allArtifacts]);

  // 4. Archive summary metrics for the header
  const summary = useMemo(() => {
    return calculateArchiveSummary(allArtifacts);
  }, [allArtifacts]);

  // Pin / Keep action toggle
  const handleTogglePin = (artifactId) => {
    setPinnedIds(prev => {
      const exists = prev.includes(artifactId);
      const next = exists ? prev.filter(id => id !== artifactId) : [...prev, artifactId];
      safeStorageSet('pinnedArchiveArtifactIds', next);
      return next;
    });
  };

  // User annotation save action
  const handleSaveAnnotation = (artifactId, noteText) => {
    setAnnotations(prev => {
      const next = { ...prev, [artifactId]: noteText };
      safeStorageSet('archiveAnnotations', next);
      return next;
    });
  };

  // Legacy badges calculation for secondary view
  const stats = getStats();
  const streak = calculateStreak();
  const totalTime = getTotalLearningTime();

  const achievements = useMemo(() => {
    return ACHIEVEMENTS.map(achievement => {
      const isUnlocked =
        unlockedAchievements.includes(achievement.id) ||
        achievement.check({ sessions, taskCompletions, streak });

      const currentProgress = achievement.getProgress
        ? achievement.getProgress({ sessions, taskCompletions, streak })
        : (isUnlocked ? achievement.maxProgress : 0);

      return {
        ...achievement,
        title: achievement.name || achievement.title,
        unlocked: isUnlocked,
        progress: Math.min(currentProgress, achievement.maxProgress || 1),
        maxProgress: achievement.maxProgress || 1
      };
    });
  }, [unlockedAchievements, sessions, taskCompletions, streak]);

  const unlockedCount = achievements?.filter(a => a.unlocked).length || 0;
  const totalCount = achievements?.length || 0;

  const categories = {
    tasks: achievements?.filter(a => a.category === 'tasks') || [],
    focus: achievements?.filter(a => a.category === 'focus') || [],
    streak: achievements?.filter(a => a.category === 'streak') || [],
    time: achievements?.filter(a => a.category === 'time') || []
  };

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-emerald-100 text-emerald-600 border-emerald-200',
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      purple: 'bg-purple-100 text-purple-600 border-purple-200',
      red: 'bg-red-100 text-red-600 border-red-200',
      orange: 'bg-orange-100 text-orange-600 border-orange-200',
      gold: 'bg-yellow-100 text-yellow-600 border-yellow-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-8 pb-16">

      {/* ── TOP IDENTITY & CURATION HEADER ── */}
      <ArchiveIdentityHeader
        summary={summary}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        domainFilter={domainFilter}
        onDomainChange={setDomainFilter}
        domains={effectiveRoadmap}
      />

      {/* View Mode Bar: Living Archive vs Legacy Badges */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewTab('archive')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              viewTab === 'archive'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Living Archive (Record of Work)
          </button>
          <button
            onClick={() => setViewTab('badges')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              viewTab === 'badges'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Badges & Milestones ({unlockedCount}/{totalCount})
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
          <ArchiveIcon className="w-4 h-4 text-amber-500" />
          <span>Artifact-based personal museum</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 1: LIVING ARCHIVE (PRIMARY EXPERIENCE)
          ═══════════════════════════════════════════════════════════════ */}
      {viewTab === 'archive' ? (
        <div className="space-y-8 anim-fade-in">

          {/* Section 1: "MY IMPORTANT WORK" (Pinned Shelf) */}
          {pinnedArtifacts.length > 0 && activeFilter !== 'pinned' && (
            <ArchivePinnedShelf
              pinnedArtifacts={pinnedArtifacts}
              onSelectArtifact={setSelectedArtifact}
              onUnpinArtifact={handleTogglePin}
            />
          )}

          {/* Section 2: Chronological Living Timeline of Artifacts */}
          <ArchiveLivingTimeline
            artifacts={filteredArtifacts}
            onSelectArtifact={setSelectedArtifact}
            onTogglePin={handleTogglePin}
            onStartSomething={() => navigate('/')}
          />

        </div>
      ) : (
        <div className="space-y-6 anim-fade-in">

          {/* Overall Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Milestone Unlocks</h2>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {unlockedCount}/{totalCount}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-6 overflow-hidden">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-black font-mono text-emerald-600">{stats.completedSubtasks}</div>
                <div className="text-xs font-mono text-slate-500 mt-1">Tasks Completed</div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-black font-mono text-orange-600">{streak}</div>
                <div className="text-xs font-mono text-slate-500 mt-1">Day Streak</div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-black font-mono text-blue-600">{Math.floor(totalTime / 60)}h</div>
                <div className="text-xs font-mono text-slate-500 mt-1">Total Time</div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-black font-mono text-purple-600">{unlockedCount}</div>
                <div className="text-xs font-mono text-slate-500 mt-1">Badges Earned</div>
              </div>
            </div>
          </div>

          {/* Achievement Categories */}
          {Object.entries(categories).map(([categoryName, categoryAchievements]) => (
            <div key={categoryName} className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 capitalize">
                {categoryName} Badges
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryAchievements.map((achievement) => {
                  const IconComponent = (typeof achievement.icon === 'string' ? iconMap[achievement.icon] : achievement.icon) || Award;
                  const colorClasses = getColorClasses(achievement.color);

                  return (
                    <div
                      key={achievement.id}
                      className={`relative p-5 rounded-2xl border transition-all ${
                        achievement.unlocked
                          ? `${colorClasses} shadow-sm`
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          achievement.unlocked ? colorClasses : 'bg-slate-200 text-slate-400'
                        }`}>
                          {achievement.unlocked ? (
                            <IconComponent className="w-5 h-5" />
                          ) : (
                            <Lock className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                            {achievement.title}
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {achievement.description}
                      </p>

                      {achievement.unlocked && (
                        <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span>✓</span> Unlocked
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      )}

      {/* ── EXPANDED "MEMORY MOMENT" IN-PLACE PORTFOLIO MODAL ── */}
      {selectedArtifact && (
        <ArchiveMemoryMomentModal
          artifact={selectedArtifact}
          onClose={() => setSelectedArtifact(null)}
          onTogglePin={handleTogglePin}
          onSaveAnnotation={handleSaveAnnotation}
        />
      )}

    </div>
  );
};

export default AchievementsPage;
