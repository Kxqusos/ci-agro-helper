from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Users
from schemas import UserCreate
from utils import hash_pswd


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_user(self, payload: UserCreate) -> Users:
        if not payload.term_accept:
            raise ValueError("terms not accepted")

        user = Users(
            email=payload.email,
            name=payload.name,
            password_hash=hash_pswd(payload.password),
            phone=payload.phone,
            is_verified=False,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def get_by_email(self, email: str) -> Users | None:
        q = select(Users).where(Users.email == email)
        res = await self.db.execute(q)
        return res.scalar_one_or_none()
