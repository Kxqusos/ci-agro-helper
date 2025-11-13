from fastapi import FastAPI

app = FastAPI(title="Fields Service")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
