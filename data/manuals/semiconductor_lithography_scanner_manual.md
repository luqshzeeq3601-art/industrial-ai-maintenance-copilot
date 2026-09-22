# 3D Automated Optical Inspection & DUV Lithography System (Model: Zenith-2 / NXT-1980Di)
## Technical Operation & Maintenance Manual (Doc Rev: 4.0)
<!-- License: Synthetic Industrial AI Copilot Documentation - CC-BY-4.0 Compatible -->

### 1. Equipment Overview & Specifications
- **Equipment ID**: EQ-2003
- **Asset Name**: KohYoung-Zenith2 / ASML-NXT1980Di AOI & Lithography Scanner
- **Cleanroom Location**: Cleanroom-Bay-B (Class 10 / ISO 4)
- **Criticality**: High
- **Optical Resolution**: 0.35 um lateral resolution / 3D Moire height measurement accuracy +/- 1.0 um
- **Laser Interferometer Positioning Tolerance**: < 0.02 um (< 20 nm stage drift)
- **Maximum Stage Positioning Error Threshold**: 0.05 um (50 nm)
- **Exposure / Illumination Source**: Multi-frequency structured Moire projection & ArF 193 nm laser
- **Substrate Handling**: Dual wafer stage with magnetic levitation linear motors

### 2. Preventive Maintenance Schedule
- **Daily**:
  - Run automated optical flat field calibration and 3D height target verification (Target Cal Plate Part: KY-CAL-3D).
  - Inspect immersion fluid delivery lines and degasser pressure levels.
  - Verify laser interferometer beam intensity (> 85% signal margin on all 6 optical axes).
- **Weekly**:
  - Clean telecentric projection lenses using lint-free optic wipes and spectroscopic ethanol.
  - Verify conveyor clamping mechanism repeatability and PCB board warp compensation sensors.
- **Monthly**:
  - Perform 6-degree-of-freedom laser interferometer homing and orthogonality calibration.
  - Inspect linear motor cooling jacket for glycol/water flow restrictions (minimum 4.2 L/min).
- **Semi-Annual (2500 Operating Hours)**:
  - Replace structured light DLP projection engine and calibrate color temperature sensors.
  - Re-grease precision linear guide rails with cleanroom-certified grease (Kluber Isoflex Topas L32).

### 3. Fault Diagnostic Codes & Corrective Actions

#### Fault Code S-301: Wafer Stage Interferometer Positioning Error
- **Description**: Laser interferometer detected stage positional error exceeding 0.05 um along X/Y axes during active scanning pass.
- **Root Causes**:
  1. Optical alignment drift or dust accumulation on stage corner cube retroreflectors.
  2. Environmental air temperature / barometric pressure fluctuation upsetting refractive index compensation.
  3. Magnetic linear motor servo amplifier gain instability or tachometer feedback noise.
- **Troubleshooting Steps**:
  1. Abort current scan and inspect environmental chamber thermal sensor (must be 22.00°C +/- 0.05°C).
  2. Check laser beam signal amplitude on all 6 channels using diagnostic screen `ENG_OPT_LASER_01`.
  3. Clean optical retroreflectors with filtered nitrogen blast (0.2 um point-of-use filter).
  4. Perform auto-homing calibration sequence to re-zero the spatial interferometer grid.

#### Fault Code S-305: AOI Coplanarity & Solder Bridge Anomaly
- **Description**: Automated 3D inspection flagged coplanarity deviation > 45 um or detected adjacent pin short bridging on fine-pitch IC packages.
- **Root Causes**:
  1. Solder paste stencil volume deposition excess due to squeegee pressure drift on screen printer.
  2. PCB substrate localized warpage exceeding mechanical hold-down clamp capability.
  3. Structured light Moire projection lamp degradation causing false height reconstruction artifacts.
- **Corrective Actions**:
  1. Stop SMT line component placement to prevent building non-conforming assemblies.
  2. Perform cross-sectional X-ray inspection (AXI) on suspect component to confirm physical bridge vs optical artifact.
  3. Recalibrate 3D Moire phase projection sensor using standard stepped gauge block.
  4. Verify stencil printer paste height: nominal 120 um +/- 15 um. Adjust squeegee pressure from 4.5 kg to 3.8 kg if bridging is confirmed.
