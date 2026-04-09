#!/bin/bash
#
# Azure App Service startup command for the Hearth Haven ML inference server.
#
# This script is designed to be committed to the repo as a single source of
# truth for how the FastAPI server is launched in production. Point Azure at
# it via:
#
#   az webapp config set \
#     --resource-group <rg> \
#     --name hearth-haven-ml \
#     --startup-file "bash startup.sh"
#
# IMPORTANT: use the RELATIVE path "bash startup.sh", not an absolute path
# under /home/site/wwwroot/. When SCM_DO_BUILD_DURING_DEPLOYMENT=true, Azure's
# Oryx build packs the app into output.tar.zst and extracts it at runtime to
# /tmp/<random-hash>/ — NOT into /home/site/wwwroot/. The hash changes on
# every deploy, so absolute paths under wwwroot will fail with
# "No such file or directory". Azure sets the working directory to the
# extraction path before executing the startup command, so relative paths
# resolve correctly. $SCRIPT_DIR below uses bash introspection to locate
# the extraction path at runtime for the --chdir into inference/.
#
# Workers:
#   - 2 workers is a safe default for the smallest App Service tiers (B1/S1).
#     Bump if you move to a larger plan and see request queueing.
# Timeout:
#   - 120s accommodates cold-start sklearn model loads on the first request
#     after a restart.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

exec gunicorn \
  --chdir "$SCRIPT_DIR/inference" \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  server:app
