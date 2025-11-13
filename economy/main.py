from fastapi import FastAPI

app = FastAPI(title="Economy Service")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
