#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/kelsey"
REPO_URL="https://github.com/KLC-sudo/Kelsey.git"

echo "==> Cloning repository..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "==> Installing dependencies..."
npm ci --omit=dev || npm install --omit=dev

echo "==> Installing dev dependencies for build..."
npm install

echo "==> Building frontend..."
npm run build

echo "==> Copying PM2 config..."
cp deploy/ecosystem.config.js /root/kelsey-ecosystem.config.js

echo "==> Starting PM2 process..."
if pm2 list | grep -q kelsey; then
    pm2 restart kelsey --update-env
else
    pm2 start /root/kelsey-ecosystem.config.js
fi

echo "==> Saving PM2 process list..."
pm2 save

echo "==> Done. Kelsey is running on port 3001."
