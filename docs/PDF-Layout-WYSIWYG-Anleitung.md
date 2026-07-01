# PDF-Layouts erstellen — WYSIWYG-Workflow

**PodCore v2.7.0 · Anleitung für Mediengestalter**

---

## Überblick

PodCore speichert PDF-Layouts als JSON-Objekte in der Datenbank. Das bedeutet: Du gestaltest das Layout visuell in einem externen Tool, exportierst die Farbwerte und Einstellungen, und überträgst sie dann in den Layout-Manager von PodCore. Kein Code schreiben, kein Kompilieren.

---

## Empfohlene Tools

### 1. Canva (kostenlos, empfohlen für Einsteiger)

**Geeignet für:** Farbpaletten, Typografie-Konzepte, visuelle Vorschau

**Workflow:**
1. Öffne [canva.com](https://www.canva.com) und erstelle ein neues Design im Format **A4**
2. Gestalte eine Musterseite mit deinem gewünschten Layout:
   - Hintergrundfarbe des Headers
   - Überschriften-Farbe und -Größe
   - Fließtext-Farbe und -Größe
   - Trennlinien-Farbe
3. Notiere alle verwendeten Hex-Farbcodes (Klick auf Farbfeld → Hex-Code sichtbar)
4. Notiere die verwendeten Schriftgrößen in Punkt (pt)
5. Übertrage die Werte in PodCore (siehe Abschnitt „Übertragen")

**Tipp:** Canva zeigt Hex-Codes direkt beim Klick auf ein Farbelement an.

---

### 2. Figma (kostenlos, empfohlen für Profis)

**Geeignet für:** Präzises Layout-Design, Farb-Tokens, Typografie-Systeme

**Workflow:**
1. Öffne [figma.com](https://www.figma.com) und erstelle einen neuen Frame mit **A4** (794 × 1123 px bei 96 dpi)
2. Baue das Layout mit Frames und Textebenen auf:
   - **Header-Frame:** Hintergrundfarbe, Logo-Platzhalter, Podcast-Name, Dokumenttitel
   - **Inhalts-Frame:** Abschnitt-Überschriften, Fließtext, Trennlinien
   - **Footer-Frame:** Seitenzahl, Datum, Podcast-Name
3. Nutze **Local Styles** (Strg+Alt+G) um Farben und Schriften zu benennen
4. Exportiere die Farbwerte über das Inspect-Panel (rechte Seite → „Fill" → Hex-Code kopieren)
5. Übertrage in PodCore

**Tipp:** Im Figma Inspect-Panel werden alle Werte in pt angezeigt — direkt verwendbar.

---

### 3. Adobe InDesign (kostenpflichtig, für Profis)

**Geeignet für:** Wenn du bereits mit InDesign arbeitest und professionelle Drucklayouts kennst

**Workflow:**
1. Neues Dokument: **A4**, Ränder nach Wunsch (Standard: 50 pt = ca. 17,6 mm)
2. Gestalte eine Musterseite mit Musterrahmen
3. Farbwerte auslesen: Fenster → Farbe → Hex-Wert ablesen
4. Schriftgrößen in pt direkt aus dem Zeichenformat übernehmen
5. In PodCore übertragen

---

### 4. Coolors.co (kostenlos, für Farbpaletten)

**Geeignet für:** Schnelle, harmonische Farbpaletten generieren

**Workflow:**
1. Öffne [coolors.co](https://coolors.co/generate)
2. Drücke **Leertaste** um neue Paletten zu generieren, oder gib eine Primärfarbe ein
3. Exportiere die Palette als **Hex-Codes**
4. Weise die Farben den PodCore-Feldern zu (Tabelle unten)

---

## Farbzuweisung: Von deinem Design zu PodCore

| PodCore-Feld | Bedeutung | Beispiel aus Figma/Canva |
|---|---|---|
| **Primär** | Überschriften, Sponsor-Name, Gesamt-Betrag | Deine Hauptmarkenfarbe |
| **Sekundär** | Tabellen-Header-Hintergrund, Unterüberschriften | Etwas dunkler als Primär |
| **Akzent** | Trennlinien, Badges, Highlights | Kontrastfarbe zur Primärfarbe |
| **Text** | Normaler Fließtext | Fast Schwarz, z.B. `#111111` |
| **Gedämpft** | Meta-Infos, Footer-Text, Datumsangaben | Grau, z.B. `#888888` |
| **Hintergrund** | Header-Balken-Hintergrund | Dunkle Markenfarbe |
| **Header-Text** | Text im Header-Balken | Weiß oder helles Grau |

---

## Typografie-Zuweisung

PodCore unterstützt drei eingebettete Schriftfamilien (keine externen Fonts nötig):

| PodCore-Wert | Schrift | Wann verwenden |
|---|---|---|
| `Helvetica` | Helvetica / Arial | Modern, sachlich, Podcast-Standard |
| `Times-Roman` | Times New Roman | Klassisch, journalistisch |
| `Courier` | Courier | Technisch, Skript-Stil |

**Schriftgrößen** (Empfehlungen):

| Feld | Empfehlung | Minimum | Maximum |
|---|---|---|---|
| Titel | 20 pt | 16 pt | 28 pt |
| Untertitel | 14 pt | 11 pt | 18 pt |
| Überschrift | 12 pt | 10 pt | 16 pt |
| Fließtext | 10 pt | 8 pt | 13 pt |
| Klein | 8 pt | 6 pt | 10 pt |

---

## Schritt-für-Schritt: Layout in PodCore übertragen

### Schritt 1 — Layout-Manager öffnen

Navigiere in PodCore zu **PDF-Layouts** (linke Navigation, unterhalb von Administration).

### Schritt 2 — Neues Layout anlegen

Klicke auf das **+**-Symbol oben rechts in der Layout-Liste.

- **Name:** Vergib einen aussagekräftigen Namen, z.B. `Podcast-CI 2024`
- **Export-Typ:** Wähle, für welchen Export das Layout gilt:
  - *Alle Exporte* — gilt für alle vier PDF-Typen
  - *Episoden-Dokument* — nur für den Episoden-Editor
  - *Ideenmappe* — nur für den Redaktions-Hub
  - *Redaktionskalender* — nur für den Kalender
  - *Sponsoring-Abrechnung* — nur für die Sponsor-Abrechnung
- **Basierend auf:** Wähle ein bestehendes Layout als Ausgangsbasis (empfohlen: „Standard")
- Klicke **Erstellen**

### Schritt 3 — Farben eintragen

Öffne den Bereich **Farben** im Layout-Editor.

Klicke auf das Farbfeld oder gib den Hex-Code direkt in das Textfeld ein (Format: `#RRGGBB`).

### Schritt 4 — Typografie einstellen

Öffne den Bereich **Typografie**.

- Wähle die **Schriftfamilie** aus dem Dropdown
- Trage die Schriftgrößen in Punkt (pt) ein

### Schritt 5 — Header konfigurieren

Öffne den Bereich **Header**.

| Option | Beschreibung |
|---|---|
| **Banner** | Farbiger Balken über der gesamten Seitenbreite mit Logo links, Text rechts |
| **Minimal** | Nur eine dünne Trennlinie, kein farbiger Balken |
| **Seitenstreifen** | Schmaler farbiger Streifen am linken Rand, Text darunter |

Aktiviere oder deaktiviere Logo, Podcast-Name und Dokumenttitel nach Bedarf.

> **Hinweis:** Das Logo wird automatisch aus dem Branding-Bereich der App geladen (Einstellungen → Branding & Backup → Logo hochladen).

### Schritt 6 — Footer konfigurieren

Öffne den Bereich **Footer**.

- **Seitenzahlen:** Empfohlen bei mehrseitigen Dokumenten
- **Datum:** Zeigt das Exportdatum
- **Podcast-Name:** Zeigt den Podcast-Namen aus den Einstellungen
- **Benutzerdefinierter Text:** Freitext, z.B. `Vertraulich · Nur für interne Verwendung`

### Schritt 7 — Sektionen aktivieren/deaktivieren

Öffne den Bereich **Sichtbare Sektionen**.

Hier steuerst du, welche Inhaltsbereiche im PDF erscheinen. Beispiel:

- Für ein **kompaktes Episoden-Dokument** für Besprechungen: Nur *Metadaten* und *Script-Blöcke* aktivieren, *Technische Daten* und *Interne Notizen* deaktivieren
- Für eine **vollständige Produktion**: Alle Sektionen aktivieren

### Schritt 8 — Seite konfigurieren

Öffne den Bereich **Seite & Ränder**.

- **Seitengröße:** A4 (Europa-Standard) oder Letter (US-Standard)
- **Seitenrand:** Abstand vom Seitenrand in Punkt (Standard: 50 pt = ca. 17,6 mm)

### Schritt 9 — Speichern

Klicke auf den **Speichern**-Button oben rechts im Editor.

Das Layout ist sofort in allen Export-Dialogen verfügbar.

### Schritt 10 — Als Standard markieren (optional)

Aktiviere die Checkbox **Als Standard-Layout verwenden** im Allgemein-Bereich, damit das Layout automatisch vorausgewählt wird.

---

## Layout beim Export auswählen

An jedem PDF-Export-Button erscheint ein **Layout-Dropdown**:

```
Layout: [Podcast-CI 2024 ▾]  [PDF Export]
```

Wähle das gewünschte Layout direkt vor dem Export aus. Die Auswahl gilt nur für diesen Export und wird nicht gespeichert.

---

## Backup und Wiederherstellung

Layouts werden in der PodCore-Datenbank gespeichert (`~/.podcore/podcore.db`, Tabelle `pdf_layouts`). Sie sind automatisch im vollständigen Datenbank-Backup enthalten (Einstellungen → Branding & Backup → Datenbank exportieren).

### Manuelles Exportieren eines Layouts (für Weitergabe)

Öffne in einem Terminal:

```bash
# Layout als JSON exportieren (ID aus der URL des Layout-Editors)
curl -s http://localhost:3001/api/pdf-layouts/<LAYOUT-ID> \
  -H "Cookie: $(cat ~/.podcore/session.txt)" \
  > mein-layout.json
```

### Manuelles Importieren

```bash
# Layout importieren
curl -s -X POST http://localhost:3001/api/pdf-layouts \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat ~/.podcore/session.txt)" \
  -d @mein-layout.json
```

---

## Häufige Fragen

**Kann ich eigene Schriften einbinden?**
Nein, PDFKit (die verwendete PDF-Bibliothek) unterstützt nur die drei eingebetteten Schriften. Für eigene Schriften wäre eine Erweiterung der `pdfLayouts.ts` erforderlich (Developer-Guide beachten).

**Warum sieht das PDF anders aus als in Canva/Figma?**
PDF-Rendering mit PDFKit unterscheidet sich von Bildschirm-Rendering. Schriften wirken auf Papier etwas kleiner. Empfehlung: Testexport direkt nach dem Einrichten der Werte durchführen.

**Kann ich ein Layout für mehrere Export-Typen gleichzeitig verwenden?**
Ja — wähle beim Erstellen den Typ **Alle Exporte**. Das Layout erscheint dann in allen vier Export-Dialogen.

**Was passiert, wenn ich das Standard-Layout lösche?**
System-Layouts (Standard, Minimal) können nicht gelöscht werden. Eigene Layouts können gelöscht werden; PodCore fällt dann automatisch auf das System-Standard-Layout zurück.
