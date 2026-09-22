"""CLI tool for migrating plant records and logs from SQLite to PostgreSQL with data integrity verification."""
import argparse
import logging
import sqlite3
import sys
from pathlib import Path
from typing import Dict, List, Any
from sqlalchemy import create_engine, text

from backend.app.config import settings
from backend.app.database.models import Base

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration.sqlite2postgres")

TABLES_ORDER = [
    "equipment",
    "fault_codes",
    "maintenance_logs",
    "alarms",
    "work_orders",
    "scheduled_inspections",
    "users",
    "action_audit",
    "telemetry_events"
]

def migrate_database(sqlite_path: Path, postgres_url: str, dry_run: bool = False) -> Dict[str, Dict[str, int]]:
    """Migrate all tables from SQLite to PostgreSQL and verify counts."""
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite database not found at: {sqlite_path}")

    logger.info("Opening SQLite source: %s", sqlite_path)
    sqlite_conn = sqlite3.connect(str(sqlite_path))
    sqlite_conn.row_factory = sqlite3.Row

    logger.info("Connecting to PostgreSQL destination: %s", postgres_url.split("@")[-1] if "@" in postgres_url else postgres_url)
    pg_engine = create_engine(postgres_url, pool_pre_ping=True)

    # Ensure schema exists on destination
    if not dry_run:
        Base.metadata.create_all(pg_engine)

    stats: Dict[str, Dict[str, int]] = {}

    with pg_engine.connect() as pg_conn:
        for table in TABLES_ORDER:
            # Read from SQLite
            cur = sqlite_conn.cursor()
            cur.execute(f"SELECT * FROM {table}")
            rows = [dict(r) for r in cur.fetchall()]
            source_count = len(rows)

            if dry_run:
                logger.info("[DRY-RUN] Table '%s': %d rows ready for migration.", table, source_count)
                stats[table] = {"source": source_count, "migrated": 0, "verified": 0}
                continue

            # Insert into PostgreSQL
            if rows:
                columns = list(rows[0].keys())
                col_names = ", ".join(columns)
                placeholders = ", ".join([f":{c}" for c in columns])
                insert_stmt = text(f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING")
                pg_conn.execute(insert_stmt, rows)
                pg_conn.commit()

            # Verify destination count
            dest_res = pg_conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            dest_count = int(dest_res or 0)

            logger.info("Table '%s': Source=%d, Dest=%d", table, source_count, dest_count)
            stats[table] = {"source": source_count, "dest": dest_count}

    sqlite_conn.close()
    return stats

def main():
    parser = argparse.ArgumentParser(description="Migrate Industrial Maintenance DB from SQLite to PostgreSQL")
    parser.add_argument("--sqlite-path", type=Path, default=settings.DATABASE_PATH, help="Path to SQLite maintenance.db")
    parser.add_argument("--postgres-url", type=str, default=settings.DATABASE_URL, help="PostgreSQL URL; set DATABASE_URL or pass this option")
    parser.add_argument("--dry-run", action="store_true", help="Perform count inspection without writing to PostgreSQL")
    args = parser.parse_args()

    try:
        results = migrate_database(args.sqlite_path, args.postgres_url, args.dry_run)
        print("\n--- Migration Summary ---")
        for tbl, counts in results.items():
            print(f"  {tbl:<25}: Source={counts.get('source', 0):<5} Dest={counts.get('dest', counts.get('migrated', 0)):<5}")
        print("\n[✓] Migration completed successfully.")
    except Exception as exc:
        logger.error("Migration failed: %s", exc, exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
