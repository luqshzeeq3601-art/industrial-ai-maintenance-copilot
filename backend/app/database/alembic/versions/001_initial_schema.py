"""001_initial_schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-09-18 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Equipment
    op.create_table(
        "equipment",
        sa.Column("machine_id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("location", sa.String(100), nullable=False),
        sa.Column("install_date", sa.String(50), nullable=False),
        sa.Column("last_service", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="operational"),
        sa.Column("operating_hours", sa.Integer(), server_default="0"),
        sa.Column("criticality", sa.String(50), nullable=False, server_default="medium")
    )

    # 2. Fault Codes
    op.create_table(
        "fault_codes",
        sa.Column("code", sa.String(50), primary_key=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("typical_cause", sa.Text(), nullable=False),
        sa.Column("recommended_action", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False)
    )

    # 3. Maintenance Logs
    op.create_table(
        "maintenance_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("machine_id", sa.String(50), sa.ForeignKey("equipment.machine_id"), nullable=False),
        sa.Column("fault_code", sa.String(50), sa.ForeignKey("fault_codes.code"), nullable=True),
        sa.Column("fault_description", sa.Text(), nullable=False),
        sa.Column("action_taken", sa.Text(), nullable=False),
        sa.Column("technician", sa.String(100), nullable=False),
        sa.Column("started_at", sa.String(50), nullable=False),
        sa.Column("completed_at", sa.String(50), nullable=False),
        sa.Column("duration_mins", sa.Integer(), nullable=False),
        sa.Column("parts_replaced", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(50), nullable=False)
    )
    op.create_index("idx_logs_machine", "maintenance_logs", ["machine_id"])
    op.create_index("idx_logs_started", "maintenance_logs", ["started_at"])

    # 4. Alarms
    op.create_table(
        "alarms",
        sa.Column("alarm_id", sa.String(100), primary_key=True),
        sa.Column("machine_id", sa.String(50), sa.ForeignKey("equipment.machine_id"), nullable=False),
        sa.Column("code", sa.String(50), sa.ForeignKey("fault_codes.code"), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("triggered_at", sa.String(50), nullable=False),
        sa.Column("acknowledged_at", sa.String(50), nullable=True),
        sa.Column("acknowledged_by", sa.String(100), nullable=True),
        sa.Column("cleared_at", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True)
    )
    op.create_index("idx_alarms_machine", "alarms", ["machine_id"])
    op.create_index("idx_alarms_status", "alarms", ["status"])

    # 5. Work Orders
    op.create_table(
        "work_orders",
        sa.Column("work_order_id", sa.String(100), primary_key=True),
        sa.Column("machine_id", sa.String(50), sa.ForeignKey("equipment.machine_id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("assigned_to", sa.String(100), nullable=True),
        sa.Column("created_by", sa.String(100), nullable=False),
        sa.Column("created_at", sa.String(50), nullable=False),
        sa.Column("approved_by", sa.String(100), nullable=True),
        sa.Column("approved_at", sa.String(50), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.String(50), nullable=True)
    )
    op.create_index("idx_wo_machine", "work_orders", ["machine_id"])
    op.create_index("idx_wo_status", "work_orders", ["status"])

    # 6. Scheduled Inspections
    op.create_table(
        "scheduled_inspections",
        sa.Column("inspection_id", sa.String(100), primary_key=True),
        sa.Column("machine_id", sa.String(50), sa.ForeignKey("equipment.machine_id"), nullable=False),
        sa.Column("inspection_type", sa.String(50), nullable=False),
        sa.Column("scheduled_date", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="scheduled"),
        sa.Column("technician", sa.String(100), nullable=False),
        sa.Column("created_by", sa.String(100), nullable=False),
        sa.Column("created_at", sa.String(50), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True)
    )
    op.create_index("idx_inspections_machine", "scheduled_inspections", ["machine_id"])

    # 7. Users
    op.create_table(
        "users",
        sa.Column("user_id", sa.String(100), primary_key=True),
        sa.Column("username", sa.String(100), unique=True, nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("created_at", sa.String(50), nullable=False)
    )

    # 8. Action Audit
    op.create_table(
        "action_audit",
        sa.Column("audit_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("action_id", sa.String(100), nullable=False),
        sa.Column("action_type", sa.String(100), nullable=False),
        sa.Column("user_id", sa.String(100), nullable=False),
        sa.Column("user_role", sa.String(50), nullable=False),
        sa.Column("decision", sa.String(50), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.String(50), nullable=False),
        sa.Column("ip_address", sa.String(100), nullable=True)
    )
    op.create_index("idx_audit_action", "action_audit", ["action_id"])

    # 9. Telemetry Events
    op.create_table(
        "telemetry_events",
        sa.Column("event_id", sa.String(100), primary_key=True),
        sa.Column("machine_id", sa.String(50), sa.ForeignKey("equipment.machine_id"), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("observed_at", sa.String(50), nullable=False),
        sa.Column("fault_code", sa.String(50), nullable=True),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("transport", sa.String(50), nullable=False, server_default="rest"),
        sa.Column("ingested_at", sa.String(50), nullable=False),
        sa.Column("created_alarm_id", sa.String(100), sa.ForeignKey("alarms.alarm_id"), nullable=True)
    )
    op.create_index("idx_telemetry_machine", "telemetry_events", ["machine_id"])
    op.create_index("idx_telemetry_time", "telemetry_events", ["observed_at"])

def downgrade() -> None:
    op.drop_table("telemetry_events")
    op.drop_table("action_audit")
    op.drop_table("users")
    op.drop_table("scheduled_inspections")
    op.drop_table("work_orders")
    op.drop_table("alarms")
    op.drop_table("maintenance_logs")
    op.drop_table("fault_codes")
    op.drop_table("equipment")
