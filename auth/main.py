from fastapi import FastAPI

from database.db import engine
from database.models import Base
from routers.login import router as login_router
from routers.register import router as register_router

app = FastAPI()

app.include_router(login_router)
app.include_router(register_router)


@app.on_event("startup")
async def _create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
