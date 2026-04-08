"""
Reads CSV files from lighthouse_csv_v7/ and generates seed.sql
with INSERT statements for Azure SQL Server, matching schema.sql.
"""

import csv
import os
import sys

CSV_DIR = os.path.join(os.path.dirname(__file__), "lighthouse_csv_v7")
OUTPUT = os.path.join(os.path.dirname(__file__), "seed.sql")

# Insertion order respects foreign-key dependencies
TABLE_ORDER = [
    "safehouses",
    "partners",
    "social_media_posts",
    "supporters",
    "partner_assignments",
    "donations",
    "in_kind_donation_items",
    "donation_allocations",
    "residents",
    "process_recordings",
    "home_visitations",
    "education_records",
    "health_wellbeing_records",
    "intervention_plans",
    "incident_reports",
    "safehouse_monthly_metrics",
    "public_impact_snapshots",
]

# Column type overrides — unlisted columns default to 'str' (N'quoted').
# Types: 'int', 'dec', 'bit'
COLUMN_TYPES: dict[str, dict[str, str]] = {
    "safehouses": {
        "safehouse_id": "int",
        "capacity_girls": "int",
        "capacity_staff": "int",
        "current_occupancy": "int",
    },
    "partners": {
        "partner_id": "int",
    },
    "partner_assignments": {
        "assignment_id": "int",
        "partner_id": "int",
        "safehouse_id": "int",
        "is_primary": "bit",
    },
    "supporters": {
        "supporter_id": "int",
    },
    "donations": {
        "donation_id": "int",
        "supporter_id": "int",
        "amount": "dec",
        "estimated_value": "dec",
        "is_recurring": "bit",
        "created_by_partner_id": "int",
        "referral_post_id": "int",
    },
    "in_kind_donation_items": {
        "item_id": "int",
        "donation_id": "int",
        "quantity": "int",
        "estimated_unit_value": "dec",
    },
    "donation_allocations": {
        "allocation_id": "int",
        "donation_id": "int",
        "safehouse_id": "int",
        "amount_allocated": "dec",
    },
    "residents": {
        "resident_id": "int",
        "safehouse_id": "int",
        "sub_cat_orphaned": "bit",
        "sub_cat_trafficked": "bit",
        "sub_cat_child_labor": "bit",
        "sub_cat_physical_abuse": "bit",
        "sub_cat_sexual_abuse": "bit",
        "sub_cat_osaec": "bit",
        "sub_cat_cicl": "bit",
        "sub_cat_at_risk": "bit",
        "sub_cat_street_child": "bit",
        "sub_cat_child_with_hiv": "bit",
        "is_pwd": "bit",
        "has_special_needs": "bit",
        "family_is_4ps": "bit",
        "family_solo_parent": "bit",
        "family_indigenous": "bit",
        "family_parent_pwd": "bit",
        "family_informal_settler": "bit",
    },
    "process_recordings": {
        "recording_id": "int",
        "resident_id": "int",
        "session_duration_minutes": "int",
        "progress_noted": "bit",
        "concerns_flagged": "bit",
        "referral_made": "bit",
    },
    "home_visitations": {
        "visitation_id": "int",
        "resident_id": "int",
        "safety_concerns_noted": "bit",
        "follow_up_needed": "bit",
    },
    "education_records": {
        "education_record_id": "int",
        "resident_id": "int",
        "attendance_rate": "dec",
        "progress_percent": "dec",
    },
    "health_wellbeing_records": {
        "health_record_id": "int",
        "resident_id": "int",
        "general_health_score": "dec",
        "nutrition_score": "dec",
        "sleep_quality_score": "dec",
        "energy_level_score": "dec",
        "height_cm": "dec",
        "weight_kg": "dec",
        "bmi": "dec",
        "medical_checkup_done": "bit",
        "dental_checkup_done": "bit",
        "psychological_checkup_done": "bit",
    },
    "intervention_plans": {
        "plan_id": "int",
        "resident_id": "int",
        "target_value": "dec",
    },
    "incident_reports": {
        "incident_id": "int",
        "resident_id": "int",
        "safehouse_id": "int",
        "resolved": "bit",
        "follow_up_required": "bit",
    },
    "social_media_posts": {
        "post_id": "int",
        "post_hour": "int",
        "num_hashtags": "int",
        "mentions_count": "int",
        "has_call_to_action": "bit",
        "caption_length": "int",
        "features_resident_story": "bit",
        "is_boosted": "bit",
        "boost_budget_php": "dec",
        "impressions": "int",
        "reach": "int",
        "likes": "int",
        "comments": "int",
        "shares": "int",
        "saves": "int",
        "click_throughs": "int",
        "video_views": "int",
        "engagement_rate": "dec",
        "profile_visits": "int",
        "donation_referrals": "int",
        "estimated_donation_value_php": "dec",
        "follower_count_at_post": "int",
        "watch_time_seconds": "int",
        "avg_view_duration_seconds": "int",
        "subscriber_count_at_post": "int",
        "forwards": "int",
    },
    "safehouse_monthly_metrics": {
        "metric_id": "int",
        "safehouse_id": "int",
        "active_residents": "int",
        "avg_education_progress": "dec",
        "avg_health_score": "dec",
        "process_recording_count": "int",
        "home_visitation_count": "int",
        "incident_count": "int",
    },
    "public_impact_snapshots": {
        "snapshot_id": "int",
        "is_published": "bit",
    },
}


def format_value(value: str, col_type: str) -> str:
    """Convert a CSV cell into a SQL literal."""
    stripped = value.strip()

    if stripped == "":
        return "NULL"

    if col_type == "bit":
        return "1" if stripped in ("True", "1", "true") else "0"

    if col_type in ("int", "dec"):
        # Handle floats that look like ints (e.g. "50.0" for an int column)
        if col_type == "int":
            try:
                return str(int(float(stripped)))
            except ValueError:
                return "NULL"
        return stripped  # decimal — pass through as-is

    # Default: quoted string
    escaped = stripped.replace("'", "''")
    return f"N'{escaped}'"


def generate_inserts(table: str, csv_path: str) -> list[str]:
    """Return a list of SQL statements for one table."""
    types = COLUMN_TYPES.get(table, {})
    stmts: list[str] = []

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames
        if not columns:
            return stmts

        col_list = ", ".join(f"[{c}]" for c in columns)

        for row in reader:
            vals = []
            for col in columns:
                raw = row[col]
                col_type = types.get(col, "str")
                vals.append(format_value(raw, col_type))
            val_list = ", ".join(vals)
            stmts.append(f"INSERT INTO dbo.[{table}] ({col_list}) VALUES ({val_list});")

    return stmts


def main() -> None:
    parts: list[str] = []
    parts.append("-- ============================================================")
    parts.append("-- Hearth Haven – Seed Data")
    parts.append("-- Auto-generated from lighthouse_csv_v7/")
    parts.append("-- ============================================================")
    parts.append("")
    parts.append("SET NOCOUNT ON;")
    parts.append("")

    total_rows = 0

    for table in TABLE_ORDER:
        csv_path = os.path.join(CSV_DIR, f"{table}.csv")
        if not os.path.isfile(csv_path):
            print(f"WARNING: {csv_path} not found, skipping.", file=sys.stderr)
            continue

        inserts = generate_inserts(table, csv_path)
        if not inserts:
            continue

        total_rows += len(inserts)

        parts.append(f"-- {table} ({len(inserts)} rows)")
        parts.append(f"SET IDENTITY_INSERT dbo.[{table}] ON;")
        parts.append("")
        parts.extend(inserts)
        parts.append("")
        parts.append(f"SET IDENTITY_INSERT dbo.[{table}] OFF;")
        parts.append("")

    parts.append("SET NOCOUNT OFF;")
    parts.append("")

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))

    print(f"Done — wrote {total_rows} INSERT statements across {len(TABLE_ORDER)} tables to {OUTPUT}")


if __name__ == "__main__":
    main()
