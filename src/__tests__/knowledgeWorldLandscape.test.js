import React from 'react';
import {
  buildSubjectTopology,
  resolveConceptGlyph,
  resolveWhyItMatters,
  resolveConceptCapabilities
} from '../utils/conceptRelationshipResolver';
import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';

describe('Knowledge World Landscape & Topology Suite', () => {
  const sampleSubject = CURATED_ROADMAPS[0].subjects[0]; // Electronics

  test('resolveConceptGlyph correctly identifies schematic symbols', () => {
    expect(resolveConceptGlyph('Capacitors')).toBe('capacitor');
    expect(resolveConceptGlyph('Resistors')).toBe('resistor');
    expect(resolveConceptGlyph('Diode Mechanics')).toBe('diode');
    expect(resolveConceptGlyph('BJT Cutoff & Saturation')).toBe('transistor');
    expect(resolveConceptGlyph('Virtual Address Space')).toBe('memory');
  });

  test('resolveWhyItMatters returns authentic educational physical intuition', () => {
    const capacitorWhy = resolveWhyItMatters('Capacitors');
    expect(capacitorWhy).toContain('electrostatic field');
    expect(capacitorWhy).toContain('energy');

    const resistorWhy = resolveWhyItMatters('Resistors');
    expect(resistorWhy).toContain("Ohm's Law");
  });

  test('resolveConceptCapabilities returns actionable concrete skills', () => {
    const caps = resolveConceptCapabilities('Capacitors');
    expect(caps.length).toBeGreaterThanOrEqual(2);
    expect(caps.some(c => c.includes('RC time constant'))).toBe(true);
  });

  test('buildSubjectTopology generates continuous sequential dependency graph', () => {
    const nextTask = {
      name: 'Capacitors',
      taskId: 'task-capacitors'
    };

    const topology = buildSubjectTopology(sampleSubject, nextTask);

    expect(topology.domainName).toBe('Electronics');
    expect(topology.regions.length).toBeGreaterThan(0);
    expect(topology.allConcepts.length).toBeGreaterThan(0);

    // Orientation line matches format
    expect(topology.orientationLine).toMatch(/\d+ concepts · \d+ established · currently learning/);

    // Verify dependencies
    const secondConcept = topology.allConcepts[1];
    expect(secondConcept.prerequisites).toContain(topology.allConcepts[0].name);

    const firstConcept = topology.allConcepts[0];
    expect(firstConcept.consequences).toContain(topology.allConcepts[1].name);
  });

  test('buildSubjectTopology identifies active concept with "YOU ARE HERE"', () => {
    const targetTask = sampleSubject.phases[0].tasks[0];
    const nextTask = {
      id: targetTask.id || targetTask.name,
      name: targetTask.name,
      taskId: targetTask.id
    };

    const topology = buildSubjectTopology(sampleSubject, nextTask);
    const active = topology.allConcepts.find(c => c.name === targetTask.name);

    expect(active).toBeDefined();
    expect(active.isCurrent).toBe(true);
    expect(topology.currentConcept.name).toBe(targetTask.name);
  });
});
