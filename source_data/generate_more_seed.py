"""
generate_seed.py  –  Hearth Haven Full Seed Generator (Malaysia edition)
========================================================================
Reads existing CSVs from lighthouse_csv_v7/ for reference tables, then
generates a complete seed.sql covering all tables.

Strategy per table
------------------
KEEP FROM CSV (patched for Malaysia):
    safehouses, partners, partner_assignments, social_media_posts

KEEP FROM CSV AS-IS (supporters are tied to user accounts):
    supporters  →  inserted verbatim, then ~30 synthetic donors appended

FULLY SYNTHETIC (drop + regenerate):
    residents               ~100 total (61 base + ~40 new)
    process_recordings      8-12 sessions per resident
    education_records       monthly per resident, 18 months
    health_wellbeing_records monthly per resident, 18 months
    home_visitations        3-5 per resident
    intervention_plans      2-4 per resident
    incident_reports        sparse; escalated cohort gets more
    donation_allocations    tied to donations
    donations               ~300 total (historical + seasonal)
    safehouse_monthly_metrics  per safehouse per month, 18 months
    public_impact_snapshots    monthly snapshots

ESCALATED-RISK COHORT:
    10 residents where current_risk_level > initial_risk_level
    Their health records trend DOWN, sessions flag more concerns,
    incidents are more frequent. This gives the ML pipelines real signal.

Schema constraints verified against schema.sql
----------------------------------------------
safehouses.region:          Kuala Lumpur | Selangor | Penang | Johor | Sabah | Sarawak
                            (ALTER + DROP old constraint at top of SQL)
intervention_plans.plan_category: Safety | Physical Health | Education   (schema is restrictive)
donations.impact_unit:      dollars | items | hours | campaigns
donations.currency_code:    USD
residents.*:                all CHECK constraints respected
process_recordings emotions: Calm | Anxious | Sad | Angry | Hopeful | Withdrawn | Happy | Distressed

Run
---
    python generate_seed.py
    # Expects lighthouse_csv_v7/ in same directory
    # Expects supporters_202604100019.csv in same directory
    # Outputs seed.sql
"""

import csv
import os
import random
import sys
from datetime import date, timedelta
from typing import Any

random.seed(2024)

# ── Paths ──────────────────────────────────────────────────────────────────────
CSV_DIR          = os.path.join(os.path.dirname(__file__), "lighthouse_csv_v7")
SUPPORTERS_CSV   = os.path.join(os.path.dirname(__file__), "supporters_202604100019.csv")
OUTPUT           = os.path.join(os.path.dirname(__file__), "seed.sql")

# ── Malaysia geo data ─────────────────────────────────────────────────────────
MY_REGIONS = ["Kuala Lumpur", "Selangor", "Penang", "Johor", "Sabah", "Sarawak"]

MY_CITIES = {
    "Kuala Lumpur": [("Kuala Lumpur", "Wilayah Persekutuan"), ("Chow Kit", "Wilayah Persekutuan")],
    "Selangor":     [("Shah Alam", "Selangor"), ("Petaling Jaya", "Selangor"), ("Subang Jaya", "Selangor")],
    "Penang":       [("George Town", "Pulau Pinang"), ("Butterworth", "Pulau Pinang")],
    "Johor":        [("Johor Bahru", "Johor"), ("Batu Pahat", "Johor")],
    "Sabah":        [("Kota Kinabalu", "Sabah"), ("Sandakan", "Sabah")],
    "Sarawak":      [("Kuching", "Sarawak"), ("Miri", "Sarawak")],
}

MY_BIRTH_PLACES = [
    "Kuala Lumpur", "Penang", "Johor Bahru", "Kota Kinabalu",
    "Kuching", "Shah Alam", "Ipoh", "Alor Setar", "Seremban",
]

MY_SCHOOLS = [
    "SMK Taman Melawati", "SK Bukit Damansara", "SMK Assunta",
    "Penang Free School", "SMK Convent Johor Bahru", "SK Kota Kinabalu",
    "SMK Kuching Utara", "Kolej Vokasional Shah Alam", "SMK Subang Jaya",
]

MY_CITIES_FLAT = [c for pairs in MY_CITIES.values() for c, _ in pairs]

# ── Fixed enumerations (must match schema CHECK constraints exactly) ───────────
CASE_STATUSES       = ["Active", "Active", "Active", "Closed", "Transferred"]
CASE_CATEGORIES     = ["Abandoned", "Foundling", "Surrendered", "Neglected"]
BIRTH_STATUSES      = ["Marital", "Non-Marital"]
REFERRAL_SOURCES    = ["Government Agency", "NGO", "Police", "Self-Referral", "Community", "Court Order"]
REINT_TYPES         = ["Family Reunification", "Foster Care", "Adoption (Domestic)", "Independent Living", "None"]
REINT_STATUSES      = ["Not Started", "In Progress", "Completed", "On Hold"]
RISK_LEVELS         = ["Low", "Medium", "High", "Critical"]
RELIGIONS           = ["Islam", "Christianity", "Buddhism", "Hinduism", "None"]
SESSION_TYPES       = ["Individual", "Individual", "Individual", "Group"]
EMOTIONS            = ["Calm", "Anxious", "Sad", "Angry", "Hopeful", "Withdrawn", "Happy", "Distressed"]
VISIT_TYPES         = ["Initial Assessment", "Routine Follow-Up", "Routine Follow-Up",
                        "Reintegration Assessment", "Post-Placement Monitoring", "Emergency"]
COOP_LEVELS         = ["Highly Cooperative", "Cooperative", "Cooperative", "Neutral", "Uncooperative"]
VISIT_OUTCOMES      = ["Favorable", "Favorable", "Favorable", "Needs Improvement", "Inconclusive"]
IP_CATEGORIES       = ["Safety", "Physical Health", "Education"]   # schema CK is restrictive
IP_STATUSES         = ["Open", "In Progress", "Achieved", "On Hold", "Closed"]
INCIDENT_TYPES      = ["Behavioral", "Medical", "Security", "RunawayAttempt",
                        "SelfHarm", "ConflictWithPeer", "PropertyDamage"]
PROGRAM_AREAS       = ["Education", "Wellbeing", "Operations", "Transport", "Maintenance", "Outreach"]
AREA_WEIGHTS        = [0.26, 0.22, 0.24, 0.14, 0.10, 0.04]
DON_CHANNELS        = ["Campaign", "Event", "Direct", "SocialMedia", "PartnerReferral"]
DON_CHAN_W          = [0.35, 0.15, 0.30, 0.15, 0.05]
CAMPAIGN_NAMES      = ["Year-End Hope", "Back to School", "Summer of Safety",
                        "GivingTuesday", "Anniversary Drive", "Emergency Fund"]
ACQUISITION_CHANNELS= ["Website", "SocialMedia", "Event", "WordOfMouth", "PartnerReferral", "Church"]
SOCIAL_WORKERS      = [
    "Nurul Hana Binti Ahmad", "Siti Rahayu Binti Ismail", "Priya Krishnan",
    "Lee Wei Ling", "Fatimah Binti Yusof", "Tan Mei Ling",
    "Rohani Binti Hassan", "Kavitha Subramaniam",
]
SESSION_NARRATIVES = [
    "Explored coping strategies for managing anxiety. Resident showed willingness to engage.",
    "Discussed family reintegration concerns. Identified barriers and next steps.",
    "Reviewed education goals. Resident expressed motivation to continue schooling.",
    "Trauma-informed session focusing on self-worth and identity. Positive progress noted.",
    "Group session on peer relationships and conflict resolution skills.",
    "Legal rights education session. Resident asked insightful questions.",
    "Discussed transition planning for independent living. Resident engaged actively.",
    "Emotional regulation techniques introduced. Resident practiced breathing exercises.",
    "Session focused on building trust with social worker. Breakthroughs observed.",
    "Reviewed progress on intervention plan goals. Two objectives marked achieved.",
]
NARRATIVES_CONCERN = [
    "Resident expressed distress and difficulty sleeping. Concerns flagged for follow-up.",
    "Session revealed heightened anxiety. Resident reluctant to discuss home situation.",
    "Behavioral outburst noted. Resident calmed after de-escalation intervention.",
    "Resident expressed hopelessness. Immediate support plan activated.",
    "Concerning self-isolating behavior noted. Coordination with health team required.",
]
FOLLOW_UPS = [
    "Schedule follow-up with legal team next week.",
    "Coordinate with education partner for enrollment.",
    "Check in with family liaison before next conference.",
    "Review health records before monthly assessment.",
    "No immediate follow-up required.",
    "Refer to psychologist for additional evaluation.",
    "Update intervention plan at next case conference.",
]

IP_DESCRIPTIONS = {
    "Safety":         "Develop and implement a personal safety plan. Identify safe adults and emergency contacts.",
    "Physical Health":"Monitor and improve nutritional intake, sleep hygiene, and physical health indicators.",
    "Education":      "Support continued school enrollment and academic progress toward grade-level completion.",
}
IP_SERVICES = {
    "Safety":         "Caring",
    "Physical Health":"Healing",
    "Education":      "Teaching",
}

SAFEHOUSE_NAMES = [
    "Cahaya Harapan Centre", "Rumah Selamat Matahari", "Aman Jaya Shelter",
    "Pelita Kasih Home", "Rumah Sejahtera", "Budi Murni Refuge",
    "Sayang Abadi Centre", "Cahaya Baru Home", "Harmoni Shelter",
]

SUPPORTER_FIRST = ["Aisha", "Wei", "Priya", "Nurul", "Mei", "Kavitha", "Siti", "Rachel",
                    "Tan", "Ahmad", "David", "Sarah", "Omar", "Lin", "Raj", "Fatimah"]
SUPPORTER_LAST  = ["Rahman", "Chen", "Krishnan", "Abdullah", "Lim", "Subramaniam",
                    "Ismail", "Wong", "Tan", "Hassan", "Smith", "Kumar", "Ali", "Lee"]

# ── Date helpers ──────────────────────────────────────────────────────────────

def rand_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(delta, 0)))

def fmt(d: date) -> str:
    return d.strftime("%Y-%m-%d")

def months_between(start: date, end: date):
    """Yield first-of-month dates from start to end inclusive."""
    d = start.replace(day=1)
    while d <= end:
        yield d
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)

def month_end(d: date) -> date:
    if d.month == 12:
        return date(d.year + 1, 1, 1) - timedelta(days=1)
    return date(d.year, d.month + 1, 1) - timedelta(days=1)

# ── SQL value formatters ──────────────────────────────────────────────────────

def q(s: Any) -> str:
    if s is None:
        return "NULL"
    return "N'" + str(s).replace("'", "''") + "'"

def n(v: Any) -> str:
    if v is None:
        return "NULL"
    return str(v)

def b(v: bool) -> str:
    return "1" if v else "0"

def insert(table: str, row: dict) -> str:
    cols = ", ".join(f"[{c}]" for c in row)
    vals = ", ".join(str(v) for v in row.values())
    return f"INSERT INTO dbo.[{table}] ({cols}) VALUES ({vals});"

# ── CSV reader (original generate_seed.py format logic) ───────────────────────

COLUMN_TYPES: dict[str, dict[str, str]] = {
    "safehouses":               {"safehouse_id":"int","capacity_girls":"int","capacity_staff":"int","current_occupancy":"int"},
    "partners":                 {"partner_id":"int"},
    "partner_assignments":      {"assignment_id":"int","partner_id":"int","safehouse_id":"int","is_primary":"bit"},
    "social_media_posts":       {
        "post_id":"int","post_hour":"int","num_hashtags":"int","mentions_count":"int",
        "has_call_to_action":"bit","caption_length":"int","features_resident_story":"bit",
        "is_boosted":"bit","boost_budget_php":"dec","impressions":"int","reach":"int",
        "likes":"int","comments":"int","shares":"int","saves":"int","click_throughs":"int",
        "video_views":"int","engagement_rate":"dec","profile_visits":"int",
        "donation_referrals":"int","estimated_donation_value_php":"dec",
        "follower_count_at_post":"int","watch_time_seconds":"int",
        "avg_view_duration_seconds":"int","subscriber_count_at_post":"int","forwards":"int",
    },
    "supporters":               {"supporter_id":"int"},
}

def csv_format_value(value: str, col_type: str) -> str:
    stripped = value.strip()
    if stripped == "":
        return "NULL"
    if col_type == "bit":
        return "1" if stripped in ("True", "1", "true") else "0"
    if col_type == "int":
        try:
            return str(int(float(stripped)))
        except ValueError:
            return "NULL"
    if col_type == "dec":
        return stripped
    escaped = stripped.replace("'", "''")
    return f"N'{escaped}'"

def read_csv_inserts(table: str, csv_path: str, patch_fn=None) -> list[str]:
    """Read a CSV and return INSERT statements. patch_fn(row_dict) can mutate rows."""
    types = COLUMN_TYPES.get(table, {})
    stmts = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        for row in reader:
            if patch_fn:
                patch_fn(row)
            vals = []
            for col in columns:
                raw = row.get(col, "")
                vals.append(csv_format_value(raw, types.get(col, "str")))
            col_list = ", ".join(f"[{c}]" for c in columns)
            val_list = ", ".join(vals)
            stmts.append(f"INSERT INTO dbo.[{table}] ({col_list}) VALUES ({val_list});")
    return stmts

# ── Safehouse patcher ─────────────────────────────────────────────────────────

# Map safehouse_id (as string) to a fixed Malaysian region/city for consistency
_SH_MALAYSIA = {
    "1": ("Kuala Lumpur",  "Kuala Lumpur",    "Wilayah Persekutuan"),
    "2": ("Selangor",      "Shah Alam",        "Selangor"),
    "3": ("Selangor",      "Petaling Jaya",    "Selangor"),
    "4": ("Penang",        "George Town",      "Pulau Pinang"),
    "5": ("Penang",        "Butterworth",      "Pulau Pinang"),
    "6": ("Johor",         "Johor Bahru",      "Johor"),
    "7": ("Johor",         "Batu Pahat",       "Johor"),
    "8": ("Sabah",         "Kota Kinabalu",    "Sabah"),
    "9": ("Sarawak",       "Kuching",          "Sarawak"),
}

def patch_safehouse(row: dict):
    sid = row.get("safehouse_id", "").strip()
    if sid in _SH_MALAYSIA:
        region, city, province = _SH_MALAYSIA[sid]
        row["region"]   = region
        row["city"]     = city
        row["province"] = province
        row["country"]  = "Malaysia"
    # Rename to Malaysian safehouse names if we have them
    idx = int(sid) - 1 if sid.isdigit() and 1 <= int(sid) <= 9 else None
    if idx is not None:
        row["name"] = SAFEHOUSE_NAMES[idx]

# ── Synthetic safehouse region lookup (for foreign-key joins) ─────────────────
def sh_region(sh_id: int) -> str:
    return _SH_MALAYSIA[str(sh_id)][0]

def sh_city(sh_id: int) -> str:
    return _SH_MALAYSIA[str(sh_id)][1]

# ── Resident generation ───────────────────────────────────────────────────────

def gen_age_string(years: int, months: int) -> str:
    return f"{years} Years {months} months"

def make_resident(resident_id: int, safehouse_id: int, escalated: bool = False) -> dict:
    """Build one resident row. escalated=True → risk went UP since admission."""
    adm_date = rand_date(date(2020, 1, 1), date(2025, 6, 1))
    dob       = adm_date - timedelta(days=random.randint(365*10, 365*17))
    age_adm   = (adm_date - dob).days // 365
    age_now   = (date(2026, 4, 10) - dob).days // 365
    stay_yrs  = (date(2026, 4, 10) - adm_date).days // 365
    stay_mos  = ((date(2026, 4, 10) - adm_date).days % 365) // 30

    if escalated:
        # Start low/medium, escalate to high/critical
        init_risk = random.choice(["Low", "Low", "Medium"])
        curr_risk = random.choice(["High", "Critical"])
        case_status    = "Active"
        reint_status   = random.choice(["Not Started", "On Hold"])
        reint_type     = "None"
        date_closed    = None
    else:
        init_risk = random.choice(RISK_LEVELS)
        # Most improve or stay same
        risk_idx  = RISK_LEVELS.index(init_risk)
        curr_risk = RISK_LEVELS[max(0, risk_idx - random.choice([0, 0, 1, 1, 2]))]
        case_status  = random.choices(["Active", "Closed", "Transferred"], weights=[0.65, 0.25, 0.10])[0]
        reint_type   = random.choice(REINT_TYPES)
        if case_status == "Closed":
            reint_status = random.choice(["Completed", "Completed", "On Hold"])
            date_closed  = rand_date(adm_date + timedelta(days=180), date(2026, 3, 1))
        else:
            reint_status = random.choice(["Not Started", "In Progress", "In Progress"])
            date_closed  = None

    row = {
        "resident_id":           n(resident_id),
        "case_control_no":       q(f"C{resident_id:04d}"),
        "internal_code":         q(f"RES-MY-{resident_id:04d}"),
        "safehouse_id":          n(safehouse_id),
        "case_status":           q(case_status),
        "sex":                   q("F"),
        "date_of_birth":         q(fmt(dob)),
        "birth_status":          q(random.choice(BIRTH_STATUSES)),
        "place_of_birth":        q(random.choice(MY_BIRTH_PLACES)),
        "religion":              q(random.choice(RELIGIONS)),
        "case_category":         q(random.choice(CASE_CATEGORIES)),
        "sub_cat_orphaned":      b(random.random() < 0.15),
        "sub_cat_trafficked":    b(random.random() < 0.25),
        "sub_cat_child_labor":   b(random.random() < 0.12),
        "sub_cat_physical_abuse":b(random.random() < 0.40),
        "sub_cat_sexual_abuse":  b(random.random() < 0.55),
        "sub_cat_osaec":         b(random.random() < 0.20),
        "sub_cat_cicl":          b(random.random() < 0.05),
        "sub_cat_at_risk":       b(random.random() < 0.30),
        "sub_cat_street_child":  b(random.random() < 0.08),
        "sub_cat_child_with_hiv":b(random.random() < 0.03),
        "is_pwd":                b(random.random() < 0.08),
        "pwd_type":              "NULL",
        "has_special_needs":     b(random.random() < 0.10),
        "special_needs_diagnosis":"NULL",
        "family_is_4ps":         b(random.random() < 0.35),
        "family_solo_parent":    b(random.random() < 0.40),
        "family_indigenous":     b(random.random() < 0.10),
        "family_parent_pwd":     b(random.random() < 0.08),
        "family_informal_settler":b(random.random() < 0.30),
        "date_of_admission":     q(fmt(adm_date)),
        "age_upon_admission":    q(gen_age_string(age_adm, random.randint(0, 11))),
        "present_age":           q(gen_age_string(age_now, random.randint(0, 11))),
        "length_of_stay":        q(gen_age_string(stay_yrs, stay_mos)),
        "referral_source":       q(random.choice(REFERRAL_SOURCES)),
        "referring_agency_person":q(f"Agency Rep {resident_id}"),
        "date_colb_registered":  "NULL",
        "date_colb_obtained":    "NULL",
        "assigned_social_worker":q(random.choice(SOCIAL_WORKERS)),
        "initial_case_assessment":q("For Reunification" if not escalated else "For Assessment"),
        "date_case_study_prepared":q(fmt(adm_date + timedelta(days=random.randint(7, 30)))),
        "reintegration_type":    q(reint_type),
        "reintegration_status":  q(reint_status),
        "initial_risk_level":    q(init_risk),
        "current_risk_level":    q(curr_risk),
        "date_enrolled":         q(fmt(adm_date)),
        "date_closed":           q(fmt(date_closed)) if date_closed else "NULL",
        "created_at":            q(fmt(adm_date) + "T00:00:00"),
        "notes_restricted":      "NULL",
    }
    return row

def gen_residents(start_id: int = 1, count: int = 100, escalated_count: int = 10) -> tuple[list[str], list[int], list[int]]:
    """Returns (stmts, normal_ids, escalated_ids)."""
    stmts         = []
    normal_ids    = []
    escalated_ids = []

    # Distribute across 9 safehouses, ~8-12 each
    safehouse_cycle = []
    for sh in range(1, 10):
        safehouse_cycle.extend([sh] * 11)
    random.shuffle(safehouse_cycle)

    escalated_start = start_id + count - escalated_count

    for i in range(count):
        rid = start_id + i
        sh_id = safehouse_cycle[i % len(safehouse_cycle)]
        is_esc = (rid >= escalated_start)
        row = make_resident(rid, sh_id, escalated=is_esc)
        stmts.append(insert("residents", row))
        if is_esc:
            escalated_ids.append(rid)
        else:
            normal_ids.append(rid)

    return stmts, normal_ids, escalated_ids

# ── Process recordings ────────────────────────────────────────────────────────

def gen_process_recordings(resident_ids: list[int], escalated_ids: set[int], start_id: int = 1) -> list[str]:
    stmts  = []
    rec_id = start_id
    period_start = date(2024, 1, 1)
    period_end   = date(2026, 4, 1)

    escalated_set = set(escalated_ids)

    for resident_id in resident_ids:
        is_esc = resident_id in escalated_set
        n_sessions = random.randint(10, 16) if is_esc else random.randint(7, 12)
        session_dates = sorted(rand_date(period_start, period_end) for _ in range(n_sessions))

        for sd in session_dates:
            if is_esc:
                # Escalated: sessions start hopeful, deteriorate over time
                progress_in_period = session_dates.index(sd) / max(len(session_dates) - 1, 1)
                concern_prob = 0.15 + progress_in_period * 0.55   # up to 70% flagged
                progress_prob = 0.6 - progress_in_period * 0.4    # dropping
                # Emotions: more distressed/withdrawn as time goes on
                if progress_in_period > 0.6:
                    emo_obs = random.choice(["Anxious", "Distressed", "Withdrawn", "Angry"])
                    emo_end = random.choice(["Anxious", "Sad", "Withdrawn", "Calm"])
                else:
                    emo_obs = random.choice(["Hopeful", "Anxious", "Calm"])
                    emo_end = random.choice(["Hopeful", "Calm", "Anxious"])
                narrative = random.choice(NARRATIVES_CONCERN if progress_in_period > 0.5 else SESSION_NARRATIVES)
            else:
                concern_prob  = 0.10
                progress_prob = 0.72
                emo_idx = random.randint(0, len(EMOTIONS) - 1)
                # skew toward positive end states
                pos_emotions = ["Calm", "Hopeful", "Happy"]
                neg_emotions = ["Anxious", "Sad", "Angry", "Withdrawn", "Distressed"]
                emo_obs = random.choice(neg_emotions + pos_emotions)
                emo_end = random.choice(pos_emotions + pos_emotions + ["Calm"])  # skew positive
                narrative = random.choice(SESSION_NARRATIVES)

            flagged  = random.random() < concern_prob
            referral = flagged and random.random() < 0.35
            progress = random.random() < progress_prob

            row = {
                "recording_id":             n(rec_id),
                "resident_id":              n(resident_id),
                "session_date":             q(fmt(sd)),
                "social_worker":            q(random.choice(SOCIAL_WORKERS)),
                "session_type":             q(random.choice(SESSION_TYPES)),
                "session_duration_minutes": n(random.choice([45, 50, 60, 60, 60, 75, 90])),
                "emotional_state_observed": q(emo_obs),
                "emotional_state_end":      q(emo_end),
                "session_narrative":        q(narrative),
                "interventions_applied":    q("Cognitive-behavioral techniques, active listening, goal review."),
                "follow_up_actions":        q(random.choice(FOLLOW_UPS)),
                "progress_noted":           b(progress),
                "concerns_flagged":         b(flagged),
                "referral_made":            b(referral),
            }
            stmts.append(insert("process_recordings", row))
            rec_id += 1

    return stmts

# ── Education records ─────────────────────────────────────────────────────────

def gen_education_records(resident_ids: list[int], escalated_ids: set[int], start_id: int = 1) -> list[str]:
    stmts  = []
    rec_id = start_id
    month_list = list(months_between(date(2024, 1, 1), date(2026, 3, 1)))

    for resident_id in resident_ids:
        is_esc = resident_id in escalated_ids
        edu_level = random.choice(["Primary", "Secondary", "Vocational", "CollegePrep"])
        school    = random.choice(MY_SCHOOLS)
        base_prog = random.uniform(35, 60)

        for i, month in enumerate(month_list):
            if is_esc:
                # Progress stalls or drops after halfway
                if i < len(month_list) // 2:
                    progress = min(98.0, base_prog + i * random.uniform(1.5, 3.0))
                    enrolled = random.random() < 0.85
                else:
                    # Stalls / slight regression
                    progress = max(10.0, base_prog + (len(month_list)//2) * 2.0 - (i - len(month_list)//2) * random.uniform(0.5, 2.0))
                    enrolled = random.random() < 0.65  # more absenteeism
            else:
                progress = min(98.0, base_prog + i * random.uniform(1.8, 3.5))
                enrolled = random.random() < 0.89

            attendance = round(random.uniform(0.55, 0.80) if (is_esc and i > len(month_list)//2 and not enrolled)
                               else random.uniform(0.78, 0.97) if enrolled
                               else random.uniform(0.0, 0.4), 4)

            if progress >= 95:
                completion = "Completed"
            elif progress > 10:
                completion = "InProgress"
            else:
                completion = "NotStarted"

            row = {
                "education_record_id": n(rec_id),
                "resident_id":         n(resident_id),
                "record_date":         q(fmt(month)),
                "education_level":     q(edu_level),
                "school_name":         q(school),
                "enrollment_status":   q("Enrolled" if enrolled else "NotEnrolled"),
                "attendance_rate":     n(attendance),
                "progress_percent":    n(round(max(0.0, min(100.0, progress)), 2)),
                "completion_status":   q(completion),
            }
            stmts.append(insert("education_records", row))
            rec_id += 1

    return stmts

# ── Health records ────────────────────────────────────────────────────────────

def gen_health_records(resident_ids: list[int], escalated_ids: set[int], start_id: int = 1) -> list[str]:
    stmts  = []
    rec_id = start_id
    month_list = list(months_between(date(2024, 1, 1), date(2026, 3, 1)))

    for resident_id in resident_ids:
        is_esc      = resident_id in escalated_ids
        base_health = random.uniform(2.2, 3.2)
        base_height = random.uniform(148.0, 165.0)
        base_weight = random.uniform(38.0, 58.0)

        for i, month in enumerate(month_list):
            if is_esc:
                if i < len(month_list) // 2:
                    health = min(5.0, base_health + i * random.uniform(0.04, 0.09))
                else:
                    health = max(1.0, base_health + (len(month_list)//2) * 0.06
                                 - (i - len(month_list)//2) * random.uniform(0.08, 0.18))
            else:
                health = min(5.0, base_health + i * random.uniform(0.07, 0.13))

            health  = round(health, 1)
            nutri   = round(max(1.0, min(5.0, health + random.uniform(-0.4, 0.3))), 1)
            sleep   = round(max(1.0, min(5.0, health + random.uniform(-0.3, 0.4) - (0.3 if is_esc and i > len(month_list)//2 else 0))), 1)
            energy  = round(max(1.0, min(5.0, health + random.uniform(-0.4, 0.3))), 1)
            height  = round(base_height + i * 0.05, 1)
            weight  = round(base_weight + i * 0.12 + random.uniform(-0.3, 0.5), 2)
            bmi     = round(weight / ((height / 100) ** 2), 2)

            medical = (month.month % 3 == 1)
            dental  = (month.month % 6 == 1)
            psych   = (month.month % 2 == 1)

            row = {
                "health_record_id":           n(rec_id),
                "resident_id":                n(resident_id),
                "record_date":                q(fmt(month)),
                "general_health_score":       n(health),
                "nutrition_score":            n(nutri),
                "sleep_quality_score":        n(sleep),
                "energy_level_score":         n(energy),
                "height_cm":                  n(height),
                "weight_kg":                  n(weight),
                "bmi":                        n(bmi),
                "medical_checkup_done":       b(medical),
                "dental_checkup_done":        b(dental),
                "psychological_checkup_done": b(psych),
            }
            stmts.append(insert("health_wellbeing_records", row))
            rec_id += 1

    return stmts

# ── Home visitations ──────────────────────────────────────────────────────────

def gen_home_visitations(resident_ids: list[int], escalated_ids: set[int], start_id: int = 1) -> list[str]:
    stmts  = []
    vis_id = start_id

    for resident_id in resident_ids:
        is_esc  = resident_id in escalated_ids
        n_visits = random.randint(4, 7) if is_esc else random.randint(3, 5)
        visit_dates = sorted(rand_date(date(2024, 1, 1), date(2026, 3, 31)) for _ in range(n_visits))

        for vd in visit_dates:
            concerns  = (random.random() < 0.45) if is_esc else (random.random() < 0.10)
            follow_up = concerns or random.random() < 0.20
            coop      = random.choices(COOP_LEVELS, weights=[0.10, 0.30, 0.30, 0.20, 0.10])[0] if is_esc \
                        else random.choices(COOP_LEVELS, weights=[0.30, 0.40, 0.15, 0.10, 0.05])[0]
            outcome   = random.choice(["Needs Improvement", "Unfavorable", "Inconclusive"]) if is_esc \
                        else random.choice(VISIT_OUTCOMES)

            row = {
                "visitation_id":            n(vis_id),
                "resident_id":              n(resident_id),
                "visit_date":               q(fmt(vd)),
                "social_worker":            q(random.choice(SOCIAL_WORKERS)),
                "visit_type":               q(random.choice(VISIT_TYPES)),
                "location_visited":         q(random.choice(MY_CITIES_FLAT)),
                "family_members_present":   q(random.choice(["Mother", "Mother and father", "Aunt and grandmother", "Foster parent", "Guardian"])),
                "purpose":                  q("Assess home environment and family readiness for reintegration planning."),
                "observations":             q("Home environment assessed. Family situation reviewed by social worker." if not is_esc
                                              else "Safety concerns noted. Environment assessed as unstable. Immediate follow-up required."),
                "family_cooperation_level": q(coop),
                "safety_concerns_noted":    b(concerns),
                "follow_up_needed":         b(follow_up),
                "follow_up_notes":          q("Schedule urgent check-in within 14 days." if concerns else "Schedule check-in within 30 days.") if follow_up else "NULL",
                "visit_outcome":            q(outcome),
            }
            stmts.append(insert("home_visitations", row))
            vis_id += 1

    return stmts

# ── Intervention plans ────────────────────────────────────────────────────────

def gen_intervention_plans(resident_ids: list[int], escalated_ids: set[int], start_id: int = 1) -> list[str]:
    stmts   = []
    plan_id = start_id

    for resident_id in resident_ids:
        is_esc   = resident_id in escalated_ids
        n_plans  = random.randint(3, 5) if is_esc else random.randint(2, 4)
        cats     = random.choices(IP_CATEGORIES, k=n_plans)

        for cat in cats:
            created = rand_date(date(2024, 1, 1), date(2025, 6, 1))
            target  = created + timedelta(days=random.randint(60, 365))

            if is_esc:
                status = random.choice(["Open", "In Progress", "On Hold", "On Hold"])
            else:
                status = random.choice(["Open", "In Progress", "In Progress", "Achieved", "Closed"])

            row = {
                "plan_id":              n(plan_id),
                "resident_id":          n(resident_id),
                "plan_category":        q(cat),
                "plan_description":     q(IP_DESCRIPTIONS[cat]),
                "services_provided":    q(IP_SERVICES[cat]),
                "target_value":         "NULL",
                "target_date":          q(fmt(target)),
                "status":               q(status),
                "case_conference_date": q(fmt(created)),
                "created_at":           q(fmt(created) + "T00:00:00"),
                "updated_at":           q(fmt(created) + "T00:00:00"),
            }
            stmts.append(insert("intervention_plans", row))
            plan_id += 1

    return stmts

# ── Incident reports ──────────────────────────────────────────────────────────

def gen_incident_reports(
    resident_ids: list[int],
    escalated_ids: set[int],
    resident_to_sh: dict[int, int],
    start_id: int = 1,
) -> list[str]:
    stmts  = []
    inc_id = start_id

    for resident_id in resident_ids:
        is_esc  = resident_id in escalated_ids
        sh_id   = resident_to_sh[resident_id]

        # Normal: ~15% chance of any incident at all
        # Escalated: 2-4 incidents, skewing higher severity
        if is_esc:
            n_incidents = random.randint(2, 4)
        else:
            if random.random() > 0.15:
                continue  # no incidents for this resident
            n_incidents = random.randint(1, 2)

        for _ in range(n_incidents):
            inc_date  = rand_date(date(2024, 1, 1), date(2026, 3, 31))
            severity  = random.choice(["High", "High", "Medium"]) if is_esc \
                        else random.choice(["Low", "Low", "Medium"])
            inc_type  = random.choice(["SelfHarm", "RunawayAttempt", "Behavioral", "Security"]) if is_esc \
                        else random.choice(INCIDENT_TYPES)
            resolved  = not is_esc and random.random() < 0.80
            res_date  = rand_date(inc_date, date(2026, 4, 1)) if resolved else None

            row = {
                "incident_id":        n(inc_id),
                "resident_id":        n(resident_id),
                "safehouse_id":       n(sh_id),
                "incident_date":      q(fmt(inc_date)),
                "incident_type":      q(inc_type),
                "severity":           q(severity),
                "description":        q("Incident documented by on-duty staff. Full report filed."),
                "response_taken":     q("Immediate de-escalation protocol followed. Social worker notified."),
                "resolved":           b(resolved),
                "resolution_date":    q(fmt(res_date)) if res_date else "NULL",
                "reported_by":        q(random.choice(SOCIAL_WORKERS)),
                "follow_up_required": b(is_esc or severity == "High"),
            }
            stmts.append(insert("incident_reports", row))
            inc_id += 1

    return stmts

# ── Supporters (CSV + synthetic) ──────────────────────────────────────────────

def gen_supporters_from_csv(csv_path: str) -> tuple[list[str], list[int]]:
    """Returns (stmts, existing_ids)."""
    existing_ids = []
    stmts = []
    types = COLUMN_TYPES.get("supporters", {})

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        for row in reader:
            # Update Philippines references to Malaysia in region/country
            if row.get("country", "").strip() == "Philippines":
                row["country"] = "Malaysia"
            if row.get("region", "").strip() in ("Luzon", "Visayas", "Mindanao"):
                row["region"] = random.choice(MY_REGIONS)
            # Fix phone numbers
            if row.get("phone", "").strip().startswith("+63"):
                row["phone"] = "+60" + row["phone"].strip()[3:]

            sid = row.get("supporter_id", "").strip()
            if sid.isdigit():
                existing_ids.append(int(sid))

            vals = []
            for col in columns:
                raw = row.get(col, "")
                vals.append(csv_format_value(raw, types.get(col, "str")))
            col_list = ", ".join(f"[{c}]" for c in columns)
            val_list = ", ".join(vals)
            stmts.append(f"INSERT INTO dbo.[supporters] ({col_list}) VALUES ({val_list});")

    return stmts, existing_ids

def gen_synthetic_supporters(start_id: int = 200, count: int = 40) -> tuple[list[str], list[int]]:
    stmts = []
    ids   = []
    channels = ["Website", "SocialMedia", "Event", "WordOfMouth", "PartnerReferral", "Church"]

    for i in range(count):
        sid   = start_id + i
        fname = random.choice(SUPPORTER_FIRST)
        lname = random.choice(SUPPORTER_LAST)
        dname = f"{fname} {lname}"
        sup_type = random.choices(
            ["MonetaryDonor", "MonetaryDonor", "MonetaryDonor", "Volunteer", "SkillsContributor"],
            weights=[0.60, 0.15, 0.10, 0.10, 0.05]
        )[0]
        rel = random.choice(["Local", "Local", "International"])
        region = random.choice(MY_REGIONS)
        first_don = rand_date(date(2022, 1, 1), date(2025, 12, 31))
        channel = random.choice(channels)

        row = {
            "supporter_id":      n(sid),
            "supporter_type":    q(sup_type),
            "display_name":      q(dname),
            "organization_name": "NULL",
            "first_name":        q(fname),
            "last_name":         q(lname),
            "relationship_type": q(rel),
            "region":            q(region),
            "country":           q("Malaysia"),
            "email":             q(f"{fname.lower()}.{lname.lower()}{sid}@email.com"),
            "phone":             q(f"+601{random.randint(10000000, 99999999)}"),
            "status":            q(random.choice(["Active", "Active", "Active", "Inactive"])),
            "first_donation_date": q(fmt(first_don)),
            "acquisition_channel": q(channel),
            "created_at":        q(fmt(first_don) + "T00:00:00"),
        }
        stmts.append(insert("supporters", row))
        ids.append(sid)

    return stmts, ids

# ── Donations ─────────────────────────────────────────────────────────────────

def gen_donations(all_supporter_ids: list[int], start_don_id: int = 1, start_alloc_id: int = 1) -> tuple[list[str], list[str]]:
    don_stmts   = []
    alloc_stmts = []
    don_id      = start_don_id
    alloc_id    = start_alloc_id

    # Only monetary donors get donations
    all_months = list(months_between(date(2022, 1, 1), date(2026, 3, 1)))
    SEASONAL = {11: 16, 12: 20, 2: 11, 8: 13, 4: 9}

    for month in all_months:
        count = SEASONAL.get(month.month, random.randint(6, 11))
        for _ in range(count):
            supporter_id = random.choice(all_supporter_ids)
            channel      = random.choices(DON_CHANNELS, weights=DON_CHAN_W)[0]
            campaign     = random.choice(CAMPAIGN_NAMES) if channel == "Campaign" else None

            # USD amounts — realistic for international donors
            amount = round(random.choices(
                [random.uniform(25, 200),
                 random.uniform(200, 1000),
                 random.uniform(1000, 5000)],
                weights=[0.55, 0.35, 0.10]
            )[0], 2)

            # date within this month
            m_end = month_end(month)
            don_date = rand_date(month, m_end)

            row = {
                "donation_id":    n(don_id),
                "supporter_id":   n(supporter_id),
                "donation_type":  q("Monetary"),
                "donation_date":  q(fmt(don_date)),
                "channel_source": q(channel),
                "currency_code":  q("USD"),
                "amount":         n(amount),
                "estimated_value":n(amount),
                "impact_unit":    q("dollars"),
                "is_recurring":   b(random.random() < 0.22),
                "campaign_name":  q(campaign) if campaign else "NULL",
                "notes":          "NULL",
                "created_by_partner_id": "NULL",
                "referral_post_id":      "NULL",
            }
            don_stmts.append(insert("donations", row))

            # 1–2 allocation rows
            n_areas = random.choices([1, 2], weights=[0.6, 0.4])[0]
            areas   = random.choices(PROGRAM_AREAS, weights=AREA_WEIGHTS, k=n_areas)
            splits  = [random.random() for _ in range(n_areas)]
            t       = sum(splits)
            splits  = [round(s / t * amount, 2) for s in splits]
            splits[-1] = round(amount - sum(splits[:-1]), 2)

            sh_id = random.choice(list(range(1, 10)))
            for area, alloc_amt in zip(areas, splits):
                alloc_row = {
                    "allocation_id":   n(alloc_id),
                    "donation_id":     n(don_id),
                    "safehouse_id":    n(sh_id),
                    "program_area":    q(area),
                    "amount_allocated":n(alloc_amt),
                    "allocation_date": q(fmt(don_date)),
                }
                alloc_stmts.append(insert("donation_allocations", alloc_row))
                alloc_id += 1

            don_id += 1

    return don_stmts, alloc_stmts

# ── Safehouse monthly metrics ─────────────────────────────────────────────────

def gen_safehouse_monthly_metrics(
    resident_to_sh: dict[int, int],
    escalated_ids: set[int],
    start_id: int = 1,
) -> list[str]:
    stmts  = []
    met_id = start_id
    month_list = list(months_between(date(2022, 1, 1), date(2026, 3, 1)))

    # Build per-safehouse resident list
    sh_residents: dict[int, list[int]] = {sh: [] for sh in range(1, 10)}
    for rid, sh in resident_to_sh.items():
        sh_residents[sh].append(rid)

    for sh_id in range(1, 10):
        base_edu    = random.uniform(50, 68)
        base_health = random.uniform(2.8, 3.4)
        residents   = len(sh_residents.get(sh_id, [])) or random.randint(6, 12)
        # Count escalated in this safehouse for incident inflation
        n_escalated = sum(1 for r in sh_residents.get(sh_id, []) if r in escalated_ids)

        for i, month in enumerate(month_list):
            m_end = month_end(month)
            edu_prog  = round(min(96.0, base_edu + i * random.uniform(0.8, 1.8)), 2)
            hlth_scr  = round(min(5.0, base_health + i * random.uniform(0.03, 0.08)), 1)
            recordings = residents * random.randint(1, 2)
            visitations = random.randint(1, 5)
            # Incidents: base low, slightly higher if escalated residents present
            incidents  = random.choices(
                [0, 0, 0, 1, 2, 3],
                weights=[0.50, 0.20, 0.10, 0.10, 0.06, 0.04]
            )[0] + (1 if n_escalated > 2 and random.random() < 0.3 else 0)

            row = {
                "metric_id":               n(met_id),
                "safehouse_id":            n(sh_id),
                "month_start":             q(fmt(month)),
                "month_end":               q(fmt(m_end)),
                "active_residents":        n(residents),
                "avg_education_progress":  n(edu_prog),
                "avg_health_score":        n(hlth_scr),
                "process_recording_count": n(recordings),
                "home_visitation_count":   n(visitations),
                "incident_count":          n(incidents),
            }
            stmts.append(insert("safehouse_monthly_metrics", row))
            met_id += 1

    return stmts

# ── Public impact snapshots ───────────────────────────────────────────────────

def gen_public_impact_snapshots(start_id: int = 1) -> list[str]:
    stmts = []
    snap_id = start_id
    for i, month in enumerate(months_between(date(2023, 1, 1), date(2026, 3, 1))):
        published = month < date(2026, 3, 1)
        row = {
            "snapshot_id":          n(snap_id),
            "snapshot_date":        q(fmt(month)),
            "headline":             q(f"Monthly Impact Report – {month.strftime('%B %Y')}"),
            "summary_text":         q("Aggregated monthly outcomes across all Hearth Haven safehouses in Malaysia."),
            "metric_payload_json":  "NULL",
            "is_published":         b(published),
            "published_at":         q(fmt(month)) if published else "NULL",
        }
        stmts.append(insert("public_impact_snapshots", row))
        snap_id += 1
    return stmts

# ── Output paths ──────────────────────────────────────────────────────────────

OUT_DIR = os.path.dirname(__file__)

OUTPUT_FILES = {
    "01_reference":  os.path.join(OUT_DIR, "seed_01_reference.sql"),
    "02_supporters": os.path.join(OUT_DIR, "seed_02_supporters.sql"),
    "03_residents":  os.path.join(OUT_DIR, "seed_03_residents.sql"),
    "04_case_records": os.path.join(OUT_DIR, "seed_04_case_records.sql"),
    "05_donations":  os.path.join(OUT_DIR, "seed_05_donations.sql"),
    "06_metrics":    os.path.join(OUT_DIR, "seed_06_metrics.sql"),
}

# ── Main ──────────────────────────────────────────────────────────────────────

def main():

    def section(lines: list[str], title: str):
        lines.append("")
        lines.append(f"-- {'='*60}")
        lines.append(f"-- {title}")
        lines.append(f"-- {'='*60}")
        lines.append("")

    def block(lines: list[str], table: str, stmts: list[str]):
        if not stmts:
            return
        lines.append(f"-- {table} ({len(stmts)} rows)")
        lines.append(f"SET IDENTITY_INSERT dbo.[{table}] ON;")
        lines.append("GO")
        lines.append("")
        lines.extend(stmts)
        lines.append("")
        lines.append(f"SET IDENTITY_INSERT dbo.[{table}] OFF;")
        lines.append("GO")
        lines.append("")

    def file_header(title: str) -> list[str]:
        return [
            "-- ============================================================",
            f"-- Hearth Haven – {title}",
            "-- Generated by generate_seed.py",
            "-- Run in DBeaver against hearth-haven-prd",
            "-- ============================================================",
            "",
            "SET NOCOUNT ON;",
            "",
        ]

    def write_file(path: str, lines: list[str]):
        lines.append("")
        lines.append("SET NOCOUNT OFF;")
        lines.append("")
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"  → {os.path.basename(path)}")

    def csv_path(table: str) -> str:
        return os.path.join(CSV_DIR, f"{table}.csv")

    # ── Build resident/safehouse map (shared across multiple files) ──
    res_stmts, normal_ids, escalated_ids = gen_residents(start_id=1, count=100, escalated_count=10)
    escalated_set = set(escalated_ids)
    all_resident_ids = normal_ids + escalated_ids

    safehouse_cycle = []
    for sh in range(1, 10):
        safehouse_cycle.extend([sh] * 11)
    random.seed(2024)
    random.shuffle(safehouse_cycle)
    resident_to_sh: dict[int, int] = {}
    for i, rid in enumerate(range(1, 101)):
        resident_to_sh[rid] = safehouse_cycle[i % len(safehouse_cycle)]

    # ── seed_01_reference.sql ─────────────────────────────────────────────────
    lines = file_header("Seed 01 — Reference tables (safehouses, partners, social_media_posts)")

    # Drop old region constraint first (before any DELETEs, while table may still have rows)
    lines += [
        "-- Drop old region constraint before clearing data",
        "IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_safehouses_region') ALTER TABLE dbo.safehouses DROP CONSTRAINT CK_safehouses_region;",
        "GO",
        "",
    ]

    section(lines, "Clear all tables in FK-safe order")
    drop_order_ref = [
        "public_impact_snapshots", "safehouse_monthly_metrics", "incident_reports",
        "intervention_plans", "health_wellbeing_records", "education_records",
        "home_visitations", "process_recordings", "residents",
        "in_kind_donation_items", "donation_allocations", "donations",
        "partner_assignments", "social_media_posts", "partners", "safehouses",
    ]
    for t in drop_order_ref:
        lines.append(f"DELETE FROM dbo.[{t}];")
    lines.append("")

    # Re-add constraint after safehouses is empty
    lines += [
        "-- Re-add region constraint now that safehouses is empty",
        "ALTER TABLE dbo.safehouses ADD CONSTRAINT CK_safehouses_region CHECK (region IN (N'Kuala Lumpur', N'Selangor', N'Penang', N'Johor', N'Sabah', N'Sarawak'));",
        "GO",
        "",
    ]

    section(lines, "Reference tables from CSV (Malaysia-patched)")
    for table, patch in [
        ("safehouses",          patch_safehouse),
        ("partners",            None),
        ("partner_assignments", None),
        ("social_media_posts",  None),
    ]:
        path = csv_path(table)
        if not os.path.isfile(path):
            print(f"WARNING: {path} not found — skipping {table}", file=sys.stderr)
            continue
        stmts = read_csv_inserts(table, path, patch_fn=patch)
        block(lines, table, stmts)

    write_file(OUTPUT_FILES["01_reference"], lines)

    # ── seed_02_supporters.sql ────────────────────────────────────────────────
    lines = file_header("Seed 02 — Supporters (CSV + synthetic Malaysian donors)")

    section(lines, "Clear supporters")
    lines.append("DELETE FROM dbo.[supporters];")
    lines.append("")

    csv_sup_stmts, existing_ids = gen_supporters_from_csv(SUPPORTERS_CSV)
    syn_sup_stmts, syn_sup_ids  = gen_synthetic_supporters(start_id=200, count=40)
    block(lines, "supporters", csv_sup_stmts + syn_sup_stmts)

    write_file(OUTPUT_FILES["02_supporters"], lines)

    all_supporter_ids = existing_ids + syn_sup_ids

    # ── seed_03_residents.sql ─────────────────────────────────────────────────
    lines = file_header("Seed 03 — Residents (~100 total, 10 escalated-risk cohort)")

    section(lines, "Clear residents and dependent tables")
    drop_order_res = [
        "public_impact_snapshots", "safehouse_monthly_metrics", "incident_reports",
        "intervention_plans", "health_wellbeing_records", "education_records",
        "home_visitations", "process_recordings", "residents",
    ]
    for t in drop_order_res:
        lines.append(f"DELETE FROM dbo.[{t}];")
    lines.append("")

    section(lines, "Residents")
    block(lines, "residents", res_stmts)

    write_file(OUTPUT_FILES["03_residents"], lines)

    # ── seed_04_case_records.sql ──────────────────────────────────────────────
    lines = file_header("Seed 04 — Case records (process_recordings, education, health, visitations, plans, incidents)")

    print("Generating process_recordings...")
    section(lines, "Process recordings")
    block(lines, "process_recordings", gen_process_recordings(all_resident_ids, escalated_set, start_id=1))

    print("Generating education_records...")
    section(lines, "Education records")
    block(lines, "education_records", gen_education_records(all_resident_ids, escalated_set, start_id=1))

    print("Generating health_wellbeing_records...")
    section(lines, "Health & wellbeing records")
    block(lines, "health_wellbeing_records", gen_health_records(all_resident_ids, escalated_set, start_id=1))

    print("Generating home_visitations...")
    section(lines, "Home visitations")
    block(lines, "home_visitations", gen_home_visitations(all_resident_ids, escalated_set, start_id=1))

    print("Generating intervention_plans...")
    section(lines, "Intervention plans")
    block(lines, "intervention_plans", gen_intervention_plans(all_resident_ids, escalated_set, start_id=1))

    print("Generating incident_reports...")
    section(lines, "Incident reports")
    block(lines, "incident_reports", gen_incident_reports(all_resident_ids, escalated_set, resident_to_sh, start_id=1))

    write_file(OUTPUT_FILES["04_case_records"], lines)

    # ── seed_05_donations.sql ─────────────────────────────────────────────────
    lines = file_header("Seed 05 — Donations + allocations (USD, 2022–2026)")

    section(lines, "Clear donation tables")
    lines.append("DELETE FROM dbo.[donation_allocations];")
    lines.append("DELETE FROM dbo.[donations];")
    lines.append("")

    print("Generating donations...")
    don_stmts, alloc_stmts = gen_donations(all_supporter_ids, start_don_id=1, start_alloc_id=1)
    block(lines, "donations", don_stmts)
    block(lines, "donation_allocations", alloc_stmts)

    write_file(OUTPUT_FILES["05_donations"], lines)

    # ── seed_06_metrics.sql ───────────────────────────────────────────────────
    lines = file_header("Seed 06 — Safehouse monthly metrics + public impact snapshots")

    section(lines, "Clear metrics tables")
    lines.append("DELETE FROM dbo.[public_impact_snapshots];")
    lines.append("DELETE FROM dbo.[safehouse_monthly_metrics];")
    lines.append("")

    print("Generating safehouse_monthly_metrics...")
    section(lines, "Safehouse monthly metrics")
    block(lines, "safehouse_monthly_metrics",
          gen_safehouse_monthly_metrics(resident_to_sh, escalated_set, start_id=1))

    section(lines, "Public impact snapshots")
    block(lines, "public_impact_snapshots", gen_public_impact_snapshots(start_id=1))

    write_file(OUTPUT_FILES["06_metrics"], lines)

    print("\nDone.")



if __name__ == "__main__":
    main()

