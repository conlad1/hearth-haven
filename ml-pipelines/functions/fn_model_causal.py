# fn_model_causal.py
# Causal (Explanatory) Modeling — MLR Diagnostics and Coefficient Extraction
# Covers: Chapter 9  (MLR concepts, coefficients, R², p-values)
#         Chapter 10 (Regression diagnostics: normality, VIF, autocorrelation,
#                     linearity, homoscedasticity)
#         Chapter 16 (VIF-based feature selection for causal models)
#
# WHY THIS FILE IS SEPARATE FROM fn_model_predict.py:
#   Causal and predictive pipelines have fundamentally different goals.
#   This file uses statsmodels (not sklearn) because statsmodels produces
#   the full coefficient table with p-values, standard errors, confidence
#   intervals, and diagnostic statistics. sklearn does not expose these.
#   Everything here answers "why does this happen and what can we do about
#   it?" — not "how accurately can we predict the next value?"
#
# TYPICAL WORKFLOW IN A CAUSAL PIPELINE:
#   1. Prepare data with fn_eda_custom.prepare_*()
#   2. Define features with fn_prepare.define_features()
#   3. One-hot encode X_train (statsmodels needs a plain numeric matrix)
#   4. check_vif() — drop multicollinear features iteratively
#   5. fit_causal_regression() or fit_causal_classification()
#   6. check_assumptions() — evaluate all five OLS assumptions
#   7. get_coefficients() — extract and interpret the coefficient table
#   8. (Regression) run_greedy_backward() for final feature refinement
#   8. (Classification) run_stepwise_pvalue() for final feature refinement
#
# NOTE ON ENCODING:
#   statsmodels requires a plain numeric matrix. Before calling fit_causal_*,
#   encode X_train with pd.get_dummies(X_train, drop_first=True) or use
#   sklearn's ColumnTransformer and convert the result to a DataFrame.
#   The helpers in this file handle constant addition internally.


# ── Model Fitting ──────────────────────────────────────────────────────────────

def fit_causal_regression(X_train, y_train):
    """
    Fit an OLS multiple linear regression model for causal/explanatory analysis.
    Chapter 9 — MLR for causal inference using statsmodels.

    Uses statsmodels OLS (not sklearn) because:
        - Produces p-values and standard errors for each coefficient
        - Reports R², Adjusted R², F-statistic for model-level significance
        - Reports Omnibus, Durbin-Watson, and condition number automatically
        - These are required for causal interpretation

    The constant (intercept) is added automatically inside this function.

    Robust handling:
        - Drops constant columns (zero variance) before fitting
        - Drops near-constant columns (> 99% identical values)
        - Raises a clear ValueError if the matrix is still singular after cleanup,
          rather than crashing with a cryptic numpy LinAlgError

    Parameters:
        X_train (DataFrame): numeric feature matrix (already encoded, no target)
        y_train (Series): continuous target vector

    Returns:
        results: fitted statsmodels RegressionResultsWrapper
                 call results.summary() to print the full output
                 pass to get_coefficients(), check_assumptions(), check_vif()

    Example:
        X_enc = pd.get_dummies(X_train, drop_first=True)
        results = fit_causal_regression(X_enc, y_train)
        print(results.summary())
        coef_df = get_coefficients(results)
        check_assumptions(results)
    """
    import statsmodels.api as sm
    import pandas as pd
    import numpy as np

    X = pd.DataFrame(X_train).copy()
    X = X.apply(pd.to_numeric, errors='coerce').fillna(0)

    # Drop constant columns — zero variance makes the matrix singular
    constant_cols = [c for c in X.columns if X[c].nunique() <= 1]
    if constant_cols:
        print(f"[fit_causal_regression] Dropping {len(constant_cols)} constant "
              f"column(s): {constant_cols}")
        X = X.drop(columns=constant_cols)

    # Drop near-constant columns — > 99% identical values add no information
    near_constant = [c for c in X.columns
                     if X[c].value_counts(normalize=True).iloc[0] > 0.99]
    if near_constant:
        print(f"[fit_causal_regression] Dropping {len(near_constant)} near-constant "
              f"column(s): {near_constant}")
        X = X.drop(columns=near_constant)

    if X.shape[1] == 0:
        raise ValueError(
            "[fit_causal_regression] No features remain after dropping constant "
            "and near-constant columns. Add more data or reduce feature count."
        )

    X_const = sm.add_constant(X, has_constant='add')

    try:
        results = sm.OLS(y_train, X_const).fit()
    except np.linalg.LinAlgError as e:
        raise ValueError(
            f"[fit_causal_regression] Singular matrix — the feature matrix is "
            f"still rank-deficient after cleanup. Try running check_vif() first "
            f"and removing high-VIF features, or reduce the number of features "
            f"relative to observations (n={len(y_train)}, p={X.shape[1]}).\n"
            f"Original error: {e}"
        ) from e

    print(f"\n[OK] fit_causal_regression() complete.")
    print(f"     R²: {results.rsquared:.4f}  |  Adj R²: {results.rsquared_adj:.4f}")
    print(f"     F-statistic: {results.fvalue:.4f}  |  p(F): {results.f_pvalue:.6f}")
    print(f"     Observations: {int(results.nobs)}  |  Features: {len(results.params) - 1}")
    print(f"     Call results.summary() for the full output.")
    print(f"     Fitted columns ({len(results.model.exog_names) - 1}): "
        f"{[c for c in results.model.exog_names if c != 'const']}")

    return results


def fit_causal_classification(X_train, y_train, max_iter=200):
    """
    Fit a Logistic Regression model for causal/explanatory classification.
    Chapter 9 — Logistic regression as the causal baseline for binary targets.

    Uses statsmodels Logit (not sklearn) for p-values, standard errors,
    and confidence intervals on each coefficient.

    Coefficient interpretation:
        Coefficients are in log-odds units.
        exp(coefficient) = odds ratio for a one-unit increase in that feature
        holding all others constant. An odds ratio of 1.5 means the odds of
        the positive class are 50% higher per one-unit increase.

    Robust handling:
        - Drops constant columns (zero variance) before fitting
        - Drops near-constant columns (> 99% identical values)
        - Tries 'bfgs' optimizer as fallback if Newton-Raphson fails
        - Raises a clear ValueError if the matrix is still singular after cleanup,
          rather than crashing with a cryptic numpy LinAlgError

    Parameters:
        X_train (DataFrame): numeric feature matrix (already encoded)
        y_train (Series): binary target (0/1)
        max_iter (int): maximum iterations for convergence (default 200)

    Returns:
        results: fitted statsmodels LogitResultsWrapper

    Example:
        X_enc = pd.get_dummies(X_train, drop_first=True)
        results = fit_causal_classification(X_enc, y_train)
        print(results.summary())
        coef_df = get_coefficients(results, model_type='logistic')
    """
    import statsmodels.api as sm
    import pandas as pd
    import numpy as np
    import warnings

    X = pd.DataFrame(X_train).copy()
    X = X.apply(pd.to_numeric, errors='coerce').fillna(0)

    # Drop constant columns — zero variance makes the matrix singular
    constant_cols = [c for c in X.columns if X[c].nunique() <= 1]
    if constant_cols:
        print(f"[fit_causal_classification] Dropping {len(constant_cols)} constant "
              f"column(s): {constant_cols}")
        X = X.drop(columns=constant_cols)

    # Drop near-constant columns — > 99% identical values add no information
    near_constant = [c for c in X.columns
                     if X[c].value_counts(normalize=True).iloc[0] > 0.99]
    if near_constant:
        print(f"[fit_causal_classification] Dropping {len(near_constant)} near-constant "
              f"column(s): {near_constant}")
        X = X.drop(columns=near_constant)

    if X.shape[1] == 0:
        raise ValueError(
            "[fit_causal_classification] No features remain after dropping constant "
            "and near-constant columns. Add more data or reduce feature count."
        )

    X_const = sm.add_constant(X, has_constant='add')

    # Try Newton-Raphson first, fall back to bfgs if it fails
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        try:
            results = sm.Logit(y_train, X_const).fit(
                maxiter=max_iter, disp=False, method='newton'
            )
        except (np.linalg.LinAlgError, Exception) as e_newton:
            print(f"[fit_causal_classification] Newton failed ({type(e_newton).__name__}), "
                  f"trying bfgs optimizer...")
            try:
                results = sm.Logit(y_train, X_const).fit(
                    maxiter=max_iter, disp=False, method='bfgs'
                )
                print("[fit_causal_classification] bfgs succeeded.")
            except np.linalg.LinAlgError as e:
                raise ValueError(
                    f"[fit_causal_classification] Singular matrix — the feature matrix "
                    f"is rank-deficient after cleanup. Try running check_vif() first "
                    f"and removing high-VIF features, or use SelectKBest to reduce "
                    f"features (n={len(y_train)}, p={X.shape[1]}).\n"
                    f"Original error: {e}"
                ) from e

    print(f"\n[OK] fit_causal_classification() complete.")
    print(f"     Pseudo R² (McFadden): {results.prsquared:.4f}")
    print(f"     Log-Likelihood: {results.llf:.4f}")
    print(f"     Observations: {int(results.nobs)}  |  Features: {len(results.params) - 1}")
    print(f"     Call results.summary() for the full output.")
    print(f"     Use get_coefficients(results, model_type='logistic') for odds ratios.")
    print(f"     Fitted columns ({len(results.model.exog_names) - 1}): "
        f"{[c for c in results.model.exog_names if c != 'const']}")

    return results


# ── Coefficient Extraction ─────────────────────────────────────────────────────

def get_coefficients(results, model_type='linear', p_threshold=0.05):
    """
    Extract the coefficient table from a fitted statsmodels results object.
    Chapter 9 — Interpreting MLR and Logistic Regression coefficients.

    For linear regression:
        coefficient = change in target per one-unit increase in that feature,
                      holding all other features constant.

    For logistic regression:
        coefficient = change in log-odds per one-unit increase.
        odds_ratio  = exp(coefficient) — more intuitive for business reporting.
        An odds ratio > 1 means higher odds of the positive class.

    Significance flags:
        ***  p < 0.001
        **   p < 0.01
        *    p < 0.05
        (ns) p >= 0.05 — not significant, interpret with caution

    Parameters:
        results: fitted statsmodels results object (OLS or Logit)
        model_type (str): 'linear' or 'logistic' (default 'linear')
        p_threshold (float): threshold for counting significant features (default 0.05)

    Returns:
        DataFrame: feature, coefficient, std_err, p_value, ci_lower, ci_upper,
                   significant, [odds_ratio if logistic]
                   Sorted by absolute coefficient, descending.
                   Constant excluded.

    Example:
        coef_df = get_coefficients(results)
        coef_df = get_coefficients(results, model_type='logistic')
    """
    import pandas as pd
    import numpy as np

    params  = results.params
    pvalues = results.pvalues
    bse     = results.bse
    conf    = results.conf_int()

    df = pd.DataFrame({
        'feature':     params.index,
        'coefficient': params.values,
        'std_err':     bse.values,
        'p_value':     pvalues.values,
        'ci_lower':    conf[0].values,
        'ci_upper':    conf[1].values,
    })

    df = df[df['feature'] != 'const'].copy()

    def _sig(p):
        if p < 0.001: return '***'
        if p < 0.01:  return '**'
        if p < 0.05:  return '*'
        return '(ns)'

    df['significant'] = df['p_value'].apply(_sig)

    if model_type == 'logistic':
        df['odds_ratio'] = np.exp(df['coefficient'])

    df = df.sort_values('coefficient', key=abs, ascending=False).reset_index(drop=True)

    sig_count = (df['p_value'] < p_threshold).sum()
    print(f"\n[OK] get_coefficients() — {len(df)} features, {sig_count} significant at p < {p_threshold}")
    if model_type == 'logistic':
        print(f"     Logistic model — 'odds_ratio' column = exp(coefficient)")
    print(f"\n{df.to_string(index=False)}")

    return df


# ── Multicollinearity ──────────────────────────────────────────────────────────

def check_vif(X_train, threshold=5.0):
    """
    Compute Variance Inflation Factor (VIF) for all features.
    Chapter 10 — Multicollinearity diagnostic.
    Chapter 16 — VIF-based feature selection for causal models.

    VIF measures how much a feature's variance is inflated by its correlation
    with all other features. A high VIF means the feature carries little
    independent information — it can largely be predicted from the others.

    This matters for causal modeling because high VIF causes:
        - Unstable coefficient estimates
        - Inflated standard errors → unreliable p-values
        - Difficulty attributing credit between correlated features

    VIF thresholds (from Chapter 16):
        VIF < 3:    Ideal for causal modeling
        VIF 3-5:    Moderate, often acceptable
        VIF 5-10:   Concern, investigate
        VIF > 10:   Severe, likely unreliable coefficients

    Expected high VIF (do NOT remove):
        - Polynomial terms (age, age²) — keep both per hierarchical principle
        - Interaction terms and their components — keep all
        - One-hot dummies from the same variable — expected

    Parameters:
        X_train (DataFrame): numeric feature matrix (already encoded)
        threshold (float): flag features above this VIF (default 5.0)

    Returns:
        DataFrame: feature, vif — sorted descending

    Example:
        vif_df = check_vif(X_train_encoded)
        X_clean = X_train_encoded.drop(columns=['problem_feature'])
        vif_df = check_vif(X_clean)  # repeat until clean
    """
    import pandas as pd
    import numpy as np
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    import warnings

    X = pd.DataFrame(X_train).copy()
    X = X.apply(pd.to_numeric, errors='coerce').fillna(0)

    vif_values = []
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore', category=RuntimeWarning)
        for i in range(X.shape[1]):
            try:
                vif = variance_inflation_factor(X.values, i)
            except Exception:
                vif = float('nan')
            vif_values.append(vif)

    vif_df = pd.DataFrame({
        'feature': X.columns,
        'vif':     vif_values,
    }).sort_values('vif', ascending=False).reset_index(drop=True)

    flagged = vif_df[vif_df['vif'] > threshold]

    print(f"\n[OK] check_vif() — {len(vif_df)} features (threshold={threshold})")
    print(f"\n{vif_df.to_string(index=False)}")

    if len(flagged) > 0:
        print(f"\n⚠️  {len(flagged)} features above VIF threshold of {threshold}:")
        for _, row in flagged.iterrows():
            vif_str = f"{row['vif']:.2f}" if not np.isinf(row['vif']) else "inf"
            print(f"     {row['feature']:40s}  VIF = {vif_str}")
        print(f"\n     Drop the highest-VIF feature, re-run check_vif(), repeat.")
        print(f"     Exception: polynomial/interaction terms — high VIF expected.")
    else:
        print(f"\n✅  No multicollinearity concerns above threshold {threshold}.")

    return vif_df


# ── Full Assumption Check ──────────────────────────────────────────────────────

def check_assumptions(results, dw_low=1.5, dw_high=2.5):
    """
    Run all five OLS regression assumption checks and print a verdict.
    Chapter 10 — MLR Diagnostics for causal inference.

    The five assumptions:
        1. Normality       — Omnibus test (high p = residuals approx normal)
        2. Multicollinearity — Condition Number (signal; use check_vif() for detail)
        3. Autocorrelation — Durbin-Watson (≈2 = no autocorrelation)
        4. Linearity       — |corr(residuals, fitted)| (low = no systematic curve)
        5. Homoscedasticity — Breusch-Pagan test (high p = constant variance)

    Verdicts:
        PASS — assumption holds
        WARN — mild violation, interpret with caution
        FAIL — violation is severe, coefficient interpretation unreliable

    These checks matter for causal modeling. For prediction, many violations
    are acceptable — see fn_model_predict.py.

    Parameters:
        results: fitted statsmodels OLS results object
        dw_low (float): lower Durbin-Watson bound for PASS (default 1.5)
        dw_high (float): upper Durbin-Watson bound for PASS (default 2.5)

    Returns:
        dict: {assumption: {'verdict', 'stat', 'note'}}
    """
    import numpy as np
    from statsmodels.stats.stattools import omni_normtest, durbin_watson
    from statsmodels.stats.diagnostic import het_breuschpagan

    verdicts = {}
    resid    = results.resid
    fitted   = results.fittedvalues

    print(f"\n{'='*56}")
    print(f"  REGRESSION ASSUMPTION DIAGNOSTICS")
    print(f"  (causal/explanatory modeling only)")
    print(f"{'='*56}")

    # 1. Normality
    omni_stat, omni_p = omni_normtest(resid)
    norm_v = 'PASS' if omni_p > 0.05 else ('WARN' if omni_p > 0.01 else 'FAIL')
    verdicts['normality'] = {'verdict': norm_v, 'stat': round(omni_p, 6),
        'note': f"Omnibus p={omni_p:.4f}"}
    print(f"\n1. Normality:          [{norm_v}]")
    print(f"   Omnibus stat={omni_stat:.3f}, p={omni_p:.4f}")
    if norm_v != 'PASS':
        print(f"   Fix: log-transform the target, or apply Yeo-Johnson transformation")

    # 2. Multicollinearity — Condition Number
    cond_no = results.condition_number
    mc_v = 'PASS' if cond_no < 100 else ('WARN' if cond_no < 1000 else 'FAIL')
    verdicts['multicollinearity'] = {'verdict': mc_v, 'stat': round(cond_no, 2),
        'note': f"Condition Number={cond_no:.1f}"}
    print(f"\n2. Multicollinearity:  [{mc_v}]")
    print(f"   Condition Number={cond_no:.1f}")
    if mc_v != 'PASS':
        print(f"   Fix: run check_vif(), drop features above threshold iteratively")

    # 3. Autocorrelation — Durbin-Watson
    dw = durbin_watson(resid)
    ac_v = 'PASS' if dw_low <= dw <= dw_high else ('WARN' if 1.0 <= dw <= 3.0 else 'FAIL')
    verdicts['autocorrelation'] = {'verdict': ac_v, 'stat': round(dw, 4),
        'note': f"Durbin-Watson={dw:.4f}"}
    print(f"\n3. Autocorrelation:    [{ac_v}]")
    print(f"   Durbin-Watson={dw:.4f} (ideal ≈ 2.0)")
    if ac_v != 'PASS':
        print(f"   Fix: only relevant for time-series data. Check if rows are time-ordered.")

    # 4. Linearity
    resid_arr = np.array(resid, dtype=float)
    fit_arr   = np.array(fitted, dtype=float)
    lin_corr  = abs(np.corrcoef(resid_arr, fit_arr)[0, 1])
    lin_v = 'PASS' if lin_corr < 0.05 else ('WARN' if lin_corr < 0.15 else 'FAIL')
    verdicts['linearity'] = {'verdict': lin_v, 'stat': round(lin_corr, 4),
        'note': f"|corr(residuals, fitted)|={lin_corr:.4f}"}
    print(f"\n4. Linearity:          [{lin_v}]")
    print(f"   |corr(residuals, fitted)|={lin_corr:.4f}")
    if lin_v != 'PASS':
        print(f"   Fix: add polynomial terms (feature²) or log-transform skewed features")

    # 5. Homoscedasticity — Breusch-Pagan
    try:
        bp_stat, bp_p, _, _ = het_breuschpagan(resid, results.model.exog)
        hs_v = 'PASS' if bp_p > 0.05 else ('WARN' if bp_p > 0.01 else 'FAIL')
        verdicts['homoscedasticity'] = {'verdict': hs_v, 'stat': round(float(bp_p), 6),
            'note': f"Breusch-Pagan p={bp_p:.4f}"}
        print(f"\n5. Homoscedasticity:   [{hs_v}]")
        print(f"   Breusch-Pagan stat={bp_stat:.3f}, p={bp_p:.4f}")
        if hs_v != 'PASS':
            print(f"   Fix: use refit_with_robust_se() for HC3 robust standard errors")
    except Exception as e:
        verdicts['homoscedasticity'] = {'verdict': 'ERROR', 'stat': None, 'note': str(e)}
        print(f"\n5. Homoscedasticity:   [ERROR] — {e}")

    # Summary
    all_v  = [v['verdict'] for v in verdicts.values()]
    n_pass = all_v.count('PASS')
    n_warn = all_v.count('WARN')
    n_fail = all_v.count('FAIL')

    print(f"\n{'='*56}")
    print(f"  SUMMARY: {n_pass} PASS / {n_warn} WARN / {n_fail} FAIL")
    if n_fail > 0:
        print(f"  ⚠️  Address FAIL items before drawing causal conclusions.")
    elif n_warn > 0:
        print(f"  ⚠️  Interpret coefficients with caution.")
    else:
        print(f"  ✅  All assumptions pass — safe for causal interpretation.")
    print(f"{'='*56}")

    return verdicts


def refit_with_robust_se(results):
    """
    Refit the model with HC3 heteroscedasticity-robust standard errors.
    Chapter 10 — Responding to heteroscedasticity for causal inference.

    HC3 does NOT change coefficient estimates or fitted values.
    It adjusts standard errors to be more reliable when residual variance
    is unequal. Use when check_assumptions() returns FAIL/WARN for
    homoscedasticity and your goal is causal interpretation.

    Parameters:
        results: fitted statsmodels OLS results object

    Returns:
        results_hc3: same model with HC3-corrected standard errors

    Example:
        verdicts = check_assumptions(results)
        if verdicts['homoscedasticity']['verdict'] != 'PASS':
            results = refit_with_robust_se(results)
            coef_df = get_coefficients(results)
    """
    results_hc3 = results.get_robustcov_results(cov_type='HC3')
    print(f"\n[OK] refit_with_robust_se() — HC3 applied.")
    print(f"     Coefficients unchanged. Standard errors and p-values updated.")
    return results_hc3


# ── Feature Selection (Causal) ─────────────────────────────────────────────────

def run_greedy_backward(X_train, y_train, X_val, y_val,
                         numeric_features, categorical_features,
                         min_features=5):
    """
    Iteratively remove one feature at a time to minimize validation RMSE.
    Chapter 11 — Greedy Backward Feature Removal for regression.
    Chapter 16 — Feature selection for causal models.

    Why greedy backward for causal regression?
        Produces a parsimonious feature set where every remaining feature
        earned its place. Ideal for coefficient interpretation because the
        model is as simple as the data supports.

    Why NOT for predictive pipelines?
        O(n²) model fits — expensive. Use run_rfecv() from fn_model_predict.py
        instead, which is O(n) and integrates safely into cross-validation.

    Why a validation set instead of the test set?
        Using the test set to pick features is leakage. The validation set
        is carved from training data for these decisions. The test set stays
        locked until final evaluation.

    Parameters:
        X_train (DataFrame): training features (numeric, already encoded)
        y_train (Series): training target
        X_val (DataFrame): validation features (same encoding)
        y_val (Series): validation target
        numeric_features (list): original numeric column names
        categorical_features (list): original categorical column names
        min_features (int): stop removing when this many remain (default 5)

    Returns:
        trace (DataFrame): step, removed_feature, n_features, val_rmse
        optimal_features (list): features at the step with lowest val_rmse

    Example:
        from sklearn.model_selection import train_test_split
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_train, y_train, test_size=0.25, random_state=42
        )
        trace, optimal_features = run_greedy_backward(
            X_tr, y_tr, X_val, y_val,
            numeric_features=NUMERIC_FEATURES,
            categorical_features=CATEGORICAL_FEATURES
        )
    """
    import numpy as np
    import pandas as pd
    from sklearn.pipeline import Pipeline
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_squared_error
    import warnings

    def _score(features):
        num = [c for c in features if c in numeric_features]
        cat = [c for c in features if c in categorical_features]
        transformers = []
        if num:
            transformers.append(('num', Pipeline([
                ('imp', SimpleImputer(strategy='median')),
                ('sc',  StandardScaler()),
            ]), num))
        if cat:
            transformers.append(('cat', Pipeline([
                ('imp', SimpleImputer(strategy='most_frequent')),
                ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
            ]), cat))
        if not transformers:
            return float('inf')
        pipe = Pipeline([
            ('prep', ColumnTransformer(transformers, remainder='drop')),
            ('lr',   LinearRegression()),
        ])
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            pipe.fit(X_train[features], y_train)
            y_pred = pipe.predict(X_val[features])
        return np.sqrt(mean_squared_error(y_val, y_pred))

    current    = list(X_train.columns)
    trace_rows = []
    base_rmse  = _score(current)
    trace_rows.append({'step': 0, 'removed_feature': '(none)',
                       'n_features': len(current), 'val_rmse': base_rmse})

    print(f"\n[OK] run_greedy_backward() starting.")
    print(f"     Features: {len(current)}  |  Baseline val RMSE: {base_rmse:.4f}")

    step = 0
    while len(current) > min_features:
        step += 1
        best_f, best_rmse = None, float('inf')
        for f in current:
            rmse = _score([c for c in current if c != f])
            if rmse < best_rmse:
                best_f, best_rmse = f, rmse
        current.remove(best_f)
        trace_rows.append({'step': step, 'removed_feature': best_f,
                           'n_features': len(current), 'val_rmse': best_rmse})
        if step % 5 == 0 or step <= 3:
            print(f"     Step {step:3d}: removed '{best_f}' | "
                  f"{len(current)} left | RMSE={best_rmse:.4f}")

    trace        = pd.DataFrame(trace_rows)
    optimal_idx  = trace['val_rmse'].idxmin()
    optimal_step = int(trace.loc[optimal_idx, 'step'])  # type: ignore[arg-type]
    optimal_rmse = trace.loc[optimal_idx, 'val_rmse']

    all_features     = list(X_train.columns)
    optimal_features = all_features.copy()
    for i in range(1, optimal_step + 1):
        removed = trace.loc[trace['step'] == i, 'removed_feature'].values[0]
        if removed in optimal_features:
            optimal_features.remove(removed)

    print(f"\n[OK] run_greedy_backward() complete.")
    print(f"     Optimal: step {optimal_step} | {len(optimal_features)} features | RMSE={optimal_rmse:.4f}")
    print(f"     Optimal features: {optimal_features}")

    return trace, optimal_features


def run_stepwise_pvalue(X_train, y_train, p_threshold=0.05, model_type='linear'):
    """
    Iteratively remove the least significant feature until all remaining
    features are significant at p < p_threshold.
    Chapter 16 — Stepwise p-value selection for causal classification models.

    Use this for Logistic Regression causal pipelines where RMSE is not the
    right criterion. For regression targets, use run_greedy_backward() instead.

    Parameters:
        X_train (DataFrame): numeric feature matrix (already encoded)
        y_train (Series): target vector
        p_threshold (float): remove features above this p-value (default 0.05)
        model_type (str): 'linear' (OLS) or 'logistic' (Logit)

    Returns:
        results: final fitted statsmodels results with only significant features
        kept_features (list): feature names remaining in the final model

    Example:
        results, kept = run_stepwise_pvalue(X_enc, y_train, model_type='logistic')
        coef_df = get_coefficients(results, model_type='logistic')
    """
    import pandas as pd
    import statsmodels.api as sm
    import numpy as np
    import warnings

    X = pd.DataFrame(X_train).copy()
    X = X.apply(pd.to_numeric, errors='coerce').fillna(0)
    current = list(X.columns)

    print(f"\n[OK] run_stepwise_pvalue() starting.")
    print(f"     Model: {model_type}  |  p threshold: {p_threshold}  |  Features: {len(current)}")

    step = 0
    while True:
        X_cur = sm.add_constant(X[current], has_constant='add')
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            if model_type == 'linear':
                results = sm.OLS(y_train, X_cur).fit()
            else:
                try:
                    results = sm.Logit(y_train, X_cur).fit(maxiter=200, disp=False, method='newton')
                except np.linalg.LinAlgError:
                    results = sm.Logit(y_train, X_cur).fit(maxiter=200, disp=False, method='bfgs')

        pvals = results.pvalues.drop('const', errors='ignore')

        # Drop any features whose p-values are NaN (model failed to converge for them)
        nan_feats = pvals[pvals.isna()].index.tolist()
        if nan_feats:
            for f in nan_feats:
                current.remove(f)
                step += 1
                print(f"     Step {step}: removed '{f}' (NaN p-value, convergence failure) | {len(current)} remaining")
            if not current:
                break
            continue

        worst_feat   = pvals.idxmax()
        worst_p      = pvals.max()

        if worst_p <= p_threshold:
            break

        step += 1
        current.remove(worst_feat)
        print(f"     Step {step}: removed '{worst_feat}' (p={worst_p:.4f}) | {len(current)} remaining")

    print(f"\n[OK] run_stepwise_pvalue() complete — {len(current)} features remain.")
    for f in current:
        print(f"     {f:40s}  p={results.pvalues.get(f, float('nan')):.4f}")

    return results, current