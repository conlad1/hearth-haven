"""
Generates synthetic relational data for Hearth Haven ML pipelines.
Outputs to extra_seed.sql with INSERT statements matching schema.sql.
"""

import os
import sys
import datetime
import numpy as np
from faker import Faker

fake = Faker()
Faker.seed(42)
np.random.seed(42)

OUTPUT = os.path.join(os.path.dirname(__file__), "extra_seed.sql")

# Configuration
NUM_RESIDENTS = 1000
NUM_SUPPORTERS = 2000
NUM_SOCIAL_POSTS = 1500
START_ID = 10000 # Offset to prevent colliding with real seed data
EXISTING_SAFEHOUSE_IDS = list(range(1, 10)) # SH01 to SH09 from seed.sql

# Column types borrowed from your generate_seed.py for SQL formatting
COLUMN_TYPES = {
    "supporters": {"supporter_id": "int"},
    "donations": {
        "donation_id": "int", "supporter_id": "int", "amount": "dec", 
        "estimated_value": "dec", "is_recurring": "bit"
    },
    "donation_allocations": {
        "allocation_id": "int", "donation_id": "int", "safehouse_id": "int", "amount_allocated": "dec"
    },
    "residents": {
        "resident_id": "int", "safehouse_id": "int", "has_special_needs": "bit"
    },
    "education_records": {
        "education_record_id": "int", "resident_id": "int", "attendance_rate": "dec", "progress_percent": "dec"
    },
    "process_recordings": {
        "recording_id": "int", "resident_id": "int", "session_duration_minutes": "int", "progress_noted": "bit"
    },
    "social_media_posts": {
        "post_id": "int", "features_resident_story": "bit", "is_boosted": "bit", "donation_referrals": "int", "estimated_donation_value_php": "dec"
    }
}

def format_sql_value(value, col_type):
    """Format Python values into SQL literals based on column type."""
    if value is None:
        return "NULL"
    if col_type == "bit":
        return "1" if value else "0"
    if col_type in ("int", "dec"):
        return str(value)
    
    # Handle dates and strings
    if isinstance(value, (datetime.date, datetime.datetime)):
        return f"N'{value.strftime('%Y-%m-%d')}'"
        
    escaped = str(value).replace("'", "''")
    return f"N'{escaped}'"

def generate_inserts(table_name, data_dicts):
    """Generate SQL INSERT statements for a list of dictionaries."""
    if not data_dicts:
        return []
    
    types = COLUMN_TYPES.get(table_name, {})
    columns = list(data_dicts[0].keys())
    col_list = ", ".join(f"[{c}]" for c in columns)
    
    stmts = []
    for row in data_dicts:
        vals = []
        for col in columns:
            raw_val = row[col]
            col_type = types.get(col, "str")
            vals.append(format_sql_value(raw_val, col_type))
        
        val_list = ", ".join(vals)
        stmts.append(f"INSERT INTO dbo.[{table_name}] ({col_list}) VALUES ({val_list});")
    return stmts

def main():
    print("Generating relational synthetic data...")
    all_sql_parts = [
        "-- ============================================================",
        "-- Hearth Haven – SYNTHETIC EXTRA SEED DATA (ML Training)",
        "-- ============================================================",
        "SET NOCOUNT ON;",
        ""
    ]
    
    global_ids = {'donation': START_ID, 'allocation': START_ID, 'edu': START_ID, 'process': START_ID}
    
    # ==========================================
    # 1. RESIDENTS & RELATED RECORDS
    # ==========================================
    residents, edu_records, process_records = [], [], []
    
    for i in range(NUM_RESIDENTS):
        res_id = START_ID + i
        safehouse_id = np.random.choice(EXISTING_SAFEHOUSE_IDS)
        dob = fake.date_of_birth(minimum_age=10, maximum_age=18)
        admit_date = fake.date_between_dates(date_start=dob + datetime.timedelta(days=365*10), date_end=datetime.date.today())
        has_spec_needs = np.random.rand() < 0.15
        
        residents.append({
            "resident_id": res_id, "safehouse_id": safehouse_id, "first_name": fake.first_name_female(),
            "last_name": fake.last_name(), "date_of_birth": dob, "date_of_admission": admit_date,
            "has_special_needs": has_spec_needs, "status": "Active"
        })
        
        # Education Records (Impacted by special needs)
        for _ in range(np.random.randint(1, 12)): # 1 to 12 months of records
            progress = np.clip(np.random.normal(loc=45 if has_spec_needs else 75, scale=15), 0, 100)
            edu_records.append({
                "education_record_id": global_ids['edu'], "resident_id": res_id,
                "record_date": fake.date_between_dates(date_start=admit_date, date_end=datetime.date.today()),
                "attendance_rate": np.round(np.clip(np.random.normal(85, 10), 0, 100), 2),
                "progress_percent": np.round(progress, 2)
            })
            global_ids['edu'] += 1
            
        # Process Recordings (Counseling - Avg ~47 based on EDA)
        for _ in range(int(np.random.normal(loc=47, scale=15))):
            process_records.append({
                "recording_id": global_ids['process'], "resident_id": res_id,
                "session_date": fake.date_between_dates(date_start=admit_date, date_end=datetime.date.today()),
                "session_duration_minutes": np.random.choice([30, 45, 60]),
                "progress_noted": np.random.rand() > 0.3
            })
            global_ids['process'] += 1

    # ==========================================
    # 2. SUPPORTERS, DONATIONS & ALLOCATIONS
    # ==========================================
    supporters, donations, allocations = [], [], []
    
    for i in range(NUM_SUPPORTERS):
        sup_id = START_ID + i
        supporters.append({
            "supporter_id": sup_id, "first_name": fake.first_name(), "last_name": fake.last_name(),
            "email": fake.email(), "type": "Individual", "status": "Active"
        })
        
        is_recurring = np.random.rand() < 0.25
        num_donations = int(np.random.poisson(lam=24)) + 1 if is_recurring else int(np.random.poisson(lam=1)) + 1
        
        for _ in range(num_donations):
            don_id = global_ids['donation']
            amt = np.round(np.random.normal(loc=150 if is_recurring else 75, scale=40), 2)
            if amt < 5: amt = 5.00 # Minimum donation
            
            donations.append({
                "donation_id": don_id, "supporter_id": sup_id, "donation_date": fake.date_this_decade(),
                "amount": amt, "donation_type": "Monetary", "is_recurring": is_recurring
            })
            
            # Allocate donation to a random safehouse
            allocations.append({
                "allocation_id": global_ids['allocation'], "donation_id": don_id,
                "safehouse_id": np.random.choice(EXISTING_SAFEHOUSE_IDS), "amount_allocated": amt
            })
            global_ids['donation'] += 1
            global_ids['allocation'] += 1

    # ==========================================
    # 3. SOCIAL MEDIA POSTS
    # ==========================================
    social_posts = []
    for i in range(NUM_SOCIAL_POSTS):
        post_id = START_ID + i
        features_story = np.random.rand() < 0.18
        referrals = int(np.random.poisson(lam=15)) if features_story else int(np.random.poisson(lam=0.5))
        
        social_posts.append({
            "post_id": post_id, "platform": np.random.choice(["Facebook", "Instagram", "Twitter"]),
            "post_date": fake.date_this_year(), "features_resident_story": features_story,
            "is_boosted": np.random.rand() < (0.6 if features_story else 0.2),
            "donation_referrals": referrals,
            "estimated_donation_value_php": referrals * 2500.00 # Mock avg value
        })

    # ==========================================
    # BUILD SQL FILE
    # ==========================================
    tables_to_write = [
        ("supporters", supporters),
        ("donations", donations),
        ("donation_allocations", allocations),
        ("residents", residents),
        ("education_records", edu_records),
        ("process_recordings", process_records),
        ("social_media_posts", social_posts)
    ]
    
    total_inserts = 0
    for table_name, data in tables_to_write:
        if not data: continue
        inserts = generate_inserts(table_name, data)
        total_inserts += len(inserts)
        
        all_sql_parts.append(f"-- {table_name} ({len(inserts)} rows)")
        all_sql_parts.append(f"SET IDENTITY_INSERT dbo.[{table_name}] ON;")
        all_sql_parts.extend(inserts)
        all_sql_parts.append(f"SET IDENTITY_INSERT dbo.[{table_name}] OFF;")
        all_sql_parts.append("")

    all_sql_parts.append("SET NOCOUNT OFF;")
    all_sql_parts.append("")

    # === THE FIX: Write line by line explicitly ===
    with open(OUTPUT, "w", encoding="utf-8") as f:
        for line in all_sql_parts:
            f.write(line + "\n")

    print(f"Success! Wrote {total_inserts} synthetic rows across {len(tables_to_write)} tables to {OUTPUT}")

if __name__ == "__main__":
    main()