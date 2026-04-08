# fn_explore.py
# Data Understanding — Exploration Functions (Pipeline-Safe, No Plots)
# Covers: Chapter 6 (Automating Feature-Level Exploration),
#         Chapter 8 (Relationship Discovery)
#
# These functions return data structures — DataFrames, dicts — not charts.
# All plotting happens in your EDA notebook, not here. That separation
# means these functions can be imported safely in any pipeline .py file.
#
# Typical notebook workflow:
#   num_df, cat_df = summarize_dataframe(df)      ← get the lay of the land
#   describe_column(df, 'engagement_rate')         ← inspect one column
#   ranked = rank_features_for_target(df, 'engagement_rate')  ← what matters?
#   corr = get_correlation_matrix(df)              ← multicollinearity check
#   test_relationship(df, 'post_type', 'engagement_rate')     ← drill into a pair
#
# For plots, call these from your notebook:
#   import matplotlib.pyplot as plt
#   import seaborn as sns
#   Use the returned DataFrames/dicts to drive your own charts.


# ── Helper ─────────────────────────────────────────────────────────────────────

def _is_numeric(col):
    """
    Returns True if a column should be treated as numeric.
    Booleans are excluded — they are 0/1 flags, not continuous values.
    """
    import numpy as np
    import pandas as pd
    return pd.api.types.is_numeric_dtype(col) and col.dtype != bool and col.dtype != np.bool_


# ── Single Column Stats ────────────────────────────────────────────────────────

def describe_column(df, column, verbose=True):
    """
    Compute and optionally print a detailed summary of a single column.
    Chapter 6 — Univariate Statistics: the first step in understanding any
    column is knowing its type, range, missing values, and distribution shape.

    For numeric columns: count, missing, min, max, mean, median, std, skew, kurt.
    For categorical columns: count, missing, unique count, mode, top 5 values.

    Parameters:
        df (DataFrame): input data
        column (str): column to describe
        verbose (bool): if True, prints a formatted summary (default True)

    Returns:
        dict of computed stats — use this to build tables or drive decisions

    Example:
        stats = describe_column(df, 'engagement_rate')
        stats = describe_column(df, 'post_type')
        stats = describe_column(df, 'boost_budget_php', verbose=False)
    """
    import numpy as np

    col = df[column]
    missing     = col.isnull().sum()
    missing_pct = missing / len(df) * 100

    stats = {
        'column':      column,
        'dtype':       str(col.dtype),
        'count':       int(col.count()),
        'missing':     int(missing),
        'missing_pct': round(missing_pct, 2),
        'unique':      int(col.nunique()),
    }

    if _is_numeric(col):
        stats.update({
            'min':    round(col.min(), 4),
            'max':    round(col.max(), 4),
            'mean':   round(col.mean(), 4),
            'median': round(col.median(), 4),
            'std':    round(col.std(), 4),
            'skew':   round(col.skew(), 4),
            'kurt':   round(col.kurt(), 4),
        })
    else:
        mode_val = col.mode().values[0] if not col.mode().empty else None
        stats.update({
            'mode':  mode_val,
            'top_5': col.value_counts().head(5).to_dict(),
        })

    if verbose:
        print(f"\n{'─'*52}")
        print(f"  Column  : {column}")
        print(f"  Type    : {stats['dtype']}  |  Unique: {stats['unique']}")
        print(f"  Count   : {stats['count']}  |  Missing: {missing} ({missing_pct:.1f}%)")
        if _is_numeric(col):
            print(f"  Range   : {stats['min']} → {stats['max']}")
            print(f"  Mean    : {stats['mean']}  |  Median: {stats['median']}  |  Std: {stats['std']}")
            print(f"  Skew    : {stats['skew']}  |  Kurt: {stats['kurt']}")
            if abs(stats['skew']) > 1:
                print(f"  ⚠️  High skew ({stats['skew']:.2f}) — consider transform_skewed_column()")
            if missing_pct > 5:
                print(f"  ⚠️  {missing_pct:.1f}% missing — consider impute_column() or drop_sparse_column()")
        else:
            print(f"  Mode    : {stats['mode']}")
            print(f"  Top 5   : {stats['top_5']}")
        print(f"{'─'*52}")

    return stats


# ── Full DataFrame Summary ──────────────────────────────────────────────────────

def summarize_dataframe(df):
    """
    Compute a full summary table of every column in the DataFrame.
    Chapter 6 — Starting point for Data Understanding. Call this first
    on any new dataset to get the complete lay of the land.

    Returns two separate DataFrames: one for numeric columns, one for
    categorical columns. Each row is a column from your dataset.

    Parameters:
        df (DataFrame): input data

    Returns:
        (num_df, cat_df): tuple of DataFrames
            num_df — numeric columns with: dtype, count, missing, missing_pct,
                     min, max, mean, median, std, skew, kurt
            cat_df — categorical columns with: dtype, count, missing, missing_pct,
                     unique, mode

    Example:
        num_df, cat_df = summarize_dataframe(df)
        display(num_df)   # in notebook
        display(cat_df)
    """
    import pandas as pd

    rows = []
    for col in df.columns:
        s = describe_column(df, col, verbose=False)
        rows.append(s)

    full = pd.DataFrame(rows).set_index('column')

    num_cols = [c for c in df.columns if _is_numeric(df[c])]
    cat_cols = [c for c in df.columns if not _is_numeric(df[c])]

    num_fields = ['dtype', 'count', 'missing', 'missing_pct', 'min', 'max',
                  'mean', 'median', 'std', 'skew', 'kurt']
    cat_fields = ['dtype', 'count', 'missing', 'missing_pct', 'unique', 'mode']

    num_df = full.loc[num_cols, [f for f in num_fields if f in full.columns]] if num_cols else pd.DataFrame()
    cat_df = full.loc[cat_cols, [f for f in cat_fields if f in full.columns]] if cat_cols else pd.DataFrame()

    print(f"\n{'='*52}")
    print(f"  NUMERIC COLUMNS ({len(num_cols)})")
    print(f"{'='*52}")
    print(num_df.to_string())
    print(f"\n{'='*52}")
    print(f"  CATEGORICAL COLUMNS ({len(cat_cols)})")
    print(f"{'='*52}")
    print(cat_df.to_string())

    return num_df, cat_df


# ── Target Rate by Category ─────────────────────────────────────────────────────

def compute_target_rate_by_category(df, column, target, min_count=10):
    """
    Compute the mean target value for each category in a column.
    Chapter 8 — Categorical-to-target relationship: shows which categories
    of a feature are associated with higher or lower target values.

    For classification targets: shows positive class rate per category.
    For regression targets: shows mean target value per category.

    This is one of the most useful pre-modeling checks. A column where
    FundraisingAppeal posts have 3x the donation rate of EventPromotion
    is clearly worth including as a feature.

    Parameters:
        df (DataFrame): input data
        column (str): categorical feature to analyze
        target (str): target column (binary or continuous)
        min_count (int): minimum rows in a category to include (default 10)

    Returns:
        DataFrame with columns [column, 'mean_target', 'count'],
        sorted by mean_target descending

    Examples:
        compute_target_rate_by_category(df, 'post_type', 'donation_referrals')
        compute_target_rate_by_category(df, 'platform', 'engagement_rate')
        compute_target_rate_by_category(df, 'sentiment_tone', 'led_to_donation')
    """
    import pandas as pd

    counts = df[column].value_counts()
    valid  = counts[counts >= min_count].index
    subset = df[df[column].isin(valid)]

    rates = (
        subset.groupby(column)[target]
        .agg(['mean', 'count'])
        .rename(columns={'mean': 'mean_target'})
        .sort_values('mean_target', ascending=False)
        .reset_index()
    )
    rates['mean_target'] = rates['mean_target'].round(4)

    print(f"\n[compute_target_rate_by_category] '{target}' by '{column}' (min_count={min_count}):")
    print(rates.to_string(index=False))
    return rates


# ── Bivariate Tests ─────────────────────────────────────────────────────────────

def test_numeric_vs_numeric(df, col1, col2, verbose=True):
    """
    Test the linear relationship between two numeric columns (Pearson correlation).
    Chapter 8 — Numeric-to-Numeric relationship discovery.

    r values:
        close to  1 → strong positive (both go up together)
        close to -1 → strong negative (one up, other down)
        close to  0 → little/no linear relationship

    p < 0.05 → statistically significant (unlikely to be chance).

    Parameters:
        df (DataFrame): input data
        col1, col2 (str): the two numeric columns to compare
        verbose (bool): print results (default True)

    Returns:
        dict with keys: r, p, slope, intercept
    """
    from scipy import stats

    temp = df[[col1, col2]].dropna()
    slope, intercept, r, p, _ = stats.linregress(temp[col1], temp[col2])

    if verbose:
        sig = "✅ significant" if p < 0.05 else "❌ not significant"
        print(f"\n[N↔N] {col1} vs {col2}")
        print(f"  r = {r:.4f}  |  p = {p:.4f}  →  {sig}")
        print(f"  Slope: {slope:.4f}  |  Intercept: {intercept:.4f}")

    return {'r': r, 'p': p, 'slope': slope, 'intercept': intercept}


def test_numeric_vs_categorical(df, numeric_col, categorical_col, verbose=True):
    """
    Test whether a numeric column differs across categories (ANOVA F-test).
    Chapter 8 — Numeric-to-Categorical relationship discovery.

    ANOVA asks: "Is the average of this numeric column meaningfully different
    between groups?" A large F and small p means the groups genuinely differ.

    Example: "Is engagement_rate significantly different across post_types?"

    Parameters:
        df (DataFrame): input data
        numeric_col (str): the numeric column
        categorical_col (str): the grouping column
        verbose (bool): print results (default True)

    Returns:
        dict with keys: F, p
    """
    from scipy import stats

    temp = df[[numeric_col, categorical_col]].dropna()
    groups = [temp.loc[temp[categorical_col] == g, numeric_col]
              for g in temp[categorical_col].unique()]
    F, p = stats.f_oneway(*groups)

    if verbose:
        sig = "✅ significant" if p < 0.05 else "❌ not significant"
        print(f"\n[N↔C] {numeric_col} by {categorical_col}")
        print(f"  ANOVA F = {F:.4f}  |  p = {p:.4f}  →  {sig}")

    return {'F': F, 'p': p}


def test_categorical_vs_categorical(df, col1, col2, verbose=True):
    """
    Test whether two categorical columns are statistically associated (Chi-Square).
    Chapter 8 — Categorical-to-Categorical relationship discovery.

    Chi-Square asks: "Does knowing the value of col1 help predict col2?"
    A small p means they are associated — not independent.

    Example: "Is platform associated with post_type?"

    Parameters:
        df (DataFrame): input data
        col1, col2 (str): the two categorical columns to compare
        verbose (bool): print results (default True)

    Returns:
        dict with keys: chi2, p, dof
    """
    from scipy.stats import chi2_contingency
    import pandas as pd

    temp = df[[col1, col2]].dropna()
    ct   = pd.crosstab(temp[col1], temp[col2])
    chi2, p, dof, _ = chi2_contingency(ct)

    if verbose:
        sig = "✅ significant" if p < 0.05 else "❌ not significant"
        print(f"\n[C↔C] {col1} vs {col2}")
        print(f"  Chi-Square = {chi2:.4f}  |  p = {p:.4f}  |  df = {dof}  →  {sig}")

    return {'chi2': chi2, 'p': p, 'dof': dof}


def test_relationship(df, col1, col2, verbose=True):
    """
    Auto-detect column types and run the appropriate statistical test.
    Chapter 8 — Main entry point for relationship discovery.

    Routes to:
        numeric  ↔ numeric     → Pearson correlation
        numeric  ↔ categorical → ANOVA F-test
        category ↔ category    → Chi-Square

    Parameters:
        df (DataFrame): input data
        col1, col2 (str): any two columns
        verbose (bool): print results (default True)

    Returns:
        dict of test results (keys depend on test type)

    Examples:
        test_relationship(df, 'num_hashtags', 'engagement_rate')
        test_relationship(df, 'post_type', 'engagement_rate')
        test_relationship(df, 'platform', 'post_type')
    """
    is1 = _is_numeric(df[col1])
    is2 = _is_numeric(df[col2])

    if is1 and is2:
        return test_numeric_vs_numeric(df, col1, col2, verbose)
    elif not is1 and not is2:
        return test_categorical_vs_categorical(df, col1, col2, verbose)
    else:
        num = col1 if is1 else col2
        cat = col2 if is1 else col1
        return test_numeric_vs_categorical(df, num, cat, verbose)


# ── Feature Ranking ─────────────────────────────────────────────────────────────

def rank_features_for_target(df, target, p_threshold=0.05, top_n=20):
    """
    Score every feature by its statistical relationship to the target column
    and return them ranked strongest to weakest.
    Chapter 8 — Finding the most useful predictors before modeling.

    This is one of the most important pre-modeling steps. It tells you which
    features are worth including and which are probably noise — before you've
    spent any time building a model.

    For numeric features:     ranks by |r| (Pearson correlation strength)
    For categorical features: ranks by chi-square statistic or ANOVA F

    Parameters:
        df (DataFrame): input data (should already have target column present)
        target (str): the column you are trying to predict
        p_threshold (float): only include statistically significant features (default 0.05)
        top_n (int): how many top features to display (default 20)

    Returns:
        DataFrame ranked by relationship strength, strongest first
        Columns: feature, test, metric, p_value, strength

    Examples:
        rank_features_for_target(df, 'engagement_rate')
        rank_features_for_target(df, 'donation_referrals', top_n=15)
        rank_features_for_target(df, 'led_to_donation')
    """
    import pandas as pd

    results = []
    for col in df.columns:
        if col == target:
            continue
        try:
            res = test_relationship(df, col, target, verbose=False)
            if res['p'] >= p_threshold:
                continue

            if 'r' in res:
                strength = abs(res['r'])
                metric   = f"r = {res['r']:.4f}"
                test     = 'Pearson'
            elif 'F' in res:
                strength = res['F']
                metric   = f"F = {res['F']:.4f}"
                test     = 'ANOVA'
            else:
                strength = res['chi2']
                metric   = f"χ² = {res['chi2']:.4f}"
                test     = 'Chi-Square'

            results.append({
                'feature':  col,
                'test':     test,
                'metric':   metric,
                'p_value':  round(res['p'], 6),
                'strength': strength,
            })
        except Exception:
            continue

    if not results:
        print(f"[rank_features_for_target] No significant features found for '{target}' at p < {p_threshold}.")
        return pd.DataFrame()

    ranked = (
        pd.DataFrame(results)
        .sort_values('strength', ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )

    print(f"\n{'='*52}")
    print(f"  TOP FEATURES FOR '{target}' (p < {p_threshold})")
    print(f"{'='*52}")
    print(ranked[['feature', 'test', 'metric', 'p_value']].to_string(index=False))

    return ranked


# ── Correlation Matrix ──────────────────────────────────────────────────────────

def get_correlation_matrix(df, columns=None, threshold=None):
    """
    Compute Pearson correlations between numeric columns.
    Chapter 8 — Multicollinearity check: if two features are highly correlated
    with each other (|r| > 0.8), including both gives the model redundant
    information and can destabilize coefficient estimates in linear models.

    Use the returned DataFrame to drive a heatmap in your notebook:
        corr = get_correlation_matrix(df)
        sns.heatmap(corr, annot=True, cmap='coolwarm', vmin=-1, vmax=1)

    Parameters:
        df (DataFrame): input data
        columns (list): specific columns to include (default: all numeric)
        threshold (float): if set, only prints pairs with |r| above this value

    Returns:
        DataFrame (correlation matrix)

    Examples:
        corr = get_correlation_matrix(df)
        corr = get_correlation_matrix(df, columns=['likes', 'shares', 'comments'])
        corr = get_correlation_matrix(df, threshold=0.7)
    """
    import pandas as pd

    if columns is None:
        columns = [c for c in df.columns if _is_numeric(df[c])]

    corr = df[columns].corr()

    if threshold is not None:
        print(f"\n[get_correlation_matrix] Pairs with |r| > {threshold}:")
        found = False
        for i in range(len(columns)):
            for j in range(i + 1, len(columns)):
                r = corr.iloc[i, j]
                if abs(r) > threshold:
                    print(f"  {columns[i]} ↔ {columns[j]}: r = {r:.4f}")
                    found = True
        if not found:
            print(f"  None found.")

    return corr