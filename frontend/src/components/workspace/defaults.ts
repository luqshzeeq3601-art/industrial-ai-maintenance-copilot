import type { EquipmentData } from "../visualization/OperatingHoursBarChart";
import type { WorkOrderLog, Message } from "./types";

// Exact 10 fleet assets matching reference screenshot
export const DEFAULT_EQUIPMENT: EquipmentData[] = [
  { machine_id: "EQ-1000", name: "ApexMill-500", type: "5-Axis CNC Mill", location: "Plant A Cell 1", status: "fault", operating_hours: 12450, criticality: "high" },
  { machine_id: "EQ-1001", name: "RoboArm-X2", type: "Articulated Welder", location: "Plant A Cell 2", status: "operational", operating_hours: 8320, criticality: "high" },
  { machine_id: "EQ-1002", name: "LaserCut-9000", type: "Fiber Laser Cutter", location: "Plant B Cell 1", status: "operational", operating_hours: 11206, criticality: "medium" },
  { machine_id: "EQ-1003", name: "HydroPress-500", type: "Hydraulic Press", location: "Plant B Cell 2", status: "maintenance", operating_hours: 7540, criticality: "high" },
  { machine_id: "EQ-1004", name: "TitanPress-3000", type: "Stamping Press", location: "Plant A Cell 3", status: "operational", operating_hours: 9118, criticality: "critical" },
  { machine_id: "EQ-1005", name: "AeroLathe-Pro", type: "Precision Lathe", location: "Plant C Cell 1", status: "operational", operating_hours: 6982, criticality: "medium" },
  { machine_id: "EQ-1006", name: "WeldBot-200", type: "Welding Robot", location: "Plant C Cell 2", status: "operational", operating_hours: 10421, criticality: "medium" },
  { machine_id: "EQ-1007", name: "PackLine-100", type: "Packaging System", location: "Plant B Cell 3", status: "operational", operating_hours: 5390, criticality: "low" },
  { machine_id: "EQ-1008", name: "CoolantSys-1", type: "Coolant Station", location: "Plant A Utility", status: "operational", operating_hours: 14230, criticality: "high" },
  { machine_id: "EQ-1009", name: "InspectCam-7", type: "Vision QC System", location: "Plant C Cell 3", status: "operational", operating_hours: 4865, criticality: "low" }
];

export const DEFAULT_LOGS_EQ1000: WorkOrderLog[] = [
  {
    id: 1,
    machine_id: "EQ-1000",
    fault_code: "E-402",
    fault_description: "High spindle temperature. Investigating bearing wear.",
    action_taken: "Spindle Thermal Overload",
    technician: "J. Carter",
    started_at: "2026-03-14 08:30",
    completed_at: "",
    duration_mins: 75,
    parts_replaced: "Investigating bearing wear",
    severity: "OPEN"
  },
  {
    id: 2,
    machine_id: "EQ-1000",
    fault_code: "M-104",
    fault_description: "Replaced coolant filter and inspected lube system. All systems nominal.",
    action_taken: "Scheduled Maintenance",
    technician: "L. Nguyen",
    started_at: "2026-02-28 14:15",
    completed_at: "2026-02-28 15:00",
    duration_mins: 45,
    parts_replaced: "Coolant filter, synthetic lube",
    severity: "CLOSED"
  },
  {
    id: 3,
    machine_id: "EQ-1000",
    fault_code: "M-098",
    fault_description: "Routine spindle inspection completed. No issues found.",
    action_taken: "Spindle Inspection",
    technician: "R. Patel",
    started_at: "2026-01-15 10:00",
    completed_at: "2026-01-15 11:15",
    duration_mins: 75,
    parts_replaced: "None",
    severity: "CLOSED"
  }
];

export const DEFAULT_INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    content: "The spindle thermal overload alarm (E-402) indicates the spindle temperature has exceeded the normal operating range, likely due to bearing wear, insufficient lubrication, or coolant flow issues.\n\n**Recommended next steps:**\n\n1. Inspect spindle bearing condition (visual and noise check)\n2. Verify lubrication flow and coolant system operation\n3. Check for recent cutting load changes or tool imbalance\n4. Follow the spindle bearing replacement procedure if wear is confirmed",
    timestamp: "10:14",
    workflow_trace: [
      { agent: "supervisor", action: "classify_plan", summary: "Supervisor · Classify & plan" },
      { agent: "retrieval", action: "search_manuals", summary: "Retrieval · Search SOPs & history" },
      { agent: "diagnostic", action: "analyze_recommend", summary: "Diagnostic · Analyze & recommend" }
    ]
  },
  {
    role: "user",
    content: "What should I check first?",
    timestamp: "10:15"
  },
  {
    role: "assistant",
    content: "Start by verifying the lubrication and coolant flow systems. Insufficient lubrication or reduced coolant flow can quickly lead to elevated spindle temperatures and trigger E-402. If flow is normal, inspect the spindle bearings for signs of wear such as abnormal noise, vibration, or increased friction.",
    timestamp: "10:15",
    workflow_trace: [
      { agent: "supervisor", action: "classify_plan", summary: "Supervisor · Classify & plan" },
      { agent: "retrieval", action: "search_manuals", summary: "Retrieval · Search SOPs & history" },
      { agent: "diagnostic", action: "analyze_recommend", summary: "Diagnostic · Analyze & recommend" }
    ],
    pending_action: {
      action_id: "ACT-8492",
      action_type: "create_work_order",
      summary: "Dispatch work order to replace ApexMill-500 spindle bearings and perform LOTO electrical safety isolation.",
      arguments: {
        machine_id: "EQ-1000",
        priority: "HIGH",
        scheduled_date: "Next Shift",
        description: "Spindle bearing inspection & replacement per SOP-ApexMill-04."
      },
      requester: "tech1",
      requester_role: "technician",
      session_id: "sess-prod-eq1000"
    }
  }
];
