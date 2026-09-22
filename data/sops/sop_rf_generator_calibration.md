# Standard Operating Procedure: RF Generator & Matching Network Calibration (SOP-RF-001)
## Cleanroom Plasma Etch & Deposition Systems
<!-- License: Synthetic Industrial AI Copilot Documentation - CC-BY-4.0 Compatible -->

### 1. Purpose & Scope
This procedure defines the calibration, tuning, and verification of 13.56 MHz RF solid-state power generators and auto-matching networks on semiconductor plasma tools (`EQ-2001`, `EQ-2002`).

### 2. Required Equipment & PPE
- Calibrated 50-Ohm 2.5 kW Coaxial RF Dummy Load (Bird Model 8251)
- Inline Directional RF Power Meter & Sensor Head (Bird 4391A)
- Digital Oscilloscope (100 MHz bandwidth, 50-ohm termination)
- Cleanroom Class 100 ESD-safe tool kit
- PPE: Cleanroom jumpsuit, nitrile gloves, safety glasses, ESD wrist strap

### 3. Step-by-Step Procedure

#### Phase A: RF Generator Forward Power Calibration
1. **Safety Lockout**: Ensure chamber gas supplies (SiH4, CF4, Cl2) are locked out at the sub-fab manifold.
2. **Dummy Load Connection**: Disconnect the 50-ohm coaxial feed line from the chamber match box and connect directly to the 50-ohm dummy load with the inline directional wattmeter.
3. **Power Sweep**:
   - Set generator output to 500 W, 1000 W, and 1500 W in continuous-wave (CW) mode.
   - Record forward power on inline wattmeter. Tolerance must be within +/- 1.0% of setpoint.
   - If deviation > 1.5%, adjust internal DAC gain potentiometer `R124` on the RF driver board.

#### Phase B: Auto-Matching Network Servo Calibration
1. Reconnect the coaxial feed line to the chamber match network.
2. Pump chamber down to base vacuum (< 1.0e-5 Torr) and establish 50 sccm Argon flow at 20 mTorr chamber pressure.
3. Strike plasma at 300 W forward power in manual tune mode.
4. Adjust `TUNE` and `LOAD` variable vacuum capacitors to achieve minimum reflected power (< 5 W).
5. Switch controller to `AUTO` mode and verify phase and magnitude error detectors settle to zero within 1.5 seconds.
6. Record final capacitor position encoder counts in the maintenance logbook.
