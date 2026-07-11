# PodCore v2.14.0 - Release Notes

Dieses Update konzentriert sich auf die Optimierung des Workflows, die Verbesserung der Zusammenarbeit und die Einführung datenbasierter Automatisierungen im Episoden-Editor und Redaktions-Hub.

## Neue Funktionen und Verbesserungen

### 1. Workflow-Optimierung & Live-Vorschau

- **Dashboard (EpisodesDashboard.tsx):**
  - Zentrales Schnellzugriff-Dashboard mit Statistiken und Filterfunktionen.
  - Tastatur-Shortcuts für schnelle Aktionen (z.B. `Strg+N` für neue Episoden).
- **Inline-Editing (EditableField.tsx):**
  - Umstellung der Metadaten-Eingabe von Modals auf direktes Inline-Editing.
  - Automatische Speicherung nach 2 Sekunden Inaktivität.
  - Echtzeit-Validierung der Eingaben.
  - Undo/Redo-Unterstützung (`Strg+Z`).
- **Sponsoring & Medien:**
  - **Sponsoring-Schnellbuchung (SponsoringQuickBook.tsx):** 1-Klick-Buchungssystem für Werbeplätze.
  - **Integrierte Medienverwaltung (EpisodeMediaManager.tsx):** Drag-and-Drop-Upload direkt im Editor.
- **Split-View (PreviewPane.tsx):**
  - Live-Vorschau parallel zum Editor.
  - Echtzeit-Rendering von Markdown-Beschreibungen und Episoden-Status.

### 2. Zusammenarbeit & Feedback-System

- **Kommentare (CommentThread.tsx):**
  - Feldbezogenes Kommentarsystem mit Diskussions-Threads.
  - `@Mentions` für Teammitglieder.
  - 
  - "Gelöst"-Status für Kommentare.
- **Versionsverlauf (ChangeHistory.tsx):**
  - Lückenloser Änderungsverlauf mit Audit-Log (Wer hat was wann geändert?).
  - Visueller Diff-Vergleich.
  - Rollback-Funktion zur Wiederherstellung älterer Stände.
- **Benachrichtigungen:**
  - Echtzeit-Benachrichtigungen via WebSockets bei Statusänderungen oder neuen Kommentaren.

### 3. Datenbasierte Automatisierungen

- **Automatische Zeitstempel:**
  - Integration einer Funktion, die Interviewfragen automatisch mit Zeitstempeln versieht.
  - Auslesen von eingebetteten Audiomarkern (ID3-Tags/Kapitelmarken) aus hochgeladenen MP3/WAV-Dateien.
  - Asynchrone client-/serverseitige Analyse von Audiometadaten zur Strukturierung.
- **Sponsoring-Empfehlungen:**
  - Intelligentes Matchmaking-System im Backend.
  - Abgleich von Episoden-Tags und -Kategorien mit Sponsor-Profilen und Zielgruppenkriterien.
  - Direkte Vorschläge passender Sponsoren im Sponsoring-Tab.

## Integration mit RedaktionsHub

- Der Episoden-Editor und der RedaktionsHub arbeiten nun nahtlos zusammen, um einen reibungslosen Workflow zu gewährleisten.
- Änderungen im RedaktionsHub werden in Echtzeit im Episoden-Editor synchronisiert.

## Technische Hinweise

- **Backend:** Erweiterung des SQLite-Schemas um neue Tabellen für Revisionsverlauf, Kommentare, Benachrichtigungen, Medienverknüpfungen, Audioanalyse-Jobs und Sponsor-Targeting.
- **Echtzeit:** Implementierung einer zentralen WebSocket-Schicht für Episodenereignisse und persönliche Benachrichtigungen.
- **Frontend:** Umfassende Überarbeitung des Episoden-Editors mit neuen Komponenten für Inline-Editing, Live-Vorschau, Sponsoring-Schnellbuchung und Medienverwaltung.

## Installation und Update

Für ein Update auf Version 2.14.0 führen Sie bitte die üblichen Schritte für die Aktualisierung Ihrer PodCore-Installation aus. Es sind keine manuellen Migrationsschritte für die Datenbank erforderlich, da diese automatisch beim Start des Servers aktualisiert wird.

## Danksagung

Vielen Dank an alle Mitwirkenden für ihre Beiträge zu diesem umfangreichen Update!
