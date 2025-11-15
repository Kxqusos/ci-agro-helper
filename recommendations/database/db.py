"""
Database connection and session management for Recommendations service.

This module provides:
- Async SQLAlchemy engine configuration
- Session factory for database operations
- Database dependency for FastAPI endpoints
"""

import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


DATABASE_URL = os.getenv("RECOMMENDATIONS_DATABASE_URL") or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL or RECOMMENDATIONS_DATABASE_URL must be set for Recommendations service.")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

# Create async session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
    autoflush=False,
)


async def get_db():
    """
    Dependency function for FastAPI endpoints.

    Yields an async database session and handles commit/rollback.
    """
    session = SessionLocal()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
