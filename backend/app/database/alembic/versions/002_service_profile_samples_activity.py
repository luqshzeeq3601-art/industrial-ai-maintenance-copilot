"""002_service_profile_samples_activity

Mirrors SQLite migration v5: service intervals, work-order due dates,
user profile fields, telemetry samples, and activity events.

Revision ID: 002_service_profile_samples_activity
Revises: 001_initial_schema
Create Date: 2026-09-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_service_profile_samples_activity"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column("equipment", sa.Column("service_interval_hours", sa.Integer(), nullable=True))
    op.add_column("equipment", sa.Column("hours_at_last_service", sa.Integer(), nullable=True))
    op.add_column("work_orders", sa.Column("due_date", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("department", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("plant", sa.String(100), nullable=True))

    op.create_table(
        "telemetry_samples",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("machine_id", sa.String(50), sa.ForeignKey("equipment.machine_id"), nullable=False),
        sa.Column("metric", sa.String(50), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("observed_at", sa.String(50), nullable=False),
        sa.Column("ingested_at", sa.String(50), nullable=False)
    )
    op.create_index("idx_samples_machine_metric_time", "telemetry_samples", ["machine_id", "metric", "observed_at"])

    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("machine_id", sa.String(50), nullable=True),
        sa.Column("user_id", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("ref", sa.String(200), nullable=True),
        sa.Column("created_at", sa.String(50), nullable=False)
    )
    op.create_index("idx_activity_created", "activity_events", ["created_at"])

def downgrade() -> None:
    op.drop_table("activity_events")
    op.drop_table("telemetry_samples")
    op.drop_column("users", "plant")
    op.drop_column("users", "department")
    op.drop_column("users", "email")
    op.drop_column("work_orders", "due_date")
    op.drop_column("equipment", "hours_at_last_service")
    op.drop_column("equipment", "service_interval_hours")
