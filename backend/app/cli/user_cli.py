"""Local CLI for managing users and roles."""
import sys
import uuid
import click
from backend.app.database.models import init_db
from backend.app.database.repository import IndustrialRepository
from backend.app.auth.security import hash_password

@click.group()
def cli():
    """Industrial Copilot User Management CLI."""
    pass

@cli.command("create-user")
@click.option("--username", prompt=True, help="Unique username")
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Password")
@click.option("--full-name", prompt=True, help="Full name of the technician or supervisor")
@click.option("--role", type=click.Choice(["technician", "supervisor", "admin"]), default="technician", prompt=True, help="User role")
def create_user(username, password, full_name, role):
    """Create a new user with Argon2id hashed password."""
    init_db()
    repo = IndustrialRepository()
    existing = repo.get_user_by_username(username)
    if existing:
        click.echo(f"Error: User '{username}' already exists.", err=True)
        sys.exit(1)

    user_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
    p_hash = hash_password(password)
    user = repo.create_user(
        user_id=user_id,
        username=username,
        password_hash=p_hash,
        full_name=full_name,
        role=role
    )
    click.echo(f"Successfully created user {user['username']} ({user['role']}) with ID {user['user_id']}.")

@cli.command("list-users")
def list_users():
    """List all registered users and roles."""
    init_db()
    repo = IndustrialRepository()
    conn = repo._get_conn()
    cur = conn.cursor()
    cur.execute("SELECT user_id, username, full_name, role, created_at FROM users ORDER BY created_at ASC")
    rows = cur.fetchall()
    conn.close()

    click.echo(f"{'User ID':<15} {'Username':<15} {'Role':<12} {'Full Name':<25}")
    click.echo("-" * 70)
    for r in rows:
        click.echo(f"{r['user_id']:<15} {r['username']:<15} {r['role']:<12} {r['full_name']:<25}")

if __name__ == "__main__":
    cli()
