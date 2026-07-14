#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:33142}"
OUT_DIR="${OUT_DIR:-/tmp/podcore-smoke-2142-output}"
COOKIE_JAR="$OUT_DIR/cookies.txt"
mkdir -p "$OUT_DIR"
rm -f "$COOKIE_JAR" "$OUT_DIR"/*.pdf "$OUT_DIR"/*.txt "$OUT_DIR"/*.json

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "$needle" <<<"$haystack"; then
    printf 'FEHLER: %s fehlt: %s\n' "$label" "$needle" >&2
    exit 1
  fi
}

assert_pdf() {
  local pdf_path="$1"
  local label="$2"
  if [[ "$(head -c 4 "$pdf_path")" != '%PDF' ]]; then
    printf 'FEHLER: %s ist keine PDF-Datei.\n' "$label" >&2
    exit 1
  fi
}

health="$(curl -fsS "$BASE_URL/api/health")"
assert_contains "$health" '"version":"2.14.2"' 'Health-Version'

index_html="$(curl -fsS "$BASE_URL/")"
assert_contains "$index_html" '<title>PodCore v2.14.2</title>' 'Browser-Titel'

login="$(curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' "$BASE_URL/api/auth/login")"
assert_contains "$login" '"success":true' 'Login'

# Redaktion: Freier Text, vollständige Themenwerkstatt und Ideenmappen-PDF
idea_response="$(curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"title":"Smoke-Test Ideenmappe 2.14.2","description":"Integrationstest für vollständigen Themenwerkstatt-Export","tags":["release","2.14.2"]}' \
  "$BASE_URL/api/editorial/ideas")"
idea_id="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$idea_response" | head -1)"
[[ -n "$idea_id" ]] || { printf 'FEHLER: Ideen-ID fehlt: %s\n' "$idea_response" >&2; exit 1; }

research_response="$(curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Freitext-Smoke-Test\",\"type\":\"text\",\"description\":\"Optionale Kurzfassung\",\"content\":\"Eigenständiger Haupttext ohne URL\",\"relatedIdeaId\":\"$idea_id\"}" \
  "$BASE_URL/api/editorial/research")"
assert_contains "$research_response" '"type":"text"' 'Recherchetyp Freier Text'
assert_contains "$research_response" '"url":null' 'Freitext ohne URL'
assert_contains "$research_response" '"content":"Eigenständiger Haupttext ohne URL"' 'Freitext-Haupttext'

workshop_response="$(curl -fsS -b "$COOKIE_JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"angle":"Perspektive TEST-2142","guidingQuestion":"Leitfrage TEST-2142","coreThesis":"Kernaussage TEST-2142","audienceValue":"Zielgruppennutzen TEST-2142","workingTitles":["Arbeitstitel Eins TEST-2142","Arbeitstitel Zwei TEST-2142"],"teaser":"Teaser TEST-2142","episodeDescription":"Episodenbeschreibung TEST-2142","showNotes":"Show Notes TEST-2142","callToAction":"Call-to-Action TEST-2142","body":"Haupttext TEST-2142","status":"ready"}' \
  "$BASE_URL/api/editorial/ideas/$idea_id/topic-workshop")"
assert_contains "$workshop_response" '"status":"ready"' 'Themenwerkstatt-Speicherung'

curl -fsS -b "$COOKIE_JAR" \
  "$BASE_URL/api/editorial/ideas/$idea_id/export-pdf?documentTitle=Smoke-Test%20Ideenmappe%202.14.2" \
  -o "$OUT_DIR/ideenmappe.pdf"
assert_pdf "$OUT_DIR/ideenmappe.pdf" 'Ideenmappe'
pdftotext "$OUT_DIR/ideenmappe.pdf" "$OUT_DIR/ideenmappe.txt"
idea_pdf_text="$(cat "$OUT_DIR/ideenmappe.txt")"
for expected in \
  'Themenwerkstatt' 'Perspektive TEST-2142' 'Leitfrage TEST-2142' \
  'Kernaussage TEST-2142' 'Zielgruppennutzen TEST-2142' \
  'Arbeitstitel Eins TEST-2142' 'Arbeitstitel Zwei TEST-2142' \
  'Teaser TEST-2142' 'Episodenbeschreibung TEST-2142' 'Show Notes TEST-2142' \
  'Call-to-Action TEST-2142' 'Haupttext TEST-2142'; do
  assert_contains "$idea_pdf_text" "$expected" 'Ideenmappen-PDF'
done

# Sponsoren: vollständige Buchung, sicheres Teilupdate und Dossier
sponsor_response="$(curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"name":"Sponsor Smoke 2.14.2","company":"Testfirma","address":"Testweg 14","contactName":"Max Test","contactEmail":"max@example.test","contactPhone":"01234 56789","website":"https://example.test"}' \
  "$BASE_URL/api/sponsors")"
sponsor_id="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$sponsor_response" | head -1)"
[[ -n "$sponsor_id" ]] || { printf 'FEHLER: Sponsor-ID fehlt: %s\n' "$sponsor_response" >&2; exit 1; }

slots_response="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/sponsors/v2/slots")"
slot_id="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$slots_response" | head -1)"
[[ -n "$slot_id" ]] || { printf 'FEHLER: Werbekategorie fehlt: %s\n' "$slots_response" >&2; exit 1; }

booking_response="$(curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "{\"slotId\":\"$slot_id\",\"bookingDate\":\"2026-07-14\",\"bookingEndDate\":\"2026-08-31\",\"price\":200,\"priceAdjustment\":25,\"listenerFee\":15,\"notes\":\"Alle Eingaben TEST-2142\",\"invoiceStatus\":\"versendet\",\"status\":\"bestaetigt\",\"placementCount\":3,\"episodeRefs\":[{\"episodeTitle\":\"Folge 42 TEST-2142\",\"count\":2}],\"discount\":10,\"discountType\":\"percent\",\"listenerCount\":12500,\"totalEpisodes\":8}" \
  "$BASE_URL/api/sponsors/v2/$sponsor_id/bookings")"
booking_id="$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' <<<"$booking_response" | head -1)"
[[ -n "$booking_id" ]] || { printf 'FEHLER: Buchungs-ID fehlt: %s\n' "$booking_response" >&2; exit 1; }

bookings_response="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/sponsors/v2/$sponsor_id/bookings")"
for expected in \
  '"bookingDate":"2026-07-14"' '"bookingEndDate":"2026-08-31"' '"price":200' \
  '"priceAdjustment":25' '"listenerFee":15' '"notes":"Alle Eingaben TEST-2142"' \
  '"invoiceStatus":"versendet"' '"status":"bestaetigt"' '"placementCount":3' \
  '"episodeTitle":"Folge 42 TEST-2142"' '"count":2' '"discount":10' \
  '"discountType":"percent"' '"listenerCount":12500' '"totalEpisodes":8'; do
  assert_contains "$bookings_response" "$expected" 'gespeicherte Buchung'
done

partial_update="$(curl -fsS -b "$COOKIE_JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"invoiceStatus":"bezahlt"}' "$BASE_URL/api/sponsors/v2/bookings/$booking_id")"
assert_contains "$partial_update" '"invoiceStatus":"bezahlt"' 'Buchungs-Teilupdate'

bookings_after_update="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL/api/sponsors/v2/$sponsor_id/bookings")"
for expected in \
  '"invoiceStatus":"bezahlt"' '"bookingDate":"2026-07-14"' '"bookingEndDate":"2026-08-31"' \
  '"priceAdjustment":25' '"listenerFee":15' '"notes":"Alle Eingaben TEST-2142"' \
  '"placementCount":3' '"episodeTitle":"Folge 42 TEST-2142"' '"totalEpisodes":8'; do
  assert_contains "$bookings_after_update" "$expected" 'Buchung nach Teilupdate'
done
printf '%s\n' "$bookings_after_update" > "$OUT_DIR/bookings.json"

curl -fsS -b "$COOKIE_JAR" \
  "$BASE_URL/api/sponsors/v2/$sponsor_id/dossier-pdf?title=Sponsor-Dossier%20TEST-2142" \
  -o "$OUT_DIR/dossier.pdf"
assert_pdf "$OUT_DIR/dossier.pdf" 'Sponsor-Dossier'
pdftotext "$OUT_DIR/dossier.pdf" "$OUT_DIR/dossier.txt"
dossier_text="$(cat "$OUT_DIR/dossier.txt")"
for expected in \
  'Sponsor-Dossier TEST-2142' 'Sponsor Smoke 2.14.2' 'Folgensponsoring' \
  '216.00 €' 'bezahlt' 'Seite 1'; do
  assert_contains "$dossier_text" "$expected" 'Dossier-PDF'
done
dossier_pages="$(pdfinfo "$OUT_DIR/dossier.pdf" | awk '/^Pages:/ {print $2}')"
if [[ "$dossier_pages" != '1' ]]; then
  printf 'FEHLER: Dossier enthält %s Seiten statt 1; mögliche Footer-Leerseiten.\n' "$dossier_pages" >&2
  exit 1
fi

# Preislisten-PDF: sämtliche Werbekategorie-Felder und keine Footer-Leerseiten
category_update="$(curl -fsS -b "$COOKIE_JAR" -X PUT -H 'Content-Type: application/json' \
  -d '{"name":"Komplettkategorie TEST-2142","description":"Ausführliche Beschreibung für den vollständigen Preislistenexport.","color":"#123456","defaultPosition":"Mid-Roll TEST-2142","defaultDuration":75,"presentationTemplate":"Individueller Präsentationstext TEST-2142 mit allen Leistungsangaben.","isExclusive":true,"basePrice":149.5,"pricePerEpisode":89.25,"pricePer1000Listens":12.75,"currency":"EUR","isActive":true,"sortOrder":1}' \
  "$BASE_URL/api/sponsors/categories/$slot_id")"
assert_contains "$category_update" '"name":"Komplettkategorie TEST-2142"' 'Werbekategorie-Aktualisierung'

curl -fsS -b "$COOKIE_JAR" \
  "$BASE_URL/api/sponsors/v2/price-list-pdf?title=Vollstaendige%20Preisliste%20TEST-2142&description=Alle%20Werbeoptionen%20und%20Konditionen%20im%20Ueberblick." \
  -o "$OUT_DIR/preisliste.pdf"
assert_pdf "$OUT_DIR/preisliste.pdf" 'Preisliste'
pdftotext -layout "$OUT_DIR/preisliste.pdf" "$OUT_DIR/preisliste.txt"
price_pdf_text="$(cat "$OUT_DIR/preisliste.txt")"
for expected in \
  'Komplettkategorie TEST-2142' 'Ausführliche Beschreibung' 'Mid-Roll TEST-2142' \
  '75 Sekunden' '149,50 EUR' '89,25 EUR' '12,75 EUR' 'Exklusiv' 'Ja' 'Aktiv' \
  '#123456' 'Individueller Präsentationstext TEST-2142' 'Seite 1' 'Seite 2'; do
  assert_contains "$price_pdf_text" "$expected" 'Preislisten-PDF'
done
price_pages="$(pdfinfo "$OUT_DIR/preisliste.pdf" | awk '/^Pages:/ {print $2}')"
if [[ "$price_pages" != '2' ]]; then
  printf 'FEHLER: Preisliste enthält %s Seiten statt 2; mögliche Footer-Leerseiten.\n' "$price_pages" >&2
  exit 1
fi

printf 'OK: PodCore 2.14.2 – Version, Freitext-Recherche, Themenwerkstatt, Ideenmappe, Sponsor-Buchung, Teilupdate, Dossier und vollständige Preisliste erfolgreich geprüft.\n'
printf 'Testartefakte: %s\n' "$OUT_DIR"
