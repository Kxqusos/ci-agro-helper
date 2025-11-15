import os
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from database.models import Users


ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "dev-secret"))

ACCESS_TTL = int(os.getenv("ACCESS_TOKEN_EXPIRES", "3600"))  # seconds
REFRESH_TTL = int(os.getenv("REFRESH_TOKEN_EXPIRES", str(60 * 60 * 24 * 30)))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_token(
    *,
    subject: str | int,
    ttl_seconds: int,
    token_type: Literal["access", "refresh"],
    extra: dict[str, Any] | None = None,
) -> str:
    now = _now()
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl_seconds)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:  # type: ignore[attr-defined]
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен истёк")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Users:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный тип токена")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Нет субъекта в токене")

    q = select(Users).where(Users.id == int(user_id))
    res = await db.execute(q)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    return user


def create_access_token(subject: str | int, extra: dict[str, Any] | None = None) -> str:
    return create_token(subject=subject, ttl_seconds=ACCESS_TTL, token_type="access", extra=extra)


def create_refresh_token(subject: str | int, extra: dict[str, Any] | None = None) -> str:
    return create_token(subject=subject, ttl_seconds=REFRESH_TTL, token_type="refresh", extra=extra)

