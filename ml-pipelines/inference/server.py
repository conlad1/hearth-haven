# ml-pipelines/inference/server.py
#
# FastAPI inference server for Hearth Haven ML predictions.
# HTTP layer only — all business logic lives in endpoints.py.
#
# USAGE (local development):
#   cd ml-pipelines/inference
#   uvicorn server:app --port 8000 --reload
#
# The .NET backend calls these endpoints after assembling feature vectors
# from Azure SQL. The Python server does not query the database directly.

import os
import pickle
import logging
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.pipeline import Pipeline as SklearnPipeline

from endpoints import (
    reintegration_prediction,
    progress_prediction,
    donation_conversion_prediction,
    engagement_rate_prediction,
    donor_lapse_prediction,
    donor_upgrade_prediction,
)

# ── Config ─────────────────────────────────────────────────────────────────────

MODELS_DIR = Path(os.getenv("MODELS_DIR", Path(__file__).parent.parent / "models"))

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("hearth-haven-ml")

app = FastAPI(title="Hearth Haven ML Inference", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5070",
        "http://localhost:5071",
        "http://localhost:5173",
        "https://hearth-haven.azurewebsites.net",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Model cache ────────────────────────────────────────────────────────────────

_model_cache: dict[str, SklearnPipeline] = {}

def load_model(target_name: str) -> SklearnPipeline:
    if target_name not in _model_cache:
        path = MODELS_DIR / f"{target_name}.pkl"
        if not path.exists():
            raise FileNotFoundError(f"Model not found: {path}")
        with open(path, "rb") as f:
            model = pickle.load(f)
        assert isinstance(model, SklearnPipeline), \
            f"Expected sklearn Pipeline, got {type(model)}"
        _model_cache[target_name] = model
        log.info(f"Loaded model: {target_name}")
    return _model_cache[target_name]


# ── Request / Response models ──────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    resident_id: int
    features: Dict[str, Any]

class PostScoringRequest(BaseModel):
    post_id: int               # use 0 for pre-publication scoring
    features: Dict[str, Any]

class ReintegrationResponse(BaseModel):
    resident_id:     int
    readiness_score: float
    probability:     float
    recommendation:  str
    model_version:   str
    predicted_at:    str

class DonationConversionResponse(BaseModel):
    post_id:          int
    conversion_score: float
    probability:      float
    recommendation:   str
    model_version:    str
    predicted_at:     str

class DonorScoringRequest(BaseModel):
    supporter_id: int
    features: Dict[str, Any]

class EngagementRateResponse(BaseModel):
    post_id:                  int
    predicted_engagement_rate: float
    engagement_rate_pct:      float
    recommendation:           str
    model_version:            str
    predicted_at:             str

class DonorLapseResponse(BaseModel):
    supporter_id:  int
    lapse_score:   float
    probability:   float
    recommendation: str
    model_version: str
    predicted_at:  str

class DonorUpgradeResponse(BaseModel):
    supporter_id:  int
    upgrade_score: float
    probability:   float
    recommendation: str
    model_version: str
    predicted_at:  str

class ProgressResponse(BaseModel):
    resident_id:    int
    progress_score: float
    recommendation: str
    model_version:  str
    predicted_at:   str

class HealthCheckResponse(BaseModel):
    status:        str
    models_loaded: list[str]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/health")


@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return {
        "status":        "ok",
        "models_loaded": list(_model_cache.keys()),
    }


@app.post("/predict/reintegration", response_model=ReintegrationResponse)
def predict_reintegration(request: PredictionRequest):
    """
    Score a resident's reintegration readiness.
    .NET backend assembles the feature dict from Azure SQL and POSTs here.
    """
    try:
        pipeline = load_model("reintegration_achieved")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        return reintegration_prediction(
            resident_id=request.resident_id,
            features=request.features,
            pipeline=pipeline,
        )
    except Exception as e:
        log.error(f"Prediction failed for resident {request.resident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.post("/predict/progress", response_model=ProgressResponse)
def predict_progress(request: PredictionRequest):
    """
    Predict a resident's education progress percent (0–100).
    .NET backend assembles the feature dict from Azure SQL and POSTs here.
    """
    try:
        pipeline = load_model("progress_percent_latest")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        return progress_prediction(
            resident_id=request.resident_id,
            features=request.features,
            pipeline=pipeline,
        )
    except Exception as e:
        log.error(f"Progress prediction failed for resident {request.resident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.post("/predict/donation-conversion", response_model=DonationConversionResponse)
def predict_donation_conversion(request: PostScoringRequest):
    """
    Score a social media post's estimated donation conversion probability.
    Accepts post_id=0 for pre-publication scoring of draft posts.
    .NET backend assembles the feature dict and POSTs here.
    """
    try:
        pipeline = load_model("led_to_donation")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        return donation_conversion_prediction(
            post_id=request.post_id,
            features=request.features,
            pipeline=pipeline,
        )
    except Exception as e:
        log.error(f"Prediction failed for post {request.post_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.post("/predict/engagement-rate", response_model=EngagementRateResponse)
def predict_engagement_rate(request: PostScoringRequest):
    """
    Predict a social media post's engagement rate.
    .NET backend assembles the feature dict and POSTs here.
    """
    try:
        pipeline = load_model("engagement_rate")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        return engagement_rate_prediction(
            post_id=request.post_id,
            features=request.features,
            pipeline=pipeline,
        )
    except Exception as e:
        log.error(f"Engagement prediction failed for post {request.post_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.post("/predict/donor-lapse", response_model=DonorLapseResponse)
def predict_donor_lapse(request: DonorScoringRequest):
    """
    Predict whether a donor is at risk of lapsing.
    .NET backend assembles aggregated features from Azure SQL and POSTs here.
    """
    try:
        pipeline = load_model("is_lapsed")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        return donor_lapse_prediction(
            supporter_id=request.supporter_id,
            features=request.features,
            pipeline=pipeline,
        )
    except Exception as e:
        log.error(f"Lapse prediction failed for supporter {request.supporter_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.post("/predict/donor-upgrade", response_model=DonorUpgradeResponse)
def predict_donor_upgrade(request: DonorScoringRequest):
    """
    Predict whether a donor is likely to increase their donation.
    .NET backend assembles aggregated features from Azure SQL and POSTs here.
    """
    try:
        pipeline = load_model("will_increase_donation")
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    try:
        return donor_upgrade_prediction(
            supporter_id=request.supporter_id,
            features=request.features,
            pipeline=pipeline,
        )
    except Exception as e:
        log.error(f"Upgrade prediction failed for supporter {request.supporter_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")