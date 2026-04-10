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


def engagement_rate_prediction(post_id: int, features: dict, pipeline) -> dict:
    """
    Predict a social media post's engagement rate.

    Parameters:
        post_id (int): post being scored
        features (dict): feature vector assembled by the .NET backend.
                         Must match the feature set used during training:
                         num_hashtags, mentions_count, caption_length,
                         post_hour, post_month, follower_count_at_post,
                         video_views, forwards, platform, post_type,
                         media_type, day_of_week, call_to_action_type,
                         content_topic, sentiment_tone, campaign_name,
                         has_call_to_action, is_boosted, features_resident_story
        pipeline: fitted sklearn Pipeline (engagement_rate.pkl)

    Returns:
        dict matching EngagementRateResponse schema
    """
    features_df = pd.DataFrame([features])

    predicted = float(pipeline.predict(features_df)[0])
    rate = round(predicted * 100, 2)  # as percentage

    if predicted >= 0.15:
        recommendation = "High engagement potential — strong content mix"
    elif predicted >= 0.07:
        recommendation = "Moderate engagement — consider boosting or adding a call to action"
    else:
        recommendation = "Low engagement predicted — review content type and timing"

    return {
        "post_id":                post_id,
        "predicted_engagement_rate": round(predicted, 6),
        "engagement_rate_pct":    rate,
        "recommendation":         recommendation,
        "model_version":          "engagement_rate_v1",
        "predicted_at":           datetime.now(timezone.utc).isoformat(),
    }


def donor_lapse_prediction(supporter_id: int, features: dict, pipeline) -> dict:
    """
    Predict whether a donor is at risk of lapsing.

    Parameters:
        supporter_id (int): supporter being scored
        features (dict): aggregated feature vector assembled by the .NET backend.
                         Fields: monetary_donation_count, avg_monetary_gift,
                         unique_campaigns, donation_types_count,
                         days_since_first_donation, days_since_created,
                         supporter_type, relationship_type, country, region,
                         status, acquisition_channel, is_recurring_donor
                         NOTE: days_since_last_donation is EXCLUDED (direct leakage)
        pipeline: fitted sklearn Pipeline (is_lapsed.pkl)

    Returns:
        dict matching DonorLapseResponse schema
    """
    features_df = pd.DataFrame([features])

    proba = float(pipeline.predict_proba(features_df)[0, 1])
    score = round(proba * 100, 1)

    if score >= 70:
        recommendation = "High lapse risk — prioritize re-engagement outreach"
    elif score >= 40:
        recommendation = "Moderate lapse risk — consider a personal thank-you or update"
    else:
        recommendation = "Low lapse risk — donor appears engaged"

    return {
        "supporter_id":  supporter_id,
        "lapse_score":   score,
        "probability":   round(proba, 4),
        "recommendation": recommendation,
        "model_version": "is_lapsed_v1",
        "predicted_at":  datetime.now(timezone.utc).isoformat(),
    }


def donor_upgrade_prediction(supporter_id: int, features: dict, pipeline) -> dict:
    """
    Predict whether a donor is likely to increase their donation.

    Parameters:
        supporter_id (int): supporter being scored
        features (dict): aggregated feature vector assembled by the .NET backend.
                         Same fields as donor_lapse_prediction plus
                         days_since_last_donation.
        pipeline: fitted sklearn Pipeline (will_increase_donation.pkl)

    Returns:
        dict matching DonorUpgradeResponse schema
    """
    features_df = pd.DataFrame([features])

    proba = float(pipeline.predict_proba(features_df)[0, 1])
    score = round(proba * 100, 1)

    if score >= 60:
        recommendation = "High upgrade potential — good candidate for major gift ask"
    elif score >= 35:
        recommendation = "Moderate upgrade potential — consider a giving level nudge"
    else:
        recommendation = "Low upgrade likelihood — maintain current engagement"

    return {
        "supporter_id":   supporter_id,
        "upgrade_score":  score,
        "probability":    round(proba, 4),
        "recommendation": recommendation,
        "model_version":  "will_increase_donation_v1",
        "predicted_at":   datetime.now(timezone.utc).isoformat(),
    }


def progress_prediction(resident_id: int, features: dict, pipeline) -> dict:
    """
    Predict a resident's latest education progress percent.

    Parameters:
        resident_id (int): resident being scored
        features (dict): feature vector assembled by the .NET backend.
                         Same resident features as reintegration MINUS:
                         progress_avg, length_of_stay_days,
                         reintegration_achieved, reintegration_status,
                         current_risk_num, current_risk_level,
                         initial_risk_num, risk_improved, risk_escalated.
        pipeline: fitted sklearn Pipeline (progress_percent_latest.pkl)

    Returns:
        dict matching ProgressResponse schema
    """
    features_df = pd.DataFrame([features])

    predicted = float(pipeline.predict(features_df)[0])
    predicted = max(0.0, min(100.0, predicted))  # clamp to [0, 100]

    if predicted >= 80:
        recommendation = "Strong education progress — on track for completion"
    elif predicted >= 60:
        recommendation = "Moderate progress — review attendance and support needs"
    else:
        recommendation = "Low progress predicted — consider targeted academic support"

    return {
        "resident_id":       resident_id,
        "progress_score":    round(predicted, 1),
        "recommendation":    recommendation,
        "model_version":     "progress_percent_latest_v1",
        "predicted_at":      datetime.now(timezone.utc).isoformat(),
    }


def monthly_donation_prediction(month: str, features: dict, pipeline) -> dict:
    """
    Predict monthly donation volume from a content calendar.

    Parameters:
        month (str): target month in YYYY-MM format
        features (dict): monthly aggregated posting features assembled by the caller.
                         Must match the feature set used during training — see
                         models/monthly_donation_features.json for the full list.
                         Key fields: total_posts, boosted_posts, total_engagement,
                         posts_with_cta, posts_with_story, platform_* proportions,
                         content_topic_* proportions.
        pipeline: fitted sklearn Pipeline (monthly_donation_value.pkl)

    Returns:
        dict matching MonthlyForecastResponse schema
    """
    features_df = pd.DataFrame([features])

    predicted = float(pipeline.predict(features_df)[0])
    predicted = max(0.0, predicted)  # clip negative predictions

    return {
        "month":                              month,
        "predicted_donation_value":           round(predicted, 2),
        "predicted_donation_value_formatted": f"PHP {predicted:,.0f}",
        "confidence_note":                    "Estimate based on historical posting patterns. Accuracy improves with more months of data.",
        "model_version":                      "monthly_donation_value_v1",
        "predicted_at":                       datetime.now(timezone.utc).isoformat(),
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