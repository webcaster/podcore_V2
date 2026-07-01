# PodCore v2.9.14

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

- **Redaktions-Hub:** Ideenpool, Redaktionsplan, Interviews und Notizen
- **Episoden-Management:** Block-Editor mit Interview-Fragen-Block, Show-Notes, Kapitelmarken, Metadaten
- **Sponsoren & Werbung:** Werbekategorien, Ad-Slots, Platzierungen und Kunden-Auswertungen
- **Media Library:** Verwaltung von Audio-Dateien, Bildern und Sponsoren-Assets
- **Podigee-Integration:** Direkter Abruf von Podcast-Statistiken (Downloads, Geo, Clients)
- **Branding:** Individuelles Logo und Cover für die App und Exporte
- **Cloud-Speicher:** Unterstützung für lokale Speicherung, WebDAV (Nextcloud/OneDrive) und S3-kompatible Speicher
- **Backups:** Export und Import von Episoden und Ideen als JSON, sowie komplette Datenbank-Backups

## Datenablage

Alle Anwendungsdaten (Datenbank, lokale Uploads, Backups) werden im Benutzerverzeichnis unter `.podcore` gespeichert (z.B. `C:\Users\Name\.podcore` oder `~/.podcore`). Dadurch gehen bei einem Update der Anwendung keine Daten verloren.

## Updates

Um PodCore zu aktualisieren:
1. Beende den laufenden Server
2. Ersetze den gesamten Ordner-Inhalt mit der neuen Version (deine Daten liegen sicher in `~/.podcore`)
3. Starte den Server über das Start-Skript neu

---

## Versionshistorie

### v2.9.14 (2026-07-01)
**Kritischer Fix: Berechtigungssystem, Werbung löschen & Audio-Editor**

#### Behobene Fehler
- **Berechtigungssystem (Root Cause Fix):** Die Auth-Middleware lädt jetzt automatisch Rollen-Berechtigungen aus der `roles`-Tabelle, wenn die individuellen Benutzer-Berechtigungen leer sind. Dies behebt den Fehler, dass Benutzer trotz korrekter Rolle keine Rechte hatten.
- **Admin-Panel:** Neuer Button „Standard-Berechtigungen“ im Rollen-Tab zum Zurücksetzen aller System-Rollen.
- **Werbung löschen:** Funktioniert nun zuverlässig im Episoden-Editor.
- **Audio-Editor:** Button in der Media Library ist jetzt dauerhaft sichtbar und funktional.

### v2.9.0 (2026-06-29)
**Episoden-Editor: Interview-Fragen-Block, Show-Notes, Zeiterfassung, Technische Daten**
*(Details siehe Wiki)*

### v2.8.3 und früher
Siehe vorherige Versionen.
