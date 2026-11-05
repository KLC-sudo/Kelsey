#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/www/backups/kelsey"
DB_PATH="/var/www/kelsey/server/kelsey.db"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kelsey-$TIMESTAMP.db"

cp "$DB_PATH" "$BACKUP_FILE"
echo "Backup created: $BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"
echo "Compressed: $BACKUP_FILE.gz"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "kelsey-*.db.gz" -mtime +$KEEP_DAYS -delete

echo "Backups in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/
