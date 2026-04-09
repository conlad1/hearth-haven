import pandas as pd
from faker import Faker
import random
import os

fake = Faker()

# ─── SHARED STATE FOR FOREIGN KEYS ─────────────────────────────────────────────
# Stores valid IDs (real + synthetic) from parent tables so child tables 
# can randomly select them, maintaining perfect referential integrity.
valid_ids = {
    'safehouses': [],
    'supporters': [],
    'residents': [],
    'social_media_posts': [],
    'donations': []
}

# ─── PARENT TABLE GENERATORS ───────────────────────────────────────────────────

def generate_fake_safehouses(next_id, count):
    rows = []
    for i in range(count):
        current_id = next_id + i
        valid_ids['safehouses'].append(current_id)
        rows.append({
            'safehouse_id': current_id,
            'name': f"Safehouse {fake.word().capitalize()}",
            'location_city': fake.city(),
            'location_region': fake.state(),
            'capacity': random.randint(10, 50),
            'current_occupancy': random.randint(5, 45),
            'status': random.choices(['Active', 'Maintenance', 'Closed'], weights=[0.8, 0.15, 0.05])[0],
            'date_established': fake.date_between(start_date='-10y', end_date='-2y').isoformat()
        })
    return rows

def generate_fake_social_media_posts(next_id, count):
    rows = []
    for i in range(count):
        current_id = next_id + i
        valid_ids['social_media_posts'].append(current_id)
        rows.append({
            'post_id': current_id,
            'platform': random.choice(['Facebook', 'Instagram', 'Twitter', 'LinkedIn']),
            'post_type': random.choice(['Image', 'Video', 'Text', 'Link']),
            'created_at': fake.date_between(start_date='-3y', end_date='today').isoformat(),
            'campaign_name': random.choice(['End of Year', 'Spring Gala', 'Awareness Month', 'None']),
            'impressions': random.randint(100, 50000),
            'likes': random.randint(10, 5000),
            'shares': random.randint(0, 500)
        })
    return rows

def generate_fake_supporters(next_id, count):
    rows = []
    for i in range(count):
        current_id = next_id + i
        valid_ids['supporters'].append(current_id)
        rows.append({
            'supporter_id': current_id,
            'first_name': fake.first_name(),
            'last_name': fake.last_name(),
            'email': fake.unique.email(),
            'phone': fake.phone_number()[:15],
            'supporter_type': random.choice(['MonetaryDonor', 'Volunteer', 'InKindDonor', 'PartnerOrganization']),
            'acquisition_channel': random.choice(['Website', 'SocialMedia', 'Event', 'WordOfMouth']),
            'status': random.choices(['Active', 'Inactive'], weights=[0.8, 0.2])[0],
            'created_at': fake.date_between(start_date='-3y', end_date='today').isoformat()
        })
    return rows

def generate_fake_residents(next_id, count):
    rows = []
    for i in range(count):
        current_id = next_id + i
        valid_ids['residents'].append(current_id)
        rows.append({
            'resident_id': current_id,
            'initial_risk_level': random.choice(['Low', 'Medium', 'High', 'Critical']),
            'current_risk_level': random.choice(['Low', 'Medium', 'High', 'Critical']),
            'case_status': random.choice(['Active', 'Closed']),
            'case_category': random.choice(['Trafficking', 'Abuse', 'At-Risk']),
            'date_of_birth': fake.date_between(start_date='-20y', end_date='-10y').isoformat(),
            'date_of_admission': fake.date_between(start_date='-5y', end_date='-1m').isoformat(),
            'reintegration_status': random.choice(['Not Ready', 'In Progress', 'Completed'])
        })
    return rows


# ─── CHILD TABLE GENERATORS ────────────────────────────────────────────────────

def generate_fake_donations(next_id, count):
    rows = []
    for i in range(count):
        current_id = next_id + i
        valid_ids['donations'].append(current_id)
        
        # Grab foreign keys from shared state
        supporter_id = random.choice(valid_ids['supporters']) if valid_ids['supporters'] else 1
        
        # 30% chance a donation came from a social media post
        referral_post_id = random.choice(valid_ids['social_media_posts']) if (random.random() < 0.3 and valid_ids['social_media_posts']) else None
        
        rows.append({
            'donation_id': current_id,
            'supporter_id': supporter_id,
            'referral_post_id': referral_post_id,
            'donation_type': random.choice(['Monetary', 'InKind']),
            'amount': round(random.uniform(10.0, 5000.0), 2),
            'donation_date': fake.date_between(start_date='-3y', end_date='today').isoformat(),
            'campaign_name': random.choice(['End of Year', 'Spring Gala', 'General'])
        })
    return rows

def generate_fake_health_records(next_id, count):
    rows = []
    for i in range(count):
        resident_id = random.choice(valid_ids['residents']) if valid_ids['residents'] else 1
        rows.append({
            'health_record_id': next_id + i,  # <-- FIX THIS LINE
            'resident_id': resident_id,
            'record_date': fake.date_between(start_date='-2y', end_date='today').isoformat(),
            'general_health_score': round(random.uniform(1.0, 5.0), 1),
            'nutrition_score': round(random.uniform(1.0, 5.0), 1),
            'sleep_quality_score': round(random.uniform(1.0, 5.0), 1),
            'bmi': round(random.uniform(16.0, 28.0), 1),
            'medical_checkup_done': random.choice([True, False])
        })
    return rows

def generate_fake_education_records(next_id, count):
    rows = []
    for i in range(count):
        resident_id = random.choice(valid_ids['residents']) if valid_ids['residents'] else 1
        rows.append({
            'education_record_id': next_id + i,
            'resident_id': resident_id,
            'record_date': fake.date_between(start_date='-2y', end_date='today').isoformat(),
            'attendance_rate': round(random.uniform(50.0, 100.0), 1),
            'progress_percent': round(random.uniform(10.0, 100.0), 1),
            'education_level': random.choice(['Primary', 'Secondary', 'Vocational']),
            'enrollment_status': random.choice(['Enrolled', 'Not Enrolled', 'Graduated'])
        })
    return rows

def generate_fake_process_recordings(next_id, count):
    rows = []
    for i in range(count):
        resident_id = random.choice(valid_ids['residents']) if valid_ids['residents'] else 1
        rows.append({
            'recording_id': next_id + i,
            'resident_id': resident_id,
            'session_date': fake.date_between(start_date='-2y', end_date='today').isoformat(),
            'session_duration_minutes': random.randint(30, 120),
            'progress_noted': random.choice([True, False]),
            'concerns_flagged': random.choice([True, False])
        })
    return rows


# ─── CORE PROCESSING ENGINE ────────────────────────────────────────────────────

def process_table(table_name, csv_path, id_col, target_rows, generator_func):
    """Reads real data, logs valid IDs, generates fakes, and returns combined DataFrame."""
    print(f"\\n--- Processing Table: {table_name} ---")
    
    # 1. Read existing CSV safely
    try:
        real_df = pd.read_csv(csv_path)
        current_rows = len(real_df)
        print(f"Found {current_rows} real rows.")
    except FileNotFoundError:
        print(f"WARNING: Could not find {csv_path}. Starting from scratch.")
        real_df = pd.DataFrame(columns=[id_col]) # Empty df to prevent crashes
        current_rows = 0

    # 2. Add real IDs to shared state for foreign keys
    if table_name in valid_ids and current_rows > 0:
        valid_ids[table_name].extend(real_df[id_col].tolist())
        
    # 3. Calculate gap
    max_id = real_df[id_col].max() if current_rows > 0 else 0
    next_id = max_id + 1
    rows_to_add = target_rows - current_rows
    
    if rows_to_add <= 0:
        print(f"Target count ({target_rows}) already met.")
        return real_df
        
    # 4. Generate and combine
    print(f"Generating {rows_to_add} synthetic rows...")
    new_rows = generator_func(next_id, rows_to_add)
    fake_df = pd.DataFrame(new_rows)
    
    combined_df = pd.concat([real_df, fake_df], ignore_index=True)
    return combined_df

def write_sql_inserts(df, table_name, file_handle):
    """Writes the DataFrame as SQL INSERTs directly into the open file handle."""
    file_handle.write(f"-- ==========================================\\n")
    file_handle.write(f"-- TABLE: {table_name}\\n")
    file_handle.write(f"-- ==========================================\\n")
    file_handle.write(f"DELETE FROM dbo.{table_name};\\n\\n")
    
    # We use a trick to convert 'NaN' back to SQL NULLs
    df = df.where(pd.notnull(df), None)
    
    for _, row in df.iterrows():
        values = []
        for val in row.values:
            if val is None:
                values.append('NULL')
            elif isinstance(val, bool):
                values.append('1' if val else '0') # SQL Server boolean format
            elif isinstance(val, (int, float)):
                values.append(str(val))
            else:
                clean_str = str(val).replace("'", "''")
                values.append(f"'{clean_str}'")
        
        sql = f"INSERT INTO dbo.{table_name} ({', '.join(df.columns)}) VALUES ({', '.join(values)});\\n"
        file_handle.write(sql)
        
    file_handle.write("\\n\\n")


# ─── MAIN EXECUTION ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    BASE_DIR = "/Users/michellejohanson/Programming/hearth-haven/source_data/lighthouse_csv_v7/"
    OUTPUT_SQL = "long_seed.sql"
    
    # CRITICAL: Execution order dictates Foreign Key availability.
    # Level 1 (Independent): safehouses, social_media_posts, supporters, residents
    # Level 2 (Dependent): donations, health_records, education_records, process_recordings
    
    pipeline_config = [
        {"table": "safehouses", "csv": "safehouses.csv", "id_col": "safehouse_id", "target": 5, "generator": generate_fake_safehouses},
        {"table": "social_media_posts", "csv": "social_media_posts.csv", "id_col": "post_id", "target": 500, "generator": generate_fake_social_media_posts},
        {"table": "supporters", "csv": "supporters.csv", "id_col": "supporter_id", "target": 500, "generator": generate_fake_supporters},
        {"table": "residents", "csv": "residents.csv", "id_col": "resident_id", "target": 300, "generator": generate_fake_residents},
        
        # Level 2 tables start here (they can safely pull IDs from the above tables)
        {"table": "donations", "csv": "donations.csv", "id_col": "donation_id", "target": 2000, "generator": generate_fake_donations},
        {"table": "health_wellbeing_records", "csv": "health_wellbeing_records.csv", "id_col": "health_record_id", "target": 1500, "generator": generate_fake_health_records},
        {"table": "education_records", "csv": "education_records.csv", "id_col": "education_record_id", "target": 1500, "generator": generate_fake_education_records},
        {"table": "process_recordings", "csv": "process_recordings.csv", "id_col": "recording_id", "target": 2000, "generator": generate_fake_process_recordings},
        
        # To add `home_visitations` or `incident_reports`, just add their dictionary here!
    ]
    
    with open(OUTPUT_SQL, 'w') as sql_file:
        for config in pipeline_config:
            # Construct the absolute path dynamically
            csv_absolute_path = os.path.join(BASE_DIR, config["csv"])
            
            final_df = process_table(
                table_name=config["table"],
                csv_path=csv_absolute_path,
                id_col=config["id_col"],
                target_rows=config["target"],
                generator_func=config["generator"]
            )
            write_sql_inserts(final_df, config["table"], sql_file)
            
    print(f"\\n✅ All tables processed successfully! Master SQL file saved to {OUTPUT_SQL}.")