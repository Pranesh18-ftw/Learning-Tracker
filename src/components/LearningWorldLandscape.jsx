import React from 'react';
import ConceptObject from './ConceptObject';
import { ArrowRight, Compass } from 'lucide-react';

/**
 * LearningWorldLandscape
 *
 * The visual learning landscape of the user's roadmap.
 * Implements:
 * - Map regions (phases as geographical knowledge territories)
 * - Progression conjoining concepts
 * - Hover relationship emergence (builds on / connects to / unlocks)
 * - Search dimming / highlighting
 * - Unmissable "YOU ARE HERE" anchoring
 */
const LearningWorldLandscape = ({
  topology,
  hoveredConcept,
  onHoverConcept,
  onLeaveConcept,
  onSelectConcept,
  searchQuery = '',
  currentConceptRef
}) => {
  const { regions = [], allConcepts = [] } = topology;

  // Determine which concepts are related to the currently hovered concept
  const relatedConceptIds = new Set();
  if (hoveredConcept) {
    relatedConceptIds.add(hoveredConcept.id);

    // Add prerequisites
    (hoveredConcept.prerequisites || []).forEach(name => {
      const match = allConcepts.find(c => c.name === name);
      if (match) relatedConceptIds.add(match.id);
    });

    // Add consequences
    (hoveredConcept.consequences || []).forEach(name => {
      const match = allConcepts.find(c => c.name === name);
      if (match) relatedConceptIds.add(match.id);
    });

    // Add immediate peer in same region
    (hoveredConcept.connectsTo || []).forEach(name => {
      const match = allConcepts.find(c => c.name === name);
      if (match) relatedConceptIds.add(match.id);
    });
  }

  // Search filtering logic
  const query = searchQuery.trim().toLowerCase();

  return (
    <div className="relative space-y-10 select-none pb-12">

      {/* ── RELATIONSHIP REVELATION TOOLTIP (Floating HUD on hover) ── */}
      {hoveredConcept && (
        <aside
          aria-label="Concept Relationship Inspector"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 border-2 border-electric-500 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-md anim-pop flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-none"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-sm text-electric-400 dark:text-electric-600">
                {hoveredConcept.name}
              </span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 dark:text-slate-600">
                {hoveredConcept.phaseName}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {hoveredConcept.prerequisites.length > 0 && (
                <span className="text-slate-300 dark:text-slate-700">
                  <strong className="text-slate-400 dark:text-slate-500">Builds on:</strong> {hoveredConcept.prerequisites.join(', ')}
                </span>
              )}
              {hoveredConcept.consequences.length > 0 && (
                <span className="text-slate-300 dark:text-slate-700">
                  <strong className="text-electric-400 dark:text-electric-600">Unlocks:</strong> {hoveredConcept.consequences.join(', ')}
                </span>
              )}
            </div>
          </div>

          <span className="text-[10px] font-bold text-coral-400 dark:text-coral-600 shrink-0 bg-slate-800 dark:bg-slate-100 px-2.5 py-1 rounded-lg">
            Click to Deep Dive ➔
          </span>
        </aside>
      )}

      {/* ── REGIONAL LEARNING LANDSCAPES ── */}
      <div className="space-y-12">
        {regions.map((region, rIdx) => {
          const regionHasMatch = query
            ? region.concepts.some(c => c.name.toLowerCase().includes(query))
            : true;

          const regionOpacity = query && !regionHasMatch ? "opacity-30" : "opacity-100";

          return (
            <section
              key={region.id}
              aria-label={`Learning Region: ${region.name}`}
              className={`space-y-4 transition-opacity duration-200 ${regionOpacity}`}
            >

              {/* Region Territory Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl font-display font-black text-xs flex items-center justify-center border-2 ${
                    region.isFullyEstablished
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : region.hasCurrent
                        ? 'bg-coral-500 border-coral-500 text-white animate-pulse'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {region.isFullyEstablished ? '✓' : `0${region.index}`}
                  </div>

                  <div>
                    <h3 className="font-display font-black text-base tracking-tight text-slate-900 dark:text-white uppercase">
                      {region.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      Region Territory · {region.concepts.length} Concept Milestones
                    </p>
                  </div>
                </div>

                {/* Region Status Metric */}
                <div className="flex items-center gap-2 text-xs font-bold self-start sm:self-auto">
                  <span className={`px-3 py-1 rounded-full border ${
                    region.isFullyEstablished
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : region.hasCurrent
                        ? 'bg-coral-50 border-coral-300 text-coral-700 dark:bg-coral-950/40 dark:border-coral-800 dark:text-coral-300'
                        : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}>
                    {region.isFullyEstablished
                      ? 'All Concepts Established ✓'
                      : `${region.establishedCount} of ${region.totalConcepts} established`}
                  </span>
                </div>
              </div>

              {/* Concepts Spatial Grid / Flowing Band */}
              <div className="relative pt-2">
                <div className="flex flex-wrap items-stretch gap-4 sm:gap-6">
                  {region.concepts.map((concept, cIdx) => {
                    // Check search query match
                    const isSearchMatch = query ? concept.name.toLowerCase().includes(query) : true;
                    const isRelated = hoveredConcept ? relatedConceptIds.has(concept.id) : false;
                    const isDimmed = query
                      ? !isSearchMatch
                      : hoveredConcept
                        ? !relatedConceptIds.has(concept.id)
                        : false;

                    const isCurrent = concept.isCurrent;

                    return (
                      <div
                        key={concept.id}
                        id={rIdx === 0 && cIdx === 0 ? 'first-task-item' : undefined}
                        ref={isCurrent ? currentConceptRef : null}
                        className="relative flex items-center"
                      >
                        <ConceptObject
                          concept={concept}
                          isHovered={hoveredConcept?.id === concept.id}
                          isRelated={isRelated}
                          isDimmed={isDimmed}
                          onHover={onHoverConcept}
                          onLeave={onLeaveConcept}
                          onClick={onSelectConcept}
                        />

                        {/* Visual Inter-Concept Conduit (Horizontal Arrow) */}
                        {cIdx < region.concepts.length - 1 && (
                          <div className="hidden lg:flex items-center px-1 text-slate-300 dark:text-slate-700">
                            <ArrowRight className={`w-4 h-4 stroke-[2.5] ${
                              concept.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional Connecting Conduit downward to next region */}
              {rIdx < regions.length - 1 && (
                <div className="py-2 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-slate-200 dark:bg-slate-800" />
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      ↓
                    </div>
                    <div className="w-0.5 h-6 bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* ── FOOTER: SPATIAL SUMMARY ── */}
      <footer className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-electric-500" />
          <span>Interactive Learning Landscape · Move deeper into concepts to explore capabilities</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Established
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-coral-500 inline-block" /> You Are Here
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" /> Upcoming
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LearningWorldLandscape;
