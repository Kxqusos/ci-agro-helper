from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from schemas import LoginRequest, Token, UserReadPublic
from service.auth_svc import AuthService
from service.security import (
    ACCESS_TTL,
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from utils import verify_pswd

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    user = await svc.get_by_email(payload.email)
    if not user or not verify_pswd(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверная почта или пароль")

    access = create_access_token(subject=user.id)
    refresh = create_refresh_token(subject=user.id)
    response.headers["Authorization"] = f"Bearer {access}"
    response.headers["X-Refresh-Token"] = refresh
    return Token(access_token=access, refresh_token=refresh, expire_in=ACCESS_TTL)


@router.post("/refresh", response_model=Token)
async def refresh(token: str, response: Response, db: AsyncSession = Depends(get_db)):
    # Simple refresh: issue a new access token if provided token is a refresh
    from service.security import decode_token, REFRESH_TTL

    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Неверный тип токена")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Недействительный токен")

    access = create_access_token(subject=int(user_id))
    # Issue a new refresh as well (rotation)
    new_refresh = create_refresh_token(subject=int(user_id))
    response.headers["Authorization"] = f"Bearer {access}"
    response.headers["X-Refresh-Token"] = new_refresh
    return Token(access_token=access, refresh_token=new_refresh, expire_in=ACCESS_TTL)


@router.get("/me", response_model=UserReadPublic)
async def me(user=Depends(get_current_user)):
    return UserReadPublic.model_validate(user)
