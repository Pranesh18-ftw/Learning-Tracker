import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';

describe('Cinematic Learning OS — NOW & SCENE Architecture', () => {
  test('validates curated roadmap domain hierarchies, trajectory arcs, and linear storyboard frame mapping', () => {
    expect(CURATED_ROADMAPS).toHaveLength(2);

    // 1. Electronics track: Arc -> Scene -> Take hierarchy
    const electronics = CURATED_ROADMAPS.find(r => r.id === 'electronics-embedded');
    expect(electronics).toBeDefined();
    expect(electronics.subjects[0].name).toBe('Electronics');

    const arc02 = electronics.subjects[0].phases.find(p => p.name === 'Transistor Switching');
    expect(arc02).toBeDefined();

    const bjtTask = arc02.tasks.find(t => t.name === 'BJT Cutoff & Saturation');
    expect(bjtTask).toBeDefined();
    expect(bjtTask.time).toBe(38);

    const q1Subtask = bjtTask.subtasks.find(s => s.name === 'Why does Q1 turn on?');
    expect(q1Subtask).toBeDefined();
    expect(q1Subtask.completed).toBe(false);

    // 2. Systems Programming track: memory and concurrency arcs
    const systems = CURATED_ROADMAPS.find(r => r.id === 'systems-software');
    expect(systems).toBeDefined();
    expect(systems.subjects[0].phases).toHaveLength(2);

    const memoryArc = systems.subjects[0].phases[0];
    expect(memoryArc.name).toBe('Memory Model & Pointer Semantics');

    const concurrencyArc = systems.subjects[0].phases[1];
    expect(concurrencyArc.name).toBe('Concurrent State Execution');

    // 3. Storyboard frame mapping: linear reel representation
    const frames = [];
    arc02.tasks.forEach((task) => {
      task.subtasks.forEach((subtask) => {
        frames.push({
          id: subtask.id || subtask.name,
          name: subtask.name,
          taskName: task.name,
          completed: Boolean(subtask.completed)
        });
      });
    });

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].name).toBe('Biasing fundamentals and load line analysis');
    expect(frames[0].completed).toBe(false);
    expect(frames[1].name).toBe('Why does Q1 turn on?');
    expect(frames[1].completed).toBe(false);
  });
});
