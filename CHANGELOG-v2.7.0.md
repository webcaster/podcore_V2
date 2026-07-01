# PodCore v2.7.0 — Änderungsprotokoll

## Neue Funktionen

### 1. Sponsoring-Automatik

**Zeitgesteuerte Werbebuchungen ohne verknüpfte Folge**

Sponsoren können nun Werbeplätze für einen Zeitraum buchen, ohne direkt eine Folge angeben zu müssen. Sobald eine Episode mit einem Veröffentlichungsdatum gespeichert wird, das in diesen Zeitraum fällt, wird die Werbebuchung automatisch der Folge zugeordnet.

**Exklusivitäts-Check (Folgensponsor)**

Ist eine Werbekategorie als exklusiv markiert, kann pro Veröffentlichungsdatum nur ein Sponsor dieser Kategorie zugewiesen werden. Ein zweiter Sponsor wird automatisch übersprungen. Die Prüfung greift sowohl beim Erstellen als auch beim Aktualisieren einer Episode.

**Konfiguration:**
- Werbeplatz anlegen: *Sponsoring → Sponsor → Werbeplätze → Neu*
- Zeitraum mit Start- und Enddatum eintragen (Folge muss nicht angegeben werden)
- Kategorie als „Exklusiv" markieren, um den Folgensponsor-Schutz zu aktivieren

---

### 2. Episoden-Editor Pro

**Automatische Zeitberechnung**

Die Dauer eines Script-Blocks wird automatisch aus der Wortanzahl des eingegebenen Textes berechnet (Basis: 150 Wörter/Minute = 2,5 Wörter/Sekunde). Die berechnete Zeit erscheint im Block-Header und wird mit einem blauen Chip-Symbol (`⚙`) als automatisch erkannt. Manuelle Eingabe überschreibt die Berechnung dauerhaft.

**Media Library Integration (Intro / Outro / Jingle)**

Blöcke vom Typ *Intro*, *Outro* und *Jingle* zeigen nun eine Schaltfläche „Datei wählen". Darüber öffnet sich ein Modal mit der gesamten Media Library. Jede Datei zeigt:
- Dateiname und Typ
- Dateigröße in MB
- Dauer in mm:ss (sofern erkannt)

Nach der Auswahl wird die Datei-Dauer automatisch in den Block übernommen.

**Platzhalter-Blöcke**

Ist noch keine Datei verknüpft, wird der Block als Platzhalter angezeigt:
> `Platzhalter: Intro (30s)`

Der Platzhalter enthält Titel und die manuell oder automatisch berechnete Dauer.

---

### 3. Custom PDF-Layouts

**Layout-Manager** *(Navigation → PDF-Layouts)*

Eigene Layouts für alle vier PDF-Export-Typen erstellen und verwalten:

| Export-Typ | Verwendung |
|---|---|
| Episoden-Dokument | Episoden-Editor → PDF Export |
| Ideenmappe | Redaktions-Hub → Idee → PDF exportieren |
| Redaktionskalender | Kalender → PDF exportieren |
| Sponsoring-Abrechnung | Sponsor → Abrechnung → Abrechnung als PDF |

**Einstellbare Parameter je Layout:**
- Seitengröße (A4 / Letter) und Ränder
- Farben (Primär, Sekundär, Akzent, Text, Hintergrund, Gedämpft)
- Typografie (Schriftfamilie, Größen für Titel / Überschrift / Fließtext / Klein)
- Header-Stil (Banner / Minimal / Seitenstreifen) mit Logo, Podcast-Name und Dokumenttitel
- Footer mit Seitenzahlen, Datum, Podcast-Name und eigenem Text
- Sichtbare Sektionen (je nach Export-Typ konfigurierbar)

**System-Layouts** sind schreibgeschützt und können dupliziert werden. Eigene Layouts können als Standard markiert werden.

**Layout-Auswahl** erscheint direkt neben dem jeweiligen Export-Button als Dropdown.

---

### 4. Media Library — Dauer-Erkennung

Beim Upload einer Audio- oder Videodatei wird die Dauer automatisch via `ffprobe` erkannt und in der Datenbank gespeichert. Die Dauer wird in der Media Library und im Episoden-Editor (Media-Picker) angezeigt.

---

## Technische Details

- Backend: `server/pdfLayouts.ts` — zentrale Layout-Engine mit `renderPdfHeader`, `renderPdfFooter`, `renderSectionHeading`
- Backend: `server/routers/pdfLayouts.ts` — CRUD-Router für `/api/pdf-layouts`
- Frontend: `PdfLayoutManagerPage.tsx` — vollständiger Layout-Editor
- Frontend: `PdfLayoutPicker.tsx` — wiederverwendbare Dropdown-Komponente für alle Export-Dialoge
- Alle vier PDF-Exporte (Episode, Idee, Kalender, Rechnung) nutzen die gemeinsame Layout-Engine
