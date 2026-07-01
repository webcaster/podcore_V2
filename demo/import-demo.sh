#!/bin/bash
# ============================================================
# PodCore Demo-Daten Import
# ============================================================
# Dieses Skript importiert die Demo-Daten in die PodCore-Datenbank.
# ACHTUNG: Bestehende Daten werden NICHT gelöscht (INSERT OR IGNORE).
# Führe dieses Skript nur auf einer frischen Installation aus.
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/demo-data.sql"

# Datenbank-Pfad ermitteln
if [ -n "$PODCORE_DATA_DIR" ]; then
  DB_PATH="$PODCORE_DATA_DIR/podcore.db"
else
  DB_PATH="$HOME/.podcore/podcore.db"
fi

echo "=================================================="
echo "  PodCore Demo-Daten Import"
echo "=================================================="
echo ""
echo "  Datenbank: $DB_PATH"
echo "  SQL-Datei: $SQL_FILE"
echo ""

# Prüfen ob sqlite3 verfügbar ist
if ! command -v sqlite3 &> /dev/null; then
  echo "  FEHLER: sqlite3 ist nicht installiert."
  echo "  Installation:"
  echo "    Ubuntu/Debian: sudo apt-get install sqlite3"
  echo "    macOS:         brew install sqlite3"
  echo "    Windows:       https://www.sqlite.org/download.html"
  exit 1
fi

# Prüfen ob Datenbank existiert
if [ ! -f "$DB_PATH" ]; then
  echo "  FEHLER: Datenbank nicht gefunden: $DB_PATH"
  echo "  Stelle sicher, dass PodCore mindestens einmal gestartet wurde."
  exit 1
fi

# Prüfen ob SQL-Datei existiert
if [ ! -f "$SQL_FILE" ]; then
  echo "  FEHLER: SQL-Datei nicht gefunden: $SQL_FILE"
  exit 1
fi

# Warnung
echo "  WARNUNG: Dieses Skript fügt Demo-Daten in deine Datenbank ein."
echo "  Bestehende Daten werden nicht gelöscht."
echo ""
read -p "  Fortfahren? (j/N): " confirm
if [[ "$confirm" != "j" && "$confirm" != "J" ]]; then
  echo "  Abgebrochen."
  exit 0
fi

echo ""
echo "  [1/3] Erstelle Backup der aktuellen Datenbank..."
BACKUP_PATH="${DB_PATH%.db}_backup_$(date +%Y%m%d_%H%M%S).db"
cp "$DB_PATH" "$BACKUP_PATH"
echo "        Backup: $BACKUP_PATH ✓"

echo "  [2/3] Importiere Demo-Daten..."
sqlite3 "$DB_PATH" < "$SQL_FILE"
echo "        Import abgeschlossen ✓"

echo "  [3/3] Prüfe Import..."
EPISODE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE id LIKE 'demo-%';")
SPONSOR_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sponsors WHERE id LIKE 'demo-%';")
IDEA_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM ideas WHERE id LIKE 'demo-%';")
USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE id LIKE 'demo-%';")

echo ""
echo "=================================================="
echo "  Import erfolgreich!"
echo ""
echo "  Importierte Datensätze:"
echo "    Episoden:  $EPISODE_COUNT"
echo "    Sponsoren: $SPONSOR_COUNT"
echo "    Ideen:     $IDEA_COUNT"
echo "    Benutzer:  $USER_COUNT"
echo ""
echo "  Demo-Zugangsdaten:"
echo "    max.mueller     / demo1234  (Admin)"
echo "    sarah.schneider / demo1234  (Redakteur)"
echo "    tom.weber       / demo1234  (Moderator)"
echo "    lena.braun      / demo1234  (Produktion)"
echo ""
echo "  Starte PodCore neu, damit alle Änderungen sichtbar sind."
echo "=================================================="
