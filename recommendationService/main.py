from fastapi import FastAPI, HTTPException

from .matching import score_devices
from .schemas import ScoreRequest, ScoreResponse

app = FastAPI(title="Recommendation Service", version="1.0.0")


@app.get("/")
def read_root():
    return {"message": "Recommendation service is running"}


@app.post("/ml/score-dispositivos", response_model=ScoreResponse)
def score_dispositivos(payload: ScoreRequest):
    if not payload.criterios:
        raise HTTPException(status_code=400, detail="Nenhum critério informado")
    if not payload.dispositivos:
        raise HTTPException(status_code=400, detail="Nenhum dispositivo informado")

    scores = score_devices(payload.criterios, payload.dispositivos)
    return ScoreResponse(scores=scores)
