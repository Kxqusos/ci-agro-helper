#!/usr/bin/env python3
"""
Demo user seed script for auth service

Creates a demo user for testing and demonstrations:
- Email: demo-agronom@local
- Password: Demo123!
- Role: user

Usage:
    python seed_demo_user.py

Requirements:
    - Database must be running and accessible via DATABASE_URL
    - Auth service tables must be created
"""

import asyncio
import os
from passlib.context import CryptContext
from sqlalchemy import select
from database.db import SessionLocal, engine
from database.models import Users, Base

# Password hashing context (matches auth service configuration)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo user credentials
DEMO_EMAIL = "demo-agronom@local"
DEMO_PASSWORD = "Demo123!"
DEMO_NAME = "Demo Agronom"
DEMO_PHONE = "+1234567890"


async def create_tables():
    """Ensure all tables exist"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Database tables verified/created")


async def seed_demo_user():
    """Create demo user if it doesn't exist"""
    async with SessionLocal() as session:
        # Check if demo user already exists
        result = await session.execute(
            select(Users).where(Users.email == DEMO_EMAIL)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"⚠ Demo user '{DEMO_EMAIL}' already exists (ID: {existing_user.id})")
            print(f"  To reset password, delete the user and run this script again")
            return existing_user

        # Hash password
        hashed_password = pwd_context.hash(DEMO_PASSWORD)

        # Create new demo user
        demo_user = Users(
            email=DEMO_EMAIL,
            name=DEMO_NAME,
            phone=DEMO_PHONE,
            password_hash=hashed_password,
            is_verified=True,  # Pre-verified for easy testing
        )

        session.add(demo_user)
        await session.commit()
        await session.refresh(demo_user)

        print(f"✓ Demo user created successfully!")
        print(f"  ID: {demo_user.id}")
        print(f"  Email: {demo_user.email}")
        print(f"  Name: {demo_user.name}")
        print(f"  Password: {DEMO_PASSWORD}")
        print(f"  Verified: {demo_user.is_verified}")

        return demo_user


async def main():
    """Main seed function"""
    print("=" * 60)
    print("Auth Service - Demo User Seed Script")
    print("=" * 60)

    # Check DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable not set")
        print("   Set it in .env or export it before running this script")
        return 1

    print(f"Database: {database_url.split('@')[-1]}")  # Hide credentials
    print()

    try:
        # Create tables if needed
        await create_tables()

        # Seed demo user
        await seed_demo_user()

        print()
        print("=" * 60)
        print("Demo User Credentials")
        print("=" * 60)
        print(f"Email:    {DEMO_EMAIL}")
        print(f"Password: {DEMO_PASSWORD}")
        print()
        print("Use these credentials to:")
        print("  1. Login at https://app.example.com/auth")
        print("  2. Test authentication flow")
        print("  3. Request recommendations")
        print("=" * 60)

        return 0

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
