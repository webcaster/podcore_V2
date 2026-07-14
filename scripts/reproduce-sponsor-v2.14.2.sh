#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:33143}"
OUT_DIR="${OUT_DIR:-/tmp/podcore-sponsor-repro-2142}"
COOKIE_JAR="$OUT_DIR/cookies.txt"
mkdir -p "$OUT_DIR"
rm -f "$COOKIE_JAR" "$OUT_DIR/dossier.pdf" "$OUT_DIR/dossier-response.txt"

login="$(curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' "$BASE_URL/api/auth/login")"
printf 'Login: %s\n' "$login"

sponsor_response="$(curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"name":"Sponsor Smoke 2.14.2","company":"Testfirma","address":"Testweg 14","contactName":"Max Test","contactEmail":"max@example.test","contactPhone":"01234 56789","website":"https://example.test"}' \
  "$BASE_URL/api/sponsors")"
sponsor_id="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$sponsor_response" | head -1)"
[[ -n "$sponsor_id" ]] || { printf 'Sponsor-ID fehlt: %s\n' "$sponsor_response" >&2; exit 1; }
printf 'Sponsor-ID: %s\n' "$sponsor_id"

slots_response="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/sponsors/v2/slots")"
slot_id="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$slots_response" | head -1)"
[[ -n "$slot_id" ]] || { printf 'Werbekategorie fehlt: %s\n' "$slots_response" >&2; exit 1; }
printf 'Slot-ID: %s\n' "$slot_id"

booking_response="$(curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$slot_id\",\"bookingDate\":\"2026-07-14\",\"bookingEndDate\":\"2026-08-31\",\"price\":200,\"priceAdjustment\":25,\"listenerFee\":15,\"notes\":\"Alle Eingaben TEST-2142\",\"invoiceStatus\":\"versendet\",\"status\":\"bestaetigt\",\"placementCount\":3,\"episodeRefs\":[{\"episodeTitle\":\"Folge 42 TEST-2142\",\"count\":2}],\"discount\":10,\"discountType\":\"percent\",\"listenerCount\":12500,\"totalEpisodes\":8}" \
  "$BASE_URL/api/sponsors/v2/$sponsor_id/bookings")"
booking_id="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$booking_response" | head -1)"
[[ -n "$booking_id" ]] || { printf 'Buchungs-ID fehlt: %s\n' "$booking_response" >&2; exit 1; }
printf 'Buchungs-ID: %s\n' "$booking_id"

bookings_response="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/sponsors/v2/$sponsor_id/bookings")"
printf 'Geladene Buchung: %s\n' "$bookings_response"
printf '%s' "$bookings_response" > "$OUT_DIR/bookings.json"

http_status="$(curl -sS -b "$COOKIE_JAR" -o "$OUT_DIR/dossier-response.txt" -w '%{http_code}' \
  "$BASE_URL/api/sponsors/v2/$sponsor_id/dossier-pdf?title=Sponsor-Smoke-2.14.2")"
printf 'Dossier-HTTP-Status: %s\n' "$http_status"
printf 'Dossier-Antwort: '
head -c 500 "$OUT_DIR/dossier-response.txt" || true
printf '\n'
