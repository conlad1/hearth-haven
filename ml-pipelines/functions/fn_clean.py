# fn_clean.py
# Data Preparation — Cleaning Functions
# Covers: Chapter 7 (Data Prep Pipelines)
#
# These functions are called from your EDA notebook after you've explored
# the data and decided what each column needs. They return a cleaned DataFrame
# and print a log of every change made so decisions are auditable.
#
# Every function:
#   - Takes a DataFrame and returns a DataFrame (never modifies in place)
#   - Prints a clear log of what changed
#   - Skips gracefully if the column doesn't need the operation
#
# Typical notebook workflow (social media pipeline example):
#   df = load_social_media_data()          # from your notebook
#   df = standardize_column_names(df)
#   df = drop_structural_columns(df, ['platform_post_id', 'post_url', 'caption'])
#   df = fix_column_types(df)
#   df = handle_intentional_nulls(df)      # video_views, watch_time, etc.
#   df = impute_column(df, 'num_hashtags')
#   df = cap_outliers_iqr(df, 'boost_budget_php')
#   df = transform_skewed_column(df, 'estimated_donation_value_php')
#   df = bin_rare_categories(df, 'call_to_action_type')
#   df = merge_tables(posts, donations, on='referral_post_id', how='left')


# ── Helper ────────────────────────────────────────────────────────────────────

def _is_numeric(col):
    """
    Returns True if a column should be treated as numeric.
    Booleans are excluded — they are flags (0/1), not continuous values.
    Computing mean or skew on a boolean is misleading.
    """
    import numpy as np
    import pandas as pd
    return pd.api.types.is_numeric_dtype(col) and col.dtype != bool and col.dtype != np.bool_


# ── Name Standardization ──────────────────────────────────────────────────────

def standardize_column_names(df):
    """
    Standardize all column names to lowercase_with_underscores.
    Chapter 7 — Data Wrangling: consistent column names prevent KeyErrors
    and make code readable. Run this first, before any other cleaning.

    Parameters:
        df (DataFrame): any DataFrame

    Returns:
        DataFrame with standardized column names
    """
    df = df.copy()
    before = list(df.columns)
    df.columns = (
        df.columns
        .str.lower()
        .str.strip()
        .str.replace('%', '_pct',  regex=False)
        .str.replace('#', '_num',  regex=False)
        .str.replace('$', '_usd',  regex=False)
        .str.replace(' ', '_',     regex=False)
        .str.replace(r'[^a-z0-9_]', '', regex=True)
    )
    changed = [(b, a) for b, a in zip(before, df.columns) if b != a]
    if changed:
        print(f"[standardize_column_names] Renamed {len(changed)} columns: {changed}")
    else:
        print(f"[standardize_column_names] All column names already clean.")
    return df


# ── Structural Column Removal ─────────────────────────────────────────────────

def drop_structural_columns(df, columns):
    """
    Drop columns that should never enter the model: IDs, URLs, free text,
    and columns that are purely administrative.
    Chapter 7 — Data Wrangling: drop these before exploration to prevent
    them from appearing in correlation scans or feature rankings.

    Use this for columns where you already know they are useless for modeling
    (e.g. post_url, caption, platform_post_id). For columns you're unsure about,
    explore them first then call this.

    Parameters:
        df (DataFrame): input data
        columns (list): column names to drop unconditionally

    Returns:
        DataFrame with specified columns removed

    Example (social media pipeline):
        df = drop_structural_columns(df, [
            'platform_post_id',  # unique ID — no signal
            'post_url',          # unique URL — no signal
            'caption',           # free text — use caption_length instead
            'hashtags',          # free text — use num_hashtags instead
        ])
    """
    df = df.copy()
    found    = [c for c in columns if c in df.columns]
    missing  = [c for c in columns if c not in df.columns]
    df = df.drop(columns=found)
    if found:
        print(f"[drop_structural_columns] Dropped {len(found)} columns: {found}")
    if missing:
        print(f"[drop_structural_columns] ⚠️  Not found (already dropped?): {missing}")
    return df


def drop_sparse_column(df, column, threshold=0.5):
    """
    Drop a column if it is missing more than `threshold` of its values.
    Chapter 7 — Missing Data: columns with too many missing values can't
    be reliably imputed and often add noise rather than signal.

    Note: In INTEX, some columns have *intentional* nulls (e.g. video_views
    is only populated for Video/Reel posts). Use handle_intentional_nulls()
    for those instead of dropping them.

    Parameters:
        df (DataFrame): input data
        column (str): column to check
        threshold (float): proportion missing above which we drop (default 0.5)

    Returns:
        DataFrame with column removed if missing ratio exceeds threshold

    Example:
        df = drop_sparse_column(df, 'watch_time_seconds', threshold=0.7)
    """
    df = df.copy()
    missing_ratio = df[column].isnull().sum() / len(df)
    if missing_ratio >= threshold:
        df = df.drop(columns=[column])
        print(f"[drop_sparse_column] Dropped '{column}' — {missing_ratio:.1%} missing (threshold: {threshold:.1%}).")
    else:
        print(f"[drop_sparse_column] Kept '{column}' — {missing_ratio:.1%} missing, below threshold.")
    return df


# ── Type Fixing ───────────────────────────────────────────────────────────────

def fix_column_types(df):
    """
    Scan all object (string) columns and convert them to a better type
    if they are clearly numeric or datetime.
    Chapter 7 — Data Wrangling: strings that are really numbers or dates
    must be converted before modeling.

    Logic per column:
        1. If already numeric or datetime, leave it alone.
        2. Try converting to numeric — accept if 90%+ of values convert cleanly.
        3. Try converting to datetime — accept if 90%+ of values convert cleanly.
        4. Otherwise leave as string.

    Parameters:
        df (DataFrame): input data

    Returns:
        DataFrame with columns converted where possible
    """
    import pandas as pd
    df = df.copy()

    for col in df.columns:
        if df[col].dtype != 'object':
            continue

        non_null = df[col].notna().sum()
        if non_null == 0:
            continue

        as_numeric = pd.to_numeric(df[col], errors='coerce')
        if as_numeric.notna().sum() >= non_null * 0.9:
            df[col] = as_numeric
            print(f"[fix_column_types] '{col}' → numeric")
            continue

        as_date = pd.to_datetime(df[col], errors='coerce', format='mixed')
        if as_date.notna().sum() >= non_null * 0.9:
            df[col] = as_date
            print(f"[fix_column_types] '{col}' → datetime")

    return df


# ── Intentional Null Handling ─────────────────────────────────────────────────

def handle_intentional_nulls(df, fill_map):
    """
    Fill columns that have intentional nulls with a meaningful sentinel value.
    Chapter 7 — Missing Data: not all missing values are data quality problems.
    In INTEX, several columns are null *by design* for certain post types.

    Examples of intentional nulls in social_media_posts:
        video_views       — null for non-video posts → fill with 0
        watch_time_seconds — null for non-YouTube posts → fill with 0
        boost_budget_php  — null when is_boosted is False → fill with 0
        forwards          — null for non-WhatsApp posts → fill with 0
        call_to_action_type — null when has_call_to_action is False → fill with 'None'

    Parameters:
        df (DataFrame): input data
        fill_map (dict): {column_name: fill_value} for each intentional null

    Returns:
        DataFrame with intentional nulls filled

    Example:
        df = handle_intentional_nulls(df, {
            'video_views':            0,
            'watch_time_seconds':     0,
            'avg_view_duration_seconds': 0,
            'subscriber_count_at_post':  0,
            'boost_budget_php':       0,
            'forwards':               0,
            'call_to_action_type':    'None',
        })
    """
    df = df.copy()
    for col, fill_val in fill_map.items():
        if col not in df.columns:
            print(f"[handle_intentional_nulls] ⚠️  '{col}' not found — skipping.")
            continue
        n_filled = df[col].isnull().sum()
        if n_filled > 0:
            df[col] = df[col].fillna(fill_val)
            print(f"[handle_intentional_nulls] '{col}' — filled {n_filled} nulls with {fill_val!r}.")
        else:
            print(f"[handle_intentional_nulls] '{col}' — no nulls.")
    return df


# ── Missing Value Imputation ──────────────────────────────────────────────────

def impute_column(df, column, strategy='auto'):
    """
    Fill remaining (non-intentional) missing values in a single column.
    Chapter 7 — Missing Data: after handling intentional nulls, use this
    for columns that have genuine data quality gaps.

    IMPORTANT: This is for pre-split cleaning only (structural missingness
    discovered in EDA). After the train/test split, imputation inside the
    sklearn Pipeline (fn_prepare.py) handles the rest — that version is
    fit on training data only and applied to test data, preventing leakage.
    Use this only for missingness that exists before you even define features.

    Strategies:
        'auto'   — median for numeric, mode for categorical (default)
        'median' — fill with median (robust to outliers)
        'mean'   — fill with mean (sensitive to outliers)
        'mode'   — fill with most frequent value
        'drop'   — drop rows where this column is missing

    Parameters:
        df (DataFrame): input data
        column (str): column to impute
        strategy (str): one of 'auto', 'median', 'mean', 'mode', 'drop'

    Returns:
        DataFrame with missing values filled
    """
    df = df.copy()
    missing_count = df[column].isnull().sum()

    if missing_count == 0:
        print(f"[impute_column] '{column}' — no missing values, skipping.")
        return df

    if strategy == 'auto':
        strategy = 'median' if _is_numeric(df[column]) else 'mode'

    if strategy == 'drop':
        df = df.dropna(subset=[column])
        print(f"[impute_column] '{column}' — dropped {missing_count} rows.")
        return df

    if strategy == 'mean':
        fill = df[column].mean()
    elif strategy == 'median':
        fill = df[column].median()
    elif strategy == 'mode':
        fill = df[column].mode()[0]
    else:
        raise ValueError(f"Unknown strategy: '{strategy}'. Use 'auto', 'median', 'mean', 'mode', or 'drop'.")

    df[column] = df[column].fillna(fill)
    print(f"[impute_column] '{column}' — filled {missing_count} missing values with {strategy} ({fill!r}).")
    return df


# ── Categorical Grouping ───────────────────────────────────────────────────────

def bin_rare_categories(df, column, threshold=0.05, fill_value='Other'):
    """
    Collapse infrequent categories into a single 'Other' bucket.
    Chapter 7 — Grouping Data: rare categories add dummy columns during
    one-hot encoding but have too few examples for the model to learn from.
    Grouping them reduces noise and prevents overfitting to tiny groups.

    Parameters:
        df (DataFrame): input data
        column (str): categorical column to clean
        threshold (float): categories appearing less than this % → 'Other'
        fill_value (str): label for collapsed categories (default 'Other')

    Returns:
        DataFrame with rare categories replaced

    Example:
        df = bin_rare_categories(df, 'call_to_action_type', threshold=0.05)
    """
    df = df.copy()

    if _is_numeric(df[column]):
        print(f"[bin_rare_categories] '{column}' is numeric — skipping.")
        return df

    counts = df[column].value_counts()
    rare   = counts[counts / len(df) < threshold].index

    if len(rare) == 0:
        print(f"[bin_rare_categories] '{column}' — no rare categories at {threshold:.1%} threshold.")
        return df

    df[column] = df[column].where(~df[column].isin(rare), other=fill_value)
    print(f"[bin_rare_categories] '{column}' — collapsed {len(rare)} rare categories into '{fill_value}': {list(rare)}")
    return df


# ── Skew Transformation ────────────────────────────────────────────────────────

def transform_skewed_column(df, column, skew_threshold=0.5):
    """
    Apply the best-fitting mathematical transformation to reduce skew.
    Chapter 7 — Math Transformations: heavily skewed columns distort linear
    models by giving extreme values disproportionate influence on coefficients.

    Skew interpretation:
        |skew| < 0.5  → symmetric, no transform needed
        |skew| 0.5–1  → moderate skew, transform may help
        |skew| > 1    → high skew, transform recommended

    Candidates tried (Yeo-Johnson preferred as tiebreaker — handles negatives):
        yeo-johnson, log1p, sqrt, cbrt, none

    Modifies the column in place. The transformed column replaces the original.

    Parameters:
        df (DataFrame): input data
        column (str): numeric column to transform
        skew_threshold (float): only transform if |skew| exceeds this (default 0.5)

    Returns:
        DataFrame with column transformed

    Example:
        df = transform_skewed_column(df, 'estimated_donation_value_php')
        df = transform_skewed_column(df, 'boost_budget_php')
    """
    import numpy as np
    import pandas as pd
    from scipy.stats import yeojohnson

    df = df.copy()

    if not _is_numeric(df[column]):
        print(f"[transform_skewed_column] '{column}' is not numeric — skipping.")
        return df

    x = pd.to_numeric(df[column], errors='coerce')
    skew_before = x.skew()

    if abs(skew_before) < skew_threshold:
        print(f"[transform_skewed_column] '{column}' skew={skew_before:.3f} — below threshold, no transform.")
        return df

    min_val   = x.min(skipna=True)
    shift     = max(0, -min_val)
    x_shifted = x + shift

    candidates = {
        'none':  x,
        'sqrt':  np.sqrt(x_shifted.clip(lower=0)),
        'cbrt':  np.cbrt(x_shifted.clip(lower=0)),
        'log1p': np.log1p(x_shifted.clip(lower=0)),
    }

    try:
        yj_vals, _ = yeojohnson(x.dropna().to_numpy())
        yj_series  = pd.Series(yj_vals, index=x.dropna().index)
        yj_full    = x.copy()
        yj_full.loc[yj_series.index] = yj_series
        candidates['yeo-johnson'] = yj_full
    except Exception:
        pass

    skewness = {
        name: abs(val.skew(skipna=True)) if pd.notna(val.skew(skipna=True)) else float('inf')
        for name, val in candidates.items()
    }

    priority = ['yeo-johnson', 'log1p', 'sqrt', 'cbrt', 'none']
    min_skew = min(skewness.values())
    best = next(
        (t for t in priority if t in skewness and abs(skewness[t] - min_skew) < 1e-10),
        min(skewness, key=skewness.get)
    )

    if best == 'none' or skewness[best] >= abs(skew_before):
        print(f"[transform_skewed_column] '{column}' — no transform improved skew of {skew_before:.3f}.")
    else:
        df[column] = candidates[best]
        print(f"[transform_skewed_column] '{column}' — {best} applied "
              f"(skew: {skew_before:.3f} → {skewness[best]:.3f}).")

    return df


# ── Outlier Capping ────────────────────────────────────────────────────────────

def cap_outliers_iqr(df, column):
    """
    Cap extreme outliers using Tukey's IQR method (Winsorizing).
    Chapter 7 — Managing Outliers: outliers distort linear model coefficients
    by pulling the fitted line toward extreme values. Capping preserves sample
    size while neutralizing the influence of true extremes.

    IQR Method (same rule used in box plots):
        Lower fence = Q1 - 1.5 × IQR
        Upper fence = Q3 + 1.5 × IQR
        Values outside fences are clipped to the fence value.

    Use this for: boost_budget_php, engagement_rate, estimated_donation_value_php,
    impressions, reach — any column where a few very large values exist.

    Parameters:
        df (DataFrame): input data
        column (str): numeric column to cap

    Returns:
        DataFrame with outliers clipped to IQR fences

    Example:
        df = cap_outliers_iqr(df, 'boost_budget_php')
        df = cap_outliers_iqr(df, 'impressions')
    """
    import pandas as pd
    df = df.copy()

    if not pd.api.types.is_numeric_dtype(df[column]):
        print(f"[cap_outliers_iqr] '{column}' is not numeric — skipping.")
        return df

    q1  = df[column].quantile(0.25)
    q3  = df[column].quantile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr

    n_capped = ((df[column] < lower) | (df[column] > upper)).sum()
    df[column] = df[column].clip(lower=lower, upper=upper)

    print(f"[cap_outliers_iqr] '{column}' — capped {n_capped} outliers (fences: [{lower:.2f}, {upper:.2f}]).")
    return df


# ── Date Parsing ───────────────────────────────────────────────────────────────

def parse_date_column(df, column, drop_original=True):
    """
    Parse a datetime column and extract numeric features a model can use.
    Chapter 7 — Dates and Times: raw datetime values can't be used directly.
    We extract components that capture meaningful temporal patterns.

    Extracted features:
        {column}_year       — calendar year
        {column}_month      — month (1–12)
        {column}_day        — day of month
        {column}_hour       — hour (0–23)
        {column}_dow        — day of week integer (0=Mon, 6=Sun)
        {column}_is_weekend — 1 if Saturday or Sunday, else 0

    Note: social_media_posts already has day_of_week and post_hour columns,
    so you may not need to call this on created_at. Use it for date fields
    that don't already have extracted components.

    Parameters:
        df (DataFrame): input data
        column (str): string or datetime column to parse
        drop_original (bool): drop the original column after extracting (default True)

    Returns:
        DataFrame with new date feature columns added

    Example:
        df = parse_date_column(df, 'created_at')
        df = parse_date_column(df, 'donation_date', drop_original=False)
    """
    import pandas as pd
    df = df.copy()

    if not pd.api.types.is_datetime64_dtype(df[column]):
        df[column] = pd.to_datetime(df[column], errors='coerce', format='mixed')

    if df[column].isna().all():
        print(f"[parse_date_column] '{column}' — could not parse any dates. Check the format.")
        return df

    df[f'{column}_year']       = df[column].dt.year
    df[f'{column}_month']      = df[column].dt.month
    df[f'{column}_day']        = df[column].dt.day
    df[f'{column}_hour']       = df[column].dt.hour
    df[f'{column}_dow']        = df[column].dt.dayofweek
    df[f'{column}_is_weekend'] = df[column].dt.dayofweek.ge(5).astype(int)

    if drop_original:
        df = df.drop(columns=[column])

    print(f"[parse_date_column] '{column}' — extracted year, month, day, hour, dow, is_weekend.")
    return df


# ── Table Joining ──────────────────────────────────────────────────────────────

def merge_tables(left, right, on, how='left', suffixes=('', '_right')):
    """
    Join two DataFrames and report the result.
    Chapter 7 — Data Integration: INTEX pipelines require joining across
    multiple tables (e.g. posts + donations, residents + health records).

    After joining, always check the row count. An unexpected row explosion
    usually means the join key is not unique on one side (a many-to-many join).

    Parameters:
        left (DataFrame): left table (the one you're enriching)
        right (DataFrame): right table (the one providing new columns)
        on (str or list): column name(s) to join on
        how (str): 'left', 'inner', 'outer', or 'right' (default 'left')
        suffixes (tuple): suffixes for overlapping column names

    Returns:
        Merged DataFrame

    Examples:
        # Add donation data to posts (left join keeps all posts)
        df = merge_tables(posts, donations, on='referral_post_id', how='left')

        # Add resident health records (inner join keeps only matched rows)
        df = merge_tables(residents, health, on='resident_id', how='inner')
    """
    before = len(left)
    merged = left.merge(right, on=on, how=how, suffixes=suffixes)
    after  = len(merged)

    print(f"[merge_tables] {how.upper()} JOIN on '{on}': {before} rows → {after} rows")
    if after > before:
        print(f"  ⚠️  Row count increased — join key may not be unique in the right table.")
    if after < before and how == 'left':
        print(f"  ⚠️  Row count decreased — unexpected for a left join. Check for duplicate keys.")

    return merged