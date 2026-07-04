# PodCore v2.11.5

PodCore ist ein eigenständiges, lokal hostbares Podcast-Management-System zur Verwaltung von Episoden, Ideen, Medien, Sponsoren und Statistiken.

## Systemvoraussetzungen

- **Node.js** (Version 18 oder höher)
- Keine externe Datenbank erforderlich (verwendet SQLite)
- Keine Cloud-Abhängigkeiten

## Installation & Start

### Windows
1. Lade das PodCore-Paket herunter und entpacke es
2. Führe die Datei `start-windows.bat` per Doppelklick aus
3. Der Server installiert beim ersten Start automatisch alle nötigen Abhängigkeiten
4. Öffne deinen Browser und navigiere zu: `http://localhost:3001`

### macOS / Linux
1. Lade das PodCore-Paket herunter und entpacke es
2. Öffne das Terminal im PodCore-Verzeichnis
3. Mache das Start-Skript ausführbar: `chmod +x start-unix.sh`
4. Führe das Skript aus: `./start-unix.sh`
5. Öffne deinen Browser und navigiere zu: `http://localhost:3001`

## Standard-Zugangsdaten

Beim ersten Start wird automatisch ein Administrator-Account angelegt:

- **Benutzername:** admin
- **Passwort:** admin123

*(Bitte ändere das Passwort nach dem ersten Login in den Einstellungen)*

## Funktionen

### Redaktions-Hub
- **Ideenpool:** Ideen sammeln, bewerten und priorisieren
- **Redaktionsplan:** Geplante Episoden in Kalender-Ansicht
- **Interviews:** Interview-Partner verwalten und Fragen vorbereiten
- **Notizen & Recherche:** Zentrale Notizenverwaltung

### Episoden-Management
- **Block-Editor:** Strukturierter Script-Editor mit verschiedenen Block-Typen (Intro, Segment, Interview, Werbung, Jingle, Outro)
- **Interview-Fragen-Block:** Fragen direkt im Script integrieren und verwalten
- **Show-Notes & Kapitelmarken:** Metadaten, Zeitstempel und Kapitelstruktur
- **PDF-Export:** Vollständige Episode als PDF exportieren
- **Freigabe-System:** Moderatoren können Episoden und Interview-Fragen freigeben/ablehnen

### Sponsoren & Werbung
- **Werbekategorien:** Flexible Kategorisierung von Werbeplätzen
- **Ad-Slots (Werbeplätze):** Zeitraum-basierte oder episoden-spezifische Buchungen
- **Platzierungen:** Konkrete Buchungen mit flexiblem Preismodell (Festpreis, Pro Folge, CPM)
- **Buchungskalender:** Monatsansicht aller Werbeplatzierungen mit Konflikt-Erkennung
- **Buchungsbestätigung:** PDF für Kunden mit allen Vorplanungen und Buchungen
- **Leistungsübersicht:** Detaillierte Statistiken nach Episode-Ausstrahlung
- **Abrechnungstool:** Manuelle Preisanpassungen und optionale Hörer-Gebühren
- **CSV-Export:** Buchungskalender als CSV exportierbar

### Moderator & Freigabe-Center
- **Zentrales Freigabe-Center:** Alle Freigabe-Anfragen (Episoden + Interviews) an einem Ort
- **Flexible Rollen:** Verschiedene Rollen können Freigaben durchführen
- **Dashboard-Widget:** Ausstehende Freigaben direkt im Dashboard sichtbar

### Media Library
- **Audio-Verwaltung:** Upload und Organisation von Audiodateien
- **Metadaten:** Tags, Kategorien und Beschreibungen
- **Sponsoren-Assets:** Verwaltung von Sponsoren-Logos und Werbematerialien
- **Cloud-Speicher:** Unterstützung für lokale Speicherung, WebDAV (Nextcloud/OneDrive) und S3-kompatible Speicher

### Statistiken & Insights
- **Podigee-Integration:** Direkter Abruf von Podcast-Statistiken (Downloads, Geo, Clients)
- **Einnahmen-Dashboard:** Sponsoring-Umsätze und KPIs
- **Auslastungs-Übersicht:** Werbeplatz-Auslastung und durchschnittliche TKP

### Branding & Exporte
- **Individuelles Logo:** App-Logo und Favicon
- **Cover-Management:** Podcast-Cover für verschiedene Plattformen
- **PDF-Layouts:** Anpassbare PDF-Templates für Exporte
- **Backup-System:** Export und Import von Episoden, Ideen und kompletten Datenbank-Backups

## Neu in v2.11.5

### Freigabe-Center
- Zentraler Menüpunkt für alle Freigabe-Anfragen (Episoden + Interview-Fragen)
- Moderatoren und berechtigte Rollen können direkt genehmigen/ablehnen
- Dashboard-Widget zeigt ausstehende Anfragen

### Daten-Speicher-Verbesserungen
- Werbetitel, Kategorien und Platzierungsdetails werden korrekt gespeichert
- Sponsor-Vertragsdaten (Vertragsstart/-ende) werden persistent erfasst
- Neue Position "Folgensponsor" für automatische Zuweisungen
- Datenbank-Migration mit nullable `episode_id` für Zeitraum-Buchungen

### Abrechnungs-Features
- **Manuelle Preisanpassungen** pro Platzierung
- **Optionale Hörer-Gebühr** für CPM-Modelle
- Flexible Preisberechnung im Abrechnungstool

### PDF-Optimierung
- Automatischer Textumbruch (keine abgeschnittenen Zeilen mehr)
- Leistungsübersicht an Layout-System angebunden
- Bessere Seitenumbrüche bei langen Inhalten

### Bug-Fixes
- Wiki-Seiten Darstellung behoben (schwarze Seiten)
- Buchungskalender zeigt Vorplanungen korrekt an
- Abrechnung zeigt lesbare Bezeichnungen statt UUIDs

## Datenablage

Alle Anwendungsdaten (Datenbank, lokale Uploads, Backups) werden im Benutzerverzeichnis unter `.podcore` gespeichert (z.B. `C:\Users\Name\.podcore` oder `~/.podcore`). Dadurch gehen bei einem Update der Anwendung keine Daten verloren.

## Updates

Um PodCore zu aktualisieren:
1. Beende den laufenden Server
2. Ersetze den gesamten Ordner-Inhalt mit der neuen Version (deine Daten liegen sicher in `~/.podcore`)
3. Starte den Server über das Start-Skript neu
4. Datenbank-Migrationen werden automatisch beim Start ausgeführt

## Versionshistorie

### v2.11.5 (Juli 2026)
- Freigabe-Center für Episoden und Interview-Fragen
- Daten-Speicher-Fixes (Werbetitel, Kategorien, Vertragsdaten)
- Abrechnungs-Features (Preisanpassungen, Hörer-Gebühren)
- PDF-Optimierung (Textumbruch, Layout-System)
- Wiki-Bug-Fixes

### v2.11.4 (Juli 2026)
- UUID-Anzeige in Abrechnung durch lesbare Bezeichnungen ersetzt
- Buchungsbestätigung-PDF mit Vorplanungen
- PDF-Layout-System integriert

### v2.11.3 (Juli 2026)
- Buchungskalender zeigt Vorplanungen an
- CSV-Export für Buchungskalender
- Leistungsübersicht nur bei echten Buchungen klickbar

### v2.11.2 (Juli 2026)
- Freigabe-Anfragen-Widget im Dashboard
- Globales Podcast-Profil für alle Nutzer
- Admin-Verwaltung für Freigabe-Berechtigungen

### v2.11.1 (Juli 2026)
- Buchungs-Modal für Werbeplätze
- Abrechnungs-Tab mit Vorplanungen
- TKP-Kalkulator-Fix

### v2.11.0 (Juli 2026)
- Sponsoring-Konzept: Buchungskalender, TKP-Kalkulator
- Folgensponsor-Automatisierung
- Kategorie-Konflikt-Erkennung
- Auslastungs-Tab im Einnahmen-Dashboard

---

## Support & Feedback

Bei Fragen oder Problemen öffne bitte ein Issue im GitHub-Repository oder kontaktiere das Support-Team.

**Lizenz:** MIT
