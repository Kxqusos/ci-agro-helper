from fastapi import FastAPI

app = FastAPI(title="Weather Service")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
