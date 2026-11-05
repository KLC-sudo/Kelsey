#!/usr/bin/env bash
set -euo pipefail

JWT_SECRET=$(openssl rand -hex 64)

cat > /var/www/kelsey/.env << EOF
# Kelsey Production Environment
NODE_ENV=production
PORT=3001
DB_PATH=/var/www/kelsey/server/kelsey.db
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=https://klc.lat,https://www.klc.lat
VITE_SOCKET_URL=https://klc.lat
VITE_SIGNALING_SERVER_URL=https://klc.lat
VITE_GEMINI_API_KEY=
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
EOF

chmod 600 /var/www/kelsey/.env
echo "ENV created. JWT_SECRET length: ${#JWT_SECRET}"
