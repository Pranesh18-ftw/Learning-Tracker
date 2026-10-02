import React, { useState } from 'react';
import { 
  BjtTransistorSymbol, 
  ResistorSymbol, 
  CapacitorSymbol, 
  DiodeSymbol,
  MemoryModelSymbol 
} from './STEMVisuals';

/**
 * Technical dictionary mapping concept keywords to their physical explanation
 * and optional micro-schematic symbol.
 */
const CONCEPT_DICTIONARY = {
  'mechanism': {
    term: 'mechanism',
    label: 'Physical Causality',
    annotation: 'What physical laws, particle flows, or electron states cause this observed behavior?',
    type: 'concept'
  },
  'without notes': {
    term: 'without notes',
    label: 'Active Retrieval Test',
    annotation: 'Recall directly from memory without reference material to trigger synaptic consolidation.',
    type: 'meta'
  },
  'without looking at your notes': {
    term: 'without looking at your notes',
    label: 'Active Retrieval Test',
    annotation: 'Recall directly from memory without reference material to trigger synaptic consolidation.',
    type: 'meta'
  },
  'transistor': {
    term: 'transistor',
    label: 'BJT / FET Switch',
    annotation: 'Three-terminal semiconductor where base current controls collector-emitter conduction.',
    component: () => <BjtTransistorSymbol state="saturated" className="w-24 h-16 my-1" />,
    type: 'stem'
  },
  'q1': {
    term: 'Q1',
    label: 'Reference Designator: Transistor 1',
    annotation: 'NPN switching transistor. When base-emitter forward biased (>0.7V), collector current saturates.',
    component: () => <BjtTransistorSymbol state="saturated" className="w-24 h-16 my-1" />,
    type: 'stem'
  },
  'saturation': {
    term: 'saturation',
    label: 'Saturated State (ON)',
    annotation: 'V_CE drops to ~0.2V. Transistor acts as closed switch with maximum collector current.',
    type: 'stem'
  },
  'cutoff': {
    term: 'cutoff',
    label: 'Cutoff State (OFF)',
    annotation: 'V_BE < 0.7V. Zero base current; collector-emitter behaves as an open switch.',
    type: 'stem'
  },
  'biasing': {
    term: 'biasing',
    label: 'Operating Point',
    annotation: 'Setting DC operating voltage and current levels to establish reliable on/off thresholds.',
    type: 'stem'
  },
  'resistor': {
    term: 'resistor',
    label: 'Passive Impedance',
    annotation: 'Limits current flow according to Ohm\'s Law: V = I·R. Dissipates energy as heat.',
    component: () => <ResistorSymbol className="w-20 h-6 my-1" />,
    type: 'stem'
  },
  'resistance': {
    term: 'resistance',
    label: 'Electrical Resistance',
    annotation: 'Opposition to charge carrier drift through crystalline lattice.',
    component: () => <ResistorSymbol className="w-20 h-6 my-1" />,
    type: 'stem'
  },
  'voltage': {
    term: 'voltage',
    label: 'Electric Potential Difference',
    annotation: 'Energy per unit charge between two points: V = dW/dq (Volts).',
    type: 'stem'
  },
  'current': {
    term: 'current',
    label: 'Charge Carrier Flow',
    annotation: 'Rate of charge movement: I = dq/dt (Amperes). Moves opposite electron drift.',
    type: 'stem'
  },
  'diode': {
    term: 'diode',
    label: 'P-N Semiconductor Junction',
    annotation: 'Permits unidirectional current flow once 0.7V forward threshold is overcome.',
    component: () => <DiodeSymbol className="w-16 h-6 my-1" />,
    type: 'stem'
  },
  'capacitor': {
    term: 'capacitor',
    label: 'Electrostatic Storage',
    annotation: 'Stores electric energy across dielectric plates: Q = C·V. Exponential charging transient.',
    component: () => <CapacitorSymbol className="w-20 h-8 my-1" />,
    type: 'stem'
  },
  'stack': {
    term: 'stack',
    label: 'Call Stack Segment',
    annotation: 'LIFO memory segment for local frames, automatic variables, and return addresses.',
    component: () => <MemoryModelSymbol className="w-28 h-16 my-1" />,
    type: 'stem'
  },
  'heap': {
    term: 'heap',
    label: 'Dynamic Heap Segment',
    annotation: 'Dynamically allocated memory (malloc/free). Requires explicit lifetime management.',
    component: () => <MemoryModelSymbol className="w-28 h-16 my-1" />,
    type: 'stem'
  },
  'pointer': {
    term: 'pointer',
    label: 'Memory Address Indirection',
    annotation: 'Variable holding the direct 64-bit virtual memory address of another value.',
    type: 'stem'
  }
};

/**
 * InteractiveQuestion
 * Renders the question text with reactive word-by-word hover,
 * highlighting conceptual terms and revealing micro-annotations & schematics.
 */
const InteractiveQuestion = ({ questionText }) => {
  const [activeConcept, setActiveConcept] = useState(null);
  const [pinnedConcept, setPinnedConcept] = useState(null);

  // Fallback default question if none provided
  const text = questionText || "Can you explain the mechanism without looking at your notes?";

  // Break text into tokens while recognizing multi-word keywords
  const parseTokens = () => {
    const raw = text.replace(/^["']|["']$/g, ''); // strip outer quotes if present
    const lower = raw.toLowerCase();
    
    // Sort keys by descending length to match "without looking at your notes" before "notes"
    const keys = Object.keys(CONCEPT_DICTIONARY).sort((a, b) => b.length - a.length);

    let currentIndex = 0;
    const tokens = [];

    while (currentIndex < raw.length) {
      let matchedKey = null;

      for (const key of keys) {
        // Match word boundaries
        const slice = lower.slice(currentIndex, currentIndex + key.length);
        if (slice === key) {
          // Check word boundaries before and after
          const prevChar = currentIndex > 0 ? lower[currentIndex - 1] : ' ';
          const nextChar = currentIndex + key.length < lower.length ? lower[currentIndex + key.length] : ' ';
          const isPrevBoundary = /[\s,.;:?!'"]/.test(prevChar);
          const isNextBoundary = /[\s,.;:?!'"]/.test(nextChar);

          if (isPrevBoundary && isNextBoundary) {
            matchedKey = key;
            break;
          }
        }
      }

      if (matchedKey) {
        const originalChunk = raw.slice(currentIndex, currentIndex + matchedKey.length);
        tokens.push({
          isKeyword: true,
          original: originalChunk,
          concept: CONCEPT_DICTIONARY[matchedKey]
        });
        currentIndex += matchedKey.length;
      } else {
        // Collect standard word or punctuation
        const nextSpace = raw.indexOf(' ', currentIndex);
        const end = nextSpace === -1 ? raw.length : nextSpace + 1;
        const segment = raw.slice(currentIndex, end);
        tokens.push({
          isKeyword: false,
          original: segment
        });
        currentIndex = end;
      }
    }

    return tokens;
  };

  const tokens = parseTokens();
  const currentDisplayed = pinnedConcept || activeConcept;

  return (
    <div className="relative group/question">
      {/* Question Text Line with Interactive Word Spans */}
      <p className="font-serif italic text-2xl sm:text-3xl text-[#1C1C1A] dark:text-[#F4F0E7] leading-snug tracking-tight">
        <span>“</span>
        {tokens.map((token, idx) => {
          if (!token.isKeyword) {
            return (
              <span 
                key={idx}
                className="transition-colors duration-150 hover:text-[#1C1C1A] dark:hover:text-[#FFFFFF]"
              >
                {token.original}
              </span>
            );
          }

          const isHovered = activeConcept?.term === token.concept.term;
          const isPinned = pinnedConcept?.term === token.concept.term;

          return (
            <span
              key={idx}
              data-cursor="concept"
              onMouseEnter={() => !pinnedConcept && setActiveConcept(token.concept)}
              onMouseLeave={() => !pinnedConcept && setActiveConcept(null)}
              onClick={() => {
                if (pinnedConcept?.term === token.concept.term) {
                  setPinnedConcept(null);
                } else {
                  setPinnedConcept(token.concept);
                  setActiveConcept(token.concept);
                }
              }}
              className={`relative cursor-pointer transition-all duration-200 inline-block px-0.5 rounded-sm ${
                isPinned || isHovered
                  ? 'text-[#B84F2B] font-normal underline decoration-[#B84F2B] decoration-2 underline-offset-4 bg-[#B84F2B]/10'
                  : 'underline decoration-[#D8D2C7] dark:decoration-[#2C2B27] underline-offset-4 hover:decoration-[#B84F2B] hover:text-[#B84F2B]'
              }`}
            >
              {token.original}
              {/* Subtle indicator dot */}
              <span className="inline-block w-1 h-1 rounded-full bg-[#B84F2B] opacity-60 ml-0.5 -translate-y-2" />
            </span>
          );
        })}
        <span>”</span>
      </p>

      {/* Floating Micro-Annotation Panel */}
      {currentDisplayed && (
        <div 
          className="anim-enter-subtle mt-3 p-3.5 border border-[#B84F2B]/40 bg-[#FAF8F3] dark:bg-[#1E1E1B] text-left max-w-lg shadow-sm"
          style={{ animationDuration: '0.2s' }}
        >
          <div className="flex items-center justify-between border-b border-[#D8D2C7]/60 dark:border-[#2C2B27] pb-1.5 mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#B84F2B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B84F2B]" />
              {currentDisplayed.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-[#74716A] dark:text-[#9C988F]">
                {pinnedConcept ? '[pinned · click term to dismiss]' : '[hover inspection]'}
              </span>
              {pinnedConcept && (
                <button
                  onClick={() => { setPinnedConcept(null); setActiveConcept(null); }}
                  className="text-xs text-[#74716A] hover:text-[#1C1C1A] dark:hover:text-[#F4F0E7]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <p className="font-sans text-xs text-[#1C1C1A] dark:text-[#F4F0E7] leading-relaxed">
            {currentDisplayed.annotation}
          </p>

          {/* Micro-Schematic if available */}
          {currentDisplayed.component && (
            <div className="pt-2 flex items-center justify-start gap-4">
              <div className="p-1 border border-[#D8D2C7]/40 dark:border-[#2C2B27]/40 bg-white/40 dark:bg-black/20">
                {currentDisplayed.component()}
              </div>
              <span className="font-mono text-[9px] text-[#74716A] dark:text-[#9C988F] italic">
                schematic representation
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveQuestion;
