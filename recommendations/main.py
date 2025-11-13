from fastapi import FastAPI

app = FastAPI(title="Recommendations Service")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
