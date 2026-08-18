#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
pnpm --dir server exec ts-node scripts/automatic-backup.ts
