#!/bin/bash
# PodCore Deploy Script
# Usage: ./deploy.sh <version>
# Example: ./deploy.sh 2.6.1
# This script sets the version BEFORE building to ensure correct version in bundles

set -e

VERSION=${1:-"2.6.1"}
echo "=================================================="
echo "  PodCore Deploy — v${VERSION}"
echo "=================================================="

# 1. Set version in ALL files BEFORE building
echo "[1/6] Setting version to v${VERSION}..."
sed -i "s/\"version\": \"[0-9.]*\"/\"version\": \"${VERSION}\"/" package.json
sed -i "s/\"version\": \"[0-9.]*\"/\"version\": \"${VERSION}\"/" server/package.json 2>/dev/null || true
sed -i "s/version: '[0-9.]*'/version: '${VERSION}'/" server/index.ts
sed -i "s/PodCore API Server v[0-9.]*/PodCore API Server v${VERSION}/" server/index.ts
sed -i "s/PodCore v[0-9.]*/PodCore v${VERSION}/g" server/index.ts
sed -i "s/'[0-9]\+\.[0-9]\+\.[0-9]\+' \/\/ APP_VERSION fallback/'${VERSION}' \/\/ APP_VERSION fallback/" client/vite.config.ts 2>/dev/null || \
  sed -i "s/process\.env\.npm_package_version || '[0-9.]*'/process.env.npm_package_version || '${VERSION}'/" client/vite.config.ts 2>/dev/null || true
sed -i "s/PodCore v[0-9.]*/PodCore v${VERSION}/g" start-unix.sh start-windows.bat 2>/dev/null || true
echo "    Version set to v${VERSION} ✓"

# 2. Build client (version is now correct in package.json)
echo "[2/6] Building client..."
cd client && npm run build 2>&1 | tail -3
cd ..
echo "    Client built ✓"

# 3. Compile server TypeScript
echo "[3/6] Compiling server..."
cd server && npx tsc 2>&1 | tail -3
cd ..
echo "    Server compiled ✓"

# 4. Deploy: copy fresh public build to dist/public (THE CRITICAL STEP)
echo "[4/6] Deploying public assets to dist/public..."
rm -rf server/dist/public
cp -r server/public server/dist/public
echo "    Assets deployed to dist/public ✓"

# 5. Copy to release folder
echo "[5/6] Updating release folder..."
cp -r server/dist/* ../podcore-release/server/dist/ 2>/dev/null || true
rm -rf ../podcore-release/server/dist/public
cp -r server/dist/public ../podcore-release/server/dist/public
sed -i "s/\"version\": \"[0-9.]*\"/\"version\": \"${VERSION}\"/" ../podcore-release/package.json 2>/dev/null || true
echo "    Release folder updated ✓"

# 6. Restart server
echo "[6/6] Restarting server..."
kill $(lsof -t -i:3001) 2>/dev/null || true
sleep 1
cd ../podcore-release/server && node dist/index.js >> /tmp/server.log 2>&1 &
sleep 3

# Verify
RUNNING_VERSION=$(curl -s http://localhost:3001/api/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version','?'))" 2>/dev/null || echo "?")
echo ""
echo "=================================================="
echo "  Deploy complete!"
echo "  Running version: v${RUNNING_VERSION}"
echo "  Expected:        v${VERSION}"
if [ "$RUNNING_VERSION" = "$VERSION" ]; then
  echo "  Status: ✅ VERSION CORRECT"
else
  echo "  Status: ⚠️  VERSION MISMATCH — check logs"
fi
echo "=================================================="
