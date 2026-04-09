# fn_plot.py
# EDA Visualization — Notebook Use Only
# Covers: Chapter 6 (Univariate Visualization),
#         Chapter 8 (Bivariate Relationship Visualization)
#
# ⚠️  NOTEBOOK ONLY — never import this file in a pipeline .py file.
#     These functions call matplotlib and seaborn and will fail or produce
#     unwanted output in non-interactive environments.
#
# All stat work (p-values, correlation coefficients, rankings) lives in
# fn_explore.py, which is pipeline-safe. This file is purely visual —
# it takes what fn_explore computes and shows it.
#
# Typical notebook workflow:
#   from fn_explore import summarize_dataframe, rank_features_for_target
#   from fn_plot import (plot_distribution, plot_target_rate,
#                        plot_correlation_heatmap, plot_scatter,
#                        plot_bivariate_summary)
#
#   num_df, cat_df = summarize_dataframe(df)
#   plot_distribution(df, 'engagement_rate')
#   plot_distribution(df, 'post_type', target='led_to_donation')
#   plot_target_rate(df, 'post_type', target='engagement_rate')
#   plot_correlation_heatmap(df)
#   plot_scatter(df, 'num_hashtags', 'engagement_rate')
#   plot_bivariate_summary(df, target='engagement_rate')   ← runs everything at once


# ── Univariate ─────────────────────────────────────────────────────────────────

def plot_distribution(df, column, target=None, bins=40, figsize=(10, 4)):
    """
    Plot the distribution of a single column.
    Chapter 6 — Univariate visualization.

    For numeric columns: histogram. If target is provided, overlays
    distributions split by target value (for binary classification targets).
    For categorical columns: horizontal bar chart of value counts.

    Parameters:
        df (DataFrame): input data
        column (str): column to plot
        target (str): optional binary target column to split numeric distributions by
        bins (int): number of histogram bins (default 40)
        figsize (tuple): figure size (default (10, 4))

    Examples:
        plot_distribution(df, 'engagement_rate')
        plot_distribution(df, 'engagement_rate', target='led_to_donation')
        plot_distribution(df, 'post_type')
    """
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=figsize)
    col = df[column]
    is_num = _is_numeric(col)

    if is_num:
        if target and target in df.columns and df[target].nunique() == 2:
            classes = df[target].unique()
            colors  = ['steelblue', 'crimson']
            for cls, color in zip(classes, colors):
                subset = df.loc[df[target] == cls, column].dropna()
                ax.hist(subset, bins=bins, alpha=0.55, color=color, label=str(cls))
            ax.legend(title=target)
            ax.set_title(f'{column} by {target}')
        else:
            ax.hist(col.dropna(), bins=bins, color='steelblue', edgecolor='white')
            ax.set_title(f'{column} distribution')
        ax.set_xlabel(column)
        ax.set_ylabel('Count')
    else:
        counts = col.value_counts().head(20)
        ax.barh(counts.index.astype(str), counts.values, color='steelblue')
        ax.set_xlabel('Count')
        ax.set_title(f'{column} value counts')
        ax.invert_yaxis()

    plt.tight_layout()
    plt.show()


def plot_distributions_all(df, bins=30, figsize_per=(5, 3)):
    """
    Plot distributions for every column in the DataFrame at once.
    Chapter 6 — Quick full-dataset visual sweep.

    Useful at the start of EDA to get a visual sense of every column
    before deciding which need cleaning or transformation.

    Parameters:
        df (DataFrame): input data
        bins (int): histogram bins for numeric columns (default 30)
        figsize_per (tuple): size per subplot (default (5, 3))
    """
    import matplotlib.pyplot as plt
    import math

    cols = list(df.columns)
    n    = len(cols)
    ncol = 3
    nrow = math.ceil(n / ncol)
    fig, axes = plt.subplots(nrow, ncol,
                             figsize=(figsize_per[0] * ncol, figsize_per[1] * nrow))
    axes = axes.flatten()

    for i, col in enumerate(cols):
        ax = axes[i]
        if _is_numeric(df[col]):
            ax.hist(df[col].dropna(), bins=bins, color='steelblue', edgecolor='white')
        else:
            counts = df[col].value_counts().head(10)
            ax.barh(counts.index.astype(str), counts.values, color='steelblue')
            ax.invert_yaxis()
        ax.set_title(col, fontsize=9)
        ax.tick_params(labelsize=7)

    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    plt.suptitle('Column Distributions', fontsize=12, y=1.01)
    plt.tight_layout()
    plt.show()


# ── Bivariate ──────────────────────────────────────────────────────────────────

def plot_target_rate(df, column, target, min_count=10, figsize=(10, 4)):
    """
    Bar chart of mean target value per category.
    Chapter 8 — Categorical feature vs. target visualization.

    For classification targets: shows positive class rate per category.
    For regression targets: shows mean target value per category.
    Color intensity encodes the magnitude — darker = higher rate.

    Pairs with: fn_explore.compute_target_rate_by_category()

    Parameters:
        df (DataFrame): input data
        column (str): categorical feature to plot
        target (str): target column (binary or continuous)
        min_count (int): minimum rows in a category to include (default 10)
        figsize (tuple): figure size (default (10, 4))

    Examples:
        plot_target_rate(df, 'post_type', 'donation_referrals')
        plot_target_rate(df, 'platform', 'engagement_rate')
        plot_target_rate(df, 'sentiment_tone', 'led_to_donation')
    """
    import matplotlib.pyplot as plt
    import matplotlib.cm as cm
    import numpy as np

    counts = df[column].value_counts()
    valid  = counts[counts >= min_count].index
    subset = df[df[column].isin(valid)]
    rates  = subset.groupby(column)[target].mean().sort_values(ascending=False)

    fig, ax = plt.subplots(figsize=figsize)
    norm    = rates.values / rates.values.max() if rates.values.max() > 0 else rates.values
    colors  = cm.Blues(0.3 + 0.6 * norm)
    ax.barh(rates.index.astype(str), rates.values, color=colors)
    ax.set_xlabel(f'Mean {target}')
    ax.set_title(f'Mean {target} by {column}')
    ax.invert_yaxis()
    plt.tight_layout()
    plt.show()


def plot_scatter(df, col1, col2, alpha=0.3, figsize=(8, 5)):
    """
    Scatter plot with regression line for two numeric columns.
    Chapter 8 — Numeric-to-Numeric visualization.

    Pairs with: fn_explore.test_numeric_vs_numeric()

    Parameters:
        df (DataFrame): input data
        col1 (str): x-axis column
        col2 (str): y-axis column
        alpha (float): point transparency (default 0.3)
        figsize (tuple): figure size (default (8, 5))

    Example:
        plot_scatter(df, 'num_hashtags', 'engagement_rate')
        plot_scatter(df, 'caption_length', 'donation_referrals')
    """
    import matplotlib.pyplot as plt
    import numpy as np
    from scipy import stats

    temp = df[[col1, col2]].dropna()
    x, y = temp[col1], temp[col2]

    fig, ax = plt.subplots(figsize=figsize)
    ax.scatter(x, y, alpha=alpha, color='steelblue', s=20)

    if len(x) > 1:
        m, b, r, p, _ = stats.linregress(x, y)
        x_line = np.linspace(x.min(), x.max(), 100)
        ax.plot(x_line, m * x_line + b, color='crimson', linewidth=1.5,
                label=f'r={r:.3f}, p={p:.4f}')
        ax.legend()

    ax.set_xlabel(col1)
    ax.set_ylabel(col2)
    ax.set_title(f'{col1} vs {col2}')
    plt.tight_layout()
    plt.show()


def plot_boxplot(df, numeric_col, categorical_col, figsize=(10, 5)):
    """
    Box plots of a numeric column split by categories.
    Chapter 8 — Numeric-to-Categorical visualization.

    Pairs with: fn_explore.test_numeric_vs_categorical()
    Useful for visualizing ANOVA results — shows whether group means differ
    and how much overlap exists between distributions.

    Parameters:
        df (DataFrame): input data
        numeric_col (str): the numeric column (y-axis)
        categorical_col (str): the grouping column (x-axis)
        figsize (tuple): figure size (default (10, 5))

    Example:
        plot_boxplot(df, 'engagement_rate', 'post_type')
        plot_boxplot(df, 'donation_referrals', 'platform')
    """
    import matplotlib.pyplot as plt

    temp   = df[[numeric_col, categorical_col]].dropna()
    groups = sorted(temp[categorical_col].unique())
    data   = [temp.loc[temp[categorical_col] == g, numeric_col] for g in groups]

    fig, ax = plt.subplots(figsize=figsize)
    ax.boxplot(data, labels=[str(g) for g in groups], patch_artist=True,
               boxprops=dict(facecolor='steelblue', alpha=0.6))
    ax.set_xlabel(categorical_col)
    ax.set_ylabel(numeric_col)
    ax.set_title(f'{numeric_col} by {categorical_col}')
    plt.xticks(rotation=30, ha='right')
    plt.tight_layout()
    plt.show()


def plot_crosstab_heatmap(df, col1, col2, normalize=False, figsize=(9, 6)):
    """
    Heatmap of a contingency table between two categorical columns.
    Chapter 8 — Categorical-to-Categorical visualization.

    Pairs with: fn_explore.test_categorical_vs_categorical()

    Parameters:
        df (DataFrame): input data
        col1 (str): row categories
        col2 (str): column categories
        normalize (bool): if True, shows row proportions instead of counts
        figsize (tuple): figure size (default (9, 6))

    Example:
        plot_crosstab_heatmap(df, 'platform', 'post_type')
        plot_crosstab_heatmap(df, 'sentiment_tone', 'has_call_to_action', normalize=True)
    """
    import matplotlib.pyplot as plt
    import pandas as pd

    temp = df[[col1, col2]].dropna()
    ct   = pd.crosstab(temp[col1], temp[col2])
    if normalize:
        ct = ct.div(ct.sum(axis=1), axis=0).round(3)

    fig, ax = plt.subplots(figsize=figsize)
    fmt = '.2f' if normalize else 'd'
    im  = ax.imshow(ct.values, cmap='Blues', aspect='auto')
    plt.colorbar(im, ax=ax)

    ax.set_xticks(range(len(ct.columns)))
    ax.set_yticks(range(len(ct.index)))
    ax.set_xticklabels(ct.columns.astype(str), rotation=35, ha='right', fontsize=9)
    ax.set_yticklabels(ct.index.astype(str), fontsize=9)

    for i in range(len(ct.index)):
        for j in range(len(ct.columns)):
            val = ct.values[i, j]
            label = f'{val:{fmt}}'
            ax.text(j, i, label, ha='center', va='center', fontsize=8,
                    color='white' if val > ct.values.max() * 0.6 else 'black')

    ax.set_xlabel(col2)
    ax.set_ylabel(col1)
    ax.set_title(f'{col1} vs {col2}' + (' (row proportions)' if normalize else ' (counts)'))
    plt.tight_layout()
    plt.show()


def plot_correlation_heatmap(df, columns=None, figsize=(12, 9)):
    """
    Heatmap of Pearson correlations between numeric columns.
    Chapter 8 — Multicollinearity check.

    Pairs with: fn_explore.get_correlation_matrix()
    High |r| between two *features* (not target) signals multicollinearity —
    both columns carry nearly the same information and you may only need one.

    Parameters:
        df (DataFrame): input data
        columns (list): specific columns to include (default: all numeric)
        figsize (tuple): figure size (default (12, 9))

    Example:
        plot_correlation_heatmap(df)
        plot_correlation_heatmap(df, columns=['likes', 'shares', 'comments',
                                              'engagement_rate', 'donation_referrals'])
    """
    import matplotlib.pyplot as plt

    if columns is None:
        columns = [c for c in df.columns if _is_numeric(df[c])]

    corr = df[columns].corr()

    fig, ax = plt.subplots(figsize=figsize)
    im = ax.imshow(corr.values, cmap='coolwarm', vmin=-1, vmax=1, aspect='auto')
    plt.colorbar(im, ax=ax)

    ax.set_xticks(range(len(columns)))
    ax.set_yticks(range(len(columns)))
    ax.set_xticklabels(columns, rotation=45, ha='right', fontsize=8)
    ax.set_yticklabels(columns, fontsize=8)

    for i in range(len(columns)):
        for j in range(len(columns)):
            val = corr.values[i, j]
            ax.text(j, i, f'{val:.2f}', ha='center', va='center', fontsize=7,
                    color='white' if abs(val) > 0.6 else 'black')

    ax.set_title('Correlation Matrix')
    plt.tight_layout()
    plt.show()


# ── Bivariate Summary (Controller) ─────────────────────────────────────────────

def plot_bivariate_summary(df, target, top_n=15, p_threshold=0.05, min_count=10):
    """
    Run all bivariate visualizations for every significant feature vs. the target.
    Chapter 8 — Controller function: runs the full bivariate EDA sweep.

    For each significant feature (p < p_threshold from fn_explore.rank_features_for_target):
        numeric feature → scatter plot
        categorical feature → target rate bar chart

    Also prints the ranked feature table from fn_explore.

    This is the function to run in your notebook after summarize_dataframe()
    when you want a complete picture of what's related to your target.

    Parameters:
        df (DataFrame): input data (cleaned, pre-split)
        target (str): the column you want to predict
        top_n (int): how many top features to plot (default 15)
        p_threshold (float): significance threshold (default 0.05)
        min_count (int): minimum category count for target rate charts (default 10)

    Examples:
        plot_bivariate_summary(df, 'engagement_rate')
        plot_bivariate_summary(df, 'donation_referrals', top_n=10)
        plot_bivariate_summary(df, 'led_to_donation')
    """
    from functions.fn_explore import rank_features_for_target

    print(f"\n{'='*52}")
    print(f"  BIVARIATE SUMMARY — target: '{target}'")
    print(f"{'='*52}\n")

    ranked = rank_features_for_target(df, target, p_threshold=p_threshold, top_n=top_n)

    if ranked.empty:
        print("No significant features found — nothing to plot.")
        return

    for _, row in ranked.iterrows():
        feature = row['feature']
        if feature not in df.columns or feature == target:
            continue
        if _is_numeric(df[feature]):
            plot_scatter(df, feature, target)
        else:
            plot_target_rate(df, feature, target, min_count=min_count)


# ── Missing Value Map ──────────────────────────────────────────────────────────

def plot_missing_heatmap(df, figsize=(12, 6)):
    """
    Visualize missing values across all columns as a heatmap.
    Chapter 6 — Missing data visualization.

    Each cell is colored by whether it is null. Useful for spotting
    structural patterns in missingness — e.g. video_views being null
    for all non-video posts will show a clean vertical band.

    Parameters:
        df (DataFrame): input data
        figsize (tuple): figure size (default (12, 6))

    Example:
        plot_missing_heatmap(df)
    """
    import matplotlib.pyplot as plt
    import numpy as np

    fig, ax = plt.subplots(figsize=figsize)
    mask = df.isnull()

    im = ax.imshow(mask.T.values, cmap='RdYlGn_r', aspect='auto',
                   vmin=0, vmax=1, interpolation='nearest')
    plt.colorbar(im, ax=ax, label='Missing (1) vs Present (0)', shrink=0.5)

    ax.set_yticks(range(len(df.columns)))
    ax.set_yticklabels(df.columns, fontsize=8)
    ax.set_xlabel('Row index')
    ax.set_title('Missing Value Map (red = missing)')

    missing_pcts = mask.mean().round(3)
    for i, (col, pct) in enumerate(missing_pcts.items()):
        if pct > 0:
            ax.text(len(df) + 1, i, f'{pct:.1%}', va='center', fontsize=7, color='gray')

    plt.tight_layout()
    plt.show()


# ── Helper ─────────────────────────────────────────────────────────────────────

def _is_numeric(col):
    import numpy as np
    import pandas as pd
    return pd.api.types.is_numeric_dtype(col) and col.dtype != bool and col.dtype != np.bool_