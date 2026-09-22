# Semiconductor PECVD Thin Film Deposition & Reflow System (Model: Centura-5200 / Heller-1809MK5)
## Technical Operation & Maintenance Manual (Doc Rev: 2.8)
<!-- License: Synthetic Industrial AI Copilot Documentation - CC-BY-4.0 Compatible -->

### 1. Equipment Overview & Specifications
- **Equipment ID**: EQ-2002
- **Asset Name**: Heller-1809MK5 / Centura-5200 PECVD & Reflow System
- **Cleanroom Location**: Cleanroom-Bay-A (Class 100 / ISO 5)
- **Criticality**: High
- **Operating Temperature Range**: 150°C - 480°C (Zone 1 to Zone 9)
- **Zone 4 Nominal Reflow Temperature**: 245.0°C +/- 2.5°C
- **Chamber Base Vacuum**: < 1.0e-5 Torr
- **Process Pressure (PECVD)**: 2.0 - 5.0 Torr
- **Process Gases**: SiH4 (Silane 2%), N2O (Nitrous Oxide), NH3, N2 carrier, NF3 chamber clean
- **Turbopump Model**: Pfeiffer HiPace 700 with Mag-Lev bearings

### 2. Preventive Maintenance Schedule
- **Daily**:
  - Check 9-zone thermocouple temperature profile and conveyor speed stability (nominal 90 cm/min).
  - Verify exhaust scrubber differential pressure and toxic gas sensor baseline.
  - Check nitrogen purge flow rate (nominal 250 SLPM).
- **Weekly**:
  - Perform helium hard-vacuum leak check on deposition chamber O-ring seals.
  - Inspect gas inlet showerhead faceplate for chemical vapor deposition crusting or pinhole clogging.
- **Monthly**:
  - Calibrate Zone 4 thermocouple against NIST-traceable wireless profiler (KIC Explorer).
  - Inspect turbomolecular pump vibration baseline (must be < 0.25 mm/s RMS).
- **Semi-Annual (2000 Operating Hours)**:
  - Full chamber wet clean with deionized water and anhydrous IPA wipe down.
  - Rebuild process gas isolation bellows valves and replace chamber lid Viton O-rings (Part No: SEAL-CT-5200).

### 3. Fault Diagnostic Codes & Corrective Actions

#### Fault Code S-201: Chamber Vacuum Leak / Pirani Gauge Deviation
- **Description**: Vacuum chamber pressure breached 0.05 Torr threshold during base vacuum pump-down, or pressure rise rate exceeded 5 mTorr/min during isolated rate-of-rise test.
- **Root Causes**:
  1. Micro-cracking or thermal degradation of chamber lid Viton O-ring seal.
  2. Gas manifold pneumatic shutoff valve leakage letting carrier gas bleed into chamber.
  3. Turbomolecular drag pump backing pressure rise due to dry pump diaphragm fatigue.
- **Troubleshooting Steps**:
  1. Isolate chamber by closing isolation throttle valve and roughing gate valve.
  2. Connect portable helium mass spectrometer leak detector to chamber test port.
  3. Spray helium probe gas around lid flange, viewport quartz windows, and showerhead feedthroughs.
  4. Replace identified leaking seal using fluorocarbon O-rings lubricated with Fomblin vacuum grease.

#### Fault Code S-204: Zone 4 Reflow Convection Temp Deviation
- **Description**: Zone 4 heating chamber convection temperature drifted by > 5.0°C from setpoint (245°C) for > 10 seconds.
- **Root Causes**:
  1. Type-K thermocouple wire fatigue or cold-junction compensation drift.
  2. Solid-state relay (SSR) switching failure causing intermittent heater bank dropout.
  3. Convection blower motor impeller imbalance reducing forced laminar airflow.
- **Corrective Actions**:
  1. Halt board conveyor immediately to prevent incomplete solder reflow or thermal delamination.
  2. Measure SSR output voltage on Zone 4 heating element terminals (nominal 208V AC pulsed).
  3. Measure thermocouple resistance: expected 10.5 ohms at 25°C. Replace thermocouple assembly if open or drifted.
  4. Perform 9-zone dynamic temperature profile verification prior to resuming production.
