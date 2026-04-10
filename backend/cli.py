"""
CLI tool voor het beheren van de database.

Gebruik:
    python cli.py create-user <username> <email> <password> [--role admin]
    python cli.py generate-invite-code [--role user]
    python cli.py list-invite-codes
"""
import argparse
import secrets
import sys

from app.core.database import create_db_and_tables, get_session
from app.core.security import hash_password
from app.models.user import User
from app.models.invitation_code import InvitationCode


def create_user(args):
    create_db_and_tables()
    session = next(get_session())

    if session.query(User).filter_by(username=args.username).first():
        print(f"Fout: Gebruiker '{args.username}' bestaat al.")
        sys.exit(1)

    user = User(
        username=args.username,
        email=args.email,
        password_hash=hash_password(args.password),
        role=args.role,
    )
    session.add(user)
    session.commit()
    print(f"Gebruiker '{args.username}' (rol: {args.role}) succesvol aangemaakt.")


def generate_invite_code(args):
    create_db_and_tables()
    session = next(get_session())

    code = secrets.token_urlsafe(6)
    invite = InvitationCode(code=code, role=args.role)
    session.add(invite)
    session.commit()
    print(f"Nieuwe uitnodigingscode (rol: {args.role}): {code}")


def list_invite_codes(args):
    create_db_and_tables()
    session = next(get_session())

    codes = session.query(InvitationCode).all()
    if not codes:
        print("Geen uitnodigingscodes gevonden.")
        return

    print("\n--- Uitnodigingscodes ---")
    for c in codes:
        print(f"Code: {c.code} | Rol: {c.role} | Aangemaakt: {c.created_at}")
    print("---------------------------\n")


def main():
    parser = argparse.ArgumentParser(description="Chateau Overdruiven CLI")
    subparsers = parser.add_subparsers(dest="command")

    # create-user
    p_user = subparsers.add_parser("create-user")
    p_user.add_argument("username")
    p_user.add_argument("email")
    p_user.add_argument("password")
    p_user.add_argument("--role", default="user")
    p_user.set_defaults(func=create_user)

    # generate-invite-code
    p_code = subparsers.add_parser("generate-invite-code")
    p_code.add_argument("--role", default="user")
    p_code.set_defaults(func=generate_invite_code)

    # list-invite-codes
    p_list = subparsers.add_parser("list-invite-codes")
    p_list.set_defaults(func=list_invite_codes)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)
    args.func(args)


if __name__ == "__main__":
    main()
