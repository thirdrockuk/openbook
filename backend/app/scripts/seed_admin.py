import argparse
import os

from passlib.context import CryptContext
from sqlmodel import Session, select

from app.database import engine
from app.models.admin_user import AdminUser

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create or update an admin user for local/dev environments."
    )
    parser.add_argument(
        "--email",
        default=os.getenv("ADMIN_EMAIL"),
        help="Admin email (or set ADMIN_EMAIL env var).",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("ADMIN_PASSWORD"),
        help="Admin password (or set ADMIN_PASSWORD env var).",
    )
    return parser.parse_args()


def seed_admin(email: str, password: str) -> str:
    normalized_email = email.strip().lower()
    if not normalized_email:
        raise ValueError("Email cannot be empty")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    with Session(engine) as session:
        existing_admin = session.exec(
            select(AdminUser).where(AdminUser.email == normalized_email)
        ).first()

        hashed_password = pwd_context.hash(password)
        if existing_admin:
            existing_admin.hashed_password = hashed_password
            existing_admin.is_active = True
            session.add(existing_admin)
            session.commit()
            return "updated"

        session.add(
            AdminUser(
                email=normalized_email,
                hashed_password=hashed_password,
                is_active=True,
            )
        )
        session.commit()
        return "created"


def main() -> None:
    args = parse_args()
    if not args.email:
        raise SystemExit("Missing admin email. Use --email or set ADMIN_EMAIL.")
    if not args.password:
        raise SystemExit("Missing admin password. Use --password or set ADMIN_PASSWORD.")

    action = seed_admin(args.email, args.password)
    print(f"Admin user {action}: {args.email.strip().lower()}")


if __name__ == "__main__":
    main()
