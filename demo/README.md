# PodCore Demo-Daten

**Version:** 2.7.0 · **Podcast:** Deep Dive Digital — Tech & Gesellschaft

---

## Was ist enthalten?

Die Demo-Daten simulieren einen vollständig betriebenen Podcast-Workflow mit realistischen Inhalten.

| Bereich | Inhalt |
|---|---|
| **Podcast** | „Deep Dive Digital" — Tech & Gesellschaft |
| **Staffeln** | 2 Staffeln (Staffel 1 abgeschlossen, Staffel 2 aktiv) |
| **Episoden** | 10 Episoden (5× veröffentlicht, 1× Schnitt, 1× Aufnahme, 3× Entwurf) |
| **Benutzer** | 4 Benutzer (Admin, Redakteur, Moderator, Produktion) |
| **Sponsoren** | 4 Sponsoren (3 aktiv, 1 Interessent) |
| **Werbeplätze** | 3 Ad Slots mit 6 Placements und Rechnungsdaten |
| **Werbekategorien** | 4 Kategorien (Pre-Roll, Mid-Roll, Post-Roll, Folgensponsor) |
| **Ideen** | 6 Ideen in verschiedenen Status |
| **Interview-Partner** | 5 Gäste mit Biografie und Fragen |
| **Redaktionsplan** | 6 Planungseinträge |
| **Notizen** | 5 Redaktionsnotizen (inkl. Workflow-Dokumente) |
| **Recherche-Quellen** | 6 Quellen |
| **Statistiken** | 16 Statistik-Einträge |

---

## Demo-Zugangsdaten

| Benutzername | Passwort | Rolle |
|---|---|---|
| `max.mueller` | `demo1234` | Administrator |
| `sarah.schneider` | `demo1234` | Redakteur |
| `tom.weber` | `demo1234` | Moderator |
| `lena.braun` | `demo1234` | Produktion |

---

## Import-Anleitung

### Voraussetzung

PodCore muss mindestens einmal gestartet worden sein, damit die Datenbank angelegt wurde.

### macOS / Linux

```bash
# Skript ausführbar machen
chmod +x import-demo.sh

# Import starten
./import-demo.sh
```

### Windows

1. `sqlite3.exe` von [sqlite.org/download.html](https://www.sqlite.org/download.html) herunterladen
2. `sqlite3.exe` in diesen Ordner legen
3. `import-demo.bat` doppelklicken

### Manuell (alle Systeme)

```bash
sqlite3 ~/.podcore/podcore.db < demo-data.sql
```

Auf Windows (PowerShell):
```powershell
sqlite3 "$env:USERPROFILE\.podcore\podcore.db" < demo-data.sql
```

---

## Demo-Daten wieder entfernen

Alle Demo-Datensätze haben IDs, die mit `demo-` beginnen. So kannst du sie gezielt entfernen:

```sql
-- In sqlite3 ausführen:
DELETE FROM episodes WHERE id LIKE 'demo-%';
DELETE FROM ideas WHERE id LIKE 'demo-%';
DELETE FROM sponsors WHERE id LIKE 'demo-%';
DELETE FROM ad_slots WHERE id LIKE 'demo-%';
DELETE FROM ad_placements WHERE id LIKE 'demo-%';
DELETE FROM ad_categories WHERE id LIKE 'demo-%';
DELETE FROM seasons WHERE id LIKE 'demo-%';
DELETE FROM users WHERE id LIKE 'demo-%';
DELETE FROM interview_partners WHERE id LIKE 'demo-%';
DELETE FROM interview_questions WHERE id LIKE 'demo-%';
DELETE FROM editorial_plan WHERE id LIKE 'demo-%';
DELETE FROM editorial_notes WHERE id LIKE 'demo-%';
DELETE FROM research_sources WHERE id LIKE 'demo-%';
DELETE FROM podcast_stats WHERE id LIKE 'demo-%';
DELETE FROM idea_checklists WHERE id LIKE 'demo-%';
DELETE FROM idea_notes WHERE id LIKE 'demo-%';
```

---

## Hinweise

- Das Import-Skript erstellt automatisch ein Backup der Datenbank vor dem Import.
- `INSERT OR IGNORE` stellt sicher, dass bestehende Daten nicht überschrieben werden.
- Die Demo-Daten sind auf Deutsch und für einen deutschsprachigen Podcast ausgelegt.
- Alle Episoden-Beschreibungen und Scripts sind fiktiv und dienen nur zur Demonstration.
