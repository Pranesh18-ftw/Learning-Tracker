import { CURATED_ROADMAPS } from '../data/curatedRoadmaps';

describe('Cinematic Learning OS — NOW & SCENE Architecture', () => {
  test('curated roadmaps reflect the Arc -> Scene -> Take hierarchy', () => {
    expect(CURATED_ROADMAPS).toHaveLength(2);

    const electronics = CURATED_ROADMAPS.find(r => r.id === 'electronics-embedded');
    expect(electronics).toBeDefined();
    expect(electronics.subjects[0].name).toBe('Electronics');

    // Arc 02: Transistor Switching
    const arc02 = electronics.subjects[0].phases.find(p => p.name === 'Transistor Switching');
    expect(arc02).toBeDefined();

    // Scene: BJT Cutoff & Saturation
    const bjtTask = arc02.tasks.find(t => t.name === 'BJT Cutoff & Saturation');
    expect(bjtTask).toBeDefined();
    expect(bjtTask.time).toBe(38);

    // Take: Why does Q1 turn on?
    const q1Subtask = bjtTask.subtasks.find(s => s.name === 'Why does Q1 turn on?');
    expect(q1Subtask).toBeDefined();
    expect(q1Subtask.completed).toBe(false);
  });

  test('systems programming curated trajectory has valid memory and concurrency arcs', () => {
    const systems = CURATED_ROADMAPS.find(r => r.id === 'systems-software');
    expect(systems).toBeDefined();
    expect(systems.subjects[0].phases).toHaveLength(2);

    const memoryArc = systems.subjects[0].phases[0];
    expect(memoryArc.name).toBe('Memory Model & Pointer Semantics');

    const concurrencyArc = systems.subjects[0].phases[1];
    expect(concurrencyArc.name).toBe('Concurrent State Execution');
  });

  test('storyboard frame mapping builds linear reel representation', () => {
    const electronics = CURATED_ROADMAPS[0];
    const phase = electronics.subjects[0].phases[1]; // Transistor Switching

    const frames = [];
    phase.tasks.forEach((task) => {
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
    expect(frames[0].completed).toBe(true);
    expect(frames[1].name).toBe('Why does Q1 turn on?');
    expect(frames[1].completed).toBe(false);
  });
});
