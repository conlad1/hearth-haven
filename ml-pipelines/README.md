uvicorn server:app --port 8000 --reload

## Pipeline Quick Reference

| Pipeline notebook | Output | sklearn model | FastAPI endpoint | .NET endpoint | Frontend |
|---|---|---|---|---|---|
| `pipelines/residents_pred_reintegration_chance.ipynb` | `.pkl` — `reintegration_achieved.pkl` | LogisticRegression | `POST /predict/reintegration` | `POST /MLPredict/reintegration/{residentId}` | Resident case page — score bar below the header |
| `pipelines/residents_pred_progress_chance.ipynb` | `.pkl` — `progress_percent_latest.pkl` | Ridge (regression) | `POST /predict/progress` | `POST /MLPredict/progress/{residentId}` | Resident case page — education progress score bar below reintegration |
| `pipelines/residents_cause_risk_drivers.ipynb` | `.csv` — `current_risk_num_coefficients.csv`, `current_risk_num_drivers.csv` | OLS regression | — | — | — |
| `pipelines/residents_cause_intervention_drivers.ipynb` | `.csv` — `intervention_effectiveness_coefficients.csv` + `.json` summary | OLS regression | — | — | — |
| `pipelines/donations_pred_lapse_chance.ipynb` | `.pkl` — `is_lapsed.pkl` | DecisionTreeClassifier | `POST /predict/donor-lapse` | `POST /MLPredict/donor/{supporterId}` | Donor page — lapse risk card in supporter modal |
| `pipelines/donations_pred_upgrade_chance.ipynb` | `.pkl` — `will_increase_donation.pkl` | LogisticRegression | `POST /predict/donor-upgrade` | `POST /MLPredict/donor/{supporterId}` | Donor page — upgrade potential card in supporter modal |
| `pipelines/donations_cause_retention_drivers.ipynb` | `.csv` — `donor_retention_coefficients.csv` + `.json` summary | OLS regression | — | — | — |
| `pipelines/socials_pred_donation_chance.ipynb` | `.pkl` — `led_to_donation.pkl` | RandomForestClassifier | `POST /predict/donation-conversion` | `POST /MLPredict/social-post/{postId}` | Social media page — conversion score in post detail modal |
| `pipelines/socials_pred_engagement_amount.ipynb` | `.pkl` — `engagement_rate.pkl` | GradientBoostingRegressor | `POST /predict/engagement-rate` | `POST /MLPredict/social-post/{postId}` | Social media page — engagement % in post detail modal |
| `pipelines/socials_cause_posting_drivers.ipynb` | `.csv` — `posting_strategy_coefficients.csv` + `.json` summary | OLS regression | — | — | — |

> The `.NET` donor and social-post endpoints each call **two** FastAPI predictions in parallel and return them combined.
> Explanatory (`cause_*`) pipelines output coefficient CSVs + summary JSONs to `models/` — they describe *why* patterns exist and are not wired to the live API.

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
