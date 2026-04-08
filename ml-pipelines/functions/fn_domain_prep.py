import os
import sys
import json
import urllib.parse
import pandas as pd
import numpy as np
from sqlalchemy import create_engine

# Point Python to the current directory so it can securely import fn_clean
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fn_clean import (
    drop_structural_columns, fix_column_types, handle_intentional_nulls,
    cap_outliers_iqr, transform_skewed_column, bin_rare_categories, merge_tables,
)


# ─── 1. PRIVATE HELPER FUNCTIONS (Data Fetching) ──────────────────────────────

def _get_connection_string():
    """Finds appsettings.Development.json and translates ADO.NET to ODBC format."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    appsettings_path = os.path.abspath(os.path.join(current_dir, '..', '..', 'backend', 'HearthHaven.API', 'appsettings.Development.json'))
    
    try:
        with open(appsettings_path, 'r') as file:
            config = json.load(file)
            dot_net_string = config.get("ConnectionStrings", {}).get("AZURE_SQL_CONNECTIONSTRING", "")
            
            if not dot_net_string:
                return None
                
            if "Driver=" not in dot_net_string:
                python_string = f"Driver={{ODBC Driver 18 for SQL Server}};{dot_net_string}"
            else:
                python_string = dot_net_string
                
            python_string = python_string.replace("Encrypt=True", "Encrypt=yes")
            python_string = python_string.replace("Encrypt=False", "Encrypt=no")
            python_string = python_string.replace("TrustServerCertificate=True", "TrustServerCertificate=yes")
            python_string = python_string.replace("TrustServerCertificate=False", "TrustServerCertificate=no")
            python_string = python_string.replace("User ID=", "UID=")
            python_string = python_string.replace("Password=", "PWD=")
            python_string = python_string.replace("Initial Catalog=", "Database=")

            return python_string
            
    except FileNotFoundError:
        print(f"[WARNING] Could not find appsettings at {appsettings_path}")
        return None

def _get_data(table_name: str) -> pd.DataFrame:
    """Fetches a specific table from Azure SQL, falling back to CSV if unavailable."""
    conn_str = _get_connection_string()
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    sql_query = f"SELECT * FROM dbo.{table_name}"
    csv_path = os.path.join(base_dir, "data", f"{table_name}.csv")

    if conn_str:
        try:
            params = urllib.parse.quote_plus(conn_str)
            engine = create_engine(f"mssql+pyodbc:///?odbc_connect={params}")
            
            with engine.connect() as conn:
                df = pd.read_sql(sql_query, conn)
            
            print(f"[OK] Connected to Azure SQL for '{table_name}'!")
            return df
            
        except Exception as e:
            print(f"[INFO] Database unavailable ({type(e).__name__})\n       Falling back to CSV...")
    else:
        print(f"[INFO] No connection string found. Falling back to CSV...")

    try:
        df = pd.read_csv(csv_path)
        print(f"[OK] Loaded '{table_name}' from CSV fallback")
        return df
    except FileNotFoundError:
        raise FileNotFoundError(f"Could not connect to DB and CSV missing at {csv_path}")


# ─── 2. DOMAIN PREPARATION FUNCTIONS ──────────────────────────────────────────

def prepare_social_media():
    print("=" * 52)
    print("  prepare_social_media()")
    print("=" * 52)

    # 1. Load Data
    posts = _get_data("social_media_posts")
    donations = _get_data("donations")

    # 2. Drop structural columns
    posts = drop_structural_columns(posts, [
        'platform_post_id',
        'post_url',
        'caption',
        'hashtags',
    ])

    # 3. Fix column types
    posts = fix_column_types(posts)

    # 4. Engineer temporal features
    posts['created_at']      = pd.to_datetime(posts['created_at'], errors='coerce')
    posts['post_month']      = posts['created_at'].dt.month
    posts['post_is_weekend'] = posts['created_at'].dt.dayofweek.ge(5).astype(int)
    posts = posts.drop(columns=['created_at'])
    print("[OK] Engineered: post_month, post_is_weekend")

    # 5. Handle intentional nulls
    posts = handle_intentional_nulls(posts, {
        'video_views':               0,
        'watch_time_seconds':        0,
        'avg_view_duration_seconds': 0,
        'subscriber_count_at_post':  0,
        'boost_budget_php':          0,
        'forwards':                  0,
        'call_to_action_type':       'None',
    })

    # 6. Fill campaign_name
    posts['campaign_name'] = posts['campaign_name'].fillna('None')

    # 7. Bin rare categories
    posts = bin_rare_categories(posts, 'campaign_name', threshold=0.05)

    # 8. Cap outliers and transform skew
    posts = cap_outliers_iqr(posts, 'impressions')
    posts = cap_outliers_iqr(posts, 'reach')
    posts = cap_outliers_iqr(posts, 'follower_count_at_post')
    posts = transform_skewed_column(posts, 'impressions')
    posts = transform_skewed_column(posts, 'reach')

    # 9. Aggregate and join donations
    social_donations = (
        donations[donations['channel_source'] == 'SocialMedia']
        .groupby('referral_post_id')
        .agg(
            confirmed_donation_count=('donation_id', 'count'),
            confirmed_monetary_value=('amount',      'sum'),
        )
        .reset_index()
        .rename(columns={'referral_post_id': 'post_id'})
    )
    df = merge_tables(posts, social_donations, on='post_id', how='left')
    df['confirmed_donation_count'] = df['confirmed_donation_count'].fillna(0).astype(int)
    df['confirmed_monetary_value'] = df['confirmed_monetary_value'].fillna(0)
    df = df.drop(columns=['post_id'])

    # 10. Engineer classification target
    df['led_to_donation'] = (df['confirmed_donation_count'] > 0).astype(int)
    print(f"[OK] Target 'led_to_donation': {df['led_to_donation'].mean():.1%} positive rate")

    # 11. Feature lists
    NUMERIC_FEATURES = [
        'num_hashtags', 'mentions_count', 'caption_length', 'post_hour',
        'post_month', 'post_is_weekend', 'follower_count_at_post',
        'video_views', 'forwards',
    ]

    CATEGORICAL_FEATURES = [
        'platform', 'post_type', 'media_type', 'day_of_week',
        'call_to_action_type', 'content_topic', 'sentiment_tone',
        'campaign_name', 'has_call_to_action', 'is_boosted',
        'features_resident_story',
    ]

    DROP_ALWAYS = {
        'engagement_rate': [
            'likes', 'comments', 'shares', 'saves',
            'reach', 'impressions', 'click_throughs', 'profile_visits',
            'donation_referrals', 'estimated_donation_value_php',
            'confirmed_donation_count', 'confirmed_monetary_value', 'led_to_donation',
        ],
        'donation_referrals': [
            'estimated_donation_value_php',
            'confirmed_donation_count', 'confirmed_monetary_value', 'led_to_donation',
            'likes', 'comments', 'shares', 'saves',
            'reach', 'impressions', 'click_throughs', 'profile_visits', 'engagement_rate',
        ],
        'led_to_donation': [
            'confirmed_donation_count', 'confirmed_monetary_value',
            'donation_referrals', 'estimated_donation_value_php',
            'likes', 'comments', 'shares', 'saves',
            'reach', 'impressions', 'click_throughs', 'profile_visits', 'engagement_rate',
        ],
    }

    print(f"\n[OK] prepare_social_media() complete.")
    print(f"     Shape: {df.shape[0]} rows x {df.shape[1]} cols")
    print(f"     Numeric ({len(NUMERIC_FEATURES)}), Categorical ({len(CATEGORICAL_FEATURES)})")

    return df, NUMERIC_FEATURES, CATEGORICAL_FEATURES, DROP_ALWAYS


def prepare_donors():
    print("=" * 52)
    print("  prepare_donors()")
    print("=" * 52)

    # 1. Load Data
    supporters = _get_data("supporters")
    donations  = _get_data("donations")

    # 2. Drop PII and identifier columns
    supporters = drop_structural_columns(supporters, [
        'display_name', 'organization_name', 'first_name',
        'last_name', 'email', 'phone',
    ])

    # 3. Fix column types
    supporters = fix_column_types(supporters)

    # 4. Engineer date-derived features
    supporters['first_donation_date'] = pd.to_datetime(
        supporters['first_donation_date'], errors='coerce'
    )
    supporters['created_at'] = pd.to_datetime(
        supporters['created_at'], errors='coerce'
    )
    ref_date = pd.Timestamp('today').normalize()

    supporters['days_since_first_donation'] = (
        ref_date - supporters['first_donation_date']
    ).dt.days
    supporters['days_since_created'] = (
        ref_date - supporters['created_at']
    ).dt.days

    supporters = supporters.drop(columns=['first_donation_date', 'created_at'])
    print("[OK] Engineered: days_since_first_donation, days_since_created")

    # 5. Fill never-donated sentinel
    supporters['days_since_first_donation'] = (
        supporters['days_since_first_donation'].fillna(-1)
    )

    # 6. Aggregate donation behavior per supporter
    donation_agg = donations.groupby('supporter_id').agg(
        monetary_donation_count=('donation_type',  lambda x: (x == 'Monetary').sum()),
        total_monetary_value   =('amount',          'sum'),
        avg_monetary_gift      =('amount',           'mean'),
        is_recurring_donor     =('is_recurring',     'max'),
        unique_campaigns       =('campaign_name',    'nunique'),
        last_donation_date     =('donation_date',    'max'),
        donation_types_count   =('donation_type',    'nunique'),
    ).reset_index()

    donation_agg['last_donation_date'] = pd.to_datetime(
        donation_agg['last_donation_date'], errors='coerce'
    )
    donation_agg['days_since_last_donation'] = (
        ref_date - donation_agg['last_donation_date']
    ).dt.days
    donation_agg = donation_agg.drop(columns=['last_donation_date'])

    # 7. Left-join
    df = merge_tables(supporters, donation_agg, on='supporter_id', how='left')

    # 8. Fill zero-donation rows
    df['monetary_donation_count']  = df['monetary_donation_count'].fillna(0).astype(int)
    df['total_monetary_value']     = df['total_monetary_value'].fillna(0)
    df['avg_monetary_gift']        = df['avg_monetary_gift'].fillna(0)
    df['is_recurring_donor']       = df['is_recurring_donor'].fillna(False)
    df['unique_campaigns']         = df['unique_campaigns'].fillna(0).astype(int)
    df['donation_types_count']     = df['donation_types_count'].fillna(0).astype(int)
    df['days_since_last_donation'] = df['days_since_last_donation'].fillna(-1)
    df = df.drop(columns=['supporter_id'])

    # 9. Bin rare categories
    df = bin_rare_categories(df, 'country', threshold=0.05)

    # 10. Cap outliers and transform skew
    df = cap_outliers_iqr(df, 'avg_monetary_gift')
    df = transform_skewed_column(df, 'avg_monetary_gift')
    df = cap_outliers_iqr(df, 'monetary_donation_count')
    df = transform_skewed_column(df, 'monetary_donation_count')

    # 11. Engineer targets
    df['is_lapsed'] = (
        (df['monetary_donation_count'] > 0) &
        (df['days_since_last_donation'] > 365)
    ).astype(int)

    print(f"[OK] Target 'is_lapsed': {df['is_lapsed'].mean():.1%} positive rate")
    print(f"[OK] Target 'total_monetary_value': mean={df['total_monetary_value'].mean():.0f} PHP")

    # 12. Feature lists
    NUMERIC_FEATURES = [
        'monetary_donation_count', 'avg_monetary_gift', 'unique_campaigns',
        'donation_types_count', 'days_since_last_donation',
        'days_since_first_donation', 'days_since_created',
    ]

    CATEGORICAL_FEATURES = [
        'supporter_type', 'relationship_type', 'country', 'region',
        'status', 'acquisition_channel', 'is_recurring_donor',
    ]

    DROP_ALWAYS = {
        'is_lapsed': ['days_since_last_donation', 'total_monetary_value'],
        'total_monetary_value': ['is_lapsed'],
    }

    print(f"\n[OK] prepare_donors() complete.")
    print(f"     Shape: {df.shape[0]} rows x {df.shape[1]} cols")
    
    return df, NUMERIC_FEATURES, CATEGORICAL_FEATURES, DROP_ALWAYS


def prepare_residents():
    print("=" * 52)
    print("  prepare_residents()")
    print("=" * 52)

    # 1. Load Data
    residents     = _get_data("residents")
    health        = _get_data("health_wellbeing_records")
    education     = _get_data("education_records")
    counseling    = _get_data("process_recordings")
    incidents     = _get_data("incident_reports")
    visitations   = _get_data("home_visitations")
    interventions = _get_data("intervention_plans")

    # 2. Drop structural columns
    residents = drop_structural_columns(residents, [
        'case_control_no', 'internal_code', 'sex', 'place_of_birth',
        'referring_agency_person', 'assigned_social_worker',
        'initial_case_assessment', 'notes_restricted', 'date_enrolled',
        'date_colb_registered', 'date_colb_obtained', 'date_case_study_prepared',
    ])

    # 3. Fix column types
    residents = fix_column_types(residents)

    # 4. Engineer date features
    for col in ['date_of_birth', 'date_of_admission', 'date_closed', 'created_at']:
        residents[col] = pd.to_datetime(residents[col], errors='coerce')

    ref_date = pd.Timestamp('today').normalize()

    residents['age_at_admission_days'] = (
        residents['date_of_admission'] - residents['date_of_birth']
    ).dt.days
    residents['days_in_care'] = (
        ref_date - residents['date_of_admission']
    ).dt.days
    residents['length_of_stay_days'] = (
        residents['date_closed'] - residents['date_of_admission']
    ).dt.days

    residents = residents.drop(columns=[
        'date_of_birth', 'date_of_admission', 'date_closed', 'created_at',
        'age_upon_admission', 'present_age', 'length_of_stay',
    ])
    print("[OK] Engineered: age_at_admission_days, days_in_care, length_of_stay_days")

    # 5. Handle intentional nulls
    residents['pwd_type']               = residents['pwd_type'].fillna('None')
    residents['special_needs_diagnosis']= residents['special_needs_diagnosis'].fillna('None')
    residents['reintegration_type']     = residents['reintegration_type'].fillna('None')
    residents['length_of_stay_days']    = residents['length_of_stay_days'].fillna(
        residents['days_in_care']
    )

    # 6a. Aggregate health
    health['record_date'] = pd.to_datetime(health['record_date'], errors='coerce')
    health_latest = (
        health.sort_values('record_date').groupby('resident_id').last().reset_index()
        [['resident_id', 'general_health_score', 'nutrition_score',
          'sleep_quality_score', 'energy_level_score', 'bmi']]
        .rename(columns={
            'general_health_score': 'health_score_latest',
            'nutrition_score':      'nutrition_score_latest',
            'sleep_quality_score':  'sleep_score_latest',
            'energy_level_score':   'energy_score_latest',
            'bmi':                  'bmi_latest',
        })
    )
    health_avg = health.groupby('resident_id').agg(
        checkup_completion =('medical_checkup_done', 'mean'),
    ).reset_index()
    health_agg = health_latest.merge(health_avg, on='resident_id', how='left')

    # 6b. Aggregate education
    education['record_date'] = pd.to_datetime(education['record_date'], errors='coerce')
    edu_latest = (
        education.sort_values('record_date').groupby('resident_id').last().reset_index()
        [['resident_id', 'attendance_rate', 'progress_percent',
          'education_level', 'enrollment_status', 'completion_status']]
        .rename(columns={
            'attendance_rate':   'attendance_rate_latest',
            'progress_percent':  'progress_percent_latest',
            'education_level':   'education_level_latest',
            'enrollment_status': 'enrollment_status_latest',
            'completion_status': 'completion_status_latest',
        })
    )
    edu_avg = education.groupby('resident_id').agg(
        progress_avg     =('progress_percent', 'mean'),
        attendance_avg   =('attendance_rate',  'mean'),
        education_records=('education_record_id', 'count'),
    ).reset_index()
    edu_agg = edu_latest.merge(edu_avg, on='resident_id', how='left')

    # 6c. Aggregate counseling
    counseling_agg = counseling.groupby('resident_id').agg(
        session_count        =('recording_id',            'count'),
        avg_session_duration =('session_duration_minutes', 'mean'),
        progress_rate        =('progress_noted',           'mean'),
        concern_rate         =('concerns_flagged',         'mean'),
        referral_rate        =('referral_made',            'mean'),
    ).reset_index()

    # 6d. Aggregate incidents
    severity_map = {'Low': 1, 'Medium': 2, 'High': 3}
    incidents['severity_num'] = incidents['severity'].map(severity_map)
    incidents_agg = incidents.groupby('resident_id').agg(
        incident_count      =('incident_id',   'count'),
        avg_severity        =('severity_num',  'mean'),
        high_severity_count =('severity_num',  lambda x: (x == 3).sum()),
        runaway_attempts    =('incident_type', lambda x: (x == 'RunawayAttempt').sum()),
        self_harm_incidents =('incident_type', lambda x: (x == 'SelfHarm').sum()),
    ).reset_index()

    # 6e. Aggregate visitations
    coop_map = {'Highly Cooperative': 4, 'Cooperative': 3,
                'Neutral': 2, 'Uncooperative': 1}
    visitations['coop_num'] = visitations['family_cooperation_level'].map(coop_map)
    visitations_agg = visitations.groupby('resident_id').agg(
        visitation_count       =('visitation_id',        'count'),
        safety_concern_rate    =('safety_concerns_noted', 'mean'),
        favorable_outcome_rate =('visit_outcome', lambda x: (x == 'Favorable').sum() / len(x)),
        family_cooperation_score=('coop_num',            'mean'),
    ).reset_index()

    # 6f. Aggregate interventions
    interventions_agg = interventions.groupby('resident_id').agg(
        total_plans          =('plan_id',       'count'),
        open_plans           =('status',        lambda x: (x == 'Open').sum()),
        plan_categories      =('plan_category', 'nunique'),
        plan_achievement_rate=('status',        lambda x: (x == 'Achieved').sum() / len(x)),
    ).reset_index()

    # 7. Build master DataFrame
    df = residents.copy()
    for agg_df in [health_agg, edu_agg, counseling_agg, incidents_agg, visitations_agg, interventions_agg]:
        df = merge_tables(df, agg_df, on='resident_id', how='left')
    df = df.drop(columns=['resident_id'])

    # 8. Fill missing aggregates
    count_cols = [
        'session_count', 'incident_count', 'visitation_count', 'total_plans',
        'open_plans', 'plan_categories', 'education_records',
        'high_severity_count', 'runaway_attempts', 'self_harm_incidents'
    ]
    rate_cols  = [
        'progress_rate', 'concern_rate', 'referral_rate', 'safety_concern_rate',
        'favorable_outcome_rate', 'plan_achievement_rate', 'checkup_completion',
        'attendance_avg', 'attendance_rate_latest'
    ]
    score_cols = [
        'health_score_latest', 'nutrition_score_latest', 'sleep_score_latest',
        'energy_score_latest', 'bmi_latest', 'avg_session_duration', 'avg_severity',
        'family_cooperation_score', 'progress_percent_latest', 'progress_avg'
    ]

    for col in count_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)
    for col in rate_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    for col in score_cols:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median())

    # 9. Engineer targets
    risk_order = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}

    df['initial_risk_num'] = df['initial_risk_level'].map(risk_order)
    df['current_risk_num'] = df['current_risk_level'].map(risk_order)
    df['risk_improved'] = (df['current_risk_num'] < df['initial_risk_num']).astype(int)
    df['reintegration_achieved'] = (df['reintegration_status'] == 'Completed').astype(int)
    df['risk_escalated'] = (df['current_risk_num'] > df['initial_risk_num']).astype(int)

    print(f"[OK] Target 'reintegration_achieved': {df['reintegration_achieved'].mean():.1%} positive")

    # 10. Feature lists
    NUMERIC_FEATURES = [
        'age_at_admission_days', 'days_in_care', 'length_of_stay_days',
        'health_score_latest', 'nutrition_score_latest', 'sleep_score_latest',
        'energy_score_latest', 'bmi_latest', 'checkup_completion',
        'attendance_rate_latest', 'attendance_avg', 'progress_avg', 
        'education_records', 'session_count', 'avg_session_duration',
        'progress_rate', 'concern_rate', 'referral_rate', 'incident_count',
        'avg_severity', 'high_severity_count', 'runaway_attempts',
        'self_harm_incidents', 'visitation_count', 'safety_concern_rate',
        'favorable_outcome_rate', 'family_cooperation_score', 'total_plans',
        'plan_achievement_rate', 'open_plans', 'plan_categories', 'initial_risk_num',
    ]

    CATEGORICAL_FEATURES = [
        'case_status', 'birth_status', 'religion', 'case_category',
        'referral_source', 'initial_risk_level', 'reintegration_type',
        'enrollment_status_latest', 'education_level_latest',
        'completion_status_latest', 'pwd_type', 'special_needs_diagnosis',
        'sub_cat_orphaned', 'sub_cat_trafficked', 'sub_cat_child_labor',
        'sub_cat_physical_abuse', 'sub_cat_sexual_abuse', 'sub_cat_osaec',
        'sub_cat_cicl', 'sub_cat_at_risk', 'sub_cat_street_child',
        'sub_cat_child_with_hiv', 'is_pwd', 'has_special_needs',
        'family_is_4ps', 'family_solo_parent', 'family_indigenous',
        'family_parent_pwd', 'family_informal_settler',
    ]

    DROP_ALWAYS = {
        'reintegration_achieved': [
            'reintegration_status', 'length_of_stay_days', 'current_risk_num',
            'current_risk_level', 'initial_risk_num', 'risk_improved',
            'risk_escalated', 'progress_percent_latest',
        ],
        'progress_percent_latest': [
            'progress_avg', 'length_of_stay_days', 'reintegration_achieved',
            'reintegration_status', 'current_risk_num', 'current_risk_level',
            'initial_risk_num', 'risk_improved', 'risk_escalated',
        ],
        'current_risk_num': [
            'current_risk_level', 'initial_risk_num', 'initial_risk_level',
            'risk_improved', 'risk_escalated', 'reintegration_achieved',
            'reintegration_status', 'progress_percent_latest',
        ],
        'risk_improved': [
            'current_risk_num', 'current_risk_level', 'initial_risk_num',
            'risk_escalated', 'reintegration_achieved', 'reintegration_status',
            'progress_percent_latest',
        ],
        'risk_escalated': [
            'current_risk_num', 'current_risk_level', 'initial_risk_num',
            'risk_improved', 'reintegration_achieved', 'reintegration_status',
            'progress_percent_latest',
        ],
    }

    print(f"\n[OK] prepare_residents() complete.")
    print(f"     Shape: {df.shape[0]} rows x {df.shape[1]} cols")

    return df, NUMERIC_FEATURES, CATEGORICAL_FEATURES, DROP_ALWAYS