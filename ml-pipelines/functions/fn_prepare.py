# fn_prepare.py
# Modeling Preparation — Feature Definition, Splitting, Preprocessing, Pipeline Building
# Covers: Chapter 11 (sklearn Pipelines, Train/Test Splits),
#         Chapter 12 (Decision Trees),
#         Chapter 13 (Classification, class imbalance),
#         Chapter 14 (Ensemble Methods)
#
# LEAKAGE PREVENTION — enforced by structure, not warnings:
#
#   1. define_features()         — separates X and y, makes feature lists explicit
#   2. split_data()              — locks away the test set BEFORE any preprocessing
#   3. build_preprocessor()      — returns an UNFITTED transformer
#   4. build_*_pipeline()        — wraps the unfitted preprocessor inside each model
#
# The preprocessor is NEVER fit here. sklearn fits it inside each Pipeline
# during cross-validation, so it only ever sees training fold data.
#
# TWO USAGE MODES:
#
#   EXPLORATION (pipeline_exploration.py) — no DROP_ALWAYS needed:
#       X, y = define_features(df, target='length_of_stay_days',
#                              numeric=NUMERIC, categorical=CATEGORICAL,
#                              exclude_targets=['risk_escalated', 'reintegration_achieved'])
#
#   COMMITTED PIPELINE — use full drop list from fn_eda_custom.py:
#       X, y = define_features(df, target='led_to_donation',
#                              numeric=NUMERIC, categorical=CATEGORICAL,
#                              drop_cols=DROP['led_to_donation'])
#
#   BOTH MODES share the same split → preprocessor → pipeline workflow:
#       X_train, X_test, y_train, y_test = split_data(X, y, stratify=True)
#       preprocessor = build_preprocessor(NUMERIC, CATEGORICAL)
#       pipelines    = build_pipelines(preprocessor, problem_type='classification')


# ── Feature Definition ─────────────────────────────────────────────────────────

def define_features(df, target, numeric, categorical,
                    drop_cols=None, exclude_targets=None):
    """
    Define the feature matrix X and target vector y from a prepared DataFrame.
    Chapter 11 — the first formal step of any modeling workflow.

    Supports two modes:
        EXPLORATION: pass exclude_targets (list of other target columns to drop).
                     No need to touch DROP_ALWAYS or fn_eda_custom.py.
                     Use this in pipeline_exploration.py to try new pipeline ideas.

        COMMITTED:   pass drop_cols (the full per-target drop list from DROP_ALWAYS).
                     Use this in final pipeline .py files.

    Both modes:
        1. Remove leaky / irrelevant columns from the feature lists
        2. Drop rows where the target is unknown
        3. Return X (features only) and y (target only)

    Parameters:
        df (DataFrame): cleaned, model-ready DataFrame from prepare_*()
        target (str): column to predict
        numeric (list): numeric feature column names
        categorical (list): categorical feature column names
        drop_cols (list): full drop list for committed pipelines (from DROP_ALWAYS)
        exclude_targets (list): other target columns to auto-drop during exploration.
                                Combined with drop_cols if both are provided.

    Returns:
        X (DataFrame): feature matrix
        y (Series): target vector

    Examples:
        # Exploration mode — no DROP_ALWAYS needed
        X, y = define_features(df, target='length_of_stay_days',
                               numeric=NUMERIC, categorical=CATEGORICAL,
                               exclude_targets=['risk_escalated',
                                               'reintegration_achieved',
                                               'progress_percent_latest',
                                               'current_risk_num'])

        # Committed pipeline mode
        X, y = define_features(df, target='led_to_donation',
                               numeric=NUMERIC, categorical=CATEGORICAL,
                               drop_cols=DROP['led_to_donation'])
    """
    drop_cols       = list(drop_cols or [])
    exclude_targets = list(exclude_targets or [])

    # Combine both drop sources — exclude_targets supplements drop_cols
    all_drops = list(set(drop_cols + exclude_targets))

    # Always remove the target itself from the drop list if it snuck in
    if target in all_drops:
        all_drops.remove(target)

    flagged = [c for c in all_drops if c in numeric + categorical]
    if flagged:
        print(f"[define_features] Removing from feature lists: {flagged}")

    numeric_clean     = [c for c in numeric     if c not in all_drops]
    categorical_clean = [c for c in categorical if c not in all_drops]
    all_features      = numeric_clean + categorical_clean

    missing = [c for c in all_features if c not in df.columns]
    if missing:
        raise ValueError(f"[define_features] Missing from DataFrame: {missing}")

    if target not in df.columns:
        raise ValueError(f"[define_features] Target '{target}' not found.")

    df_known = df.dropna(subset=[target])
    dropped  = len(df) - len(df_known)
    if dropped > 0:
        print(f"[define_features] Dropped {dropped} rows with missing target.")

    X = df_known[all_features].copy()
    y = df_known[target].copy()

    print(f"\n[OK] define_features() complete.")
    print(f"     Target : '{target}'  |  Mean: {y.mean():.4f}  |  Rows: {len(y)}")
    print(f"     Numeric ({len(numeric_clean)}), Categorical ({len(categorical_clean)})")
    if exclude_targets:
        print(f"     Exploration mode — excluded targets: {exclude_targets}")
    if drop_cols:
        print(f"     Committed mode — {len(drop_cols)} columns in drop list")

    return X, y


# ── Train/Test Split ───────────────────────────────────────────────────────────

def split_data(X, y, test_size=0.20, random_state=42, stratify=True):
    """
    Split data into training and test sets before any preprocessing.
    Chapter 11 — Train/Test Splits.

    The test set is locked away immediately and never used until final evaluation.
    The preprocessor is fit on training data only, inside each sklearn Pipeline.

    stratify=True  — CLASSIFICATION: preserves class proportions in both splits.
                     Essential for imbalanced targets (e.g. 7.6% positive).
    stratify=False — REGRESSION: y is continuous, sklearn cannot stratify on it.

    Parameters:
        X (DataFrame): feature matrix from define_features()
        y (Series): target vector from define_features()
        test_size (float): proportion held out for testing (default 0.20)
        random_state (int): reproducibility seed (default 42)
        stratify (bool): True for classification, False for regression

    Returns:
        X_train, X_test, y_train, y_test
    """
    from sklearn.model_selection import train_test_split

    stratify_arg = y if stratify else None

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_arg
    )

    print(f"\n[OK] split_data() complete.")
    print(f"     Train : {X_train.shape[0]} rows  |  Target mean: {y_train.mean():.4f}")
    print(f"     Test  : {X_test.shape[0]} rows   |  Target mean: {y_test.mean():.4f}")
    print(f"     {'Stratified' if stratify else 'Non-stratified'} split.")
    print(f"     Test set locked — do not touch until final evaluation.")

    return X_train, X_test, y_train, y_test


# ── Preprocessing ──────────────────────────────────────────────────────────────

def build_preprocessor(numeric_features, categorical_features):
    """
    Build an unfitted sklearn ColumnTransformer for scaling and encoding.
    Chapter 11 — sklearn Pipelines.

    What it builds:
        Numeric columns:
            SimpleImputer(median)  — fills remaining missing values with median.
                                     Robust to outliers unlike mean imputation.
            StandardScaler()       — rescales to mean=0, std=1.
                                     Required for linear models to compare
                                     coefficients fairly across features.

        Categorical columns:
            SimpleImputer(mode)    — fills remaining missing with most frequent.
            OneHotEncoder()        — converts categories to 0/1 dummy columns.
                                     handle_unknown='ignore' outputs all zeros
                                     for unseen categories at prediction time
                                     instead of crashing.

    Why return it UNFITTED? The preprocessor must be fit inside each Pipeline
    during cross-validation so it only ever sees training fold data. If you
    fit it here on all training data, every CV fold shares the same scaler —
    that is leakage. sklearn re-fits it automatically when it is inside a
    Pipeline.

    Parameters:
        numeric_features (list): numeric column names
        categorical_features (list): categorical column names

    Returns:
        preprocessor (ColumnTransformer): unfitted, ready for build_*_pipeline()

    Example:
        preprocessor = build_preprocessor(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    """
    from sklearn.pipeline import Pipeline
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.impute import SimpleImputer

    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler',  StandardScaler()),
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot',  OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(transformers=[
        ('num', numeric_transformer,     numeric_features),
        ('cat', categorical_transformer, categorical_features),
    ], remainder='drop')

    print(f"\n[OK] build_preprocessor() ready (unfitted).")
    print(f"     Numeric ({len(numeric_features)}): median impute → StandardScaler")
    print(f"     Categorical ({len(categorical_features)}): mode impute → OneHotEncoder")

    return preprocessor


# ── Individual Model Builders ──────────────────────────────────────────────────
#
# Each builder takes an unfitted preprocessor and returns a dict of Pipelines.
# The pipeline chains preprocessing → model so the preprocessor is always
# fit inside CV folds, never before them.
#
# Call these individually for fine-grained control over model parameters,
# or call build_pipelines() to get all candidate models at once.


def build_linear_regression_pipeline(preprocessor, random_state=42):
    """
    Build LinearRegression and Ridge regression pipelines.
    Chapter 11 — Linear regression as a predictive model.
    Chapter 9  — Linear regression as a causal baseline.

    LinearRegression: ordinary least squares, no regularization.
                      Use as the interpretable baseline — if a complex model
                      barely beats this, it may not be worth the complexity.

    Ridge:            L2 regularization (penalizes large coefficients).
                      Helps when features are correlated or the dataset is
                      small relative to the number of features. The alpha
                      parameter controls regularization strength — higher
                      alpha = stronger shrinkage. alpha=1.0 is a sensible
                      default; tune via GridSearch if needed.

    Note: Ridge is a closed-form solution with no randomness — random_state
    is accepted for API consistency but has no effect on Ridge itself.

    Note: for causal interpretation use fn_model_causal.py (statsmodels OLS)
    instead — sklearn LinearRegression does not produce p-values or standard
    errors needed for coefficient inference.

    Parameters:
        preprocessor: unfitted ColumnTransformer from build_preprocessor()
        random_state (int): accepted for API consistency, unused by linear models

    Returns:
        dict of {'LinearRegression': Pipeline, 'Ridge': Pipeline}
    """
    from sklearn.pipeline import Pipeline
    from sklearn.linear_model import LinearRegression, Ridge
    from sklearn.base import clone

    pipelines = {
        'LinearRegression': Pipeline(steps=[
            ('preprocessor', clone(preprocessor)),
            ('model',        LinearRegression()),
        ]),
        # Ridge does not accept random_state — it is a closed-form solution
        # with no randomness. Removed to avoid deprecation warnings.
        'Ridge': Pipeline(steps=[
            ('preprocessor', clone(preprocessor)),
            ('model',        Ridge(alpha=1.0)),
        ]),
    }

    print(f"[OK] build_linear_regression_pipeline(): LinearRegression, Ridge")
    return pipelines


def build_decision_tree_pipeline(preprocessor, problem_type='regression',
                                  max_depth=5, class_weight='balanced',
                                  random_state=42):
    """
    Build a Decision Tree pipeline for regression or classification.
    Chapter 12 — Decision Trees.

    Decision trees split the feature space into rectangular regions by asking
    yes/no questions about feature values. Each split tries to maximally
    separate the target values (regression: minimize variance, classification:
    minimize impurity). The result is a tree of if/else rules.

    Why include decision trees?
        - Fully interpretable: you can print the tree and read every decision
        - No scaling required (but scaling inside the pipeline does not hurt)
        - Natural baseline between linear models and ensemble methods
        - Foundation for Random Forest and Gradient Boosting (Ch 14)

    Why max_depth=5? Unconstrained trees overfit badly — they memorize
    training data rather than learning patterns. max_depth=5 is a reasonable
    default that balances fit and generalization. Tune via GridSearch.

    class_weight: applies to classification only. 'balanced' adjusts for
        class imbalance the same way as LogisticRegression and RandomForest.
        Set to None for balanced classification targets or any regression.

    Parameters:
        preprocessor: unfitted ColumnTransformer from build_preprocessor()
        problem_type (str): 'regression' or 'classification'
        max_depth (int): maximum tree depth — tune via GridSearch (default 5)
        class_weight: 'balanced', None, or dict. Only applies to classification.
        random_state (int): reproducibility seed (default 42)

    Returns:
        dict of {'DecisionTree': Pipeline}
    """
    from sklearn.pipeline import Pipeline
    from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
    from sklearn.base import clone

    if problem_type == 'regression':
        model = DecisionTreeRegressor(
            max_depth=max_depth,
            random_state=random_state,
        )
    elif problem_type == 'classification':
        # class_weight added: DecisionTreeClassifier supports it and it matters
        # for imbalanced targets like led_to_donation (7.6%) and risk_escalated.
        model = DecisionTreeClassifier(
            max_depth=max_depth,
            class_weight=class_weight,
            random_state=random_state,
        )
    else:
        raise ValueError(f"problem_type must be 'regression' or 'classification'.")

    pipelines = {
        'DecisionTree': Pipeline(steps=[
            ('preprocessor', clone(preprocessor)),
            ('model',        model),
        ])
    }

    cw_note = f", class_weight={class_weight}" if problem_type == 'classification' else ""
    print(f"[OK] build_decision_tree_pipeline(): DecisionTree ({problem_type}, max_depth={max_depth}{cw_note})")
    return pipelines


def build_random_forest_pipeline(preprocessor, problem_type='regression',
                                   n_estimators=200, max_depth=None,
                                   class_weight='balanced', random_state=42):
    """
    Build a Random Forest pipeline for regression or classification.
    Chapter 14 — Ensemble Methods: Bagging.

    Random Forest trains many decision trees independently, each on a random
    subset of rows (bootstrap sample) and a random subset of features at each
    split. Predictions are averaged (regression) or voted (classification).

    Why this works better than one tree:
        Each tree is trained on different data and sees different features,
        so the trees make different mistakes. Averaging their predictions
        cancels out individual errors — this is called variance reduction.
        The result is a model that generalizes far better than any single tree.

    class_weight='balanced': for imbalanced classification targets, the model
        weights minority class errors more heavily, proportional to class
        frequency. Prevents the model from predicting the majority class
        for everything just to maximize accuracy.
        Set class_weight=None for regression or balanced classification targets.

    n_estimators=200: more trees = more stable predictions, with diminishing
        returns after ~200. Tune down to 100 if runtime is a concern.

    max_depth=None: trees grow until pure (fully fit training data). Unlike
        single decision trees, Random Forest handles this without severe
        overfitting because of the averaging effect. Tune if needed.

    Parameters:
        preprocessor: unfitted ColumnTransformer from build_preprocessor()
        problem_type (str): 'regression' or 'classification'
        n_estimators (int): number of trees (default 200)
        max_depth (int or None): max tree depth, None = unlimited (default None)
        class_weight: 'balanced', None, or dict. Only applies to classification.
        random_state (int): reproducibility seed (default 42)

    Returns:
        dict of {'RandomForest': Pipeline}
    """
    from sklearn.pipeline import Pipeline
    from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
    from sklearn.base import clone

    if problem_type == 'regression':
        model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
            n_jobs=-1,
        )
    elif problem_type == 'classification':
        model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            class_weight=class_weight,
            random_state=random_state,
            n_jobs=-1,
        )
    else:
        raise ValueError(f"problem_type must be 'regression' or 'classification'.")

    pipelines = {
        'RandomForest': Pipeline(steps=[
            ('preprocessor', clone(preprocessor)),
            ('model',        model),
        ])
    }

    cw_note = f", class_weight={class_weight}" if problem_type == 'classification' else ""
    print(f"[OK] build_random_forest_pipeline(): RandomForest ({problem_type}{cw_note})")
    return pipelines


def build_gradient_boosting_pipeline(preprocessor, problem_type='regression',
                                      n_estimators=200, learning_rate=0.05,
                                      max_depth=5, random_state=42):
    """
    Build a Gradient Boosting pipeline for regression or classification.
    Chapter 14 — Ensemble Methods: Boosting.

    Gradient Boosting trains trees sequentially. Each new tree focuses on the
    rows where the previous model made the largest errors — it learns the
    residuals. The final prediction is the sum of all trees' contributions.

    Boosting vs Bagging (Random Forest):
        Bagging:  trees are independent, errors averaged out → low variance
        Boosting: trees are sequential, errors corrected → low bias
        In practice, Gradient Boosting often achieves higher accuracy but
        requires more careful tuning and is slower to train.

    Key parameters:
        learning_rate: how much each tree contributes. Lower = more trees
                       needed but better generalization. 0.05 is a good default.
        n_estimators:  number of sequential trees. More trees with lower
                       learning_rate is usually better than fewer with higher.
        max_depth:     unlike Random Forest, boosting trees should be shallow
                       (3-6). Deep trees in boosting overfit quickly.

    Note: GradientBoostingClassifier does not support class_weight directly.
    For imbalanced classification, the primary imbalance-aware option in this
    file is RandomForest with class_weight='balanced'. GradientBoosting is
    included as a high-accuracy candidate — compare its CV performance against
    RandomForest to decide if the lack of class_weight handling matters for
    your specific target.

    Parameters:
        preprocessor: unfitted ColumnTransformer from build_preprocessor()
        problem_type (str): 'regression' or 'classification'
        n_estimators (int): number of boosting stages (default 200)
        learning_rate (float): shrinkage applied to each tree (default 0.05)
        max_depth (int): max depth of each tree (default 5)
        random_state (int): reproducibility seed (default 42)

    Returns:
        dict of {'GradientBoosting': Pipeline}
    """
    from sklearn.pipeline import Pipeline
    from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
    from sklearn.base import clone

    if problem_type == 'regression':
        model = GradientBoostingRegressor(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            random_state=random_state,
        )
    elif problem_type == 'classification':
        model = GradientBoostingClassifier(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            random_state=random_state,
        )
    else:
        raise ValueError(f"problem_type must be 'regression' or 'classification'.")

    pipelines = {
        'GradientBoosting': Pipeline(steps=[
            ('preprocessor', clone(preprocessor)),
            ('model',        model),
        ])
    }

    print(f"[OK] build_gradient_boosting_pipeline(): GradientBoosting ({problem_type})")
    return pipelines


# ── Orchestrator ───────────────────────────────────────────────────────────────

def build_pipelines(preprocessor, problem_type='regression',
                    class_weight='balanced', random_state=42):
    """
    Build all candidate model pipelines for a given problem type.
    Calls each individual builder and merges results into one dict.
    Chapter 11-14 — complete candidate model set.

    This is the convenience function for exploration and quick comparisons.
    For final pipelines where you want fine-grained control over individual
    model parameters, call the individual builder functions directly.

    Regression pipelines built:
        LinearRegression, Ridge, DecisionTree, RandomForest, GradientBoosting

    Classification pipelines built:
        LogisticRegression, DecisionTree, RandomForest, GradientBoosting

    LogisticRegression is classification-only:
        The interpretable linear baseline for classification. Equivalent to
        LinearRegression's role in regression. class_weight='balanced' is
        applied by default for imbalanced targets.

    class_weight is passed to LogisticRegression, DecisionTreeClassifier,
    and RandomForestClassifier. GradientBoostingClassifier does not support
    it — see build_gradient_boosting_pipeline() docstring for details.

    Parameters:
        preprocessor: unfitted ColumnTransformer from build_preprocessor()
        problem_type (str): 'regression' or 'classification'
        class_weight: passed to classifiers that support it.
                      'balanced' (default) adjusts for class imbalance.
                      Set to None for balanced classification targets.
        random_state (int): reproducibility seed (default 42)

    Returns:
        dict of {model_name: Pipeline} — all unfitted, ready for CV

    Example:
        pipelines = build_pipelines(preprocessor, problem_type='classification')
        # Returns: LogisticRegression, DecisionTree, RandomForest, GradientBoosting
    """
    from sklearn.pipeline import Pipeline
    from sklearn.linear_model import LogisticRegression
    from sklearn.base import clone

    pipelines = {}

    if problem_type == 'regression':
        pipelines.update(build_linear_regression_pipeline(
            preprocessor, random_state))
        pipelines.update(build_decision_tree_pipeline(
            preprocessor, 'regression', random_state=random_state))
        pipelines.update(build_random_forest_pipeline(
            preprocessor, 'regression', random_state=random_state))
        pipelines.update(build_gradient_boosting_pipeline(
            preprocessor, 'regression', random_state=random_state))

    elif problem_type == 'classification':
        # Logistic Regression — classification-only linear baseline
        pipelines['LogisticRegression'] = Pipeline(steps=[
            ('preprocessor', clone(preprocessor)),
            ('model', LogisticRegression(
                class_weight=class_weight,
                max_iter=1000,
                random_state=random_state,
            )),
        ])
        # class_weight passed through to all classifiers that support it
        pipelines.update(build_decision_tree_pipeline(
            preprocessor, 'classification',
            class_weight=class_weight, random_state=random_state))
        pipelines.update(build_random_forest_pipeline(
            preprocessor, 'classification',
            class_weight=class_weight, random_state=random_state))
        # GradientBoosting does not support class_weight — see docstring
        pipelines.update(build_gradient_boosting_pipeline(
            preprocessor, 'classification', random_state=random_state))

    else:
        raise ValueError(f"problem_type must be 'regression' or 'classification'.")

    print(f"\n[OK] build_pipelines() complete — {len(pipelines)} {problem_type} pipelines:")
    for name in pipelines:
        print(f"     - {name}")

    return pipelines