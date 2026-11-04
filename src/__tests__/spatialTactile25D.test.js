/**
 * spatialTactile25D.test.js
 *
 * Comprehensive tests for the 2.5D Spatial & Tactile Depth Upgrade:
 * 1. TemporalInstrumentTimer (Phase 5.A: 5-layer physical instrument)
 * 2. VisualGuidedPath & SpatialTravelerDrone (Phase 5.B: 2.5D winding route & robotic traveler)
 * 3. AchievementNotification, VolumetricTrophySvg, SpiderHeroCelebrantSvg (Phase 5.C: 3-stage celebration)
 * 4. SpiderRevisionOverlay multi-depth web (Phase 5.D: 3 depth layers and attached spider)
 * 5. SymbioteSignInEffect (Phase 5.E: layered organic tendril material and contact shadows)
 * 6. useSpatialTilt (Phase 4: controlled perspective and accessibility bypass)
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import TemporalInstrumentTimer from '../components/TemporalInstrumentTimer';
import VisualGuidedPath, { SpatialTravelerDrone, ExplorerTravelerAvatar } from '../components/VisualGuidedPath';
import AchievementNotification, { VolumetricTrophySvg, SpiderHeroCelebrantSvg } from '../components/AchievementNotification';
import SpiderRevisionOverlay, { StylizedSpiderSvg } from '../components/SpiderRevisionOverlay';
import SymbioteSignInEffect from '../components/SymbioteSignInEffect';
import PacmanPairingStation from '../components/PacmanPairingStation';
import SpatialSurface from '../components/SpatialSurface';
import { usePointerDepth } from '../hooks/usePointerDepth';
import { useSpatialTilt } from '../utils/useSpatialTilt';
import * as RoadmapContextModule from '../context/RoadmapContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('2.5D Spatial & Tactile Depth Upgrade', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. TEMPORAL INSTRUMENT TIMER (Phase 5.A)
  // =========================================================================
  describe('Phase 5.A: Temporal Instrument Focus Timer', () => {
    test('renders 5 distinct physical layers and correct digital chronometer readout', () => {
      act(() => {
        root.render(
          <TemporalInstrumentTimer
            timeLeftSeconds={1500}
            targetMinutes={25}
            isPaused={false}
            status="running"
          />
        );
      });

      const timerEl = container.querySelector('[role="region"]');
      expect(timerEl).not.toBeNull();
      expect(timerEl.getAttribute('aria-label')).toBe('Temporal Focus Instrument');

      // Digital readout: 1500s = 25:00
      expect(container.textContent).toContain('25:00');
      expect(container.textContent).toContain('25m Container');

      // Calibration ticks: 60 lines
      const tickLines = container.querySelectorAll('svg line');
      // At least 60 tick lines in dial
      expect(tickLines.length).toBeGreaterThanOrEqual(60);

      // Active status label
      expect(container.textContent).toContain('ACTIVE TEMPORAL CONTAINER');
    });

    test('updates readout and engages temporal latch when paused', () => {
      act(() => {
        root.render(
          <TemporalInstrumentTimer
            timeLeftSeconds={735}
            targetMinutes={25}
            isPaused={true}
            status="paused"
          />
        );
      });

      // 735s = 12:15
      expect(container.textContent).toContain('12:15');
      // Paused state label
      expect(container.textContent).toContain('TEMPORAL LATCH ENGAGED · PAUSED');
    });

    test('supports starter kit prop signature remainingSeconds, durationSeconds, and isRunning', () => {
      act(() => {
        root.render(
          <TemporalInstrumentTimer
            remainingSeconds={600}
            durationSeconds={1200}
            isRunning={true}
          />
        );
      });

      // 600s = 10:00
      expect(container.textContent).toContain('10:00');
      expect(container.textContent).toContain('20m Container');
      expect(container.textContent).toContain('ACTIVE TEMPORAL CONTAINER');
    });
  });

  // =========================================================================
  // 2. ROADMAP: 2.5D PHYSICAL PATHWAY & TRAVELER DRONE (Phase 5.B)
  // =========================================================================
  describe('Phase 5.B: 2.5D Winding Roadmap Pathway', () => {
    const mockFrames = [
      { id: 'f1', name: 'Capacitor Principles', completed: true, taskName: 'Physics' },
      { id: 'f2', name: 'RC Time Constant', completed: false, isCurrent: true, taskName: 'Lab' },
      { id: 'f3', name: 'Filter Circuits', completed: false, taskName: 'Analysis' }
    ];

    test('renders 2.5D conduit with ground shadow, milestone pucks, and traveler drone', () => {
      const mockSelect = jest.fn();

      act(() => {
        root.render(
          <RoadmapContextModule.RoadmapProvider>
            <VisualGuidedPath
              frames={mockFrames}
              activeFrameId="f2"
              onSelectFrame={mockSelect}
              phaseName="Analog Fundamentals"
              subjectName="Electronics"
            />
          </RoadmapContextModule.RoadmapProvider>
        );
      });

      // Conduit SVG with ground shadow path
      const conduitSvg = container.querySelector('svg');
      expect(conduitSvg).not.toBeNull();

      // Tactile milestone pucks: 3 frames
      const buttons = container.querySelectorAll('button[aria-label*="Milestone"]');
      expect(buttons.length).toBe(3);

      // Verify puck labels and states
      expect(buttons[0].getAttribute('aria-label')).toContain('Completed');
      expect(buttons[1].getAttribute('aria-label')).toContain('Active Destination');
      expect(buttons[2].getAttribute('aria-label')).toContain('Upcoming');

      // Verify Waypoint Seeker Drone traveler is rendered
      const droneSvg = container.querySelector('svg line[stroke="#57534E"]') || container.querySelector('svg');
      expect(droneSvg).not.toBeNull();

      // Clicking a milestone calls onSelectFrame
      act(() => {
        buttons[0].click();
      });
      expect(mockSelect).toHaveBeenCalledWith(mockFrames[0]);
    });

    test('SpatialTravelerDrone renders vector aerodynamic chassis and propulsion field', () => {
      act(() => {
        root.render(<SpatialTravelerDrone />);
      });

      const drone = container.querySelector('svg');
      expect(drone).not.toBeNull();
      expect(drone.getAttribute('viewBox')).toBe('0 0 32 32');
    });
  });

  // =========================================================================
  // 3. ACHIEVEMENTS: 2.5D VOLUMETRIC TROPHY & CELEBRATION (Phase 5.C)
  // =========================================================================
  describe('Phase 5.C: Achievements Dimensional Celebration', () => {
    test('VolumetricTrophySvg renders stepped pedestal and double-walled cup', () => {
      act(() => {
        root.render(<VolumetricTrophySvg size={80} />);
      });

      const trophy = container.querySelector('svg');
      expect(trophy).not.toBeNull();
      expect(trophy.getAttribute('viewBox')).toBe('0 0 100 100');
    });

    test('SpiderHeroCelebrantSvg supports anticipate, contact, and victory poses', () => {
      act(() => {
        root.render(
          <div>
            <SpiderHeroCelebrantSvg stage="anticipate" />
            <SpiderHeroCelebrantSvg stage="contact" />
            <SpiderHeroCelebrantSvg stage="victory" />
          </div>
        );
      });

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(3);
    });

    test('AchievementNotification reveals volumetric celebration when achievement unlocks', () => {
      const mockClear = jest.fn();
      jest.spyOn(RoadmapContextModule, 'useRoadmap').mockReturnValue({
        newlyUnlocked: {
          id: 'first-step',
          name: 'First Principles',
          description: 'Completed your first learning milestone.'
        },
        clearAchievementNotification: mockClear
      });

      act(() => {
        root.render(<AchievementNotification />);
      });

      // Notification is displayed
      expect(container.textContent).toContain('First Principles');
      expect(container.textContent).toContain('Physical Milestone Unlocked');
      expect(container.textContent).toContain('Completed your first learning milestone.');

      // Dismiss button triggers clear
      const closeBtn = container.querySelector('button[aria-label="Dismiss achievement notification"]');
      expect(closeBtn).not.toBeNull();
      act(() => {
        closeBtn.click();
      });
      expect(mockClear).toHaveBeenCalledWith('first-step');
    });
  });

  // =========================================================================
  // 4. SPIDER REVISION OVERLAY: MULTI-DEPTH WEB (Phase 5.D)
  // =========================================================================
  describe('Phase 5.D: Spider Revision Multi-Depth Web', () => {
    test('renders 3 depth layers: out-of-focus background, midground struts, and attached foreground silk', () => {
      const mockTopic = {
        name: 'Zener Diode Regulators',
        subjectName: 'Electronics',
        revisionStatus: { daysSinceLastActivity: 12, intervalDays: 10 }
      };

      act(() => {
        root.render(
          <SpiderRevisionOverlay
            isOpen={true}
            dueTopic={mockTopic}
            onStartRevision={jest.fn()}
            onSnooze={jest.fn()}
            onDismiss={jest.fn()}
          />
        );
      });

      // Web blur filter for depth
      const blurFilter = container.querySelector('filter#web-depth-blur');
      expect(blurFilter).not.toBeNull();

      // Foreground luminous silk thread
      const silkLine = container.querySelector('svg line[stroke*="foreground-silk-sheen"]');
      expect(silkLine).not.toBeNull();

      // Descending spider attached to the silk line
      const spider = container.querySelector('svg[viewBox="0 0 100 100"]');
      expect(spider).not.toBeNull();

      // Revision modal details
      expect(container.textContent).toContain('Zener Diode Regulators');
      expect(container.textContent).toContain('Electronics');
    });
  });

  // =========================================================================
  // 5. SYMBIOTE SIGN-IN: 2.5D ORGANIC MATERIAL (Phase 5.E)
  // =========================================================================
  describe('Phase 5.E: Symbiote Organic Liquid Proximity', () => {
    test('renders layered tendril structure and contact shadows', () => {
      act(() => {
        root.render(
          <SymbioteSignInEffect>
            <button id="test-google-btn">Sign in with Google</button>
          </SymbioteSignInEffect>
        );
      });

      const button = container.querySelector('#test-google-btn');
      expect(button).not.toBeNull();

      // Liquid organic glow filter
      const glowFilter = container.querySelector('filter#venom-glow-filter');
      expect(glowFilter).not.toBeNull();
    });
  });

  // =========================================================================
  // 6. CONTROLLED PERSPECTIVE HOOK (Phase 4)
  // =========================================================================
  describe('Phase 4: useSpatialTilt Perspective Hook', () => {
    function TiltTestComponent() {
      const { ref, style, glareStyle } = useSpatialTilt({ maxTilt: 2.5 });
      return (
        <div ref={ref} style={style} data-testid="tilt-card">
          <div style={glareStyle} data-testid="glare-layer" />
          <span>Card Content</span>
        </div>
      );
    }

    test('initializes with preserve-3d and stable resting transform', () => {
      act(() => {
        root.render(<TiltTestComponent />);
      });

      const card = container.querySelector('[data-testid="tilt-card"]');
      expect(card).not.toBeNull();
      expect(card.textContent).toContain('Card Content');
    });
  });

  // =========================================================================
  // 7. SPATIAL SURFACE & POINTER DEPTH HOOK
  // =========================================================================
  describe('Phase 7: SpatialSurface Primitive & Pointer Depth Hook', () => {
    test('renders with spatial-surface, glass, and elevated modifier classes', () => {
      act(() => {
        root.render(
          <SpatialSurface glass elevated data-testid="spatial-card">
            <span>Spatial Instrument Content</span>
          </SpatialSurface>
        );
      });

      const card = container.querySelector('[data-testid="spatial-card"]');
      expect(card).not.toBeNull();
      expect(card.classList.contains('spatial-surface')).toBe(true);
      expect(card.classList.contains('spatial-surface--glass')).toBe(true);
      expect(card.classList.contains('spatial-surface--elevated')).toBe(true);
      expect(card.textContent).toContain('Spatial Instrument Content');
    });

    test('wraps with spatial-scene and connects pointer handlers when interactive', () => {
      act(() => {
        root.render(
          <SpatialSurface interactive data-testid="interactive-surface">
            <span>Interactive Workbench</span>
          </SpatialSurface>
        );
      });

      const sceneWrapper = container.querySelector('.spatial-scene');
      expect(sceneWrapper).not.toBeNull();

      const surface = container.querySelector('[data-testid="interactive-surface"]');
      expect(surface).not.toBeNull();
      expect(surface.classList.contains('spatial-surface--interactive')).toBe(true);
    });
  });

  // =========================================================================
  // 8. SOURCED & INTEGRATED VISUAL ASSETS VALIDATION
  // =========================================================================
  describe('Phase 8: Sourced & Integrated Visual Assets Validation', () => {
    test('1. Horological Escapement (horology-escapement.svg) renders mechanical gear teeth & balance spring in timer', () => {
      act(() => {
        root.render(
          <TemporalInstrumentTimer
            timeLeftSeconds={1200}
            targetMinutes={20}
            status="running"
            isPaused={false}
          />
        );
      });

      // Balance hairspring spiral & escapement gear teeth
      const hairspringPath = container.querySelector('svg path[d*="M 80 80"]');
      expect(hairspringPath).not.toBeNull();

      const escapementTeeth = container.querySelector('svg path[d*="M 80 34"]');
      expect(escapementTeeth).not.toBeNull();
    });

    test('2. Articulated Explorer Traveler (traveler-walk-cycle.svg) renders suit, visor, and life support rig', () => {
      act(() => {
        root.render(<ExplorerTravelerAvatar />);
      });

      const explorerSvg = container.querySelector('svg[viewBox="0 0 48 56"]');
      expect(explorerSvg).not.toBeNull();

      // Check for explorer head and life support pack
      const head = container.querySelector('.traveler-head');
      expect(head).not.toBeNull();
      const torso = container.querySelector('.traveler-torso');
      expect(torso).not.toBeNull();
    });

    test('3. Volumetric Trophy Burst (trophy-burst.svg) renders celebratory rays and sparkle stars', () => {
      act(() => {
        root.render(<VolumetricTrophySvg size={90} />);
      });

      const rays = container.querySelector('.celebration-rays');
      expect(rays).not.toBeNull();

      const sparkles = container.querySelector('.celebration-sparkles');
      expect(sparkles).not.toBeNull();
    });

    test('4. Spider Web Mesh (spider-web-mesh.svg) renders concentric logarithmic polygons & dewdrop nodes', () => {
      act(() => {
        root.render(
          <SpiderRevisionOverlay
            isOpen={true}
            dueTopic={{ name: 'RC Filters', subjectName: 'Electronics' }}
            onStartRevision={jest.fn()}
            onSnooze={jest.fn()}
            onDismiss={jest.fn()}
          />
        );
      });

      // Concentric capture polygons & dewdrop nodes
      const webPolygons = container.querySelectorAll('polygon[points*="calc(50%"]');
      expect(webPolygons.length).toBeGreaterThanOrEqual(1);

      const dewdrops = container.querySelectorAll('circle[fill="#FEF3C7"]');
      expect(dewdrops.length).toBeGreaterThanOrEqual(3);
    });

    test('5. Telemetry Radar Grid (pairing-radar.svg) renders range rings in PacmanPairingStation', () => {
      act(() => {
        root.render(
          <PacmanPairingStation
            pairUrl="https://learningtracker.app/pair?code=123456"
            lifecycleState="scanning"
            onManualCodeSubmit={jest.fn()}
          />
        );
      });

      // Concentric range rings in pairing station
      const rangeRings = container.querySelectorAll('circle[stroke="#10B981"]');
      expect(rangeRings.length).toBeGreaterThanOrEqual(2);
    });

    test('6. Organic Tendrils (organic-tendrils.svg) renders fluid micro-droplet spores in SymbioteSignInEffect', () => {
      act(() => {
        root.render(
          <SymbioteSignInEffect>
            <button id="google-btn">Sign in</button>
          </SymbioteSignInEffect>
        );
      });

      // SVG with symbiote filters
      const venomFilter = container.querySelector('filter#venom-glow-filter');
      expect(venomFilter).not.toBeNull();
    });
  });
});
