# Heavy Industrial Hydraulic Forging Press (Model: TitanPress-3000)
## Operation, Hydraulics & Overhaul Manual (Doc Rev: 1.8)

### 1. System Overview
- **Nominal Tonnage**: 3,000 Metric Tons (30 MN)
- **Main Ram Cylinder Bore**: 650 mm
- **Operating Pressure**: Maximum Continuous: 25.0 MPa (250 bar), Peak: 28.0 MPa
- **Main Pump Station**: Rexroth A4VSO Variable Displacement Axial Piston Pump (355 cc/rev)
- **Hydraulic Reservoir Capacity**: 4,500 Liters
- **Fluid Spec**: ISO VG 46 Anti-Wear Mineral Oil (Zinc-Free formulation required for silver-plated bushings)

### 2. Maintenance & Inspection Standards
- **Daily Inspection**:
  - Main cylinder rod seal inspection for weeping or extrusion. Maximum allowable leakage: 3 drops per 50 cycles.
  - Check pump discharge oil temperature. Operating range: 45°C - 55°C. Trip shutoff threshold: 68°C.
  - Inspect nitrogen pre-charge pressure on bladder accumulators (Nominal: 14.0 MPa).
- **Monthly**:
  - Extract oil sample from port MP-03 for particle count analysis (ISO 4406 target: 16/14/11 or cleaner).
  - Check differential pressure indicator on high-pressure filter HF-101. Replace element when red pin pops up (>0.35 MPa delta-P).
- **Annual Overhaul**:
  - Replace guide bushings and chevron V-packings on main ram.
  - Flush pilot relief valves and recalibrate proportional pressure control card (Eurocard VT-5004).

### 3. Alarm Diagnostics & Root Cause Analysis

#### Fault Code H-104: Main Hydraulic Pump Discharge Pressure Drop
- **Description**: Pressure sensor PT-01 fails to reach setpoint of 21.0 MPa within 3.2 seconds of ram prefill closure.
- **Root Causes**:
  1. Main prefill valve (poppet valve PV-01) sticking open due to contamination or broken return spring.
  2. Suction strainer blocked, starving main pump and causing cavitation.
  3. Proportional pressure relief valve DBDS-20 coil failure or loose electrical connector.
- **Troubleshooting Steps**:
  1. Verify pilot supply pressure at gauge G-02 (must exceed 4.0 MPa).
  2. Check proportional valve current using multimeter: nominal command 0-800 mA.
  3. Inspect suction line butterfly valve - verify lock pin is in fully OPEN position.
  4. Perform prefill valve leakage check: monitor return port during high-pressure holding phase.

#### Fault Code H-208: Excessive Fluid Temperature Trip (>68°C)
- **Description**: Temperature transmitter TT-02 triggered emergency press inhibit.
- **Root Causes**:
  1. Plate heat exchanger PHE-01 cooling water supply stopped or thermostatic valve stuck closed.
  2. High-pressure relief valve continuously bypassing oil due to incorrect zero-pressure unload command.
  3. Internal pump slippage due to excessive cylinder barrel-to-port plate wear.
- **Troubleshooting Steps**:
  1. Inspect water flow sensor on shell/plate heat exchanger cooling circuit. Minimum flow: 120 L/min at 24°C inlet.
  2. Touch relief valve return lines: any pipe hot to the touch during idle indicates a blowing relief valve.
  3. Measure pump case drain flow (leakage line). Normal flow at 21 MPa is <18 L/min. Over 35 L/min requires pump rebuild.
