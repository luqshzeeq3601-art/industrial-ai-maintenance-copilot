# Standard Operating Procedure: High-Precision Spindle Bearing Replacement
## SOP Reference: SOP-MNT-CNC-014 (Rev 3.0)
**Applicable Equipment**: ApexMill-500, ApexMill-750, Lathe-X200
**Department**: Mechanical Maintenance & Precision Tooling

### 1. Purpose & Safety Mandates
This procedure governs the step-by-step disassembly, inspection, re-bearing, and precision alignment of high-speed motorized machine tool spindles.

> **CRITICAL SAFETY WARNING: Lockout / Tagout (LOTO)**
> - Disconnect main 400V breaker and pad lock with personal maintenance tag.
> - Verify zero electrical energy on bus bars with calibrated multimeter.
> - Bleed residual pneumatic accumulator pressure via manual drain cock V-09.

### 2. Required Tools & Precision Instruments
- Dial Indicator with magnetic base (0.001 mm / 1 micron graduation)
- Induction Bearing Heater with demagnetizing cycle (e.g., SKF TIH 030M)
- Torque wrench calibrated in range 5 - 50 Nm
- Precision matched angular contact bearing set: **SKF 7014-ACD/P4ADGA** (Quadruplex DBB arrangement)
- High-speed synthetic spindle grease: Klüber Isoflex NBU 15 (Fill quantity: precisely 15% of bearing free volume)
- Cleanroom lint-free wipes and reagent-grade pure isopropanol.

### 3. Step-by-Step Replacement Procedure

#### Step 1: Spindle Cartridge Removal
1. Drain spindle chiller glycol jacket into clean container.
2. Label and disconnect encoder feedback cables, motor power leads, and thermistor connectors.
3. Loosen spindle flange mounting bolts in cross-pattern (diagonal sequence).
4. Install two M10 jack screws into threaded extraction holes on the housing face; tighten evenly to jack out spindle cartridge.

#### Step 2: Disassembly & Inspection
1. Remove front labyrinth cover and bearing retention locknut (left-hand thread on model ApexMill-500).
2. Carefully press shaft out from housing using arbor press with brass protective sleeve.
3. Inspect shaft bearing journals with micrometer: taper and out-of-roundness must be within 0.002 mm.

#### Step 3: New Bearing Preparation & Greasing
1. Do not wash factory pre-cleaned bearings.
2. Calculate grease charge: 1.8 grams per bearing of Klüber Isoflex NBU 15 using a disposable medical syringe.
3. Distribute grease evenly between rolling balls. Slowly rotate bearing ring by hand for 20 revolutions.

#### Step 4: Installation & Preload Setting
1. Heat front bearing pair on induction heater to 80°C (never exceed 100°C).
2. Slide bearings onto shaft against seating shoulder in designated back-to-back (DB) orientation.
3. Apply precision retention locknut and torque to 35 Nm using calibrated spanner. Allow assembly to cool to ambient (22°C).
4. Slide shaft assembly into chilled outer housing. Tighten labyrinth seal cover bolts to 12 Nm.

#### Step 5: Post-Installation Runout & Run-In Procedure
1. Mount 1-micron dial test indicator against spindle internal taper (ISO 40 taper).
2. Rotate spindle by hand: total radial runout (TIR) must not exceed **0.003 mm**.
3. **Mandatory Step-Run-In Cycle**:
   - 1,000 RPM for 30 minutes (Monitor temperature: Delta-T < 10°C).
   - 3,000 RPM for 30 minutes.
   - 6,000 RPM for 20 minutes.
   - 12,000 RPM for 15 minutes.
   If housing surface temperature rises above 55°C at any stage, abort run-in immediately and inspect preload spacer.
