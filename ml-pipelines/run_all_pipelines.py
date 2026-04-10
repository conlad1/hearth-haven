#!/usr/bin/env python3
# ml-pipelines/run_all_pipelines.py
#
# Clears model outputs and re-runs every pipeline notebook in order.
# PKL files go to  ml-pipelines/models/
# CSV/JSON files go to frontend/public/causal/
#
# USAGE (from ml-pipelines/):
#   source intex/bin/activate
#   python3 run_all_pipelines.py
#
# Add --dry-run to see what would be deleted/run without doing anything.

import argparse
import glob
import os
import shutil
import sys
import time
from pathlib import Path

import nbformat
from nbconvert.preprocessors import ExecutePreprocessor

# ── Paths ──────────────────────────────────────────────────────────────────────

ROOT        = Path(__file__).parent          # ml-pipelines/
MODELS_DIR  = ROOT / "models"
CAUSAL_DIR  = ROOT.parent / "frontend" / "public" / "causal"
PIPELINES   = ROOT / "pipelines"

# ── Run order ──────────────────────────────────────────────────────────────────
# Causal notebooks run after predictive ones (they don't depend on each other,
# but this groups them logically and front-loads the pkl models).

NOTEBOOKS = [
    # Predictive — output: models/*.pkl
    "residents_pred_reintegration_chance.ipynb",
    "residents_pred_progress_chance.ipynb",
    "donations_pred_lapse_chance.ipynb",
    "donations_pred_upgrade_chance.ipynb",
    "socials_pred_donation_chance.ipynb",
    "socials_pred_engagement_amount.ipynb",
    "socials_pred_monthly_donation_amount.ipynb",
    # Explanatory — output: frontend/public/causal/*.csv + *.json
    "residents_cause_risk_drivers.ipynb",
    "residents_cause_intervention_drivers.ipynb",
    "residents_cause_safehouse_performance.ipynb",
    "donations_cause_retention_drivers.ipynb",
    "donations_cause_acquisition_drivers.ipynb",
    "socials_cause_posting_drivers.ipynb",
]

# ── Files to delete before re-running ─────────────────────────────────────────

PKL_PATTERNS  = ["*.pkl", "*.pkl.meta.json", "*.pkl.metrics.json", "*_features.json"]
CAUSAL_PATTERNS = ["*.csv", "*.json"]


def delete_outputs(dry_run: bool) -> None:
    print("\n── Clearing old outputs ──────────────────────────────────────────")

    deleted = []

    for pattern in PKL_PATTERNS:
        for f in MODELS_DIR.glob(pattern):
            deleted.append(f)
            if not dry_run:
                f.unlink()

    for pattern in CAUSAL_PATTERNS:
        for f in CAUSAL_DIR.glob(pattern):
            deleted.append(f)
            if not dry_run:
                f.unlink()

    if deleted:
        for f in sorted(deleted):
            prefix = "[dry-run] would delete" if dry_run else "deleted"
            print(f"  {prefix}: {f.relative_to(ROOT.parent)}")
    else:
        print("  Nothing to delete.")

    print()


def run_notebook(nb_path: Path, timeout: int = 1800) -> tuple[bool, float]:
    """Execute a single notebook in-place. Returns (success, elapsed_seconds)."""
    with open(nb_path) as f:
        nb = nbformat.read(f, as_version=4)

    ep = ExecutePreprocessor(
        timeout=timeout,
        kernel_name="intex",          # matches the INTEX Pipelines kernel
        allow_errors=False,
    )

    t0 = time.time()
    try:
        # notebooks use os.chdir('..') internally so they run from ml-pipelines/
        ep.preprocess(nb, {"metadata": {"path": str(PIPELINES)}})
        elapsed = time.time() - t0
        # Write executed notebook back so outputs are visible in VS Code
        with open(nb_path, "w") as f:
            nbformat.write(nb, f)
        return True, elapsed
    except Exception as exc:
        elapsed = time.time() - t0
        print(f"\n    ERROR: {exc}")
        return False, elapsed


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-run all ML pipeline notebooks.")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would be deleted and which notebooks would run, without doing anything."
    )
    parser.add_argument(
        "--skip-delete", action="store_true",
        help="Skip deleting existing outputs (run notebooks on top of existing files)."
    )
    parser.add_argument(
        "--only", metavar="NAME", nargs="+",
        help="Run only the notebooks whose filenames contain this substring (e.g. --only donations socials)."
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  Hearth Haven — ML Pipeline Runner")
    print("=" * 60)
    print(f"  Models dir : {MODELS_DIR}")
    print(f"  Causal dir : {CAUSAL_DIR}")
    print(f"  Dry run    : {args.dry_run}")

    MODELS_DIR.mkdir(exist_ok=True)
    CAUSAL_DIR.mkdir(parents=True, exist_ok=True)

    if not args.skip_delete:
        delete_outputs(dry_run=args.dry_run)

    notebooks = NOTEBOOKS
    if args.only:
        notebooks = [nb for nb in NOTEBOOKS if any(s in nb for s in args.only)]
        print(f"  Filtered to {len(notebooks)} notebook(s) matching: {args.only}\n")

    results: list[tuple[str, bool, float]] = []
    total_start = time.time()

    for i, nb_name in enumerate(notebooks, 1):
        nb_path = PIPELINES / nb_name
        if not nb_path.exists():
            print(f"[{i}/{len(notebooks)}] SKIP  {nb_name}  (file not found)")
            results.append((nb_name, False, 0.0))
            continue

        print(f"[{i}/{len(notebooks)}] RUN   {nb_name}", end="", flush=True)

        if args.dry_run:
            print("  [dry-run]")
            results.append((nb_name, True, 0.0))
            continue

        ok, elapsed = run_notebook(nb_path)
        status = "OK " if ok else "ERR"
        print(f"  [{status}]  {elapsed:.0f}s")
        results.append((nb_name, ok, elapsed))

    total_elapsed = time.time() - total_start

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("  Summary")
    print("=" * 60)
    passed = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]

    for name, ok, elapsed in results:
        mark = "✓" if ok else "✗"
        note = f"{elapsed:.0f}s" if not args.dry_run else "dry-run"
        print(f"  {mark}  {name:<55}  {note}")

    print()
    print(f"  {len(passed)}/{len(results)} notebooks succeeded  |  total {total_elapsed:.0f}s")

    if failed:
        print(f"\n  Failed:")
        for name, _, _ in failed:
            print(f"    - {name}")
        print()
        sys.exit(1)

    print()
    print("  Verify outputs:")
    print(f"    ls {MODELS_DIR}")
    print(f"    ls {CAUSAL_DIR}")
    print()


if __name__ == "__main__":
    main()
