#!/usr/bin/env bash
# ============================================================
# PodCore Installer für macOS und Linux
# Installiert Root-, Client- und Server-Abhängigkeiten mit pnpm
# und erstellt einen lokalen Produktions-Build.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unbekannt")

echo "==================================================="
echo "PodCore v${VERSION} - Installer"
echo "==================================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js ist nicht installiert."
    echo "Bitte installieren Sie Node.js 18 oder neuer:"
    echo "  macOS: https://nodejs.org oder brew install node"
    echo "  Linux: https://nodejs.org oder über den Paketmanager Ihrer Distribution"
    exit 1
fi

NODE_VERSION=$(node -p "Number(process.versions.node.split('.')[0])")
echo "[INFO] Node.js $(node -v) gefunden."
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[ERROR] PodCore benötigt Node.js 18 oder neuer."
    exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
    echo "[INFO] pnpm wurde nicht gefunden. Versuche die Aktivierung über Corepack ..."
    if command -v corepack >/dev/null 2>&1 && corepack enable >/dev/null 2>&1 && corepack prepare pnpm@10 --activate >/dev/null 2>&1; then
        hash -r
    fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
    echo "[ERROR] pnpm konnte nicht aktiviert werden."
    echo "Installieren Sie pnpm und starten Sie den Installer erneut:"
    echo "  corepack enable"
    echo "  corepack prepare pnpm@10 --activate"
    echo "Alternativ: npm install -g pnpm@10"
    exit 1
fi

echo "[INFO] pnpm $(pnpm --version) gefunden."
echo ""

echo "[1/4] Installiere Root-Abhängigkeiten ..."
pnpm install --frozen-lockfile

echo "[2/4] Installiere Client-Abhängigkeiten ..."
pnpm --dir client install --frozen-lockfile

echo "[3/4] Installiere Server-Abhängigkeiten ..."
pnpm --dir server install --frozen-lockfile

echo "[4/4] Erstelle Produktions-Build ..."
pnpm run build

chmod +x start-unix.sh install.sh 2>/dev/null || true

echo ""
echo "==================================================="
echo "Installation abgeschlossen."
echo "Starten Sie PodCore mit: ./start-unix.sh"
echo "Lokal: http://localhost:3001"
echo "==================================================="
