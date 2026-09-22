# Chemical Mechanical Planarization & Cleanroom Air Handling System (Model: Reflexion-LK / CleanFan-400)
## Technical Operation & Maintenance Manual (Doc Rev: 3.5)
<!-- License: Synthetic Industrial AI Copilot Documentation - CC-BY-4.0 Compatible -->

### 1. Equipment Overview & Specifications
- **Equipment ID**: EQ-2004
- **Asset Name**: Camfil-CleanFan400 / Reflexion-LK CMP & Cleanroom Air Handling System
- **Cleanroom Location**: Cleanroom-Plenum / Sub-Fab (Class 1000 / ISO 6)
- **Criticality**: Medium
- **Nominal Slurry Delivery Flow Rate**: 200.0 mL/min (Critical threshold < 150 mL/min)
- **Slurry Delivery Pressure**: 0.15 - 0.25 MPa
- **Pad Conditioning Arm Downforce**: 2.5 - 4.5 lbf
- **HEPA Differential Pressure**: Nominal 120 Pa (High alert threshold > 250 Pa)
- **Airflow Velocity**: 0.45 m/s +/- 0.05 m/s at filter face
- **Carrier Head Membrane Zones**: 5 independent pressure zones (Zone 1-5: 1.5 - 4.2 psi)

### 2. Preventive Maintenance Schedule
- **Daily**:
  - Inspect slurry delivery tubing for crystallization, agglomeration, or micro-pinching.
  - Check differential pressure manometer readings across cleanroom plenum FFU array.
  - Flush slurry lines with deionized water during idle cycles.
- **Weekly**:
  - Inspect diamond conditioning disc wear profile using optical micrometer (min diamond protrusion 35 um).
  - Inspect pad debris rinse nozzles and verify 2.0 L/min DI water flow rate.
- **Monthly**:
  - Measure cleanroom plenum airflow velocity across 16 sample grid points.
  - Calibrate ultrasonic flow meters on Silica and Ceria slurry supply loops.
- **Semi-Annual (3000 Operating Hours)**:
  - Replace peristaltic pump tubing modules (PharMed BPT Part No: TUB-CMP-400).
  - Replace pre-filter mesh panels and perform DOP aerosol integrity leak test on HEPA filters.

### 3. Fault Diagnostic Codes & Corrective Actions

#### Fault Code S-401: Slurry Delivery Loop Flow Restriction
- **Description**: Slurry flow rate to the polishing platen dropped below 150.0 mL/min during active planarization cycle.
- **Root Causes**:
  1. Peristaltic pump tubing inner wall delamination or fatigue collapse.
  2. Slurry abrasive nanoparticle agglomeration forming a dried cake plug in dispensing nozzle.
  3. Inline 1.0 um slurry capsule filter cake loading.
- **Troubleshooting Steps**:
  1. Pause platen rotation and initiate high-pressure DI water backflush on slurry dispensing arm.
  2. Inspect peristaltic pump roller head for mechanical binding or loose tension clamps.
  3. Check differential pressure across inline capsule filter (replace if delta-P > 0.08 MPa).
  4. Replace peristaltic tube segment and recalibrate pump RPM vs flow curve using 100 mL graduated cylinder.

#### Fault Code S-402: HEPA Filter Differential Pressure High
- **Description**: Differential pressure across cleanroom fan filter unit (FFU) exceeded 250 Pa, indicating air resistance overload.
- **Root Causes**:
  1. Primary HEPA filter media dust loading after extended cleanroom operation.
  2. G4 pre-filter saturation causing debris migration onto HEPA pleated membrane.
  3. Plenum static pressure transducer sensor line blockage or transducer zero drift.
- **Corrective Actions**:
  1. Inspect pre-filter condition on cleanroom plenum return shafts. Replace loaded G4 pre-filters immediately.
  2. Zero-calibrate Magnehelic / digital differential pressure transmitter using zero-pressure reference ports.
  3. If differential pressure remains > 250 Pa with fresh pre-filters, schedule HEPA filter pack replacement (Camfil Megalam MD14).
  4. Verify cleanroom positive pressure cascade (+15 Pa relative to ambient) post-maintenance.
