/**
 * auditPrompts.js
 *
 * Generates and stores the actual Learning Tracker Deep Research Charter prompts
 * for the 4 target domains under the Universal AI Roadmap Bridge v2.4 Quality Audit.
 */

import { generateDeepResearchCharter } from '../../services/roadmapBridge/researchCharter';

export const AUDIT_DOMAINS = {
  DOMAIN_A_EMBEDDED: {
    id: 'EMBEDDED_SYSTEMS',
    name: 'Embedded Systems Firmware Engineering',
    category: 'HARDWARE_SOFTWARE_ENGINEERING',
    context: {
      goal: 'Embedded Systems Firmware Engineering',
      destination: 'Senior Firmware Engineer capable of architecting bare-metal, RTOS, low-power, and secure embedded firmware for production ARM Cortex-M and RISC-V microcontrollers with formal driver design, fault isolation, and deterministic concurrency.',
      currentLevel: 'INTERMEDIATE',
      purpose: 'CAREER_MASTERY',
      targetHorizon: '6-9 months',
      weeklyHours: 15,
      priorKnowledge: 'C programming, fundamental digital logic, basic microcontroller register access, basic microcontroller peripheral usage.',
      constraints: 'Learner has development kits (STM32 Cortex-M4, ESP32, nRF52), logic analyzer, SWD debugger; requires production-grade engineering patterns beyond hobbyist Arduino libraries.'
    }
  },
  DOMAIN_B_CONTROL: {
    id: 'CONTROL_SYSTEMS',
    name: 'Control Systems Engineering',
    category: 'CYBER_PHYSICAL_MATHEMATICAL_ENGINEERING',
    context: {
      goal: 'Control Systems Engineering',
      destination: 'Control Systems Engineer proficient in state-space dynamical modeling, multivariable robust control (LQR, LQG, H-infinity), Model Predictive Control (MPC), Kalman observer synthesis, and real-time discrete microcontroller deployment.',
      currentLevel: 'INTERMEDIATE',
      purpose: 'CAREER_AND_RESEARCH',
      targetHorizon: '6-9 months',
      weeklyHours: 15,
      priorKnowledge: 'Differential equations, multivariable calculus, linear algebra, Laplace transforms, basic classical single-input single-output PID tuning.',
      constraints: 'Learner has access to MATLAB/Simulink and Python (scipy.signal, control, CVXPY); requires mathematical rigor and physical stability proofs rather than heuristic tuning.'
    }
  },
  DOMAIN_C_PLASMA: {
    id: 'PLASMA_PHYSICS',
    name: 'Plasma Physics',
    category: 'THEORETICAL_AND_COMPUTATIONAL_PHYSICS',
    context: {
      goal: 'Plasma Physics',
      destination: 'Plasma Physicist capable of analyzing kinetic and magnetohydrodynamic (MHD) plasma phenomena, wave-particle interactions, magnetic confinement (tokamaks/stellarators), and implementing computational plasma simulations (Particle-In-Cell & MHD).',
      currentLevel: 'BEGINNER_TO_INTERMEDIATE',
      purpose: 'ACADEMIC_RESEARCH',
      targetHorizon: '9-12 months',
      weeklyHours: 15,
      priorKnowledge: 'Vector calculus, classical mechanics, Maxwell electrodynamics, thermodynamics and statistical mechanics.',
      constraints: 'Learner requires theoretical derivations from first principles, mathematical proofs of instabilities, and computational physics benchmarks in Python/C++.'
    }
  },
  DOMAIN_D_HISTORIOGRAPHY: {
    id: 'HISTORIOGRAPHY',
    name: 'Historiography & Historical Methodology',
    category: 'HUMANITIES_SCHOLARLY_DISCIPLINE',
    context: {
      goal: 'Historiography & Historical Methodology',
      destination: 'Professional Historian capable of primary source criticism (external and internal diplomatic heuristics), comparative historiographical debate analysis, prosopographical/archival investigation, and formulating rigorous evidenced historical monographs.',
      currentLevel: 'BEGINNER',
      purpose: 'SCHOLARLY_MASTERY',
      targetHorizon: '6-9 months',
      weeklyHours: 12,
      priorKnowledge: 'General world history, introductory essay writing, basic archival reading.',
      constraints: 'Learner accesses digital manuscript archives (JSTOR, HathiTrust, British Library collections, National Archives); must strictly avoid STEM-specific assumptions like coding or circuit design.'
    }
  }
};

/**
 * Generates the live research charter prompt for each domain using generateDeepResearchCharter.
 */
export function getGeneratedCharterPrompts() {
  return {
    DOMAIN_A: generateDeepResearchCharter(AUDIT_DOMAINS.DOMAIN_A_EMBEDDED.context),
    DOMAIN_B: generateDeepResearchCharter(AUDIT_DOMAINS.DOMAIN_B_CONTROL.context),
    DOMAIN_C: generateDeepResearchCharter(AUDIT_DOMAINS.DOMAIN_C_PLASMA.context),
    DOMAIN_D: generateDeepResearchCharter(AUDIT_DOMAINS.DOMAIN_D_HISTORIOGRAPHY.context)
  };
}
