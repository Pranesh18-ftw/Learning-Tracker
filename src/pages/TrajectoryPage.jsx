/**
 * TrajectoryPage.jsx
 *
 * LEARNING TRACKER — TRAJECTORY / CAREER REDESIGN
 *
 * Purpose:
 * Connects the learner's real-world goal (placement / internship / job / master's / project)
 * to the capabilities they are developing inside Learning Tracker.
 *
 * Visual Chain:
 * DESTINATION → CAPABILITY MAP → CURRENT EVIDENCE → DEVELOPING AREAS → NEXT ACTION
 */

import React, { useState, useMemo } from 'react';
import { Target } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';
import {
  resolveTrajectoryDestination,
  resolveCapabilityMap,
  updateTrajectoryDestination
} from '../utils/trajectoryResolver';

import TrajectoryDestinationHero from '../components/TrajectoryDestinationHero';
import TrajectoryCapabilityMap from '../components/TrajectoryCapabilityMap';
import TrajectoryCapabilityModal from '../components/TrajectoryCapabilityModal';
import TrajectoryEvidencePortfolio from '../components/TrajectoryEvidencePortfolio';
import TrajectoryDevelopingGaps from '../components/TrajectoryDevelopingGaps';
import TrajectoryPlacementMirror from '../components/TrajectoryPlacementMirror';

const TrajectoryPage = () => {
  const {
    subjects = [],
    roadmap = [],
    sessions = []
  } = useRoadmap();

  const [destination, setDestination] = useState(() => resolveTrajectoryDestination());
  const [selectedCapability, setSelectedCapability] = useState(null);

  // Active roadmap selection
  const currentRoadmap = useMemo(() => {
    return (subjects && subjects.length > 0) ? subjects : roadmap;
  }, [subjects, roadmap]);

  // Resolve dynamic capability map & next action
  const capabilityData = useMemo(() => {
    return resolveCapabilityMap(currentRoadmap, sessions, destination);
  }, [currentRoadmap, sessions, destination]);

  const handleUpdateDestination = (updates) => {
    const next = { ...destination, ...updates };
    setDestination(next);
    updateTrajectoryDestination(updates);
  };

  const isCareerMode = destination.mode === 'career' || !destination.mode;
  const hasTrajectory = Boolean(destination && (destination.primaryRole || destination.title || (destination.trajectories && destination.trajectories.length > 0)));

  if (!hasTrajectory) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4 anim-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border-2 border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 mx-auto">
          <Target className="w-8 h-8" />
        </div>
        <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">
          Choose what you're building toward.
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Connect your real-world aspiration (placement, internship, research, or master's) to the capabilities you are developing in Learning Tracker.
        </p>
        <button
          onClick={() => handleUpdateDestination({ primaryRole: 'Embedded Systems Internship', mode: 'career' })}
          className="btn-tactile-coral px-6 py-2.5 text-xs font-mono font-bold"
        >
          Select Target Trajectory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 anim-fade-in">

      {/* ── 1. DESTINATION HERO CENTERPIECE ── */}
      <TrajectoryDestinationHero
        destination={destination}
        metrics={capabilityData.metrics}
        onUpdateDestination={handleUpdateDestination}
      />

      {/* ── 2. NEXT ACTION & DEVELOPING COMPETENCIES ── */}
      <TrajectoryDevelopingGaps
        developingAreas={capabilityData.developingAreas}
        nextAction={capabilityData.nextAction}
        onSelectCapability={(cap) => setSelectedCapability(cap)}
      />

      {/* ── 3. INTERACTIVE CAPABILITY LANDSCAPE MAP ── */}
      <TrajectoryCapabilityMap
        clusters={capabilityData.clusters}
        onSelectCapability={(cap) => setSelectedCapability(cap)}
      />

      {/* ── 4. PLACEMENT & EMPLOYER EXPECTATION MIRROR (Prompt #17) ── */}
      {isCareerMode && (
        <TrajectoryPlacementMirror
          targetRole={destination.primaryRole}
          roadmap={currentRoadmap}
        />
      )}

      {/* ── 5. PROJECTS AS FIRST-CLASS EVIDENCE PORTFOLIO ── */}
      <TrajectoryEvidencePortfolio
        roadmap={currentRoadmap}
      />

      {/* ── 6. CAPABILITY DEEP-DIVE MODAL / DRAWER ── */}
      {selectedCapability && (
        <TrajectoryCapabilityModal
          capability={selectedCapability}
          onClose={() => setSelectedCapability(null)}
          targetRole={destination.primaryRole}
        />
      )}

    </div>
  );
};

export default TrajectoryPage;
