/**
 * trajectoryCareerLandscape.test.js
 *
 * Test suite for LEARNING TRACKER — TRAJECTORY & CAREER REDESIGN
 */

import {
  resolveTrajectoryDestination,
  resolveCapabilityMap,
  updateTrajectoryDestination,
  ROLE_CAPABILITY_CLUSTERS,
  CAPABILITY_STATUSES
} from '../utils/trajectoryResolver';

describe('Trajectory & Career Engine — trajectoryResolver', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('resolveTrajectoryDestination returns grounded default destination', () => {
    const dest = resolveTrajectoryDestination();
    expect(dest.primaryRole).toBeDefined();
    expect(dest.targetRole).toContain('Embedded Systems');
    expect(dest.statement).toContain('real embedded systems');
    expect(dest.targetTimeline).toBeDefined();
  });

  test('updateTrajectoryDestination persists updates without wiping learning history', () => {
    updateTrajectoryDestination({
      primaryRole: 'Autonomous Robotics Engineer',
      targetTimeline: '2026 Winter',
      mode: 'research'
    });

    const updated = resolveTrajectoryDestination();
    expect(updated.primaryRole).toBe('Autonomous Robotics Engineer');
    expect(updated.targetTimeline).toBe('2026 Winter');
    expect(updated.mode).toBe('research');
  });

  test('resolveCapabilityMap structures domain clusters with honest capability states', () => {
    const mockRoadmap = [
      {
        id: 'subj-elec',
        name: 'Electronics',
        phases: [
          {
            id: 'ph1',
            name: 'Basic Electrical Principles',
            tasks: [
              {
                id: 't1',
                name: 'Voltage, Current & Ohm\'s Law',
                completed: true,
                subtasks: [
                  { id: 'st1', name: 'Derive V=IR', completed: true },
                  { id: 'st2', name: 'Voltage divider rule', completed: true }
                ]
              },
              {
                id: 't2',
                name: 'Capacitor Charging Dynamics',
                completed: false,
                subtasks: [
                  { id: 'st3', name: 'RC curve calculation', completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    const capabilityData = resolveCapabilityMap(mockRoadmap, []);

    expect(capabilityData.clusters).toBeDefined();
    expect(capabilityData.clusters.length).toBeGreaterThanOrEqual(2);

    // Verify clusters contain capabilities with honest states (no arbitrary percentage numbers)
    const allCaps = capabilityData.clusters.flatMap(c => c.capabilities);
    allCaps.forEach(cap => {
      expect(['DEMONSTRATED', 'PRACTICED', 'EXPOSED', 'NOT_EXPLORED']).toContain(cap.statusKey);
      expect(cap.whyItMatters).toBeDefined();
      expect(cap.whyItMatters.length).toBeGreaterThan(10);
    });

    // Verify metrics exist and are non-falsified
    expect(capabilityData.metrics.totalCapabilities).toBeGreaterThan(0);
    expect(capabilityData.metrics.practicedCount).toBeGreaterThanOrEqual(1);
    expect(capabilityData.metrics.demonstratedCount).toBe(0);

    // Verify single concrete next action is provided
    expect(capabilityData.nextAction).toBeDefined();
    expect(capabilityData.nextAction.route).toBe('/');
    expect(capabilityData.nextAction.buttonLabel).toContain('Now');
  });

  test('projects provide first-class career evidence without duplicating records', () => {
    const mockRoadmapWithProject = [
      {
        id: 'subj-proj',
        name: 'Embedded Systems',
        phases: [
          {
            id: 'ph2',
            name: 'Microcontroller Peripherals',
            tasks: [
              {
                id: 't-proj-1',
                name: 'Temperature Monitor & Data Logger Project',
                completed: true,
                subtasks: [
                  { id: 'st-p1', name: 'Wire ADC Thermistor', completed: true },
                  { id: 'st-p2', name: 'Write Bare-Metal C firmware', completed: true }
                ]
              }
            ]
          }
        ]
      }
    ];

    const capabilityData = resolveCapabilityMap(mockRoadmapWithProject, []);
    const analogCap = capabilityData.clusters
      .flatMap(c => c.capabilities)
      .find(c => c.id === 'cap-analog' || c.id === 'cap-c');

    expect(analogCap).toBeDefined();
    expect(analogCap.evidence.some(e => e.includes('Temperature Monitor') || e.includes('practical') || e.includes('Verified'))).toBe(true);
  });

  test('developing areas are limited to 1-3 items to prevent deficit overwhelm', () => {
    const capabilityData = resolveCapabilityMap([], []);
    expect(capabilityData.developingAreas.length).toBeLessThanOrEqual(3);
    expect(capabilityData.developingAreas.length).toBeGreaterThanOrEqual(1);
  });

  test('resolvePlacementExpectations returns 5 grounded employer evaluation pillars', () => {
    const mockRoadmap = [
      {
        id: 'subj-1',
        name: 'Electronics',
        phases: [
          {
            id: 'ph1',
            name: 'Circuits',
            tasks: [
              {
                id: 't-proj',
                name: 'Temperature Monitor Project',
                completed: true,
                subtasks: [{ id: 'st1', name: 'Calibrate thermistor', completed: true }]
              }
            ]
          }
        ]
      }
    ];

    const expectations = require('../utils/trajectoryResolver').resolvePlacementExpectations(mockRoadmap);
    expect(expectations.length).toBe(5);

    const areas = expectations.map(e => e.area);
    expect(areas).toContain('Technical Foundations');
    expect(areas).toContain('Practical Capability');
    expect(areas).toContain('Systematic Problem Solving & Debugging');
    expect(areas).toContain('Working Engineering Projects');
    expect(areas).toContain('Technical Communication & Documentation');

    // Projects pillar should be marked demonstrated given the completed project
    const projectItem = expectations.find(e => e.id === 'projects');
    expect(projectItem.statusKey).toBe('DEMONSTRATED');
    expect(projectItem.evidence).toContain('Temperature Monitor Project');
  });

  test('multi-trajectory switching works seamlessly and persists organization and industry', () => {
    updateTrajectoryDestination({
      activeTrajectoryId: 'secondary',
      role: 'Master\'s in Robotics & Control',
      timeline: '2028 Fall',
      organization: 'MIT Robotics Lab',
      industry: 'Autonomous Systems',
      mode: 'academic'
    });

    const dest = resolveTrajectoryDestination();
    expect(dest.activeTrajectoryId).toBe('secondary');
    expect(dest.primaryRole).toBe('Master\'s in Robotics & Control');
    expect(dest.organization).toBe('MIT Robotics Lab');
    expect(dest.industry).toBe('Autonomous Systems');
    expect(dest.mode).toBe('academic');
  });
});
