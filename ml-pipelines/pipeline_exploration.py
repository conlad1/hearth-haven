# pipeline_exploration.py
# Quick Pipeline Exploration — Is This Target Worth Building?
#
# PURPOSE:
#   Run cross-validation on a new pipeline idea with default models
#   before committing to a full pipeline. Takes about 2-5 minutes.
#   Paste the output to Claude — get a go/no-go decision and next steps.
#
# HOW TO USE:
#   1. Edit the four variables in the EDIT THESE section below
#   2. Run: python pipeline_exploration.py
#   3. Paste the printed output to Claude
#   4. Claude will tell you if it's worth building and flag any issues
#
# WHEN TO USE:
#   - You have a new pipeline idea (new target, new domain)
#   - You want to know if the data can actually predict this target
#   - You have NOT yet added this target to DROP_ALWAYS
#   - You do NOT want to touch fn_eda_custom.py yet

import numpy as np
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ── EDIT THESE FOUR THINGS ────────────────────────────────────────────────────

from functions.fn_domain_prep import prepare_residents as prepare_fn

TARGET = 'progress_percent_latest'
PROBLEM_TYPE = 'regression'
OTHER_TARGETS = [
    'risk_escalated',
    'risk_improved',
    'reintegration_achieved',
    'reintegration_status',
    'current_risk_num',
    'current_risk_level',
    'initial_risk_num',
]

# ── NOTHING BELOW THIS LINE NEEDS TO CHANGE ───────────────────────────────────

from functions.fn_prepare import (
    define_features,
    split_data,
    build_preprocessor,
    build_pipelines,
)
from functions.fn_model_predict import run_cross_validation

print("=" * 60)
print(f"  PIPELINE EXPLORATION")
print(f"  Target:       {TARGET}")
print(f"  Problem type: {PROBLEM_TYPE}")
print("=" * 60)

# Load and prepare data
df, NUMERIC, CATEGORICAL, DROP = prepare_fn()

# Define features — exploration mode (no DROP_ALWAYS needed)
X, y = define_features(
    df,
    target=TARGET,
    numeric=NUMERIC,
    categorical=CATEGORICAL,
    exclude_targets=OTHER_TARGETS,
)

# Confirm feature lists reflect only what's in X
numeric_in_X      = [c for c in NUMERIC     if c in X.columns]
categorical_in_X  = [c for c in CATEGORICAL if c in X.columns]

# Force all categorical features to string to prevent mixed-type imputer crashes
X[categorical_in_X] = X[categorical_in_X].astype(str).replace({'nan': np.nan, '<NA>': np.nan})

# Train/test split
stratify = (PROBLEM_TYPE == 'classification')
X_train, X_test, y_train, y_test = split_data(X, y, stratify=stratify)

# Build preprocessor and all candidate pipelines
preprocessor = build_preprocessor(numeric_in_X, categorical_in_X)
pipelines    = build_pipelines(preprocessor, problem_type=PROBLEM_TYPE)

# Run cross-validation — this is the main result
results = run_cross_validation(
    pipelines, X_train, y_train,
    problem_type=PROBLEM_TYPE,
)

print(f"\n{'='*60}")
print(f"  EXPLORATION COMPLETE")
print(f"  Target: '{TARGET}' | Problem: {PROBLEM_TYPE}")
print(f"  Rows: {len(y)} | Features: {X.shape[1]}")
print(f"{'='*60}")