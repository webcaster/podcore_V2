#!/bin/bash
# ============================================================
# PodCore Start-Skript für macOS und Linux
# ============================================================

set -e

# Ins Verzeichnis des Skripts wechseln (wichtig bei Doppelklick)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Version aus package.json lesen
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "2.12.4")

echo "==================================================="
echo "PodCore v${VERSION} - Podcast Management System"
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
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[WARNUNG] Node.js v${NODE_VERSION} gefunden. Empfohlen: v18 oder neuer."
fi

# ---- Server-Abhängigkeiten installieren ----
if [ ! -d "server/node_modules" ]; then
    echo "[INFO] Installiere Server-Abhängigkeiten (einmalig)..."
    cd server && npm install --production --silent && cd "$SCRIPT_DIR"
    echo "[INFO] Server-Abhängigkeiten installiert ✓"
fi

# ---- Server kompilieren (falls dist/index.js fehlt) ----
if [ ! -f "server/dist/index.js" ]; then
    echo "[INFO] Kompiliere Server (TypeScript → JavaScript)..."
    echo "       (Dies ist nur beim ersten Start oder nach Updates nötig)"

    # TypeScript lokal installieren falls nötig
    if [ ! -f "server/node_modules/.bin/tsc" ]; then
        echo "[INFO] Installiere TypeScript-Compiler..."
        cd server && npm install --save-dev typescript --silent && cd "$SCRIPT_DIR"
    fi

    cd server && ./node_modules/.bin/tsc && cd "$SCRIPT_DIR"
    echo "[INFO] Server kompiliert ✓"
fi

# ---- Frontend-Build synchronisieren ----
if [ -d "server/public" ]; then
    echo "[INFO] Synchronisiere Frontend-Build..."
    rm -rf server/dist/public
    cp -r server/public server/dist/public
    echo "[INFO] Frontend-Build synchronisiert ✓"
else
    echo "[WARNUNG] server/public nicht gefunden – Frontend-Build fehlt."
    echo "          Führen Sie 'npm run build' im Root-Verzeichnis aus."
fi

# ---- Netzwerk-IP ermitteln (macOS + Linux kompatibel) ----
if command -v ipconfig &> /dev/null; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
elif command -v hostname &> /dev/null && hostname -I &> /dev/null 2>&1; then
    # Linux mit hostname -I
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
else
    # Fallback über ip route
    LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $NF; exit}' || echo "")
fi

echo ""
echo "[INFO] Starte PodCore Server v${VERSION}..."
echo "[INFO] Lokal:          http://localhost:3001"
if [ -n "$LOCAL_IP" ]; then
    echo "[INFO] Netzwerk:       http://${LOCAL_IP}:3001"
fi
echo "[INFO] Drücken Sie STRG+C, um den Server zu beenden."
echo ""

# ---- Server starten ----
cd server && node dist/index.js
