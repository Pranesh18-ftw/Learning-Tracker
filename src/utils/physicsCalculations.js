/**
 * physicsCalculations.js
 *
 * Pure, scientifically validated physics and electronics calculation module.
 * Adheres strictly to standard SI units and analytical physical equations.
 *
 * Rules:
 * - Zero arbitrary scaling factors
 * - Zero frame-based or animation-derived physical states
 * - Strict mathematical correctness with floating-point tolerance
 */

/**
 * Calculates energy stored in an electrostatic field of a capacitor.
 * Equation: E = 1/2 * C * V^2
 *
 * @param {number} cFarads - Capacitance in FARADS (F)
 * @param {number} vVolts - Voltage across plates in VOLTS (V)
 * @returns {number} Energy in JOULES (J)
 */
export const calculateCapacitorEnergy = (cFarads, vVolts) => {
  const c = Number(cFarads);
  const v = Number(vVolts);

  if (!Number.isFinite(c) || !Number.isFinite(v) || c < 0) {
    return 0;
  }

  // E = 0.5 * C * V^2
  return 0.5 * c * Math.pow(v, 2);
};

/**
 * Formats energy in Joules to a clear, honest SI representation (µJ, mJ, or J).
 * Avoids false precision.
 *
 * @param {number} energyJoules - Energy in Joules
 * @returns {{ value: number, unit: string, formatted: string }}
 */
export const formatEnergy = (energyJoules) => {
  if (!Number.isFinite(energyJoules) || energyJoules <= 0) {
    return { value: 0, unit: 'µJ', formatted: '0.0 µJ' };
  }

  if (energyJoules < 0.001) {
    // Microjoules (µJ)
    const valUj = energyJoules * 1e6;
    return {
      value: Number(valUj.toFixed(1)),
      unit: 'µJ',
      formatted: `${valUj.toFixed(1)} µJ`
    };
  }

  if (energyJoules < 1) {
    // Millijoules (mJ)
    const valMj = energyJoules * 1e3;
    return {
      value: Number(valMj.toFixed(2)),
      unit: 'mJ',
      formatted: `${valMj.toFixed(2)} mJ`
    };
  }

  return {
    value: Number(energyJoules.toFixed(3)),
    unit: 'J',
    formatted: `${energyJoules.toFixed(3)} J`
  };
};

/**
 * Calculates the RC time constant (tau = R * C).
 *
 * @param {number} rOhms - Resistance in OHMS (Ω)
 * @param {number} cFarads - Capacitance in FARADS (F)
 * @returns {number} Tau in SECONDS (s)
 */
export const calculateRcTau = (rOhms, cFarads) => {
  const r = Number(rOhms);
  const c = Number(cFarads);

  if (!Number.isFinite(r) || !Number.isFinite(c) || r <= 0 || c <= 0) {
    return 0;
  }

  return r * c;
};

/**
 * Calculates capacitor voltage during charging.
 * Equation: V_c(t) = V_s * (1 - exp(-t / (R * C)))
 * At t = tau, V_c(tau) ≈ 0.63212 * V_s
 *
 * @param {number} vsVolts - Supply voltage in VOLTS (V)
 * @param {number} tSeconds - Elapsed time in SECONDS (s)
 * @param {number} rOhms - Resistance in OHMS (Ω)
 * @param {number} cFarads - Capacitance in FARADS (F)
 * @returns {number} Capacitor voltage V_c in VOLTS (V)
 */
export const calculateRcChargingVoltage = (vsVolts, tSeconds, rOhms, cFarads) => {
  const vs = Number(vsVolts);
  const t = Number(tSeconds);
  const tau = calculateRcTau(rOhms, cFarads);

  if (!Number.isFinite(vs) || !Number.isFinite(t) || t <= 0 || tau <= 0) {
    return 0;
  }

  return vs * (1 - Math.exp(-t / tau));
};

/**
 * Calculates capacitor voltage during discharge.
 * Equation: V_c(t) = V_0 * exp(-t / (R * C))
 * At t = tau, V_c(tau) ≈ 0.36788 * V_0
 *
 * @param {number} v0Volts - Initial charged voltage in VOLTS (V)
 * @param {number} tSeconds - Elapsed discharge time in SECONDS (s)
 * @param {number} rOhms - Resistance in OHMS (Ω)
 * @param {number} cFarads - Capacitance in FARADS (F)
 * @returns {number} Capacitor voltage V_c in VOLTS (V)
 */
export const calculateRcDischargeVoltage = (v0Volts, tSeconds, rOhms, cFarads) => {
  const v0 = Number(v0Volts);
  const t = Number(tSeconds);
  const tau = calculateRcTau(rOhms, cFarads);

  if (!Number.isFinite(v0) || !Number.isFinite(t) || v0 <= 0 || tau <= 0) {
    return 0;
  }

  if (t <= 0) return v0;

  return v0 * Math.exp(-t / tau);
};

/**
 * Calculates instantaneous RC charging current.
 * Equation: I(t) = (V_s / R) * exp(-t / (R * C))
 * At t = 0, I(0) = V_s / R
 *
 * @param {number} vsVolts - Supply voltage in VOLTS (V)
 * @param {number} tSeconds - Elapsed time in SECONDS (s)
 * @param {number} rOhms - Resistance in OHMS (Ω)
 * @param {number} cFarads - Capacitance in FARADS (F)
 * @returns {number} Current in AMPERES (A)
 */
export const calculateRcChargingCurrent = (vsVolts, tSeconds, rOhms, cFarads) => {
  const vs = Number(vsVolts);
  const t = Math.max(0, Number(tSeconds) || 0);
  const r = Number(rOhms);
  const tau = calculateRcTau(r, cFarads);

  if (!Number.isFinite(vs) || !Number.isFinite(r) || r <= 0 || tau <= 0) {
    return 0;
  }

  return (vs / r) * Math.exp(-t / tau);
};

/**
 * Calculates current using Ohm's Law.
 * Equation: I = V / R
 *
 * @param {number} vVolts - Voltage in VOLTS (V)
 * @param {number} rOhms - Resistance in OHMS (Ω)
 * @returns {number} Current in AMPERES (A)
 */
export const calculateOhmsLawCurrent = (vVolts, rOhms) => {
  const v = Number(vVolts);
  const r = Number(rOhms);

  if (!Number.isFinite(v) || !Number.isFinite(r) || r <= 0) {
    return 0;
  }

  return v / r;
};
