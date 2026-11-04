# Intellectual Property, Provenance & Asset Licensing Record

**Repository:** `Learning Tracker` (`todo app`)  
**Branch:** `experiment/human-centered-visual-design-2026-10-23`  
**License:** MIT License (Repository default)  
**Last Audited:** October 2026

This document provides a legally rigorous record of all visual assets, vector artwork, procedural filters, and micro-textures integrated into the Learning Tracker visual experiment.

---

## 1. Classification & Authorship Provenance

To ensure complete legal transparency and avoid misleading claims, all visual assets in the repository are explicitly categorized under one of the three clear legal provenance classes:

### Class A: Original In-Repo Vector Artwork (Authored for This Project)
*All assets in this class were created and authored directly within this repository as original SVG markup and CSS definitions specifically for Learning Tracker. They are not scraped from third-party image libraries, nor copied from external repositories.*
- **Copyright:** © 2026 Learning Tracker Contributors.
- **License:** **MIT License** (inheriting the project repository license).
- **Redistribution & Modification:** Permitted without royalty under the MIT License terms.

| Asset File | Size | Visual Content & Design Basis | IP & License Clearance |
| :--- | :--- | :--- | :--- |
| `src/assets/timer/horology-escapement.svg` | ~2.5 kB | Original 12-tooth horological escape wheel, Archimedean balance hairspring spiral, and jewel bearing cabochon. | Original vector composition representing functional mechanics of Swiss lever escapements. Licensed under MIT. |
| `src/assets/roadmap/traveler-walk-cycle.svg` | ~2.8 kB | Original articulated explorer rig with life-support telemetry pack, golden visor, and biomechanical walk-cycle limb pivots. | Original vector character authored for the 2.5D roadmap journey. Zero likeness to third-party trademarked characters. Licensed under MIT. |
| `src/assets/achievements/trophy-burst.svg` | ~3.1 kB | Original volumetric dual-handled chalice on a stepped pedestal base, accented with radial light beams and celebratory sparkles. | Original heraldic vector composition. Licensed under MIT. |
| `src/assets/spider/spider-web-mesh.svg` | ~2.2 kB | Original geometric logarithmic spiral web with tension anchor struts and condensation dewdrop nodes. | Original mathematical geometry based on biological orb-weaver arachnid web construction. Licensed under MIT. |
| `src/assets/symbiote/organic-tendrils.svg` | ~2.1 kB | Original cubic Bezier organic liquid tendrils with obsidian body, specular ridge highlight, and detached fluid micro-droplets. | Original algorithmic fluid vector composition. Zero proprietary assets, logos, or comic book graphics utilized. Licensed under MIT. |
| `src/assets/pacman/pairing-radar.svg` | ~1.9 kB | Original telemetry radar sweep grid with concentric range rings, cardinal reticle markers, and companion lock blips. | Original avionics telemetry vector graphic. Zero proprietary ROM sprites or Bandai Namco assets utilized. Licensed under MIT. |

---

### Class B: Procedural Mathematical XML Filters (Standard Specifications)
*Assets in this class consist of standard functional XML declarations implementing W3C Recommendation filter specifications without pictorial artistic imagery.*

| Asset File | Size | Functional Operation | IP & License Clearance |
| :--- | :--- | :--- | :--- |
| `src/assets/textures/glass-noise.svg` | ~600 B | 10-line XML procedural noise generator using `<feTurbulence type="fractalNoise">` and `<feColorMatrix type="saturate">`. | Implements the open W3C SVG 1.1 / 2.0 Filter Effects Specification. Under international copyright law, functional mathematical algorithms and standard XML element declarations are non-copyrightable functional procedures. To the extent any creative expression exists in parameter values (`baseFrequency=0.75`), it is dedicated to the public domain under **CC0 1.0 Universal** and licensed under the repository's **MIT License**. |

---

### Class C: Upstream Open-Source Dependencies
*Runtime libraries providing graphical icons or tooling.*

| Package | Version | Usage | Upstream License | Attribution & Repository |
| :--- | :--- | :--- | :--- | :--- |
| `lucide-react` | `^0.263.1` | Outline iconography (e.g. `Play`, `CheckCircle2`, `RotateCcw`, `Sparkles`, `Clock`, `Trophy`) | **ISC License** | Copyright © Lucide Contributors (`https://github.com/lucide-icons/lucide`). Permissive open-source license compatible with MIT. |

---

## 2. Trademark & Thematic Inspiration Clearance

The visual design experiment references several iconic interaction paradigms. The intellectual property boundaries are strictly defined as follows:

1. **"Venom / Symbiote" Fluid Interaction:**
   - *Status:* **100% Original Vector & Physics Implementation.**
   - *Detail:* The interaction uses procedural Bezier curves (`M ${originX} ${originY} Q ${cp1X} ${cp1Y} ${tx} ${ty}`) calculated in real time via pointer Euclidean coordinates (`Math.hypot(dx, dy)`). It contains no proprietary character artwork, trademarked logos, or copyrighted assets from Marvel Entertainment, Sony Pictures, or The Walt Disney Company.

2. **"Pac-Man" Pairing Experience:**
   - *Status:* **100% Original Geometric & Telemetry Implementation.**
   - *Detail:* The pairing station uses standard avionics radar range circles, corner reticle brackets, and an original CSS border dot-chomping animation on a linear rail. It contains no proprietary ROM sprites, audio effects, or copyrighted game code from Bandai Namco Entertainment.

3. **"Spider" Revision Reminder:**
   - *Status:* **100% Original Geometric & Vector Implementation.**
   - *Detail:* The revision reminder features a stylized geometric vector arachnid (`StylizedSpiderSvg`) descending on a straight vector line over a logarithmic web mesh. It contains no proprietary superhero character designs, spider-logos, or trademarked material.

---

## 3. Runtime Safety & Dependency Guarantees

1. **Zero External Network Fetching:** All SVG vectors and texture definitions are embedded directly in the bundle or hosted locally in `src/assets/`. No requests are made to third-party image hosts, CDNs, or tracking services at runtime.
2. **Deterministic State Binding:**
   - The horological escapement motion is strictly tied to `status === 'running' || isRunning` and `!isPaused`.
   - The roadmap traveler position is calculated from real task array indices (`currentPos.x`, `currentPos.y`).
   - Achievement celebrations trigger exclusively from confirmed `newlyUnlocked` events in `RoadmapContext`.
   - The spider reminder triggers exclusively from genuine task intervals calculated in `revisionReminderService.js`.
3. **Accessibility & Reduced Motion:** All continuous rotations, oscillations, and pulsating animations are immediately disabled when `prefers-reduced-motion: reduce` is enabled or `isReducedMotion()` returns true.
