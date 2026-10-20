/**
 * GlobalCommandPalette.jsx
 *
 * Global Search / Command Entry (Prompt #22)
 *
 * Fast, lightweight switcher across the 8 unified surfaces:
 * - Concepts & Tasks (World / Now)
 * - Projects (Archive)
 * - Capabilities (Trajectory)
 * - Routes (Path)
 * - Evidence & Notes (Growth / Archive)
 *
 * Keyboard accessible via Ctrl+K / Cmd+K.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Zap, Map, Compass, Award, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../context/RoadmapContext';
import { ROLE_CAPABILITY_CLUSTERS } from '../utils/trajectoryResolver';

const GlobalCommandPalette = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { subjects, selectLearningContext } = useRoadmap();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
          const evt = new CustomEvent('open-command-palette');
          window.dispatchEvent(evt);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Index searchable items across the unified architecture
  const searchIndex = useMemo(() => {
    const items = [];

    // 1. Roadmap Concepts & Subtasks (World / Now)
    (subjects || []).forEach(subj => {
      (subj.phases || []).forEach(ph => {
        (ph.tasks || []).forEach(tk => {
          const isProject = (tk.name || '').toLowerCase().includes('project') || (tk.name || '').toLowerCase().includes('build');

          items.push({
            id: tk.id,
            title: tk.name,
            subtitle: `${subj.name} · ${ph.name}`,
            type: isProject ? 'PROJECT' : 'CONCEPT',
            route: '/',
            icon: isProject ? <Award className="w-4 h-4 text-emerald-500" /> : <Map className="w-4 h-4 text-violet-500" />,
            payload: {
              id: tk.id,
              taskId: tk.id,
              name: tk.name,
              subjectId: subj.id,
              subjectName: subj.name,
              phaseId: ph.id,
              phaseName: ph.name
            }
          });

          // Subtasks
          (tk.subtasks || []).forEach(st => {
            items.push({
              id: st.id || st.name,
              title: st.name,
              subtitle: `${subj.name} · ${tk.name}`,
              type: 'PRACTICE',
              route: '/',
              icon: <Zap className="w-4 h-4 text-amber-500" />,
              payload: {
                id: st.id || st.name,
                subtaskId: st.id || st.name,
                taskId: tk.id,
                name: st.name,
                taskName: tk.name,
                subjectId: subj.id,
                subjectName: subj.name,
                phaseId: ph.id,
                phaseName: ph.name
              }
            });
          });
        });
      });
    });

    // 2. Trajectory Capabilities
    const clusters = ROLE_CAPABILITY_CLUSTERS['embedded systems'] || [];
    clusters.forEach(cl => {
      cl.capabilities.forEach(cap => {
        items.push({
          id: cap.id,
          title: cap.name,
          subtitle: `Capability · ${cl.clusterName}`,
          type: 'CAPABILITY',
          route: '/trajectory',
          icon: <Target className="w-4 h-4 text-electric-500" />,
          payload: {
            id: cap.id,
            name: cap.name
          }
        });
      });
    });

    // 3. Path Routes
    (subjects || []).forEach(subj => {
      items.push({
        id: `route-${subj.id}`,
        title: `${subj.name} Route`,
        subtitle: `Path Route · ${subj.phases?.length || 0} Phases`,
        type: 'ROUTE',
        route: '/learning-plan',
        icon: <Compass className="w-4 h-4 text-electric-500" />,
        payload: {
          subjectId: subj.id,
          name: subj.name
        }
      });
    });

    return items;
  }, [subjects]);

  // Filter items matching query
  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      // Suggest high-priority items initially
      return searchIndex.slice(0, 7);
    }
    const q = query.toLowerCase().trim();
    return searchIndex
      .filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchIndex, query]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectItem(filteredResults[selectedIndex]);
      }
    }
  };

  const handleSelectItem = (item) => {
    if (item.payload && selectLearningContext) {
      selectLearningContext(item.payload);
    }
    onClose();
    navigate(item.route);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24 anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden space-y-0"
        onKeyDown={handleKeyDown}
      >

        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search concepts, projects, routes, capabilities..."
            className="w-full bg-transparent text-sm sm:text-base font-sans font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredResults.length > 0 ? (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.type}-${item.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-200'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                      {item.type}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              No matching concepts, capabilities, or routes found.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Navigate with ↑ ↓ · Press Enter to jump directly</span>
          <span>Unified Learning Context</span>
        </div>

      </div>
    </div>
  );
};

export default GlobalCommandPalette;
