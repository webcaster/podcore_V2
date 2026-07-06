# PodCore Sponsoring-System v2.12.0 – Konzeptüberarbeitung

## Probleme des aktuellen Systems (v2.11.x)

### 1. **Datenmodell-Verwirrung**
- **Zu viele Tabellen**: `ad_slots`, `ad_placements`, `episode_ad_bookings`, `ad_categories`
- **Unklare Semantik**: Slot vs. Placement vs. Booking – was ist der Unterschied?
- **Redundante Felder**: Preise, Status, Daten sind über mehrere Tabellen verteilt
- **Nullable Felder**: `episode_id` ist jetzt nullable, aber das Konzept war nie klar

### 2. **Benutzer-Workflow-Probleme**
- Moderator sieht "Platzierungsübersicht" → kann nicht bearbeiten
- Preise und Kategorien werden nicht übernommen
- Position zeigt UUID statt Platzierungsname
- Buchungskalender zeigt Vorplanungen im CSV, aber nicht im Kalender-Grid

### 3. **Geschäftslogik-Mismatch**
- Slots sind "Werbe-Platzierungen" (z.B. "Pre-Roll 30s")
- Placements sind "konkrete Buchungen" (z.B. "Sponsor X bucht Pre-Roll für Episode 5")
- Aber: Slots können auch ohne Episode sein (Zeitraum-Buchungen)
- Und: Placements können auch ohne Episode sein (Vorplanungen)
- **Resultat**: Verwirrende Überlappung

### 4. **Abrechnung-Probleme**
- Leistungsübersicht vs. Buchungsbestätigung – wann wird was angezeigt?
- Preisanpassungen und Hörer-Gebühren sind optional, aber nicht intuitiv
- CSV-Export zeigt Vorplanungen, aber Kalender nicht

---

## Neues System-Konzept v2.12.0

### Kernidee: **Drei klare Ebenen**

```
┌─────────────────────────────────────────────────────┐
│ 1. SPONSORING-VERTRÄGE (Sponsor + Werbekategorien)  │
│    └─ Laufzeit, Kontakt, Bedingungen                │
├─────────────────────────────────────────────────────┤
│ 2. WERBE-SLOTS (Verfügbare Platzierungen)           │
│    └─ Pre-Roll, Mid-Roll, Post-Roll, Folgensponsor │
│    └─ Zeitraum oder Episode-spezifisch              │
├─────────────────────────────────────────────────────┤
│ 3. BUCHUNGEN (Konkrete Zuweisungen)                 │
│    └─ Slot + Sponsor + Episode/Zeitraum + Preis     │
│    └─ Status: Geplant → Bestätigt → Ausgestrahlt    │
└─────────────────────────────────────────────────────┘
```

### 1. **Sponsoring-Verträge** (Neue Tabelle: `sponsor_contracts`)

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Eindeutige ID |
| `sponsor_id` | FK | Verweis auf Sponsor |
| `contract_start` | DATE | Vertragsbeginn |
| `contract_end` | DATE | Vertragsende |
| `contact_person` | TEXT | Ansprechpartner |
| `contact_email` | TEXT | E-Mail |
| `contact_phone` | TEXT | Telefon |
| `notes` | TEXT | Interne Notizen |
| `status` | ENUM | aktiv / auslaufend / beendet |
| `created_at` | TIMESTAMP | Erstellt am |

**Zweck**: Zentrale Verwaltung aller Sponsor-Verträge mit Laufzeiten und Kontaktdaten.

---

### 2. **Werbe-Slots** (Vereinfachte Tabelle: `ad_slots`)

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Eindeutige ID |
| `sponsor_id` | FK | Sponsor (optional für Template-Slots) |
| `slot_name` | TEXT | z.B. "Pre-Roll 30s" |
| `position` | ENUM | pre-roll / mid-roll / post-roll / folgensponsor |
| `duration_seconds` | INT | z.B. 30, 60 |
| `category_id` | FK | Werbekategorie |
| `price_model` | ENUM | fixed / per_episode / per_1000_listeners |
| `base_price` | DECIMAL | Basispreis (EUR) |
| `price_per_episode` | DECIMAL | Preis pro Folge (EUR) |
| `price_per_1000_listeners` | DECIMAL | CPM (EUR) |
| `slot_type` | ENUM | episode_specific / timeframe / recurring |
| `episode_id` | FK | Nur wenn episode_specific (optional) |
| `timeframe_start` | DATE | Nur wenn timeframe (optional) |
| `timeframe_end` | DATE | Nur wenn timeframe (optional) |
| `status` | ENUM | aktiv / inaktiv / archiviert |
| `notes` | TEXT | Interne Notizen |
| `created_at` | TIMESTAMP | Erstellt am |

**Zweck**: Template/Konfiguration für verfügbare Werbe-Platzierungen.

---

### 3. **Buchungen** (Neue Tabelle: `ad_bookings`)

| Feld | Typ | Beschreibung |
|---|---|---|
| `id` | UUID | Eindeutige ID |
| `slot_id` | FK | Verweis auf Werbe-Slot |
| `sponsor_id` | FK | Sponsor (redundant, aber für schnelle Abfragen) |
| `episode_id` | FK | Episode (optional – NULL für Zeitraum-Buchungen) |
| `booking_date` | DATE | Ausstrahlungsdatum (oder Start-Datum bei Zeitraum) |
| `booking_end_date` | DATE | End-Datum bei Zeitraum-Buchungen (optional) |
| `price` | DECIMAL | Gebuchter Preis (EUR) |
| `price_adjustment` | DECIMAL | Manuelle Anpassung (optional) |
| `listener_fee` | DECIMAL | Hörer-Gebühr (optional) |
| `final_price` | DECIMAL | Endsumme (price + price_adjustment + listener_fee) |
| `invoice_status` | ENUM | offen / versendet / bezahlt / storniert |
| `invoice_number` | TEXT | Rechnungsnummer (optional) |
| `invoice_date` | DATE | Rechnungsdatum (optional) |
| `delivery_confirmed` | BOOLEAN | Ausgestrahlt? |
| `listener_count` | INT | Tatsächliche Hörer (für CPM-Abrechnung) |
| `status` | ENUM | geplant / bestätigt / ausgestrahlt / abgerechnet |
| `notes` | TEXT | Interne Notizen |
| `created_at` | TIMESTAMP | Erstellt am |
| `updated_at` | TIMESTAMP | Zuletzt aktualisiert |

**Zweck**: Konkrete Buchungen – die eigentliche Geschäftstransaktion.

---

## Neue Workflows

### Workflow 1: **Neuer Sponsor mit Vertrag**

```
1. Sponsor anlegen (Name, Firma, Farbe)
   ↓
2. Sponsoring-Vertrag erstellen (Laufzeit, Kontakt)
   ↓
3. Werbe-Slots definieren (Pre-Roll, Mid-Roll, etc.)
   ↓
4. Buchungen erstellen (Slot + Episode/Zeitraum + Preis)
```

### Workflow 2: **Buchung für Episode**

```
Episoden-Editor → Tab "Sponsoring"
   ↓
"Werbeplatz buchen" Button
   ↓
Modal: Sponsor auswählen → Slot auswählen → Preis bestätigen
   ↓
Buchung erstellt + Kalender aktualisiert
```

### Workflow 3: **Abrechnung nach Ausstrahlung**

```
Episode ausgestrahlt
   ↓
Hörer-Zahl von Podigee abrufen
   ↓
Finale Preisberechnung (CPM oder Festpreis)
   ↓
Leistungsübersicht generieren (PDF)
   ↓
Rechnung erstellen (externe Software)
```

---

## UI-Änderungen

### 1. **Sponsor-Detailseite**
- **Tab 1: Verträge** – Sponsoring-Verträge mit Laufzeiten
- **Tab 2: Werbe-Slots** – Verfügbare Platzierungen (Template)
- **Tab 3: Buchungen** – Konkrete Buchungen (mit Bearbeitung)
- **Tab 4: Abrechnung** – Finanzübersicht und Rechnungen

### 2. **Buchungskalender**
- **Kalender-Grid**: Nur **bestätigte Buchungen** anzeigen (nicht Slots!)
- **Vorplanungen-Bereich**: Slots ohne Buchung
- **CSV-Export**: Nur Buchungen (nicht Slots)

### 3. **Episoden-Editor**
- **Neuer Tab: "Sponsoring"** – Buchungen für diese Episode
- **"Werbeplatz buchen" Button** – Schnelle Buchung
- **Automatische Folgensponsor-Vorschläge** – Basierend auf Zeitraum-Slots

---

## Datenbank-Migration (v2.11.6 → v2.12.0)

```sql
-- Neue Tabellen
CREATE TABLE sponsor_contracts (...)
CREATE TABLE ad_bookings (...)

-- Alte Tabellen (deprecated, aber nicht gelöscht)
-- ad_slots → wird neu strukturiert
-- ad_placements → wird in ad_bookings migriert
-- episode_ad_bookings → wird in ad_bookings migriert

-- Migration
INSERT INTO ad_bookings (...)
SELECT ... FROM ad_placements
UNION ALL
SELECT ... FROM episode_ad_bookings
```

---

## Implementierungs-Roadmap

### Phase 1: **Datenbank & Backend (v2.12.0)**
- [ ] `sponsor_contracts` Tabelle erstellen
- [ ] `ad_bookings` Tabelle erstellen
- [ ] Migration von `ad_placements` → `ad_bookings`
- [ ] Neue Backend-Endpunkte für Verträge und Buchungen
- [ ] Kalender-Endpunkt auf `ad_bookings` umstellen

### Phase 2: **Frontend – Sponsor-Detailseite (v2.12.0)**
- [ ] Tab-Struktur neu: Verträge → Slots → Buchungen → Abrechnung
- [ ] Verträge-Tab mit Bearbeitung
- [ ] Buchungen-Tab mit Bearbeitung + Bearbeiten-Modal
- [ ] Position-Anzeige: Slot-Name statt UUID

### Phase 3: **Frontend – Episoden-Editor (v2.12.0)**
- [ ] Neuer "Sponsoring"-Tab
- [ ] "Werbeplatz buchen" Button
- [ ] Automatische Folgensponsor-Vorschläge

### Phase 4: **Frontend – Buchungskalender (v2.12.0)**
- [ ] Kalender zeigt nur `ad_bookings` (nicht Slots)
- [ ] Vorplanungen-Bereich für Slots ohne Buchung
- [ ] CSV-Export nur Buchungen

---

## Vorteile des neuen Systems

| Aspekt | Alt | Neu |
|---|---|---|
| **Klarheit** | Slots vs. Placements unklar | 3 klare Ebenen |
| **Bearbeitung** | Platzierungen nicht editierbar | Buchungen vollständig editierbar |
| **Preise** | Über mehrere Tabellen verteilt | Zentral in `ad_bookings` |
| **Kategorien** | Nicht konsistent übernommen | Immer vom Slot übernommen |
| **Kalender** | Zeigt Slots und Bookings gemischt | Nur Buchungen im Grid |
| **Abrechnung** | Komplex und fehleranfällig | Klare Finanzlogik |
| **Skalierbarkeit** | Schwer zu erweitern | Flexibel für neue Features |

---

## Bekannte Fehler (v2.11.5) – Werden in v2.12.0 behoben

1. ✅ Platzierungsübersicht nicht editierbar → Buchungen vollständig editierbar
2. ✅ Preise/Kategorien nicht übernommen → Automatisch vom Slot
3. ✅ Position zeigt UUID → Zeigt Slot-Namen
4. ✅ Buchungskalender zeigt Vorplanungen nicht → Separate Vorplanungen-Sektion
5. ✅ Freigabe-Center Fehler → Endpunkt-Fehler beheben

---

## Zusammenfassung

Das neue System trennt **Konfiguration** (Slots) von **Transaktionen** (Buchungen) und macht die Abrechnung transparent. Damit wird PodCore ein professionelles Sponsoring-Management-System, das Podcaster und Agenturen wirklich brauchen.

**Zielversion: v2.12.0** (August 2026)
