import { resolveLearningVisual, resolveProofCriteria, resolveChallengePrompt } from '../utils/visualResolver';

describe('Truthful Learning Visual & Explicit Mapping Invariants', () => {
  test('explicit visualIds correctly map to verified interactive models and technical diagrams', () => {
    const testCases = [
      {
        task: { visualId: 'rc-charging', conceptId: 'capacitors-rc-dynamics', name: 'Capacitors', taskName: 'Electrostatics' },
        subject: { name: 'Electronics' },
        expected: { type: 'interactive', model: 'rc-circuit', title: 'Capacitor Charge Dynamics', formula: 'V_C(t) = V_S · (1 - e^(-t / RC))' }
      },
      {
        task: { visualId: 'ohms-law', conceptId: 'resistors-ohms-law', name: "Ohm's Law Verification", taskName: 'Resistor Networks' },
        subject: { name: 'Electronics' },
        expected: { type: 'interactive', model: 'ohms-law', formula: 'I = V / R' }
      },
      {
        task: { visualId: 'bjt-switch', conceptId: 'bjt-cutoff-saturation', name: 'Why does Q1 turn on?', taskName: 'BJT Cutoff & Saturation' },
        subject: { name: 'Electronics' },
        expected: { type: 'interactive', model: 'bjt-switch', title: 'BJT Saturation Switch' }
      },
      {
        task: { visualId: 'diode-barrier', conceptId: 'diode-mechanics', name: 'P-N junction forward & reverse bias', taskName: 'Diode Mechanics' },
        subject: { name: 'Electronics' },
        expected: { type: 'diagram', model: 'diode' }
      },
      {
        task: { visualId: 'memory-model', conceptId: 'memory-layout-lifetime', name: 'Virtual address space layout: stack vs heap', taskName: 'Memory Layout' },
        subject: { name: 'Systems Architecture' },
        expected: { type: 'diagram', model: 'memory-model' }
      }
    ];

    for (const { task, subject, expected } of testCases) {
      const visual = resolveLearningVisual(task, task, subject);
      expect(visual.type).toBe(expected.type);
      expect(visual.model).toBe(expected.model);
      if (expected.title) expect(visual.title).toBe(expected.title);
      if (expected.formula) expect(visual.formula).toBe(expected.formula);
    }
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
