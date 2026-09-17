# Industrial CNC Lathe & Milling Center (Model: ApexMill-500)
## Technical Operation & Maintenance Manual (Doc Rev: 2.4)

### 1. General Specifications
- **Operating Voltage**: 400V AC, 3-Phase, 50/60Hz
- **Spindle Power**: 15 kW
- **Maximum Spindle Speed**: 12,000 RPM
- **Hydraulic System Pressure**: 6.0 - 7.0 MPa
- **Approved Lubrication**: Mobil Vactra Oil No. 2 (Slideways), Shell Tellus S2 MX 46 (Hydraulics)

### 2. Preventive Maintenance Schedule
- **Daily**:
  - Inspect coolant level in reservoir. Ensure refractometer reading indicates 7-9% emulsion concentration.
  - Check pneumatic line air pressure regulator; nominal is 0.6 MPa (6.0 bar).
  - Verify automatic slideway lubricator pressure and reservoir level.
- **Weekly**:
  - Clean chips and foreign debris from tool magazine changer arm and grippers.
  - Inspect way covers for binding, scoring, or rubber wiper tear.
- **Monthly**:
  - Clean heat exchanger cooling fans on the electrical cabinet.
  - Inspect spindle chiller fluid level and verify supply temperature is maintained at 20°C +/- 1°C.
- **Quarterly (500 Operating Hours)**:
  - Check axis ball screw backlash on X, Y, and Z axes. Max permissible backlash: 0.008 mm.
  - Replace hydraulic return line filter element (Part No: HP-FLT-042).

### 3. Fault Diagnostic Codes & Corrective Actions

#### Fault Code E-402: Spindle Drive Thermal Overload
- **Description**: Spindle drive motor thermistor detected winding temperature exceeding 115°C for >15 seconds.
- **Root Causes**:
  1. Spindle chiller unit circulation failure or coolant fluid degraded.
  2. Severe cutting overload or dull carbide cutting inserts causing excessive load torque.
  3. Spindle bearings beginning to seize due to grease breakdown.
- **Troubleshooting Steps**:
  1. Immediately halt cycle. Allow spindle to idle at 500 RPM for 10 minutes if not seized, otherwise power off immediately.
  2. Inspect spindle chiller unit flowmeter: minimum required coolant flow rate is 6.5 L/min.
  3. Verify spindle load meter on HMI panel during no-load rotation at 4,000 RPM (nominal is <12% load).
  4. If load exceeds 25% at no load, check bearing preload and measure axial vibration. Replace spindle bearing set (SKF 7014-ACD/P4A).

#### Fault Code E-501: Tool Magazine Indexing Timeout
- **Description**: Tool carrousel failed to complete pocket rotation within 4.5 seconds of command trigger.
- **Root Causes**:
  1. Mechanical jam caused by chips caught in geneva indexing mechanism.
  2. Proximity sensor SQ14 gap exceeded (>2.5 mm) or sensor face fouled with oil/swarf.
  3. Pneumatic actuator solenoid coil YV-08 burnt out or pilot pressure below 0.45 MPa.
- **Troubleshooting Steps**:
  1. Execute manual tool magazine reset (MDI mode: M88).
  2. Check pneumatic gauge on tool arm cylinder; adjust regulator to 0.6 MPa.
  3. Clean optical/inductive proximity sensors SQ14 and SQ15 using isopropyl alcohol.

#### Fault Code E-210: Axis Z Drive Error / Follow-up Error
- **Description**: Difference between commanded position and optical linear scale feedback exceeded threshold (0.05 mm).
- **Root Causes**:
  1. Counterbalance cylinder pressure loss.
  2. Z-axis mechanical brake failed to disengage.
  3. Servo motor encoder cable shielding damaged or loose grounding clip.
- **Troubleshooting Steps**:
  1. Inspect Z-axis brake coil voltage (24V DC present when axis is enabled).
  2. Check nitrogen accumulator pressure in pneumatic counterbalance (should read 4.2 MPa).
