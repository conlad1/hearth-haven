# fn_model_predict.py
# Predictive Modeling — Cross-Validation, Feature Selection, Tuning, Evaluation, Deployment
# Covers: Chapter 15 (Cross-Validation, Tuning, Model Selection)
#         Chapter 16 (RFECV, SelectFromModel, Permutation Importance)
#
# WHY THIS FILE IS SEPARATE FROM fn_model_causal.py:
#   Predictive modeling is evaluated by how well a model generalizes to new,
#   unseen data — not by whether its coefficients are interpretable.
#   This file uses sklearn throughout. Cross-validation, hyperparameter tuning,
#   and held-out test evaluation are the core tools.
#
# TYPICAL WORKFLOW IN A PREDICTIVE PIPELINE:
#   1. prepare_*() + define_features() + split_data() + build_preprocessor()
#      from fn_eda_custom.py and fn_prepare.py
#   2. build_pipelines() from fn_prepare.py → all candidate models
#   3. run_cross_validation()       which model wins with default settings?
#   4. run_rfecv()                  which features actually help? (optional)
#   5. run_select_from_model()      fast embedded alternative (optional)
#   6. run_permutation_importance() model-agnostic importance check (optional)
#   7. tune_model()                 GridSearch or RandomizedSearch on the winner
#   8. evaluate_final_model()       one shot on the locked test set
#   9. save_model()                 .pkl + metadata + metrics JSON


# ── Cross-Validation ───────────────────────────────────────────────────────────

def run_cross_validation(pipelines, X_train, y_train,
                          problem_type='classification',
                          n_splits=5, random_state=42):
    """
    Run stratified (classification) or standard (regression) k-fold
    cross-validation on all pipelines and return a comparison table.
    Chapter 15 — Cross-Validation: reliable performance estimation.

    Why cross-validation instead of a single train/test split?
        A single split gives one number. CV gives n_splits numbers — their
        mean is the expected performance, their std reveals stability.
        A model with mean=0.85, std=0.01 is more trustworthy than one with
        mean=0.87, std=0.08. Textbook rule: a difference smaller than
        ~2x the std is likely sampling noise, not a real performance difference.

    Metrics reported:
        Classification: roc_auc, f1, balanced_accuracy, average_precision
        Regression:     r2, rmse, mae

    Parameters:
        pipelines (dict): from build_pipelines() or individual builders
        X_train (DataFrame): training features
        y_train (Series): training target
        problem_type (str): 'classification' or 'regression'
        n_splits (int): number of CV folds (default 5)
        random_state (int): reproducibility seed (default 42)

    Returns:
        results (dict): {model_name: {metric: array of fold scores}}

    Example:
        results = run_cross_validation(pipelines, X_train, y_train,
                                       problem_type='classification')
    """
    from sklearn.model_selection import StratifiedKFold, KFold, cross_validate
    import numpy as np

    if problem_type == 'classification':
        cv      = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        scoring = {
            'roc_auc':           'roc_auc',
            'f1':                'f1',
            'balanced_accuracy': 'balanced_accuracy',
            'avg_precision':     'average_precision',
        }
        primary = 'roc_auc'
    else:
        cv      = KFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        scoring = {
            'r2':       'r2',
            'neg_rmse': 'neg_root_mean_squared_error',
            'neg_mae':  'neg_mean_absolute_error',
        }
        primary = 'r2'

    results = {}

    print(f"\n{'='*60}")
    print(f"  CROSS-VALIDATION ({n_splits}-fold, {problem_type})")
    print(f"{'='*60}")

    for name, pipe in pipelines.items():
        cv_out = cross_validate(
            pipe, X_train, y_train,
            cv=cv, scoring=scoring,
            return_train_score=False,
            n_jobs=-1,
        )
        results[name] = cv_out

        pvals    = cv_out[f'test_{primary}']
        sign     = -1 if primary.startswith('neg_') else 1
        pmean    = sign * np.mean(pvals)
        pstd     = np.std(pvals)
        stable   = 'stable' if pstd < 0.03 else 'unstable'

        print(f"\n  {name}")
        print(f"    {primary}: {pmean:.4f} +/- {pstd:.4f}  [{stable}]")

        for metric in scoring:
            if metric == primary:
                continue
            vals  = cv_out[f'test_{metric}']
            sign  = -1 if metric.startswith('neg_') else 1
            m     = sign * np.mean(vals)
            label = metric.replace('neg_', '')
            print(f"    {label:20s}: {m:.4f}")

    print(f"\n{'='*60}")
    print(f"  Tip: differences < 2x std are likely sampling noise.")
    print(f"  Prefer the simpler model when scores are within that range.")
    print(f"{'='*60}")

    return results


# ── Feature Selection (Predictive) ─────────────────────────────────────────────

def run_rfecv(preprocessor, X_train, y_train,
               numeric_features, categorical_features,
               problem_type='classification',
               n_splits=5, random_state=42):
    """
    Recursive Feature Elimination with Cross-Validation (RFECV).
    Chapter 16 — Wrapper method: finds the optimal feature subset by
    iteratively removing the weakest feature and measuring CV performance.

    RFECV vs greedy backward removal (from fn_model_causal.py):
        Greedy backward: O(n^2) fits, uses a validation set, best for
                         causal pipelines needing a clean coefficient set.
        RFECV:           O(n) fits per fold, integrates into CV safely,
                         best for predictive pipelines.

    Parameters:
        preprocessor: unfitted ColumnTransformer from build_preprocessor()
        X_train (DataFrame): training features
        y_train (Series): training target
        numeric_features (list): numeric column names
        categorical_features (list): categorical column names
        problem_type (str): 'classification' or 'regression'
        n_splits (int): CV folds (default 5, use 3 for speed)
        random_state (int): seed (default 42)

    Returns:
        selected_features (list): optimal original feature names
        rfecv: fitted RFECV object (contains cv_results_ for plotting)

    Example:
        selected, rfecv = run_rfecv(
            preprocessor, X_train, y_train,
            numeric_features=NUMERIC, categorical_features=CATEGORICAL,
            problem_type='classification'
        )
        X_train_sel = X_train[selected]
        X_test_sel  = X_test[selected]
    """
    import numpy as np
    from sklearn.base import clone
    from sklearn.feature_selection import RFECV
    from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
    from sklearn.model_selection import StratifiedKFold, KFold
    from sklearn.pipeline import Pipeline

    if problem_type == 'classification':
        estimator = GradientBoostingClassifier(
            n_estimators=50, max_depth=3, random_state=random_state)
        cv      = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        scoring = 'roc_auc'
    else:
        estimator = GradientBoostingRegressor(
            n_estimators=50, max_depth=3, random_state=random_state)
        cv      = KFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        scoring = 'r2'

    pipe = Pipeline([
        ('preprocessor', clone(preprocessor)),
        ('estimator',    estimator),
    ])

    print(f"\n[OK] run_rfecv() starting -- {X_train.shape[1]} original features")
    print(f"     {n_splits}-fold CV, scoring={scoring}. This may take a few minutes...")

    rfecv = RFECV(
        estimator=pipe,
        step=1,
        cv=cv,
        scoring=scoring,
        min_features_to_select=3,
        n_jobs=-1,
    )
    rfecv.fit(X_train, y_train)

    fitted_preprocessor = rfecv.estimator_.named_steps['preprocessor']
    try:
        cat_names = (fitted_preprocessor
                     .named_transformers_['cat']
                     .named_steps['onehot']
                     .get_feature_names_out(categorical_features).tolist())
    except Exception:
        cat_names = []
    feature_names = list(numeric_features) + cat_names

    selected_encoded = [f for f, s in zip(feature_names, rfecv.support_) if s]

    selected_numeric = [f for f in numeric_features if f in selected_encoded]
    selected_categorical = []
    for cat in categorical_features:
        if any(enc.startswith(cat + '_') or enc == cat for enc in selected_encoded):
            selected_categorical.append(cat)
    selected_original = selected_numeric + selected_categorical

    best_score = rfecv.cv_results_['mean_test_score'].max()
    print(f"\n[OK] run_rfecv() complete.")
    print(f"     Optimal: {rfecv.n_features_} encoded -> {len(selected_original)} original features")
    print(f"     Best CV {scoring}: {best_score:.4f}")
    print(f"     Selected: {selected_original}")

    return selected_original, rfecv


def run_select_from_model(preprocessor, X_train, y_train,
                           numeric_features, categorical_features,
                           problem_type='classification',
                           threshold='mean', random_state=42):
    """
    Embedded feature selection using tree-based MDI feature importances.
    Chapter 16 — SelectFromModel: keeps features above an importance threshold.

    Faster than RFECV: trains one model and uses internal importance scores.
    Use as a quick first pass. Validate results with run_permutation_importance().

    MDI caveats (from Chapter 16):
        - Biased toward high-cardinality features
        - Correlated features split importance between them
        - Importance does not equal causality

    Parameters:
        preprocessor: unfitted ColumnTransformer from build_preprocessor()
        X_train (DataFrame): training features
        y_train (Series): training target
        numeric_features (list): numeric column names
        categorical_features (list): categorical column names
        problem_type (str): 'classification' or 'regression'
        threshold (str or float): 'mean', 'median', or a float (default 'mean')
        random_state (int): seed (default 42)

    Returns:
        selected_features (list): original feature names above threshold
        importance_df (DataFrame): feature, importance -- sorted descending
    """
    import pandas as pd
    from sklearn.feature_selection import SelectFromModel
    from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor

    X_processed = preprocessor.fit_transform(X_train)

    try:
        cat_names = (preprocessor
                     .named_transformers_['cat']
                     .named_steps['onehot']
                     .get_feature_names_out(categorical_features).tolist())
    except Exception:
        cat_names = []
    feature_names = list(numeric_features) + cat_names

    if problem_type == 'classification':
        estimator = GradientBoostingClassifier(
            n_estimators=200, max_depth=3, random_state=random_state)
    else:
        estimator = GradientBoostingRegressor(
            n_estimators=200, max_depth=3, random_state=random_state)

    estimator.fit(X_processed, y_train)

    sfm     = SelectFromModel(estimator, prefit=True, threshold=threshold)
    support = sfm.get_support()

    importance_df = pd.DataFrame({
        'feature':    feature_names,
        'importance': estimator.feature_importances_,
    }).sort_values('importance', ascending=False).reset_index(drop=True)

    selected_encoded = [f for f, s in zip(feature_names, support) if s]
    selected_numeric = [f for f in numeric_features if f in selected_encoded]
    selected_categorical = []
    for cat in categorical_features:
        if any(enc.startswith(cat + '_') or enc == cat for enc in selected_encoded):
            selected_categorical.append(cat)
    selected_original = selected_numeric + selected_categorical

    print(f"\n[OK] run_select_from_model() complete (threshold='{threshold}').")
    print(f"     {len(selected_original)} original features selected.")
    print(f"\nTop 15 by MDI importance:")
    print(importance_df.head(15).to_string(index=False))
    print(f"\nSelected: {selected_original}")
    print(f"\n[Note] Validate MDI results with run_permutation_importance().")

    return selected_original, importance_df


def run_permutation_importance(pipeline, X_val, y_val,
                                feature_names=None,
                                n_repeats=10, random_state=42,
                                problem_type='classification'):
    """
    Compute permutation feature importance on a validation set.
    Chapter 16 -- model-agnostic importance: shuffle each feature, measure drop.

    Why PFI over MDI?
        Works with any model. Measures actual impact on held-out performance
        rather than training-time impurity reduction. Features whose shuffling
        causes no drop are not contributing to predictions on new data.

    IMPORTANT: pass X_val (a validation split from training), NOT X_test.
        Using X_test here is leakage -- save X_test for evaluate_final_model().

    Parameters:
        pipeline: a fitted sklearn Pipeline (already .fit() on training data)
        X_val (DataFrame): validation features
        y_val (Series): validation target
        feature_names (list): original feature names. If None, uses X_val.columns.
        n_repeats (int): shuffles per feature (default 10)
        random_state (int): seed (default 42)
        problem_type (str): 'classification' or 'regression'

    Returns:
        importance_df (DataFrame): feature, pfi_mean, pfi_std -- sorted descending

    Example:
        X_tr, X_val, y_tr, y_val = train_test_split(
            X_train, y_train, test_size=0.25, random_state=42)
        pipelines['RandomForest'].fit(X_tr, y_tr)
        imp_df = run_permutation_importance(
            pipelines['RandomForest'], X_val, y_val,
            feature_names=NUMERIC + CATEGORICAL,
            problem_type='classification'
        )
    """
    import pandas as pd
    from sklearn.inspection import permutation_importance

    scoring = 'roc_auc' if problem_type == 'classification' else 'r2'

    pfi = permutation_importance(
        pipeline, X_val, y_val,
        n_repeats=n_repeats,
        scoring=scoring,
        random_state=random_state,
        n_jobs=-1,
    )

    names = feature_names if feature_names is not None else list(X_val.columns)

    importance_df = pd.DataFrame({
        'feature':  names,
        'pfi_mean': pfi.importances_mean,
        'pfi_std':  pfi.importances_std,
    }).sort_values('pfi_mean', ascending=False).reset_index(drop=True)

    print(f"\n[OK] run_permutation_importance() -- {n_repeats} repeats, scoring={scoring}")
    print(f"\nTop 15 features (decrease in {scoring} when shuffled):")
    print(importance_df.head(15).to_string(index=False))

    near_zero = importance_df[importance_df['pfi_mean'] <= 0]
    if len(near_zero) > 0:
        print(f"\n[Note] {len(near_zero)} features with PFI <= 0 -- shuffling them doesn't hurt.")
        print(f"       Candidates for removal: {near_zero['feature'].tolist()}")

    return importance_df


# ── Hyperparameter Tuning ──────────────────────────────────────────────────────

def tune_model(pipeline, param_grid, X_train, y_train,
               problem_type='classification',
               search_type='random', n_iter=50,
               n_splits=5, random_state=42):
    """
    Tune a single pipeline using GridSearchCV or RandomizedSearchCV.
    Chapter 15 -- Hyperparameter Tuning.

    GridSearchCV vs RandomizedSearchCV:
        Grid:   exhaustive -- tests every combination. Use when you have
                <= 3 hyperparameters and narrow, well-informed ranges.
        Random: samples n_iter combinations. Use when you have many
                hyperparameters or wide ranges. Usually finds near-optimal
                results at a fraction of grid search cost.

    Common hyperparameter ranges (Chapter 15):
        LogisticRegression: C (1e-3 to 1e3, log scale)
        DecisionTree:       max_depth (2-20), min_samples_leaf (1-20)
        RandomForest:       n_estimators (50-500), max_depth (3-20)
        GradientBoosting:   n_estimators (50-500), learning_rate (0.01-0.3),
                            max_depth (2-8)

    param_grid keys must use the pipeline step prefix 'model__':
        {'model__max_depth': [3, 5, 7], 'model__n_estimators': [100, 200]}

    Parameters:
        pipeline: a single unfitted sklearn Pipeline from fn_prepare.py
        param_grid (dict): hyperparameter search space
        X_train (DataFrame): training features
        y_train (Series): training target
        problem_type (str): 'classification' or 'regression'
        search_type (str): 'grid' or 'random' (default 'random')
        n_iter (int): random combinations to try (default 50, random only)
        n_splits (int): CV folds (default 5)
        random_state (int): seed (default 42)

    Returns:
        best_pipeline: fitted Pipeline with best hyperparameters
        search: fitted search object (contains cv_results_)

    Example:
        param_grid = {
            'model__n_estimators':  [100, 200, 300],
            'model__max_depth':     [3, 5, 7, None],
            'model__learning_rate': [0.01, 0.05, 0.1],
        }
        best_pipe, search = tune_model(
            pipelines['GradientBoosting'], param_grid,
            X_train, y_train,
            problem_type='classification',
            search_type='random', n_iter=30
        )
    """
    from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, StratifiedKFold, KFold

    if problem_type == 'classification':
        cv      = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        scoring = 'roc_auc'
    else:
        cv      = KFold(n_splits=n_splits, shuffle=True, random_state=random_state)
        scoring = 'r2'

    print(f"\n[OK] tune_model() -- {search_type}Search, scoring={scoring}")

    if search_type == 'grid':
        n_combos = 1
        for v in param_grid.values():
            try:
                n_combos *= len(v)
            except TypeError:
                n_combos *= 10
        print(f"     ~{n_combos} combinations x {n_splits} folds = ~{n_combos * n_splits} fits")
        search = GridSearchCV(
            estimator=pipeline, param_grid=param_grid,
            cv=cv, scoring=scoring, n_jobs=-1, refit=True,
        )
    else:
        print(f"     {n_iter} iterations x {n_splits} folds = {n_iter * n_splits} fits")
        search = RandomizedSearchCV(
            estimator=pipeline, param_distributions=param_grid,
            n_iter=n_iter, cv=cv, scoring=scoring,
            n_jobs=-1, random_state=random_state, refit=True,
        )

    search.fit(X_train, y_train)

    print(f"\n[OK] tune_model() complete.")
    print(f"     Best params: {search.best_params_}")
    print(f"     Best CV {scoring}: {search.best_score_:.4f}")

    return search.best_estimator_, search


# ── Final Evaluation ───────────────────────────────────────────────────────────

def evaluate_final_model(pipeline, X_train, y_train, X_test, y_test,
                          problem_type='classification'):
    """
    Evaluate the final selected model on the locked test set.
    Chapter 15 -- Final evaluation: one shot, never touched until now.

    This is called ONCE at the end of the modeling workflow. The test set
    was locked in split_data() and has not been used for any modeling decision.

    Retrains on the full training set before evaluating on the test set.
    This is correct: CV selected the best configuration using X_train folds,
    now we train that configuration on ALL of X_train and evaluate on X_test.

    Metrics reported:
        Classification: accuracy, balanced_accuracy, f1, roc_auc,
                        average_precision, confusion matrix
        Regression:     r2, rmse, mae, vs. baseline (predict-mean)

    Parameters:
        pipeline: the winning Pipeline (from tune_model or CV comparison)
        X_train (DataFrame): full training features
        y_train (Series): full training target
        X_test (DataFrame): held-out test features
        y_test (Series): held-out test target
        problem_type (str): 'classification' or 'regression'

    Returns:
        metrics (dict): all computed metrics
        final_pipeline: pipeline refitted on full training set

    Example:
        metrics, final = evaluate_final_model(
            best_pipeline, X_train, y_train, X_test, y_test,
            problem_type='classification'
        )
        save_model(final, metrics, target_name='led_to_donation')
    """
    import numpy as np
    from sklearn.base import clone

    final = clone(pipeline)
    final.fit(X_train, y_train)

    print(f"\n{'='*60}")
    print(f"  FINAL MODEL EVALUATION (test set -- used once)")
    print(f"{'='*60}")

    metrics = {}

    if problem_type == 'classification':
        from sklearn.metrics import (accuracy_score, balanced_accuracy_score,
                                     f1_score, roc_auc_score,
                                     average_precision_score, confusion_matrix)

        y_pred  = final.predict(X_test)
        y_proba = final.predict_proba(X_test)[:, 1]

        metrics['accuracy']          = round(accuracy_score(y_test, y_pred), 4)
        metrics['balanced_accuracy'] = round(balanced_accuracy_score(y_test, y_pred), 4)
        metrics['f1']                = round(f1_score(y_test, y_pred), 4)
        metrics['roc_auc']           = round(roc_auc_score(y_test, y_proba), 4)
        metrics['average_precision'] = round(average_precision_score(y_test, y_proba), 4)
        cm = confusion_matrix(y_test, y_pred)

        print(f"\n  Accuracy:          {metrics['accuracy']}")
        print(f"  Balanced Accuracy: {metrics['balanced_accuracy']}")
        print(f"  F1:                {metrics['f1']}")
        print(f"  ROC AUC:           {metrics['roc_auc']}")
        print(f"  Avg Precision:     {metrics['average_precision']}")
        print(f"\n  Confusion Matrix:\n  {cm}")
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
            prec = tp / (tp + fp) if (tp + fp) > 0 else 0
            rec  = tp / (tp + fn) if (tp + fn) > 0 else 0
            print(f"  TN={tn} FP={fp} FN={fn} TP={tp}")
            print(f"  Precision: {prec:.4f}  |  Recall: {rec:.4f}")
            metrics['precision'] = round(prec, 4)
            metrics['recall']    = round(rec, 4)

    else:
        from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

        y_pred   = final.predict(X_test)
        baseline = np.full(len(y_test), y_train.mean())

        metrics['r2']            = round(r2_score(y_test, y_pred), 4)
        metrics['rmse']          = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4)
        metrics['mae']           = round(float(mean_absolute_error(y_test, y_pred)), 4)
        metrics['baseline_rmse'] = round(float(np.sqrt(mean_squared_error(y_test, baseline))), 4)
        metrics['pct_improvement'] = round(
            (metrics['baseline_rmse'] - metrics['rmse']) / metrics['baseline_rmse'] * 100, 1)

        print(f"\n  R2:              {metrics['r2']}")
        print(f"  RMSE:            {metrics['rmse']}")
        print(f"  MAE:             {metrics['mae']}")
        print(f"  Baseline RMSE:   {metrics['baseline_rmse']} (predict-mean)")
        print(f"  Improvement:     {metrics['pct_improvement']}% RMSE reduction")

    print(f"\n{'='*60}")

    return metrics, final


# ── Save / Load ────────────────────────────────────────────────────────────────

def save_model(pipeline, metrics, target_name, output_dir='models'):
    """
    Save a fitted pipeline as .pkl with metadata and metrics JSON files.

    Creates three files:
        {target_name}.pkl              -- the fitted sklearn Pipeline
        {target_name}.pkl.meta.json   -- model type, timestamp
        {target_name}.pkl.metrics.json -- final test-set metrics

    The web app loads the .pkl and calls pipeline.predict(new_data).

    Parameters:
        pipeline: fitted Pipeline from evaluate_final_model()
        metrics (dict): from evaluate_final_model()
        target_name (str): filename prefix (e.g. 'led_to_donation')
        output_dir (str): directory for output files (default 'models')

    Returns:
        pkl_path (str): path to the saved .pkl file

    Example:
        metrics, final = evaluate_final_model(...)
        save_model(final, metrics, target_name='led_to_donation')
    """
    import os, json, pickle
    from datetime import datetime

    os.makedirs(output_dir, exist_ok=True)
    pkl_path     = os.path.join(output_dir, f'{target_name}.pkl')
    meta_path    = os.path.join(output_dir, f'{target_name}.pkl.meta.json')
    metrics_path = os.path.join(output_dir, f'{target_name}.pkl.metrics.json')

    with open(pkl_path, 'wb') as f:
        pickle.dump(pipeline, f)

    meta = {
        'target':   target_name,
        'model':    type(pipeline.named_steps.get('model', pipeline)).__name__,
        'saved_at': datetime.now().isoformat(),
    }
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)

    def _safe(v):
        return v.item() if hasattr(v, 'item') else v

    metrics_clean = {k: _safe(v) for k, v in metrics.items()
                     if not hasattr(v, '__len__')}
    with open(metrics_path, 'w') as f:
        json.dump(metrics_clean, f, indent=2)

    print(f"\n[OK] save_model() complete.")
    print(f"     Model:   {pkl_path}")
    print(f"     Meta:    {meta_path}")
    print(f"     Metrics: {metrics_path}")

    return pkl_path


def load_model(pkl_path):
    """
    Load a saved pipeline from a .pkl file.
    Use in the web app or in a new notebook.

    Parameters:
        pkl_path (str): path to the .pkl file

    Returns:
        pipeline: fitted sklearn Pipeline, ready to call .predict()

    Example:
        pipeline = load_model('models/led_to_donation.pkl')
        proba = pipeline.predict_proba(new_df)[:, 1]
    """
    import pickle

    with open(pkl_path, 'rb') as f:
        pipeline = pickle.load(f)

    print(f"[OK] load_model() -- loaded from {pkl_path}")
    return pipeline