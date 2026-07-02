#!/bin/bash

# Lese Version dynamisch aus package.json
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "2.11.0")

echo "==================================================="
echo "PodCore v${VERSION} - Podcast Management System"
echo "==================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js ist nicht installiert!"
    echo "Bitte installieren Sie Node.js (https://nodejs.org)."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "server/node_modules" ]; then
    echo "[INFO] Installiere Server-Abhängigkeiten..."
    cd server && npm install --production && cd ..
fi

# Build server if dist/index.js doesn't exist
if [ ! -f "server/dist/index.js" ]; then
    echo "[INFO] Kompiliere Server (TypeScript → JavaScript)..."
    cd server && npx tsc && cd ..
    echo "[INFO] Server kompiliert ✓"
fi

# WICHTIG: dist/public immer mit aktuellem Frontend-Build synchronisieren
# Verhindert, dass veraltete Builds ausgeliefert werden
echo "[INFO] Synchronisiere Frontend-Build..."
rm -rf server/dist/public
cp -r server/public server/dist/public
echo "[INFO] Frontend-Build synchronisiert ✓"

echo ""
echo "[INFO] Starte PodCore Server v${VERSION}..."
echo "[INFO] Das System ist unter http://localhost:3001 erreichbar."
echo "[INFO] Im lokalen Netzwerk: http://$(hostname -I | awk '{print $1}'):3001"
echo "[INFO] Drücken Sie STRG+C, um den Server zu beenden."
echo ""

# Start the server
cd server && node dist/index.js
