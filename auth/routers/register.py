from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database.db import get_db
from schemas import UserCreate, UserReadPublic
from service.auth_svc import AuthService

router = APIRouter()


@router.post("/register", response_model=UserReadPublic, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    try:
        user = await svc.register_user(payload)
    except IntegrityError:
        raise HTTPException(409, detail="Пользователь с такой почтой уже существует.")
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    return UserReadPublic.model_validate(user)
