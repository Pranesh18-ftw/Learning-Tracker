/**
 * scientificVisualTruthfulness.test.js
 *
 * Strict test matrix for P0.5 Truthful & Scientifically Correct Learning Visuals.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import LearningVisual from '../components/LearningVisual';
import {
  calculateCapacitorEnergy,
  formatEnergy,
  calculateRcTau,
  calculateRcChargingVoltage,
  calculateRcDischargeVoltage,
  calculateRcChargingCurrent,
  calculateOhmsLawCurrent
} from '../utils/physicsCalculations';
import {
  VISUAL_REGISTRY,
  VISUAL_CLASSIFICATION,
  getRegisteredVisual,
  isConceptAllowedForVisual,
  getAllRegisteredVisualIds
} from '../shared/visualRegistry';
import { resolveLearningVisual } from '../utils/visualResolver';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('P0.5 — Capacitor Energy Physical Model (E = 1/2 C V^2)', () => {
  test('regression: C = 10 µF, V = 10 V yields exactly 0.0005 J (500 µJ)', () => {
    const cFarads = 10 * 1e-6; // 10 µF
    const vVolts = 10; // 10 V
    const energyJoules = calculateCapacitorEnergy(cFarads, vVolts);

    expect(energyJoules).toBeCloseTo(0.0005, 7); // 500 µJ
    const formatted = formatEnergy(energyJoules);
    expect(formatted.value).toBe(500.0);
    expect(formatted.unit).toBe('µJ');
    expect(formatted.formatted).toBe('500.0 µJ');
  });

  test('zero capacitance yields zero energy', () => {
    expect(calculateCapacitorEnergy(0, 10)).toBe(0);
  });

  test('zero voltage yields zero energy', () => {
    expect(calculateCapacitorEnergy(10 * 1e-6, 0)).toBe(0);
  });

  test('nanofarad conversion: C = 100 nF, V = 5 V', () => {
    const cFarads = 100 * 1e-9; // 100 nF
    const vVolts = 5; // 5 V
    // E = 0.5 * 100e-9 * 25 = 1.25e-6 J = 1.25 µJ
    const energy = calculateCapacitorEnergy(cFarads, vVolts);
    expect(energy).toBeCloseTo(1.25e-6, 9);
    const formatted = formatEnergy(energy);
    expect(formatted.formatted).toBe('1.3 µJ');
  });

  test('millijoule range: C = 100 µF, V = 12 V', () => {
    const cFarads = 100 * 1e-6; // 100 µF
    const vVolts = 12; // 12 V
    // E = 0.5 * 100e-6 * 144 = 0.0072 J = 7.2 mJ
    const energy = calculateCapacitorEnergy(cFarads, vVolts);
    expect(energy).toBeCloseTo(0.0072, 6);
    const formatted = formatEnergy(energy);
    expect(formatted.unit).toBe('mJ');
    expect(formatted.formatted).toBe('7.20 mJ');
  });

  test('large capacitance / voltage handling', () => {
    const cFarads = 1.0; // 1 Farad supercapacitor
    const vVolts = 2.5; // 2.5 V
    // E = 0.5 * 1.0 * 6.25 = 3.125 J
    const energy = calculateCapacitorEnergy(cFarads, vVolts);
    expect(energy).toBeCloseTo(3.125, 4);
    const formatted = formatEnergy(energy);
    expect(formatted.unit).toBe('J');
    expect(formatted.formatted).toBe('3.125 J');
  });

  test('rejects negative capacitance or non-finite inputs gracefully', () => {
    expect(calculateCapacitorEnergy(-10, 5)).toBe(0);
    expect(calculateCapacitorEnergy(NaN, 5)).toBe(0);
    expect(calculateCapacitorEnergy(10, Infinity)).toBe(0);
  });
});

describe('P0.5 — RC Time Constant & Charging/Discharging Dynamics', () => {
  const rOhms = 10 * 1e3; // 10 kΩ
  const cFarads = 10 * 1e-6; // 10 µF
  const vsVolts = 10.0; // 10 V

  test('tau calculation: τ = R * C (10 kΩ * 10 µF = 0.1 s = 100 ms)', () => {
    const tau = calculateRcTau(rOhms, cFarads);
    expect(tau).toBeCloseTo(0.1, 5);
  });

  test('charging at t = 0: V_c(0) = 0 V', () => {
    const vc0 = calculateRcChargingVoltage(vsVolts, 0, rOhms, cFarads);
    expect(vc0).toBe(0);
  });

  test('charging at t = τ: V_c(τ) ≈ 0.63212 * V_s (~6.32 V for 10V)', () => {
    const tau = calculateRcTau(rOhms, cFarads);
    const vcTau = calculateRcChargingVoltage(vsVolts, tau, rOhms, cFarads);
    const expected = vsVolts * (1 - Math.exp(-1)); // ~6.3212 V
    expect(vcTau).toBeCloseTo(expected, 4);
    expect(vcTau / vsVolts).toBeCloseTo(0.63212, 4);
  });

  test('charging is strictly monotonic', () => {
    const tau = calculateRcTau(rOhms, cFarads);
    const v1 = calculateRcChargingVoltage(vsVolts, 0.5 * tau, rOhms, cFarads);
    const v2 = calculateRcChargingVoltage(vsVolts, 1.0 * tau, rOhms, cFarads);
    const v3 = calculateRcChargingVoltage(vsVolts, 2.0 * tau, rOhms, cFarads);
    const v4 = calculateRcChargingVoltage(vsVolts, 5.0 * tau, rOhms, cFarads);

    expect(v1).toBeLessThan(v2);
    expect(v2).toBeLessThan(v3);
    expect(v3).toBeLessThan(v4);
  });

  test('charging asymptotically approaches V_s at large t (e.g. t = 7τ)', () => {
    const tau = calculateRcTau(rOhms, cFarads);
    const vcLarge = calculateRcChargingVoltage(vsVolts, 10 * tau, rOhms, cFarads);
    expect(vcLarge).toBeCloseTo(vsVolts, 2);
    expect(vcLarge).toBeLessThanOrEqual(vsVolts);
  });

  test('discharging at t = 0: V_c(0) = V_0', () => {
    const vc0 = calculateRcDischargeVoltage(vsVolts, 0, rOhms, cFarads);
    expect(vc0).toBe(vsVolts);
  });

  test('discharging at t = τ: V_c(τ) ≈ 0.36788 * V_0 (~3.68 V for 10V)', () => {
    const tau = calculateRcTau(rOhms, cFarads);
    const vcTau = calculateRcDischargeVoltage(vsVolts, tau, rOhms, cFarads);
    const expected = vsVolts * Math.exp(-1);
    expect(vcTau).toBeCloseTo(expected, 4);
  });

  test('instantaneous current at t = 0: I(0) = V_s / R', () => {
    const i0 = calculateRcChargingCurrent(vsVolts, 0, rOhms, cFarads);
    expect(i0).toBeCloseTo(vsVolts / rOhms, 6); // 10V / 10kΩ = 1 mA = 0.001 A
  });

  test('instantaneous current decays exponentially', () => {
    const tau = calculateRcTau(rOhms, cFarads);
    const iTau = calculateRcChargingCurrent(vsVolts, tau, rOhms, cFarads);
    expect(iTau).toBeCloseTo((vsVolts / rOhms) * Math.exp(-1), 6);
  });
});

describe('P0.5 — Ohm\'s Law Model (I = V / R)', () => {
  test('calculates correct current for standard values', () => {
    const current = calculateOhmsLawCurrent(12, 4000); // 12V, 4kΩ
    expect(current).toBeCloseTo(0.003, 5); // 3 mA
  });

  test('zero voltage yields zero current', () => {
    expect(calculateOhmsLawCurrent(0, 1000)).toBe(0);
  });

  test('handles invalid resistance gracefully', () => {
    expect(calculateOhmsLawCurrent(10, 0)).toBe(0);
    expect(calculateOhmsLawCurrent(10, -500)).toBe(0);
  });
});

describe('P0.5 — Visual Registry & Classification Integrity', () => {
  test('every registered visual declares strict classification', () => {
    const visualIds = getAllRegisteredVisualIds();
    expect(visualIds.length).toBeGreaterThan(0);

    visualIds.forEach(id => {
      const entry = VISUAL_REGISTRY[id];
      expect([
        VISUAL_CLASSIFICATION.QUANTITATIVE,
        VISUAL_CLASSIFICATION.CONCEPTUAL,
        VISUAL_CLASSIFICATION.ILLUSTRATIVE
      ]).toContain(entry.classification);

      expect(entry.visualId).toBe(id);
      expect(entry.model).toBeDefined();
      expect(Array.isArray(entry.allowedConceptIds)).toBe(true);
      expect(entry.allowedConceptIds.length).toBeGreaterThan(0);
      expect(entry.classificationBadge).toBeDefined();
    });
  });

  test('rc-charging and ohms-law are classified as QUANTITATIVE', () => {
    expect(VISUAL_REGISTRY['rc-charging'].classification).toBe(VISUAL_CLASSIFICATION.QUANTITATIVE);
    expect(VISUAL_REGISTRY['ohms-law'].classification).toBe(VISUAL_CLASSIFICATION.QUANTITATIVE);
  });

  test('bjt-switch and diode-barrier are classified as CONCEPTUAL', () => {
    expect(VISUAL_REGISTRY['bjt-switch'].classification).toBe(VISUAL_CLASSIFICATION.CONCEPTUAL);
    expect(VISUAL_REGISTRY['diode-barrier'].classification).toBe(VISUAL_CLASSIFICATION.CONCEPTUAL);
  });
});

describe('P0.5 — Phase 8 Visual Mapping Safety (Fail-Closed)', () => {
  test('1. A capacitor safety concept does NOT receive RC charging simulation', () => {
    // "capacitor-safety" is NOT in allowedConceptIds for "rc-charging"
    const visual = resolveLearningVisual({
      visualId: 'rc-charging',
      conceptId: 'capacitor-safety',
      name: 'Capacitor Safety Protocol'
    });

    expect(visual.type).toBe('none');
    expect(visual.title).toBeNull();
  });

  test('2. A transistor-bias concept receives only its explicitly registered visual', () => {
    const validVisual = resolveLearningVisual({
      visualId: 'bjt-switch',
      conceptId: 'bjt-cutoff-saturation',
      name: 'BJT Cutoff & Saturation'
    });

    expect(validVisual.type).toBe('interactive');
    expect(validVisual.model).toBe('bjt-switch');
    expect(validVisual.classification).toBe(VISUAL_CLASSIFICATION.CONCEPTUAL);

    // Mismatched visualId on transistor concept fails closed
    const invalidVisual = resolveLearningVisual({
      visualId: 'rc-charging', // WRONG visual requested for transistor
      conceptId: 'bjt-cutoff-saturation',
      name: 'BJT Cutoff & Saturation'
    });

    expect(invalidVisual.type).toBe('none');
  });

  test('3. An unrelated concept receives no simulation', () => {
    const visual = resolveLearningVisual({
      name: 'Ancient History Essay',
      taskName: 'Liberal Arts'
    });

    expect(visual.type).toBe('none');
    expect(visual.title).toBeNull();
  });

  test('4. A task with keywords like "capacitor" but NO visualId receives NO simulation', () => {
    // Pure keyword presence must NOT trigger a simulation
    const keywordOnlyTask = {
      name: 'High Voltage Capacitor Handling',
      taskName: 'Laboratory Safety'
    };

    const visual = resolveLearningVisual(keywordOnlyTask);
    expect(visual.type).toBe('none');
  });

  test('5. Visual registry rejects unknown visual IDs', () => {
    const visual = resolveLearningVisual({
      visualId: 'fake-quantum-simulator',
      conceptId: 'quantum-computing'
    });

    expect(visual.type).toBe('none');
    expect(visual.title).toBeNull();
  });

  test('6. A visual cannot be rendered against an incompatible learning item', () => {
    expect(isConceptAllowedForVisual('rc-charging', 'memory-layout-lifetime')).toBe(false);
    expect(isConceptAllowedForVisual('ohms-law', 'synchronization-primitives')).toBe(false);
    expect(isConceptAllowedForVisual('diode-barrier', 'python-programming')).toBe(false);
  });
});

describe('P0.5 — LearningVisual Component & Downstream Trust', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
  });

  test('LearningVisual renders null when visual is null or type is "none"', () => {
    root = createRoot(container);
    act(() => {
      root.render(<LearningVisual visual={{ type: 'none' }} />);
    });

    expect(container.innerHTML).toBe('');
  });

  test('LearningVisual renders quantitative RC model with exact formula and energy', () => {
    const visual = getRegisteredVisual('rc-charging');
    root = createRoot(container);
    act(() => {
      root.render(<LearningVisual visual={visual} />);
    });

    expect(container.textContent).toContain('QUANTITATIVE MODEL');
    expect(container.textContent).toContain('Capacitor Dynamics');
    expect(container.textContent).toContain('500.0 µJ'); // 10 µF @ 10V
    expect(container.textContent).toContain('τ = R · C');
  });

  test('visual interaction does NOT create completion, mastery, or evidence records', () => {
    // Snapshot storage before interaction
    const initialStorage = { ...localStorage };

    const visual = getRegisteredVisual('rc-charging');
    root = createRoot(container);
    act(() => {
      root.render(<LearningVisual visual={visual} />);
    });

    // Find and click the charge/discharge switch
    const switchBtn = container.querySelector('button');
    expect(switchBtn).not.toBeNull();
    act(() => {
      switchBtn.click();
    });

    // Confirm local storage was NOT mutated with task completion or mastery
    expect(localStorage.getItem('sessions')).toBe(initialStorage.sessions || null);
    expect(localStorage.getItem('concept_evidence_takes')).toBe(initialStorage.concept_evidence_takes || null);
  });
});

describe('P0.5 — Zero Question-Bank Coupling & Generic Domain Reusability', () => {
  test('visual registry does NOT contain question banks, question IDs, or assessment scoring', () => {
    const allIds = getAllRegisteredVisualIds();
    expect(allIds.length).toBeGreaterThan(0);

    allIds.forEach(id => {
      const entry = getRegisteredVisual(id);
      expect(entry.questions).toBeUndefined();
      expect(entry.questionId).toBeUndefined();
      expect(entry.questionBank).toBeUndefined();
      expect(entry.assessment).toBeUndefined();
      expect(entry.quiz).toBeUndefined();
    });
  });

  test('learning visuals are driven strictly by domain parameters (manipulation & observation), not questions', () => {
    const rc = getRegisteredVisual('rc-charging');
    expect(rc.requiredParameters).toEqual(expect.arrayContaining(['capacitanceUf', 'resistanceKohm', 'supplyVoltage']));
    expect(rc.requiredParameters).not.toContain('questionId');

    const ohms = getRegisteredVisual('ohms-law');
    expect(ohms.requiredParameters).toEqual(expect.arrayContaining(['resistanceKohm', 'voltageVolts']));
    expect(ohms.requiredParameters).not.toContain('questionId');
  });

  test('visuals span arbitrary heterogeneous domains cleanly without domain lock-in', () => {
    const allIds = getAllRegisteredVisualIds();
    const domains = new Set(allIds.map(id => getRegisteredVisual(id).domain));
    expect(domains.has('Electronics')).toBe(true);
    expect(domains.has('Systems')).toBe(true);
    expect(domains.has('Hardware')).toBe(true);
    expect(domains.has('Programming')).toBe(true);
  });
});
