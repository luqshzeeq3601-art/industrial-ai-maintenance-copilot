/*
 * Sample plant used only when DEMO_DATA is on (development or VITE_DEMO_DATA=true) and the API is unreachable.
 * Every panel that renders it shows a "Demo data" label. Timestamps are relative to now so nothing reads as stale.
 */
import type { EquipmentData } from "./components/visualization/OperatingHoursBarChart";
import type { TelemetryReading, WorkOrderLog } from "./components/workspace/types";

export const DEMO_EQUIPMENT: EquipmentData[] = [
  {
    machine_id: "EQ-1000",
    name: "ApexMill-500",
    type: "5-Axis CNC Mill",
    location: "Plant A, Cell 1",
    status: "fault",
    operating_hours: 12450,
    criticality: "high"
  },
  {
    machine_id: "EQ-2001",
    name: "Yamaha-YSM20R",
    type: "SMT Pick-and-Place",
    location: "Cleanroom Bay A",
    status: "fault",
    operating_hours: 12450,
    criticality: "critical"
  },
  {
    machine_id: "EQ-1003",
    name: "HydroPress-500",
    type: "Hydraulic Stamping Press",
    location: "Plant B, Cell 2",
    status: "maintenance",
    operating_hours: 7540,
    criticality: "high"
  },
  {
    machine_id: "EQ-1001",
    name: "RoboArm-X2",
    type: "6-Axis Articulated Robot",
    location: "Assembly Line 1",
    status: "operational",
    operating_hours: 8320,
    criticality: "medium"
  },
  {
    machine_id: "EQ-1002",
    name: "LaserCut-9000",
    type: "Fiber Laser Cutter",
    location: "Fabrication Bay",
    status: "operational",
    operating_hours: 11206,
    criticality: "high"
  },
  {
    machine_id: "EQ-1004",
    name: "TitanPress-3000",
    type: "Forging Hydraulic Press",
    location: "Press Shop 1",
    status: "operational",
    operating_hours: 9118,
    criticality: "critical"
  },
  {
    machine_id: "EQ-1005",
    name: "AeroLathe-Pro",
    type: "High-Precision CNC Lathe",
    location: "Turning Cell A",
    status: "operational",
    operating_hours: 6982,
    criticality: "medium"
  },
  {
    machine_id: "EQ-1006",
    name: "WeldBot-200",
    type: "Robotic Welding Cell",
    location: "Fabrication Line",
    status: "operational",
    operating_hours: 10421,
    criticality: "medium"
  },
  {
    machine_id: "EQ-2002",
    name: "Heller-1809MK5",
    type: "Reflow Soldering Oven",
    location: "Cleanroom Bay A",
    status: "operational",
    operating_hours: 11980,
    criticality: "high"
  },
  {
    machine_id: "EQ-2003",
    name: "KohYoung-Zenith2",
    type: "3D AOI Inspection",
    location: "Cleanroom Bay B",
    status: "operational",
    operating_hours: 9850,
    criticality: "high"
  },
  {
    machine_id: "EQ-2004",
    name: "Camfil-CleanFan400",
    type: "Cleanroom Air Handler",
    location: "Cleanroom Plenum",
    status: "operational",
    operating_hours: 8600,
    criticality: "medium"
  }
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export function demoWorkOrders(machineId: string): WorkOrderLog[] {
  if (machineId !== "EQ-1000") return [];
  return [
    {
      id: 101,
      machine_id: "EQ-1000",
      fault_code: "E-308",
      fault_description: "Inverter Bus Undervoltage Alarm. DC link bus voltage measured below 380V threshold.",
      action_taken: "Diagnosed symptom according to manual. Measuring DC bus bar voltage.",
      technician: "David Chen",
      started_at: hoursAgo(2),
      completed_at: "",
      duration_mins: 0,
      parts_replaced: "",
      severity: "critical"
    },
    {
      id: 102,
      machine_id: "EQ-1000",
      fault_code: "M-301",
      fault_description: "Slideway Automatic Lubrication Fault. Low pressure trip on Y-axis distributor.",
      action_taken: "Investigated trip alarm. Found lube distribution metering valve clogged. Cleaned valve and refilled Mobil Vactra No 2.",
      technician: "Marcus Wong",
      started_at: hoursAgo(24 * 34),
      completed_at: hoursAgo(24 * 34 - 1.5),
      duration_mins: 90,
      parts_replaced: "Lube distribution metering valve",
      severity: "medium"
    },
    {
      id: 103,
      machine_id: "EQ-1000",
      fault_code: "H-415",
      fault_description: "Proportional Directional Valve Coil Open Circuit.",
      action_taken: "Scheduled corrective action: replaced defective solenoid cartridge and calibrated flow response.",
      technician: "Sarah Jenkins",
      started_at: hoursAgo(24 * 74),
      completed_at: hoursAgo(24 * 74 - 2.3),
      duration_mins: 140,
      parts_replaced: "Rexroth 4WRPEH 6-C Proportional Valve",
      severity: "high"
    }
  ];
}

export function demoTelemetry(machineId: string): TelemetryReading[] {
  if (machineId !== "EQ-1000") return [];
  const now = new Date().toISOString();
  return [
    { metric: "thermal_sensor", value: 140, unit: "C", severity: "critical", timestamp: now, history: [118, 121, 125, 124, 130, 134, 137, 140] },
    { metric: "dc_bus_voltage", value: 342, unit: "V", severity: "high", timestamp: now, history: [392, 390, 385, 379, 371, 360, 351, 342] },
    { metric: "spindle_vibration", value: 1.8, unit: "mm/s", severity: "low", timestamp: now, history: [1.7, 1.8, 1.7, 1.9, 1.8, 1.8, 1.7, 1.8] },
    { metric: "lube_pressure", value: 4.2, unit: "bar", severity: "low", timestamp: now, history: [4.3, 4.2, 4.2, 4.3, 4.1, 4.2, 4.2, 4.2] }
  ];
}

export const DEMO_FAULTS = {
  fault_categories: [
    { category: "electrical", count: 7 },
    { category: "mechanical", count: 4 },
    { category: "hydraulic", count: 3 },
    { category: "pneumatic", count: 2 },
    { category: "software", count: 1 }
  ],
  severity_distribution: [
    { severity: "critical", count: 3 },
    { severity: "high", count: 6 },
    { severity: "medium", count: 5 },
    { severity: "low", count: 3 }
  ],
  incident_breakdown: [
    { category: "electrical", occurrences: 7, total_downtime_mins: 420 },
    { category: "mechanical", occurrences: 4, total_downtime_mins: 280 },
    { category: "hydraulic", occurrences: 3, total_downtime_mins: 210 },
    { category: "pneumatic", occurrences: 2, total_downtime_mins: 90 },
    { category: "software", occurrences: 1, total_downtime_mins: 45 }
  ]
};
