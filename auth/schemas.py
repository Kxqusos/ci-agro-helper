from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, SecretStr, ConfigDict
from pydantic_extra_types.phone_numbers import PhoneNumber

PasswordStr = Annotated[SecretStr, Field(min_length=8, max_length=32)]


class UserCreate(BaseModel):
    name: str = Field(min_length=5, max_length=20)
    email: EmailStr
    phone: Optional[str] = Field(default=None, description="Например +79991234567")
    password: PasswordStr
    term_accept: Optional[datetime] = None


class UserReadPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    is_verified: bool
    created_at: datetime


class Token(BaseModel):
    token_type: Literal["Bearer"] = "Bearer"
    access_token: str
    expire_in: int
    refresh_token: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: SecretStr
