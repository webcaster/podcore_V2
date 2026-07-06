# PodCore v2.11.5 – Demodaten Setup

Dieses Dokument erklärt, wie Sie die Demodaten für PodCore v2.11.5 laden und verwenden.

## Überblick

Die Demodaten enthalten:
- **3 Podcasts** mit realistischen Metadaten
- **5 Benutzer** mit verschiedenen Rollen (Admin, Moderator, Editor)
- **5 Sponsoren** mit Kontaktdaten und Farben
- **5 Werbekategorien** mit Standard-Preisen
- **10 Werbeplätze** (Slots) mit verschiedenen Preismodellen
- **10 Episoden** in verschiedenen Status (published, draft, pending_approval)
- **12 Buchungen** (Placements) für verschiedene Episoden
- **9 Interview-Fragen** mit Status-Tracking
- **3 Wiki-Artikel** mit Dokumentation
- **3 Podcast-Profile** mit globalen Einstellungen

**Start-Datum**: Januar 2026

---

## Installation

### Option 1: Mit Node.js Skript (empfohlen)

```bash
cd /home/ubuntu/podcore_V2
node seed-demo-data.mjs
```

Das Skript wird:
1. Das Verzeichnis `~/.podcore` erstellen (falls nicht vorhanden)
2. Die Datenbank initialisieren
3. Alle Demodaten einfügen
4. Statistiken anzeigen

### Option 2: Mit SQL-Datei direkt

```bash
cd /home/ubuntu/podcore_V2
sqlite3 ~/.podcore/podcore.db < seed-demo-data.sql
```

---

## Demodaten-Übersicht

### Podcasts

| ID | Titel | Beschreibung | Status |
|---|---|---|---|
| pod-001 | Tech Talk Daily | Täglicher Podcast über Technologie | active |
| pod-002 | Marketing Minds | Interviews mit Top-Marketern | active |
| pod-003 | Startup Stories | Gründer-Geschichten | active |

### Benutzer (Admin-Zugang)

| Email | Name | Rolle | Podcast | Passwort |
|---|---|---|---|---|
| max@techtalkdaily.de | Max Müller | admin | Tech Talk Daily | (siehe Notizen) |
| anna@techtalkdaily.de | Anna Schmidt | moderator | Tech Talk Daily | (siehe Notizen) |
| tom@techtalkdaily.de | Tom Weber | editor | Tech Talk Daily | (siehe Notizen) |
| lisa@marketingminds.de | Lisa König | admin | Marketing Minds | (siehe Notizen) |
| peter@startupstories.de | Peter Braun | admin | Startup Stories | (siehe Notizen) |

**Hinweis**: Die Passwörter sind in den Demodaten nicht enthalten. Sie müssen sich über das normale Login-Verfahren anmelden oder die Passwörter manuell setzen.

### Sponsoren

| ID | Name | Unternehmen | Kontakt | Status |
|---|---|---|---|---|
| sponsor-001 | TechHub | TechHub GmbH | Klaus Fischer | active |
| sponsor-002 | CloudServe | CloudServe AG | Maria Hoffmann | active |
| sponsor-003 | DataViz Pro | DataViz Solutions | Robert Müller | active |
| sponsor-004 | Marketing Suite | Marketing Suite Inc | Jennifer Chen | active |
| sponsor-005 | Startup Accelerator | Startup Accelerator Fund | David Lehmann | active |

### Werbeplätze (Slots)

**Tech Talk Daily**:
- TechHub Pre-Roll (30s, Festpreis €100)
- TechHub Mid-Roll (60s, €150/Folge)
- TechHub Folgensponsor (90s, €0.05/1000 Hörer)
- CloudServe Pre-Roll (30s, Festpreis €120)
- CloudServe Post-Roll (30s, €100/Folge)
- DataViz Pro Mid-Roll (60s, €0.08/1000 Hörer)

**Marketing Minds**:
- Marketing Suite Pre-Roll (30s, Festpreis €140)
- Marketing Suite Folgensponsor (90s, €180/Folge)

**Startup Stories**:
- Startup Accelerator Pre-Roll (30s, Festpreis €200)
- Startup Accelerator Mid-Roll (60s, €250/Folge)

### Episoden

**Tech Talk Daily** (pod-001):
- Episode 1: "KI und die Zukunft der Softwareentwicklung" (published)
- Episode 2: "Cloud-Migration: Best Practices 2026" (published)
- Episode 3: "Cybersecurity im Homeoffice" (published)
- Episode 4: "Blockchain für Anfänger" (pending_approval)

**Marketing Minds** (pod-002):
- Episode 1: "Social Media Trends 2026" (published)
- Episode 2: "Influencer Marketing ROI" (published)
- Episode 3: "Email Marketing Automation" (draft)

**Startup Stories** (pod-003):
- Episode 1: "Von der Idee zum Unicorn" (published)
- Episode 2: "Scheitern ist der erste Schritt zum Erfolg" (published)
- Episode 3: "Fundraising im Jahr 2026" (pending_approval)

### Buchungen (Placements)

Insgesamt **12 Buchungen** für verschiedene Episoden:
- 3 Buchungen für Episode 1 (Tech Talk Daily)
- 3 Buchungen für Episode 2 (Tech Talk Daily)
- 2 Buchungen für Episode 3 (Tech Talk Daily)
- 2 Buchungen für Episode 5 (Marketing Minds)
- 2 Buchungen für Episode 8 (Startup Stories)

**Status**: Alle Buchungen sind "confirmed" oder "offen"
**Rechnungsstatus**: Mix aus "offen" und "bezahlt"

---

## Was Sie testen können

### 1. **Sponsor-Management**
- Öffnen Sie "Sponsoren" → Wählen Sie einen Sponsor
- Sehen Sie alle Werbeplätze und Buchungen
- Bearbeiten Sie Buchungen (Preis, Status, etc.)

### 2. **Episoden-Editor**
- Öffnen Sie eine Episode
- Sehen Sie die zugeordneten Werbeplatzierungen
- Bearbeiten Sie die Sponsoring-Details

### 3. **Buchungskalender**
- Sehen Sie alle Buchungen im Kalender-Grid
- Exportieren Sie als CSV
- Filtern Sie nach Sponsor oder Status

### 4. **Abrechnung**
- Öffnen Sie "Sponsoren" → "Abrechnung"
- Sehen Sie alle Buchungen mit Preisen
- Generieren Sie Leistungsübersicht-PDF
- Exportieren Sie Buchungsbestätigung

### 5. **Freigabe-Center**
- Öffnen Sie "Freigaben"
- Sehen Sie ausstehende Episoden und Interview-Fragen
- Genehmigen oder lehnen Sie ab

### 6. **Wiki**
- Öffnen Sie "Wiki"
- Lesen Sie die Dokumentation
- Bearbeiten Sie Artikel

---

## Datenbank-Struktur

Die Demodaten verwenden folgende Tabellen:

```
podcasts
├── users
├── episodes
│   ├── interview_questions
│   └── ad_placements
├── sponsors
│   ├── ad_slots
│   ├── ad_categories
│   └── ad_placements
├── podcast_profiles
└── wiki_articles
```

---

## Häufig gestellte Fragen

### F: Wie ändere ich die Demodaten?
A: Bearbeiten Sie die Datei `seed-demo-data.sql` und führen Sie das Skript erneut aus.

### F: Wie lösche ich die Demodaten?
A: Löschen Sie die Datenbank-Datei: `rm ~/.podcore/podcore.db`

### F: Kann ich die Demodaten zusammen mit echten Daten verwenden?
A: Ja, aber achten Sie darauf, dass die IDs nicht kollidieren. Verwenden Sie eindeutige Präfixe (z.B. `demo-001` für Demodaten).

### F: Wie aktualisiere ich die Demodaten auf eine neue Version?
A: Laden Sie die neue `seed-demo-data.sql` herunter und führen Sie das Skript aus.

---

## Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Logs: `.manus-logs/devserver.log`
2. Starten Sie den Server neu: `npm start`
3. Laden Sie die Demodaten neu: `node seed-demo-data.mjs`

---

**Viel Spaß beim Testen von PodCore v2.11.5! 🚀**
