## Starting the Inference Server

Run from the `inference/` subdirectory — uvicorn must find `server.py` in the current directory, and `MODELS_DIR` defaults to `../models` relative to that file.

```bash
cd ml-pipelines/inference
uvicorn server:app --port 8000 --reload
```

Health check: http://127.0.0.1:8000/health

## Pipeline Quick Reference

| Pipeline notebook | Output | sklearn model | FastAPI endpoint | .NET endpoint | Frontend |
|---|---|---|---|---|---|
| `pipelines/residents_pred_reintegration_chance.ipynb` | `.pkl` → `models/` | LogisticRegression | `POST /predict/reintegration` | `POST /MLPredict/reintegration/{residentId}` | Resident case page — readiness score bar |
| `pipelines/residents_pred_progress_chance.ipynb` | `.pkl` → `models/` | Ridge (regression) | `POST /predict/progress` | `POST /MLPredict/progress/{residentId}` | Resident case page — education progress score bar |
| `pipelines/residents_cause_risk_drivers.ipynb` | `.csv` → `frontend/public/causal/` | OLS regression | — | — | Reports page — What Drives Resident Risk Level? |
| `pipelines/residents_cause_intervention_drivers.ipynb` | `.csv` + `.json` → `frontend/public/causal/` | OLS regression | — | — | Reports page — What Drives Intervention Success? |
| `pipelines/residents_cause_safehouse_performance.ipynb` | `.csv` + `.json` → `frontend/public/causal/` | OLS regression | — | — | Reports page — What Drives Safehouse Outcomes? |
| `pipelines/donations_pred_lapse_chance.ipynb` | `.pkl` → `models/` | DecisionTreeClassifier | `POST /predict/donor-lapse` | `POST /MLPredict/donor/{supporterId}` | Donor page — lapse risk card |
| `pipelines/donations_pred_upgrade_chance.ipynb` | `.pkl` → `models/` | LogisticRegression | `POST /predict/donor-upgrade` | `POST /MLPredict/donor/{supporterId}` | Donor page — upgrade potential card |
| `pipelines/donations_cause_retention_drivers.ipynb` | `.csv` + `.json` → `frontend/public/causal/` | OLS regression | — | — | Reports page — What Drives Total Donor Value? |
| `pipelines/donations_cause_acquisition_drivers.ipynb` | `.csv` + `.json` → `frontend/public/causal/` | OLS regression | — | — | Reports page — Which Acquisition Channels Drive Donor Value? |
| `pipelines/socials_pred_donation_chance.ipynb` | `.pkl` → `models/` | RandomForestClassifier | `POST /predict/donation-conversion` | `POST /MLPredict/social-post/{postId}` | Social media page — conversion score in post detail modal |
| `pipelines/socials_pred_engagement_amount.ipynb` | `.pkl` → `models/` | GradientBoostingRegressor | `POST /predict/engagement-rate` | `POST /MLPredict/social-post/{postId}` | Social media page — engagement % in post detail modal |
| `pipelines/socials_pred_monthly_donation_amount.ipynb` | `.pkl` → `models/` | Ridge (regression) | `POST /predict/monthly-donations` | `POST /MLPredict/monthly-donations/{month}` | Reports page — Monthly Donation Forecast card |
| `pipelines/socials_cause_posting_drivers.ipynb` | `.csv` + `.json` → `frontend/public/causal/` | OLS regression | — | — | Reports page — What Drives Post Engagement Rate? |

> **PKL files** (predictive models) → `models/` — loaded at runtime by the FastAPI server.
> **CSV/JSON files** (causal/explanatory models) → `frontend/public/causal/` — served as static assets, fetched directly by the frontend.
> The `.NET` donor and social-post endpoints each call **two** FastAPI predictions in parallel and return them combined.

## Local Environment Setup

Follow these steps to set up a clean Python virtual environment, install the required dependencies, and configure your Jupyter notebooks to use the correct kernel.

### 1. Create a Virtual Environment

Navigate to the project directory (e.g., `ml-pipelines`) in your terminal and create a new virtual environment named `intex`:

```bash
cd ml-pipelines
python3 -m venv intex
```

### 2. Activate the Environment

You must activate the virtual environment every time you work on this project.

- **macOS/Linux**: `source intex/bin/activate`
- **Windows (PowerShell)**: `.\intex\Scripts\activate`

(You will know it is active when you see (intex) at the beginning of your terminal prompt).

### 3. Install Dependencies

With the environment active, upgrade pip and install the required packages from the requirements file:

```Bash
pip install --upgrade pip
pip install -r requirements.txt
python3 -m pip install -r requirements.txt # The other one usually works, but for some reason it didn't for me, so I had to run this command. Maybe it will be the same for you. (Michelle)
```

### 4. Configure the Jupyter Kernel

To ensure your Jupyter Notebooks run using the packages we just installed, link this virtual environment to Jupyter by running:

```Bash
python3 -m ipykernel install --user --name=intex --display-name="INTEX Pipelines"
```

NOTE: You might have to reload the window to update your VS Code.

#### ⚠️ Troubleshooting: "ModuleNotFoundError" in VS Code

If you have activated the virtual environment and installed the requirements, but your Jupyter Notebooks are still throwing `ModuleNotFoundError` (especially for packages like `pandas`, `sklearn`, or `matplotlib`), **VS Code is likely using the wrong kernel.**

**The Fix:**

1. Look at the top-right corner of your open notebook in VS Code.
2. If it says a generic Python version (e.g., `Python 3.13.2`) instead of `INTEX Pipelines`, click it.
3. Select **Select Another Kernel...** -> **Jupyter Kernel**.
4. Choose the kernel named **INTEX Pipelines**.

**If the kernel is completely broken or missing, regenerate it:**
Make sure your virtual environment is active in the terminal, then run:

```bash
jupyter kernelspec uninstall intex
python3 -m ipykernel install --user --name=intex --display-name="INTEX Pipelines"
```
