from passlib.hash import bcrypt
from pydantic.types import SecretStr


def _unwrap_secret(raw: str | SecretStr) -> str:
    return raw.get_secret_value() if hasattr(raw, "get_secret_value") else raw


def hash_pswd(raw: str | SecretStr) -> str:
    s = _unwrap_secret(raw)
    if len(s.encode("utf-8")) > 72:
        raise ValueError("Пароль не должен превышать 72 байта в UTF-8, укоротите его.")
    return bcrypt.hash(s)


def verify_pswd(raw: str | SecretStr, hashed: str) -> bool:
    s = _unwrap_secret(raw)
    return bcrypt.verify(s, hashed)
