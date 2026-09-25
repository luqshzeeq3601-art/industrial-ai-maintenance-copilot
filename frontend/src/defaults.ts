/*
 * Sample plant used only when DEMO_DATA is on (development or VITE_DEMO_DATA=true) and the API is unreachable.
 * The app shows a "Demo data" banner whenever it is on screen.
 */
import type { Equipment } from "./api/models";

export const DEMO_EQUIPMENT: Equipment[] = [
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
