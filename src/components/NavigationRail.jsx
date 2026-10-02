import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useRoadmap } from '../context/RoadmapContext';

/**
 * Compact Instrument Navigation Rail
 * Principle 1: Removes the dominant top SaaS navbar.
 * Behaves like a precision hardware instrument control:
 * - Slender, minimal persistent presence.
 * - Expands on hover or click into: NOW / WORLD / PATH / GROWTH / ARCHIVE / IDENTITY.
 * - Retracts to keep screen real estate wide open for the workspace.
 */
const NavigationRail = ({ activeTab, setActiveTab }) => {
  const { isDarkMode, toggleTheme, showTutorial, hasImportedRoadmap } = useRoadmap();
  const [isOpen, setIsOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${h}:${m}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'NOW', code: '01', desc: 'Active Workspace' },
    { id: 'roadmap', label: 'WORLD', code: '02', desc: 'Knowledge Map' },
    { id: 'learning-plan', label: 'PATH', code: '03', desc: 'Schedule' },
    { id: 'stats', label: 'GROWTH', code: '04', desc: 'Capability Log' },
    { id: 'achievements', label: 'ARCHIVE', code: '05', desc: 'Evidence & Proof' },
    { id: 'settings', label: 'IDENTITY', code: '06', desc: 'Configuration' },
  ];

  const currentItem = navItems.find(item => item.id === activeTab) || navItems[0];

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 280);
  };

  return (
    <nav
      aria-label="Workspace Navigation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed top-4 left-4 sm:left-8 z-50 select-none"
    >
      {/* ── RETRACTED / DOCKED INSTRUMENT BADGE ── */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-3 py-1.5 border transition-all duration-300 cursor-pointer ${
          isDarkMode
            ? 'bg-[#181816]/90 border-[#2D2D2A] text-[#F3EFE6] hover:border-[#42423E]'
            : 'bg-[#F9F7F2]/90 border-[#DFDBD2] text-[#171716] hover:border-[#BDB8AC]'
        } backdrop-blur-md shadow-sm`}
      >
        {/* Navigation Indicator Dot / Grid Icon */}
        <div className="flex flex-col gap-0.5 justify-center w-3 h-3">
          <span className={`w-3 h-0.5 transition-colors ${isOpen ? 'bg-[#B84F2B]' : 'bg-current opacity-70'}`} />
          <span className={`w-2 h-0.5 transition-colors ${isOpen ? 'bg-[#B84F2B]' : 'bg-current opacity-70'}`} />
          <span className={`w-3 h-0.5 transition-colors ${isOpen ? 'bg-[#B84F2B]' : 'bg-current opacity-70'}`} />
        </div>

        {/* Current Space Designation */}
        <div className="flex items-baseline gap-2 font-mono text-xs">
          <span className="font-semibold tracking-wider text-[#B84F2B]">
            {currentItem.label}
          </span>
          <span className="opacity-40 hidden sm:inline">·</span>
          <span className="opacity-50 text-[11px] hidden sm:inline">
            {timeStr}
          </span>
        </div>

        {/* Subtle expand chevron */}
        <span className={`text-[10px] opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </div>

      {/* ── EXPANDED INSTRUMENT FLIGHT PANEL ── */}
      {isOpen && (
        <div 
          className={`anim-enter-subtle absolute top-full left-0 mt-2 w-64 border p-3 space-y-1 shadow-xl transition-all ${
            isDarkMode 
              ? 'bg-[#161614] border-[#2D2D2A] text-[#F3EFE6]' 
              : 'bg-[#FDFBF7] border-[#DFDBD2] text-[#171716]'
          } backdrop-blur-xl`}
          style={{ animationDuration: '0.2s' }}
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-current/10 font-mono text-[10px] tracking-wider uppercase opacity-50">
            <span>Workspace Controls</span>
            <span>{timeStr}</span>
          </div>

          {/* Navigation Controls */}
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isDisabled = showTutorial && !hasImportedRoadmap && item.id !== 'roadmap';

            return (
              <button
                key={item.id}
                id={`${item.id}-nav-item`}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-left font-mono transition-all group ${
                  isActive
                    ? 'bg-current/10 text-[#B84F2B] font-medium'
                    : 'opacity-65 hover:opacity-100 hover:bg-current/5'
                } ${isDisabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[10px] opacity-40 font-mono">
                    {item.code}
                  </span>
                  <span className="text-xs tracking-wider font-sans font-medium text-current">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B84F2B]" />
                  )}
                  <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">
                    →
                  </span>
                </div>
              </button>
            );
          })}

          {/* Bottom Instruments: Theme Toggle & Identity Info */}
          <div className="pt-2 mt-2 border-t border-current/10 flex items-center justify-between text-xs font-mono opacity-70">
            <span className="text-[10px] tracking-wide">
              LT // BENCH
            </span>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-1 hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[11px]"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#B84F2B]" />
                  <span>LIGHT</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#B84F2B]" />
                  <span>DARK</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavigationRail;
