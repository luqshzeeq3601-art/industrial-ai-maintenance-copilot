"""Strict Pydantic schemas for read and state-changing tools."""
import re
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator

MACHINE_ID_PATTERN = re.compile(r"^EQ-\d{4}$", re.IGNORECASE)
ALARM_ID_PATTERN = re.compile(r"^ALM-\d{3,6}$", re.IGNORECASE)
FAULT_CODE_PATTERN = re.compile(r"^[A-Z]-\d{3}$", re.IGNORECASE)

class MachineStatusInput(BaseModel):
    machine_id: str = Field(..., description="Unique machine identifier (e.g. 'EQ-1000', 'EQ-1004')")

    @field_validator("machine_id")
    @classmethod
    def validate_machine_id(cls, v: str) -> str:
        clean = v.strip().upper()
        if not MACHINE_ID_PATTERN.match(clean):
            raise ValueError(f"Invalid machine_id format: '{v}'. Must match pattern 'EQ-XXXX' (e.g. 'EQ-1000').")
        return clean

class ActiveAlarmsInput(BaseModel):
    machine_id: Optional[str] = Field(default=None, description="Optional machine ID filter (e.g. 'EQ-1000')")

    @field_validator("machine_id")
    @classmethod
    def validate_machine_id(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        clean = v.strip().upper()
        if not MACHINE_ID_PATTERN.match(clean):
            raise ValueError(f"Invalid machine_id format: '{v}'. Must match 'EQ-XXXX'.")
        return clean

class MaintenanceHistoryInput(BaseModel):
    machine_id: str = Field(..., description="Unique machine identifier (e.g. 'EQ-1000')")
    limit: int = Field(default=5, ge=1, le=20, description="Number of recent records to fetch (1-20)")

    @field_validator("machine_id")
    @classmethod
    def validate_machine_id(cls, v: str) -> str:
        clean = v.strip().upper()
        if not MACHINE_ID_PATTERN.match(clean):
            raise ValueError(f"Invalid machine_id format: '{v}'. Must match 'EQ-XXXX'.")
        return clean

class FaultCodeInput(BaseModel):
    code: str = Field(..., description="Industrial fault code (e.g. 'E-402', 'H-104', 'M-102')")

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        clean = v.strip().upper()
        if not FAULT_CODE_PATTERN.match(clean):
            raise ValueError(f"Invalid fault code format: '{v}'. Must match pattern like 'E-402' or 'H-104'.")
        return clean

class SearchDocsInput(BaseModel):
    query: str = Field(..., min_length=2, max_length=250, description="Technical manual search query")

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        clean = v.strip()
        # Disallow control characters
        clean = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", clean)
        if len(clean) < 2:
            raise ValueError("Search query too short.")
        return clean

# --- Mutation Action Schemas ---

class CreateWorkOrderInput(BaseModel):
    machine_id: str = Field(..., description="Target equipment identifier (e.g. 'EQ-1000')")
    title: str = Field(..., min_length=5, max_length=120, description="Summary title of the work order")
    description: str = Field(..., min_length=10, max_length=500, description="Detailed fault symptoms and repair instructions")
    priority: Literal["low", "medium", "high", "critical"] = Field(default="medium", description="Priority severity")
    assigned_to: Optional[str] = Field(default=None, max_length=80, description="Name or role of technician")

    @field_validator("machine_id")
    @classmethod
    def validate_machine_id(cls, v: str) -> str:
        clean = v.strip().upper()
        if not MACHINE_ID_PATTERN.match(clean):
            raise ValueError(f"Invalid machine_id format: '{v}'. Must match 'EQ-XXXX'.")
        return clean

class AcknowledgeAlarmInput(BaseModel):
    alarm_id: str = Field(..., description="Alarm identifier to acknowledge (e.g. 'ALM-001')")

    @field_validator("alarm_id")
    @classmethod
    def validate_alarm_id(cls, v: str) -> str:
        clean = v.strip().upper()
        if not ALARM_ID_PATTERN.match(clean):
            raise ValueError(f"Invalid alarm_id format: '{v}'. Must match 'ALM-XXX'.")
        return clean

class ScheduleInspectionInput(BaseModel):
    machine_id: str = Field(..., description="Target equipment identifier (e.g. 'EQ-1000')")
    inspection_type: Literal["routine", "preventive", "safety", "post_repair", "calibration"] = Field(
        ..., description="Type of inspection to conduct"
    )
    scheduled_date: str = Field(..., description="Scheduled date in YYYY-MM-DD format")
    technician: str = Field(..., min_length=3, max_length=80, description="Technician assigned")
    notes: Optional[str] = Field(default=None, max_length=300, description="Special instructions or precautions")

    @field_validator("machine_id")
    @classmethod
    def validate_machine_id(cls, v: str) -> str:
        clean = v.strip().upper()
        if not MACHINE_ID_PATTERN.match(clean):
            raise ValueError(f"Invalid machine_id format: '{v}'. Must match 'EQ-XXXX'.")
        return clean

    @field_validator("scheduled_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            parsed = datetime.strptime(v.strip(), "%Y-%m-%d")
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            raise ValueError(f"Invalid date '{v}'. Must be formatted as YYYY-MM-DD.")
