# Standard Operating Procedure: Vacuum Chamber Leak Detection & Seal Replacement (SOP-VAC-002)
## Semiconductor Vacuum & Thin Film Processing Tools
<!-- License: Synthetic Industrial AI Copilot Documentation - CC-BY-4.0 Compatible -->

### 1. Purpose & Scope
This procedure specifies standard helium mass spectrometry leak detection, rate-of-rise measurement, and elastomeric O-ring replacement for vacuum process chambers (`EQ-2001`, `EQ-2002`).

### 2. Required Tools & Materials
- Portable Helium Mass Spectrometer Leak Detector (Pfeiffer ASM 340)
- High-purity Helium spray probe nozzle and gas cylinder
- Fluorocarbon O-ring replacement kit (Kalrez 7075 / Viton A)
- Vacuum-grade perfluoropolyether lubricant (Fomblin Y-VAC 3)
- Anhydrous Isopropanol (99.9%) and lint-free cleanroom wipes

### 3. Step-by-Step Procedure

#### Phase 1: Isolated Rate-of-Rise Vacuum Verification
1. Evacuate chamber to base pressure (< 1.0e-5 Torr) with turbomolecular pump online.
2. Close high-vacuum throttle gate valve to isolate chamber from pumping train.
3. Monitor pressure rise over a 10-minute interval on capacitance manometer:
   - Acceptable: $< 2.0\text{ mTorr/min}$
   - Marginal (Maintenance scheduled): $2.0 - 5.0\text{ mTorr/min}$
   - Critical Leak (Immediate shutdown): $> 5.0\text{ mTorr/min}$

#### Phase 2: Helium Sniffing / Spray Probe Isolation
1. Connect leak detector inlet to chamber roughing auxiliary port and engage sniffing mode.
2. Direct a fine helium stream ($< 5\text{ sccm}$) around suspect joints in the following order:
   - Chamber lid perimeter main O-ring
   - Viewport quartz window compression flanges
   - RF power feedthrough insulators and gas showerhead seal
   - Throttle valve shaft bellows assembly
3. Observe leak detector helium signal. Any response $> 1.0\times 10^{-9}\text{ mbar}\cdot\text{L/s}$ indicates a leak location.

#### Phase 3: Seal Replacement & Assembly
1. Vent chamber with dry nitrogen (N2) gas to atmospheric pressure.
2. Carefully remove damaged O-ring with a non-marring PTFE pick. Never use metal tools on sealing surfaces.
3. Clean sealing gland with isopropanol and inspect for micro-scratches.
4. Apply a microscopic film of Fomblin grease to the new O-ring (surface should look shiny, not coated).
5. Seat O-ring, torque lid fasteners in cross-pattern to specified $14\text{ N}\cdot\text{m}$, and re-run rate-of-rise test.
