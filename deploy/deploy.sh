#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/kelsey"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

echo "==> Building frontend..."
npm run build

echo "==> Restarting Kelsey..."
pm2 restart kelsey --update-env

echo "==> Deploy complete."
