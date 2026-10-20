import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../context/RoadmapContext';
import {
  Upload,
  Compass,
  Search,
  Target,
  RotateCcw,
  ListTree,
  Map,
  X,
  Layers
} from 'lucide-react';
import TaskTree from '../components/TaskTree';
import LearningWorldLandscape from '../components/LearningWorldLandscape';
import ConceptDeepDiveDrawer from '../components/ConceptDeepDiveDrawer';
import LearningArcModal from '../components/LearningArcModal';
import FieldIntelligenceDrawer from '../components/FieldIntelligenceDrawer';
import UniversalRoadmapBridgeModal from '../components/UniversalRoadmapBridgeModal';
import { buildSubjectTopology } from '../utils/conceptRelationshipResolver';
import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';
import { getLocalDateKey } from '../utils/dateUtils';
import { updateTrajectoryDestination } from '../utils/trajectoryResolver';

const RoadmapPage = () => {
  const navigate = useNavigate();
  const {
    subjects,
    selectedSubjectId,
    setSelectedSubjectId,
    getNextSubtask,
    getNextSubtaskForSubject,
    toggleSubtask,
    toggleTaskCompletion,
    isTaskCompleted,
    scheduleSubtask,
    importRoadmap,
    updateSubjectDeadline,
    showTutorial,
    hasImportedRoadmap,
    lastAction,
    undoLastAction,
    startFocusSession,
    currentLearningContext,
    selectLearningContext
  } = useRoadmap();

  // View state: 'world' (interactive landscape) | 'tree' (classic breakdown & management)
  const [viewMode, setViewMode] = useState('world');
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [selectedArc, setSelectedArc] = useState(null);
  const [showFieldIntel, setShowFieldIntel] = useState(false);
  const [hoveredConcept, setHoveredConcept] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [deadlineModal, setDeadlineModal] = useState({ show: false, subjectId: null, deadline: '' });

  const currentConceptRef = useRef(null);

  // Handle Escape key dismissal for modals
  useEffect(() => {
    if (!showImportModal && !deadlineModal.show && !showFieldIntel && !selectedArc) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showImportModal) setShowImportModal(false);
        if (deadlineModal.show) setDeadlineModal({ show: false, subjectId: null, deadline: '' });
        if (showFieldIntel) setShowFieldIntel(false);
        if (selectedArc) setSelectedArc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImportModal, deadlineModal.show, showFieldIntel, selectedArc]);

  // Active Subject Selection
  const activeSubject = useMemo(() => {
    if (!subjects || subjects.length === 0) return null;
    if (selectedSubjectId) {
      return subjects.find(s => s.id === selectedSubjectId) || subjects[0];
    }
    return subjects[0];
  }, [subjects, selectedSubjectId]);

  // Next task calculation for current milestone anchoring (Unification Pass #12)
  const activeNextTask = useMemo(() => {
    if (!activeSubject) return null;
    if (currentLearningContext && currentLearningContext.subjectId === activeSubject.id) {
      return currentLearningContext;
    }
    return getNextSubtaskForSubject ? getNextSubtaskForSubject(activeSubject.id) : getNextSubtask();
  }, [activeSubject, currentLearningContext, getNextSubtaskForSubject, getNextSubtask]);

  // Relational Topology Graph
  const topology = useMemo(() => {
    return buildSubjectTopology(activeSubject, activeNextTask, isTaskCompleted);
  }, [activeSubject, activeNextTask, isTaskCompleted]);

  // Cross-Subject Matches for Exploration Search (P2.2)
  const otherSubjectMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !subjects || subjects.length <= 1) return [];
    const matches = [];
    subjects.forEach(s => {
      if (s.id === activeSubject?.id) return;
      let count = 0;
      (s.phases || []).forEach(p => {
        (p.tasks || []).forEach(t => {
          if (t.name?.toLowerCase().includes(q)) count++;
          (t.subtasks || []).forEach(st => {
            if (st.name?.toLowerCase().includes(q)) count++;
          });
        });
      });
      if (count > 0) {
        matches.push({ subject: s, count });
      }
    });
    return matches;
  }, [searchQuery, subjects, activeSubject]);

  // Jump to Current Concept
  const handleJumpToCurrent = () => {
    if (currentConceptRef.current) {
      currentConceptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Jump into NOW Dashboard focusing this concept
  const handleFocusInNow = (concept) => {
    if (!concept) return;

    if (concept.subjectId) {
      setSelectedSubjectId(concept.subjectId);
    }

    const today = getLocalDateKey();
    const targetSubtask = (concept.subtasks || []).find(s => !s.completed) || concept.subtasks?.[0];
    const targetSubtaskId = targetSubtask ? (targetSubtask.id || targetSubtask.name) : null;

    if (selectLearningContext) {
      selectLearningContext({
        id: concept.taskId || concept.id,
        taskId: concept.taskId || concept.id,
        subtaskId: targetSubtaskId,
        name: targetSubtask?.name || concept.name,
        taskName: concept.name,
        subjectId: concept.subjectId || activeSubject?.id,
        subjectName: concept.subjectName || activeSubject?.name,
        phaseId: concept.phaseId,
        phaseName: concept.phaseName
      });
    }

    if (scheduleSubtask) {
      scheduleSubtask(
        concept.subjectId || activeSubject?.id,
        concept.phaseId,
        concept.taskId || concept.id,
        targetSubtaskId,
        today
      );
    }

    setSelectedConcept(null);
    if (startFocusSession) {
      startFocusSession({
        ...concept,
        subtaskId: targetSubtaskId,
        subtaskName: targetSubtask?.name || concept.name,
        taskName: concept.name,
        subjectName: concept.subjectName || activeSubject?.name,
        phaseName: concept.phaseName,
        time: concept.time || 25,
        glyph: concept.glyph
      }, concept.time || 25);
    } else {
      navigate('/');
    }
  };

  // Toggle Subtask from Drawer
  const handleToggleSubtask = (concept, subtask) => {
    const subtaskId = subtask.id || subtask.name;
    toggleSubtask(concept.subjectId, concept.phaseId, concept.taskId, subtaskId);
    setSelectedConcept(prev => {
      if (!prev || prev.id !== concept.id) return prev;
      const updatedSubtasks = (prev.subtasks || []).map(s => {
        if (s.id === subtaskId || s.name === subtaskId) {
          return { ...s, completed: !s.completed };
        }
        return s;
      });
      return {
        ...prev,
        subtasks: updatedSubtasks,
        completed: updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed)
      };
    });
  };

  // Toggle Entire Task from Drawer
  const handleToggleTask = (concept) => {
    toggleTaskCompletion(concept.subjectId, concept.phaseId, concept.taskId);
    setSelectedConcept(prev => {
      if (!prev || prev.id !== concept.id) return prev;
      const nextCompleted = !prev.completed;
      return {
        ...prev,
        completed: nextCompleted,
        subtasks: (prev.subtasks || []).map(s => ({ ...s, completed: nextCompleted }))
      };
    });
  };

  // Load Curated Track
  const handleLoadCurated = (curated) => {
    if (!curated?.subjects) return;
    const success = importRoadmap(curated);
    if (success && curated.subjects[0]) {
      setSelectedSubjectId(null);
      if (curated.id === 'electronics-embedded') {
        updateTrajectoryDestination({
          primaryRole: 'Embedded Systems Internship',
          role: 'Embedded Systems Internship',
          statement: 'I want to build real embedded systems and be ready for internship interviews.',
          mode: 'career'
        });
      } else if (curated.name) {
        updateTrajectoryDestination({
          primaryRole: `${curated.name} Specialist`,
          role: `${curated.name} Specialist`,
          statement: `Develop capability across ${curated.name}.`,
          mode: 'career'
        });
      }
    }
  };



  const handleSaveDeadline = () => {
    if (deadlineModal.subjectId && deadlineModal.deadline) {
      updateSubjectDeadline(deadlineModal.subjectId, deadlineModal.deadline);
      setDeadlineModal({ show: false, subjectId: null, deadline: '' });
    }
  };

  return (
    <div className="space-y-6 select-none py-2">

      {/* ── TUTORIAL MESSAGE ── */}
      {showTutorial && !hasImportedRoadmap && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            1
          </div>
          <div>
            <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm">Welcome to Your Knowledge World!</h3>
            <p className="text-blue-700 dark:text-blue-300 text-xs">
              Load a curated track or import your roadmap below to begin exploring your capabilities.
            </p>
          </div>
        </div>
      )}

      {/* ── UNDO BANNER ── */}
      {lastAction && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between shadow-md anim-pop">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              {lastAction.taskDetails?.name
                ? `Completed: “${lastAction.taskDetails.name}”`
                : lastAction.type === 'COMPLETE' ? 'Subtask completed' : 'Action performed'}
            </span>
          </div>
          <button
            onClick={undoLastAction}
            className="btn-tactile-coral px-4 py-2 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>↺ Undo Action</span>
          </button>
        </div>
      )}

      {/* ── TOP ORIENTATION & DOMAIN BAR ── */}
      <div className="tile-tactile p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* Domain Switcher & Title */}
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-electric-600 dark:text-electric-400">
              <Compass className="w-4 h-4" />
              <span>Knowledge World</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
                {topology.domainName}
              </h1>

              {/* Multi-Domain Selector Pills */}
              {subjects && subjects.length > 1 && (
                <div className="flex items-center gap-1.5 ml-2">
                  {subjects.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        activeSubject?.id === s.id
                          ? 'bg-electric-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Concise Orientation Line */}
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {topology.orientationLine}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Jump to Current Button */}
            {topology.currentConcept && (
              <button
                onClick={handleJumpToCurrent}
                className="btn-tactile-ghost px-3.5 py-2 text-xs flex items-center gap-1.5"
                title="Center on active concept"
              >
                <Target className="w-3.5 h-3.5 text-coral-500" />
                <span>You Are Here</span>
              </button>
            )}

            {/* View Mode Toggle: World vs Tree */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('world')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'world'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>World</span>
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'tree'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>Tree & Data</span>
              </button>
            </div>

            {/* Field Intelligence Button */}
            <button
              id="field-intelligence-btn"
              onClick={() => setShowFieldIntel(true)}
              className="btn-tactile-ghost px-3.5 py-2 text-xs flex items-center gap-1.5 text-electric-600 dark:text-electric-400"
              title="Open Field Intelligence & Research Dossier"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Field Intelligence</span>
            </button>

            {/* Import Roadmap Button (Preserved ID for Onboarding Tests) */}
            <button
              id="import-roadmap-btn"
              onClick={() => setShowImportModal(true)}
              className="btn-tactile-ghost px-3.5 py-2 text-xs flex items-center gap-1.5"
              title="Import JSON roadmap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>

        </div>

        {/* ── LEVEL 1: LEARNING DESTINATION OVERVIEW ── */}
        {activeSubject && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-electric-50/70 via-slate-50 to-coral-50/40 dark:from-electric-950/30 dark:via-slate-900/40 dark:to-coral-950/20 border-2 border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-electric-600 dark:text-electric-400">
                  Level 1 · Learning Destination
                </span>
                {activeSubject.specializations && activeSubject.specializations.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {activeSubject.specializations.length} Specializations
                  </span>
                )}
                {topology.projects && topology.projects.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-coral-100 dark:bg-coral-950 text-coral-700 dark:text-coral-300 font-bold">
                    {topology.projects.length} Practical Projects
                  </span>
                )}
              </div>
              <h2 className="font-display font-black text-lg sm:text-xl text-slate-900 dark:text-white">
                {activeSubject.learnerContext?.targetCapabilities || activeSubject.learnerContext?.goal || activeSubject.fieldIntelligence?.fieldDefinition || `Mastery of ${activeSubject.name}`}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                {activeSubject.fieldIntelligence?.currentState || `Structured progression across ${topology.regions.length} knowledge arcs and ${topology.allConcepts.length} milestones.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFieldIntel(true)}
                className="btn-tactile-electric px-3.5 py-2 text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Explore Field Intelligence</span>
              </button>
            </div>
          </div>
        )}

        {/* ── BREADCRUMB ORIENTATION THREAD ── */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="text-slate-400">ORIENTATION:</span>
          <span className="text-slate-700 dark:text-slate-300">{topology.domainName}</span>
          <span className="text-slate-300 dark:text-slate-700">➔</span>
          <button
            type="button"
            onClick={() => {
              const currentRegion = topology.regions.find(r => r.name === topology.currentConcept?.phaseName) || topology.regions[0];
              if (currentRegion) setSelectedArc(currentRegion);
            }}
            className="text-electric-600 dark:text-electric-400 hover:underline flex items-center gap-1"
            title="Inspect Level 2 Learning Arc Context"
          >
            <span>{topology.currentConcept?.phaseName || 'Foundations'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-electric-100 dark:bg-electric-950 text-electric-700 dark:text-electric-300 font-bold">Arc Info ▾</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">➔</span>
          <span className="inline-flex items-center gap-1 bg-coral-50 dark:bg-coral-950/60 text-coral-600 dark:text-coral-400 px-2.5 py-0.5 rounded-full border border-coral-200 dark:border-coral-800">
            <span>●</span>
            <span>{topology.currentConcept?.name || 'Exploring'}</span>
            <span className="text-[10px] font-black uppercase ml-0.5">(YOU ARE HERE)</span>
          </span>
        </div>

        {/* ── EXPLORATION SEARCH BAR ── */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts or capabilities (e.g. Capacitors, Ohm's Law, Diode, BJT, Stack)..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-electric-500 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Cross-Subject Matches Indicator */}
        {otherSubjectMatches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="font-semibold">Found in other loaded tracks:</span>
            {otherSubjectMatches.map(({ subject, count }) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubjectId(subject.id)}
                className="px-2.5 py-1 bg-electric-50 hover:bg-electric-100 dark:bg-electric-950/60 dark:hover:bg-electric-900/60 text-electric-600 dark:text-electric-400 rounded-lg font-bold border border-electric-200 dark:border-electric-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{subject.name}</span>
                <span className="text-[10px] bg-electric-200 dark:bg-electric-800 px-1.5 py-0.5 rounded-full font-mono">
                  {count} match{count > 1 ? 'es' : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── MAIN VIEWPORT ── */}
      {subjects && subjects.length > 0 ? (
        viewMode === 'world' ? (
          <LearningWorldLandscape
            topology={topology}
            hoveredConcept={hoveredConcept}
            onHoverConcept={(concept) => setHoveredConcept(concept)}
            onLeaveConcept={() => setHoveredConcept(null)}
            onSelectConcept={(concept) => setSelectedConcept(concept)}
            searchQuery={searchQuery}
            currentConceptRef={currentConceptRef}
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>Classic tree and administrative view. Edit deadlines, subtasks, or remove subjects.</span>
              <button
                onClick={() => setViewMode('world')}
                className="text-electric-600 dark:text-electric-400 font-bold hover:underline"
              >
                Switch back to World ➔
              </button>
            </div>
            <TaskTree />
          </div>
        )
      ) : (
        /* Empty State with Curated Tracks */
        <div className="tile-tactile p-8 text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-electric-600 text-white flex items-center justify-center text-3xl mx-auto shadow-lg">
            🗺️
          </div>
          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">
            Your Knowledge World Awaits
          </h2>
          <p className="text-sm font-semibold text-slate-500 leading-relaxed">
            Mount one of our curated STEM tracks below or import your own JSON roadmap to begin exploring your capabilities.
          </p>

          <div className="space-y-3 pt-2 text-left">
            {CURATED_ROADMAPS.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 hover:border-electric-500 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                  <p className="text-xs text-slate-500">{c.tagline}</p>
                </div>
                <button
                  onClick={() => handleLoadCurated(c)}
                  className="btn-tactile-electric px-4 py-2 text-xs shrink-0"
                >
                  Start Path ➔
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONCEPT DEEP DIVE DRAWER (INSPECTOR) ── */}
      {selectedConcept && (
        <ConceptDeepDiveDrawer
          concept={selectedConcept}
          allConcepts={topology.allConcepts}
          allProjects={topology.projects}
          onClose={() => setSelectedConcept(null)}
          onSelectConcept={(c) => setSelectedConcept(c)}
          onFocusInNow={handleFocusInNow}
          onToggleSubtask={handleToggleSubtask}
          onToggleTask={handleToggleTask}
        />
      )}

      {/* ── LEARNING ARC MODAL (LEVEL 2 INSPECTOR) ── */}
      {selectedArc && (
        <LearningArcModal
          arc={selectedArc}
          subjectName={topology.domainName}
          allProjects={topology.projects}
          onClose={() => setSelectedArc(null)}
          onSelectConcept={(c) => {
            setSelectedArc(null);
            setSelectedConcept(c);
          }}
        />
      )}

      {/* ── FIELD INTELLIGENCE & RESEARCH DOSSIER ── */}
      {showFieldIntel && (
        <FieldIntelligenceDrawer
          subject={activeSubject}
          onClose={() => setShowFieldIntel(false)}
        />
      )}

      {/* ── UNIVERSAL AI ROADMAP BRIDGE MODAL (v2) ── */}
      <UniversalRoadmapBridgeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(roadmapData, options) => {
          const success = importRoadmap(roadmapData, options);
          if (success) {
            setShowImportModal(false);
            if (Array.isArray(roadmapData) && roadmapData[0]?.id) {
              setSelectedSubjectId(roadmapData[0].id);
            }
            return true;
          }
          return false;
        }}
        existingRoadmapCount={subjects?.length || 0}
      />

      {/* ── DEADLINE MODAL ── */}
      {deadlineModal.show && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deadline-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 id="deadline-modal-title" className="font-display font-black text-lg text-slate-900 dark:text-white">
              Set Subject Deadline
            </h3>
            <label htmlFor="subject-deadline-input" className="sr-only">
              Subject Target Deadline
            </label>
            <input
              id="subject-deadline-input"
              type="date"
              value={deadlineModal.deadline}
              onChange={(e) => setDeadlineModal(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeadlineModal({ show: false, subjectId: null, deadline: '' })}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeadline}
                className="btn-tactile-electric px-4 py-2 text-xs"
              >
                Save Deadline
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoadmapPage;
