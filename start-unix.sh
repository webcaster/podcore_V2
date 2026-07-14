#!/usr/bin/env bash
# ============================================================
# PodCore Produktionsstart für macOS und Linux
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unbekannt")
PORT="${PORT:-3001}"

echo "==================================================="
echo "PodCore v${VERSION} - Podcast Management System"
echo "==================================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js ist nicht installiert."
    echo "Installieren Sie Node.js 18 oder neuer und führen Sie ./install.sh aus."
    exit 1
fi

NODE_VERSION=$(node -p "Number(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[ERROR] PodCore benötigt Node.js 18 oder neuer. Gefunden: $(node -v)"
    exit 1
fi

if [ ! -d "server/node_modules" ] || [ ! -f "server/dist/index.js" ] || [ ! -d "server/dist/public" ]; then
    echo "[ERROR] PodCore ist noch nicht vollständig installiert oder gebaut."
    echo "Führen Sie im PodCore-Verzeichnis aus: ./install.sh"
    exit 1
fi

LOCAL_IP=""
if command -v ipconfig >/dev/null 2>&1; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
elif command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
elif command -v ip >/dev/null 2>&1; then
    LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $NF; exit}' || true)
fi

echo "[INFO] Starte PodCore Server v${VERSION} ..."
echo "[INFO] Lokal:    http://localhost:${PORT}"
if [ -n "$LOCAL_IP" ]; then
    echo "[INFO] Netzwerk: http://${LOCAL_IP}:${PORT}"
fi
echo "[INFO] Drücken Sie STRG+C, um den Server zu beenden."
echo ""

exec node server/dist/index.js
