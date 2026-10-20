import { resolveLearningVisual, resolveProofCriteria, resolveChallengePrompt } from '../utils/visualResolver';

describe('Truthful Learning Visual & Explicit Mapping Invariants', () => {
  test('task with explicit visualId "rc-charging" maps to authentic rc-circuit model', () => {
    const task = {
      visualId: 'rc-charging',
      conceptId: 'capacitors-rc-dynamics',
      name: 'Capacitors',
      taskName: 'Electrostatics'
    };
    const visual = resolveLearningVisual(task, task, { name: 'Electronics' });

    expect(visual.type).toBe('interactive');
    expect(visual.model).toBe('rc-circuit');
    expect(visual.title).toBe('Capacitor Charge Dynamics');
    expect(visual.formula).toBe('V_C(t) = V_S · (1 - e^(-t / RC))');
    expect(visual.model).not.toBe('ohms-law');
  });

  test('task with explicit visualId "ohms-law" maps to ohms-law model', () => {
    const task = {
      visualId: 'ohms-law',
      conceptId: 'resistors-ohms-law',
      name: "Ohm's Law Verification",
      taskName: 'Resistor Networks'
    };
    const visual = resolveLearningVisual(task, task, { name: 'Electronics' });

    expect(visual.type).toBe('interactive');
    expect(visual.model).toBe('ohms-law');
    expect(visual.formula).toBe('I = V / R');
  });

  test('task with explicit visualId "bjt-switch" maps to bjt-switch model', () => {
    const task = {
      visualId: 'bjt-switch',
      conceptId: 'bjt-cutoff-saturation',
      name: 'Why does Q1 turn on?',
      taskName: 'BJT Cutoff & Saturation'
    };
    const visual = resolveLearningVisual(task, task, { name: 'Electronics' });

    expect(visual.type).toBe('interactive');
    expect(visual.model).toBe('bjt-switch');
    expect(visual.title).toBe('BJT Saturation Switch');
  });

  test('task with explicit visualId "diode-barrier" maps to diode diagram', () => {
    const task = {
      visualId: 'diode-barrier',
      conceptId: 'diode-mechanics',
      name: 'P-N junction forward & reverse bias',
      taskName: 'Diode Mechanics'
    };
    const visual = resolveLearningVisual(task, task, { name: 'Electronics' });

    expect(visual.type).toBe('diagram');
    expect(visual.model).toBe('diode');
  });

  test('task with explicit visualId "memory-model" maps to memory-model diagram', () => {
    const task = {
      visualId: 'memory-model',
      conceptId: 'memory-layout-lifetime',
      name: 'Virtual address space layout: stack vs heap',
      taskName: 'Memory Layout'
    };
    const visual = resolveLearningVisual(task, task, { name: 'Systems Architecture' });

    expect(visual.type).toBe('diagram');
    expect(visual.model).toBe('memory-model');
  });

  test('unmapped abstract task resolves to type "none" (no fake simulator)', () => {
    const task = { name: 'Ancient History Essay', taskName: 'Liberal Arts' };
    const visual = resolveLearningVisual(task, task, { name: 'History' });

    expect(visual.type).toBe('none');
    expect(visual.title).toBeNull();
  });

  test('keyword-only tasks without visualId FAIL CLOSED to type "none"', () => {
    // "Capacitor safety" without explicit visualId must NEVER receive a simulation
    const task = { name: 'Capacitor Safety & High Voltage Discharge', taskName: 'Safety' };
    const visual = resolveLearningVisual(task, task, { name: 'Electronics' });

    expect(visual.type).toBe('none');
    expect(visual.title).toBeNull();
  });

  test('proof criteria for capacitors returns concrete RC and energy benchmarks', () => {
    const criteria = resolveProofCriteria({ conceptId: 'capacitors-rc-dynamics' }, { name: 'RC time constant' });
    expect(criteria.length).toBeGreaterThanOrEqual(3);
    expect(criteria.some(c => c.includes('capacitance'))).toBe(true);
    expect(criteria.some(c => c.includes('RC time constant'))).toBe(true);
  });

  test('challenge prompt returns natural direct educational rationale', () => {
    const promptCapacitor = resolveChallengePrompt({ taskName: 'Capacitors' }, { name: 'Capacitors' });
    expect(promptCapacitor).toBe('Understand how a capacitor stores and releases energy.');

    const promptOhm = resolveChallengePrompt({ taskName: 'Resistors' }, { name: 'Ohm’s law' });
    expect(promptOhm).toBe('Understand why current scales inversely with resistance.');
  });
});
