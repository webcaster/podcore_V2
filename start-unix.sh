#!/bin/bash

echo "==================================================="
echo "PodCore v2.9.16 - Podcast Management System"
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
    rm -rf server/dist/public
    cp -r server/public server/dist/public
    echo "[INFO] Server kompiliert ✓"
fi

echo ""
echo "[INFO] Starte PodCore Server..."
echo "[INFO] Das System ist unter http://localhost:3001 erreichbar."
echo "[INFO] Drücken Sie STRG+C, um den Server zu beenden."
echo ""

# Start the server
cd server && node dist/index.js
