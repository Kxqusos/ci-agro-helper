from fastapi import FastAPI

app = FastAPI(title="Reference Service")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
