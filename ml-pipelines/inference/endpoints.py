# ml-pipelines/inference/endpoints.py
#
# Pure business logic for all ML prediction endpoints.
# No HTTP, no FastAPI, no database — just feature dict → response dict.
# Each function is independently testable and importable.
#
# Functions:
#   reintegration_prediction()     — reintegration_achieved model
#   donation_conversion_prediction() — led_to_donation model

import pandas as pd
from datetime import datetime, timezone


def reintegration_prediction(resident_id: int, features: dict, pipeline) -> dict:
    """
    Score a resident's reintegration readiness.

    Parameters:
        resident_id (int): resident being scored
        features (dict): feature vector assembled by the .NET backend
        pipeline: fitted sklearn Pipeline (reintegration_achieved.pkl)

    Returns:
        dict matching ReintegrationResponse schema
    """
    features_df = pd.DataFrame([features])

    proba = float(pipeline.predict_proba(features_df)[0, 1])
    score = round(proba * 100, 1)

    if score >= 75:
        recommendation = "Reintegration readiness indicated — schedule case conference"
    elif score >= 50:
        recommendation = "Progressing — continue current intervention plan"
    else:
        recommendation = "Continue structured care — reintegration readiness not yet indicated"

    return {
        "resident_id":     resident_id,
        "readiness_score": score,
        "probability":     round(proba, 4),
        "recommendation":  recommendation,
        "model_version":   "reintegration_achieved_v1",
        "predicted_at":    datetime.now(timezone.utc).isoformat(),
    }


def donation_conversion_prediction(post_id: int, features: dict, pipeline) -> dict:
    """
    Score a social media post's estimated donation conversion probability.

    Parameters:
        post_id (int): post being scored (use 0 for pre-publication scoring)
        features (dict): feature vector assembled by the .NET backend.
                         Must match the feature set used during training:
                         num_hashtags, mentions_count, caption_length,
                         post_hour, post_month, post_is_weekend,
                         follower_count_at_post, video_views, forwards,
                         platform, post_type, media_type, day_of_week,
                         call_to_action_type, content_topic, sentiment_tone,
                         campaign_name, has_call_to_action, is_boosted,
                         features_resident_story
        pipeline: fitted sklearn Pipeline (led_to_donation.pkl)

    Returns:
        dict matching DonationConversionResponse schema
    """
    features_df = pd.DataFrame([features])

    proba = float(pipeline.predict_proba(features_df)[0, 1])
    score = round(proba * 100, 1)

    if score >= 60:
        recommendation = "High conversion potential — prioritize this content type"
    elif score >= 35:
        recommendation = "Moderate conversion potential — consider pairing with a call to action"
    else:
        recommendation = "Low conversion potential — better suited for engagement or awareness goals"

    return {
        "post_id":           post_id,
        "conversion_score":  score,
        "probability":       round(proba, 4),
        "recommendation":    recommendation,
        "model_version":     "led_to_donation_v1",
        "predicted_at":      datetime.now(timezone.utc).isoformat(),
    }