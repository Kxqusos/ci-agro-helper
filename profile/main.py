from fastapi import FastAPI

app = FastAPI(title="Profile Service")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
