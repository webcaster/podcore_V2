#!/bin/bash
# ============================================================
# PodCore Installer für macOS und Linux
# Führt alle notwendigen Schritte für die Erstinstallation aus
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "2.12.4")

echo "==================================================="
echo "PodCore v${VERSION} - Installer"
echo "==================================================="
echo ""

# ---- Node.js prüfen ----
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js ist nicht installiert!"
    echo ""
    echo "Bitte installieren Sie Node.js (Version 18 oder neuer):"
    echo "  macOS:  https://nodejs.org  oder  brew install node"
    echo "  Linux:  sudo apt install nodejs npm  oder  https://nodejs.org"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
echo "[INFO] Node.js $(node -v) gefunden ✓"

if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[WARNUNG] Node.js v${NODE_VERSION} ist veraltet. Empfohlen: v18 oder neuer."
fi

# ---- Server-Abhängigkeiten installieren ----
echo "[INFO] Installiere Server-Abhängigkeiten..."
cd server && npm install --production --silent && cd "$SCRIPT_DIR"
echo "[INFO] Server-Abhängigkeiten installiert ✓"

# ---- TypeScript-Compiler installieren ----
if [ ! -f "server/node_modules/.bin/tsc" ]; then
    echo "[INFO] Installiere TypeScript-Compiler..."
    cd server && npm install --save-dev typescript --silent && cd "$SCRIPT_DIR"
    echo "[INFO] TypeScript-Compiler installiert ✓"
fi

# ---- Server kompilieren ----
echo "[INFO] Kompiliere Server (TypeScript → JavaScript)..."
cd server && ./node_modules/.bin/tsc && cd "$SCRIPT_DIR"
echo "[INFO] Server kompiliert ✓"

# ---- Frontend-Build synchronisieren ----
if [ -d "server/public" ]; then
    echo "[INFO] Synchronisiere Frontend-Build..."
    rm -rf server/dist/public
    cp -r server/public server/dist/public
    echo "[INFO] Frontend-Build synchronisiert ✓"
else
    echo "[WARNUNG] server/public nicht gefunden – Frontend-Build fehlt."
fi

# ---- Ausführungsrechte setzen ----
chmod +x start-unix.sh install.sh 2>/dev/null || true

echo ""
echo "==================================================="
echo "Installation abgeschlossen!"
echo ""
echo "Starten Sie PodCore mit:"
echo "  ./start-unix.sh"
echo ""
echo "Das System ist dann unter http://localhost:3001 erreichbar."
echo "==================================================="
