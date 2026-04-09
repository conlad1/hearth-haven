#!/bin/bash
#
# Redeploy the Hearth Haven ML inference server to Azure App Service.
#
# Usage (from anywhere):
#   ml-pipelines/deploy.sh
#
# First-time setup (creating the App Service, Linux plan, app settings,
# startup command) is documented in DEPLOYMENT.md. This script only covers
# the recurring build-zip-and-push cycle for subsequent deploys.
#
# Environment variables (optional overrides):
#   RG          Resource group name     (default: appsvc_windows_westus3)
#   APP_NAME    App Service name        (default: hearth-haven-ml)
#
# Assumes:
#   - az CLI is installed and `az login` has been run
#   - The hearth-haven-ml App Service already exists
#   - You've trained the pipelines and the .pkl files are in ml-pipelines/models/

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
RG="${RG:-appsvc_windows_westus3}"
APP_NAME="${APP_NAME:-hearth-haven-ml}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STAGE_DIR="/tmp/ml-deploy"
ZIP_PATH="/tmp/ml-deploy.zip"

# ── Pre-flight checks ───────────────────────────────────────────────────────
command -v az >/dev/null 2>&1 || { echo "ERROR: az CLI not found. Install via 'brew install azure-cli'."; exit 1; }
command -v zip >/dev/null 2>&1 || { echo "ERROR: zip not found."; exit 1; }
az account show >/dev/null 2>&1 || { echo "ERROR: not logged in to Azure. Run 'az login' first."; exit 1; }

[[ -d "$SCRIPT_DIR/inference" ]] || { echo "ERROR: $SCRIPT_DIR/inference missing."; exit 1; }
[[ -d "$SCRIPT_DIR/models" ]] || { echo "ERROR: $SCRIPT_DIR/models missing — train pipelines first."; exit 1; }
[[ -f "$SCRIPT_DIR/requirements-inference.txt" ]] || { echo "ERROR: requirements-inference.txt missing."; exit 1; }
[[ -f "$SCRIPT_DIR/startup.sh" ]] || { echo "ERROR: startup.sh missing."; exit 1; }

# Warn if there are no .pkl files (models dir exists but empty = forgot to train)
if ! ls "$SCRIPT_DIR/models"/*.pkl >/dev/null 2>&1; then
  echo "WARNING: no .pkl files in ml-pipelines/models/ — predictions will fail at runtime."
fi

# ── Build the zip ───────────────────────────────────────────────────────────
echo "==> Staging deploy contents..."
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
cp -R "$SCRIPT_DIR/inference" "$SCRIPT_DIR/models" "$SCRIPT_DIR/startup.sh" "$STAGE_DIR/"

# Azure Oryx looks for a file literally named requirements.txt at the zip root.
# We rename here so ml-pipelines/requirements.txt (the bloated training set)
# can stay in the repo untouched.
cp "$SCRIPT_DIR/requirements-inference.txt" "$STAGE_DIR/requirements.txt"

echo "==> Creating $ZIP_PATH..."
(cd "$STAGE_DIR" && zip -rq "$ZIP_PATH" .)

ZIP_SIZE=$(du -h "$ZIP_PATH" | awk '{print $1}')
echo "==> Zip built: $ZIP_SIZE"

# Sanity check: warn if the zip is unexpectedly large (a telltale of stray
# venv, notebook checkpoints, or dataset files sneaking in).
ZIP_BYTES=$(stat -f%z "$ZIP_PATH" 2>/dev/null || stat -c%s "$ZIP_PATH" 2>/dev/null || echo 0)
if [[ $ZIP_BYTES -gt 104857600 ]]; then
  echo "WARNING: zip is >100 MB. Check for stray venv, .ipynb_checkpoints, or CSVs in ml-pipelines/."
fi

# ── Deploy ──────────────────────────────────────────────────────────────────
echo "==> Deploying to App Service: $APP_NAME (resource group: $RG)..."
echo "    This takes 1-2 minutes for code-only changes, or 5-8 minutes if"
echo "    requirements-inference.txt changed (Oryx rebuilds the Python env)."

az webapp deploy \
  --resource-group "$RG" \
  --name "$APP_NAME" \
  --src-path "$ZIP_PATH" \
  --type zip

# ── Verify ──────────────────────────────────────────────────────────────────
URL=$(az webapp show --resource-group "$RG" --name "$APP_NAME" --query defaultHostName -o tsv)
echo ""
echo "==> Deploy submitted. Waiting 30s for container to stabilize..."
sleep 30

echo "==> Health check: https://$URL/health"
HEALTH_BODY=$(curl -sS --max-time 10 "https://$URL/health" || echo "")
if [[ "$HEALTH_BODY" == *'"status":"ok"'* ]]; then
  echo "    $HEALTH_BODY"
  echo ""
  echo "[OK] Deploy successful."
  echo ""
  echo "Tail logs while testing from the frontend with:"
  echo "  az webapp log tail --resource-group $RG --name $APP_NAME"
else
  echo "[WARN] Health check did not return the expected response."
  echo "    Got: ${HEALTH_BODY:-<empty>}"
  echo ""
  echo "The container may still be starting. Wait a bit longer, then:"
  echo "  curl -sS https://$URL/health"
  echo ""
  echo "Or tail logs to see what's happening:"
  echo "  az webapp log tail --resource-group $RG --name $APP_NAME"
  exit 1
fi
