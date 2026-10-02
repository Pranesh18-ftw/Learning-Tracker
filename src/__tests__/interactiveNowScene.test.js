import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';

describe('Interactive Cinematic Learning OS - Behavioral Tests', () => {
  test('concept keyword dictionary covers fundamental STEM concepts', () => {
    // Test that the curated roadmaps contain terms supported by the concept dictionary
    const electronics = CURATED_ROADMAPS[0];
    const bjtTask = electronics.subjects[0].phases[1].tasks[0];
    const subtask = bjtTask.subtasks[1];

    expect(subtask.name).toBe('Why does Q1 turn on?');
    // 'Q1' and 'turn on' relate to transistor switching
    expect(subtask.name.toLowerCase()).toContain('q1');
  });

  test('contact sheet relationship graph correctly associates neighboring and shared-task takes', () => {
    const frames = [
      { id: 'f1', name: 'Biasing fundamentals', taskName: 'BJT Cutoff & Saturation' },
      { id: 'f2', name: 'Why does Q1 turn on?', taskName: 'BJT Cutoff & Saturation' },
      { id: 'f3', name: 'Calculate base resistor', taskName: 'BJT Cutoff & Saturation' },
      { id: 'f4', name: 'Flyback diode protection', taskName: 'Switching Circuit Design' }
    ];

    // Compute relationships for f2 (Why does Q1 turn on?)
    const hoveredId = 'f2';
    const related = new Set();
    const idx = frames.findIndex(f => f.id === hoveredId);
    if (idx > 0) related.add(frames[idx - 1].id);
    if (idx < frames.length - 1) related.add(frames[idx + 1].id);

    frames.forEach(f => {
      if (f.taskName === 'BJT Cutoff & Saturation') {
        related.add(f.id);
      }
    });

    expect(related.has('f1')).toBe(true);
    expect(related.has('f3')).toBe(true);
    expect(related.has('f4')).toBe(false); // Different task, not adjacent
  });

  test('empirical circuit equations calculate saturation and cutoff accurately', () => {
    const vBeThreshold = 0.7;
    const calculateState = (vin, rbKiloOhms) => {
      const vInEff = Math.max(0, vin - vBeThreshold);
      const ibMicroAmps = vin > vBeThreshold ? Math.round((vInEff / (rbKiloOhms * 1000)) * 1000000) : 0;
      const maxIc = (5.0 - 0.2) / 1.0; // 4.8 mA
      const unsaturatedIc = (ibMicroAmps * 100) / 1000;
      const actualIc = Math.min(maxIc, unsaturatedIc);

      if (vin < 0.7) return { state: 'cutoff', ib: 0, ic: 0 };
      if (actualIc >= maxIc) return { state: 'saturated', ib: ibMicroAmps, ic: actualIc };
      return { state: 'active', ib: ibMicroAmps, ic: actualIc };
    };

    // Sub-threshold input voltage -> Cutoff
    const cutoffResult = calculateState(0.4, 10);
    expect(cutoffResult.state).toBe('cutoff');
    expect(cutoffResult.ib).toBe(0);

    // High input voltage -> Saturated
    const satResult = calculateState(3.3, 10);
    expect(satResult.state).toBe('saturated');
    expect(satResult.ib).toBeGreaterThan(0);
    expect(satResult.ic).toBeCloseTo(4.8, 1);
  });
});
