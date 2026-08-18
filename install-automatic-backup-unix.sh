#!/usr/bin/env sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
JOB="0 20 * * * cd \"$ROOT\" && ./run-automatic-backup-unix.sh >> \"$ROOT/.podcore-auto-backup.log\" 2>&1"
(crontab -l 2>/dev/null | grep -Fv "run-automatic-backup-unix.sh" || true; echo "$JOB") | crontab -
echo "Die tägliche PodCore-Sicherung um 20:00 Uhr wurde eingerichtet."
