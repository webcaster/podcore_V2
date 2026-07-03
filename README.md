# PodCore v2.11.4

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
