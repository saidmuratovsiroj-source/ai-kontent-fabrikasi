#!/bin/bash
# AI Kontent Fabrikasi — PostgreSQL zaxira nusxasi
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
OUTPUT="$BACKUP_DIR/$TIMESTAMP.sql"

# DATABASE_URL dan ulanish ma'lumotlarini olish
DB_URL="${DATABASE_URL:-postgresql://macbookair@localhost:5432/kontent_fabrikasi}"

mkdir -p "$BACKUP_DIR"

echo "📦 Zaxira nusxa tayyorlanmoqda..."
echo "   Ma'lumotlar bazasi: $DB_URL"
echo "   Manzil: $OUTPUT"

# pg_dump orqali dump qilish
pg_dump "$DB_URL" > "$OUTPUT"

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo "✅ Zaxira nusxa saqlandi: $OUTPUT ($SIZE)"

# 30 kundan eski nusxalarni o'chirish
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete 2>/dev/null && echo "🧹 30 kundan eski nusxalar tozalandi" || true
