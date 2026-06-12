#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/family-scheduler}"

echo "Deploying FamilyScheduler from ${APP_DIR}"
cd "${APP_DIR}"

git pull --ff-only

docker compose build
docker compose up -d
docker image prune -f

docker compose ps
