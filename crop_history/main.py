from fastapi import FastAPI

app = FastAPI(title="Crop History Service")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
