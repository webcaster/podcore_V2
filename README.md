# PodCore – Podcast Management App

**PodCore** ist eine umfassende, selbstgehostete Webanwendung zur professionellen Verwaltung von Podcasts. Entwickelt für Podcast-Produzenten, Redaktionen und Agenturen, vereint PodCore alle Aspekte der Podcast-Produktion in einem zentralen Tool: Von der ersten Idee über die Redaktionsplanung, Sponsoren-Verwaltung und Skript-Erstellung bis hin zur fertigen Episode.

**Aktuelle Version: 2.14.4**

*Erstellt von Maximilian Hartwich - Medien der Sinne (https://medien-der-sinne.de)*

---

## 🌟 Kernfunktionen

### 📝 Redaktions-Hub & Ideenpool
- Sammeln von Themenideen, Recherchen und Links
- Verwaltung von Interview-Gästen inkl. Fragenkatalog
- Allgemeiner, thematisch gruppierter Fragen-Pool mit Suche, Auswahl, Zuweisung, Kopieren und PDF-Export
- Checklisten und Notizen pro Idee
- Nahtlose Übernahme von Ideen in fertige Episoden
- Übernahme verknüpfter Themenentwürfe in Beschreibung, Show Notes, Notizen oder Script-Blöcke
- Durchsuchbare globale und ideenbezogene Textbausteine direkt im Episoden-Editor
- Freie Texte als eigenständiger Recherchetyp ohne erforderliche URL
- Vollständiger Themenwerkstatt-Abschnitt im Ideenmappen-PDF mit allen befüllten Entwurfsfeldern
- Strategische Staffelplanung mit Reihenfolge, Alternativen, Themen, Formaten, Partnern, Rollen, Status und Staffelziel
- Direkter Übergang bestätigter Planpositionen in Ideenmappe und Episoden-Editor ohne doppelte Datenpflege
- Staffelplan-PDF mit vorhandenem CI-Layout, Dokumenttitel, Reihenfolge und Alternativen

### 🎙️ Episoden-Editor
- Rich-Text-Editor für Show-Notes und Skripte
- Drag & Drop Blöcke für Intro, Segmente, Werbung, Interviews und Outro
- Vorlagen-System für wiederkehrende Episoden-Strukturen
- Erfassung technischer Daten (Mikrofone, Interface, DAW, Lizenzen)
- Integrierte Medien-Bibliothek für Audio-Assets
- **PDF-Export**: Professionelle Tabellen-Skripte für die Aufnahme
- Verknüpfte Staffelplan-Episoden mit Herkunftshinweis und Rücksprung zur strategischen Planung

### 💰 Sponsoren & Monetarisierung (v2)
- CRM für Sponsoren und Werbepartner
- Verwaltung von Werbekategorien (Pre-Roll, Mid-Roll, Post-Roll, Folgen-Sponsoring)
- Erstellung individueller Angebote mit frei benennbaren Varianten
- Automatische Generierung von PDF-Angeboten mit den individuellen Optionsnamen im Corporate Design
- Optionaler Sponsor-Logo-Upload mit Anzeige in Übersicht und Detailseite
- Sponsor-Adresse und Kontaktperson als getrennte Stammdaten
- Buchungs-Verwaltung mit vollständiger Speicherung von Slot, Laufzeit, Folgen, Preisen, Rabatt und Status sowie Konflikt-Prüfung im Kalender
- Automatische Abrechnung mit Preisanpassungen und variabler Hörerbeteiligung
- Vollständige Preislisten-PDFs mit Beschreibung, Präsentationstext, allen Preismodellen, Währung, Farbe, Exklusivität und Status
- Konfigurierbare Sponsor-Dossiers mit Stammdaten, Verträgen, Buchungen, Abrechnung und optionalen Notizen
- Layouttreue, mehrseitige Einzel- und Sammelbestätigungen für Sponsor-Buchungen mit robustem Text- und Seitenumbruch
- Leistungsübersichten und Rechnungs-Export

### 📅 Kalender & Planung
- Jahres- und Monatsübersicht aller geplanten Episoden
- Visuelle Konflikt-Erkennung für Sponsoren-Platzierungen
- PDF-Export des Redaktionsplans für Besprechungen

### 🎨 CI & PDF-Layout-Manager
- Vollständig anpassbare PDF-Exporte (Farben, Typografie, Logos)
- Verschiedene Layout-Typen für Skripte, Angebote, Rechnungen und Kalender
- Wasserzeichen-Unterstützung (z.B. "Entwurf", "Vertraulich")
- Visueller Layout-Manager mit Kartenansicht und Vorschau

### 👥 Team & Berechtigungen
- Rollen-basiertes Zugriffssystem (Admin, Redakteur, Moderator, Gast)
- Granulare Rechte für jeden Bereich der App, einschließlich getrenntem Lesen, Bearbeiten, PDF-Export und Editorübergang in der Staffelplanung
- Freigabe-Workflows für Episoden (Approval-System)
- Integrierter Team-Chat

### 📚 In-App-Handbuch
- Durchsuchbares Endnutzer-Nachschlagewerk für sämtliche Hauptbereiche
- Kategorisierte, aufklappbare Anleitungen zu Episoden, RedaktionsHub, Medien, Sponsoring, Statistiken, PDF-Exporten und Einstellungen
- Kennzeichnung berechtigungsabhängiger Administrationsfunktionen
- Kompakte und übersichtliche Versionshistorie

---

## 🚀 Installation & Setup

PodCore ist als Node.js-Anwendung konzipiert und verwendet SQLite als Datenbank, wodurch keine externe Datenbank-Einrichtung erforderlich ist.

Für die produktive Bereitstellung unter Ubuntu mit dediziertem Dienstkonto, `systemd`, UFW, optionalem Caddy-Reverse-Proxy, Backup, Update, Rollback und Fehlerdiagnose gilt die IT-Anleitung [`docs/INSTALL-UBUNTU.md`](docs/INSTALL-UBUNTU.md).

### Voraussetzungen

- Node.js 18 oder höher
- pnpm; empfohlen ist die Aktivierung über Corepack mit `corepack enable` und `corepack prepare pnpm@10 --activate`

### Automatische Installation

Nach dem Klonen kann PodCore einschließlich aller Root-, Client- und Server-Abhängigkeiten automatisch installiert und als Produktionsversion gebaut werden.

| Plattform | Installation | Start |
|---|---|---|
| Linux und macOS | `chmod +x install.sh && ./install.sh` | `./start-unix.sh` |
| Windows | `install.bat` | `start-windows.bat` |

### Manuelle Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/webcaster/podcore_V2.git
   cd podcore_V2
   ```

2. **pnpm aktivieren**
   ```bash
   corepack enable
   corepack prepare pnpm@10 --activate
   ```

3. **Abhängigkeiten in allen relevanten Verzeichnissen installieren**

   PodCore besteht aus drei eigenständigen Paketverzeichnissen. Deshalb müssen Root, Client und Server jeweils installiert werden:

   ```bash
   pnpm install --frozen-lockfile
   pnpm --dir client install --frozen-lockfile
   pnpm --dir server install --frozen-lockfile
   ```

   Alternativ fasst `pnpm run install:all` diese drei Schritte zusammen.

4. **Anwendung bauen**
   ```bash
   pnpm run build
   ```

5. **Server starten**
   ```bash
   pnpm start
   ```

Die Anwendung ist nun unter `http://localhost:3001` erreichbar.

### Start-Skripte

Die Startskripte starten ausschließlich den vorhandenen Produktions-Build. Sie installieren keine Pakete im Hintergrund. Fehlen `server/node_modules`, `server/dist/index.js` oder `server/dist/public`, verweisen sie auf den passenden Installer.

| Plattform | Startbefehl |
|---|---|
| Windows | `start-windows.bat` |
| Linux und macOS | `./start-unix.sh` |

---

## 🔄 Updates

> **Wichtig für Version 2.14.2 und älter:** Der dort enthaltene ZIP-Updatehandler ist selbst von dem in 2.14.3 behobenen Fehler betroffen und kann Erfolg melden, ohne die laufende Anwendung zu ersetzen. Installieren Sie **2.14.3 einmalig manuell** gemäß [`docs/UPDATE-2.14.3.md`](docs/UPDATE-2.14.3.md). Aktualisieren Sie anschließend auf 2.14.4. Den integrierten ZIP-Weg verwenden Sie erst, wenn PodCore mindestens Version 2.14.3 meldet.

Ab Version **2.14.3** verfügt PodCore unter **Einstellungen → App-Update** über ein integriertes, verifiziertes Update-System. Neue Versionen können dort als ZIP-Datei hochgeladen und zunächst geprüft werden. PodCore entpackt und baut das Paket in einem getrennten Staging-Bereich, installiert Abhängigkeiten nicht interaktiv, sichert den bisherigen Programmstand und übernimmt nur das vorbereitete Ergebnis. Der Vorgang gilt erst als erfolgreich, wenn der neu gestartete Server die erwartete Zielversion bestätigt; bei Fehlern wird der vorherige Programmstand wiederhergestellt.

Aktuelle Release-ZIPs finden Sie unter [Releases](https://github.com/webcaster/podcore_V2/releases). Vor jedem Update muss das persistente PodCore-Datenverzeichnis extern gesichert werden.

Für ein manuelles Update installieren Sie nach `git pull` die Abhängigkeiten in **allen drei Paketverzeichnissen** erneut und erstellen anschließend den Produktions-Build:

```bash
git pull
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Alternativ können Sie für die drei Installationsschritte `pnpm run install:all` verwenden. Die Datenbankerweiterungen für **2.14.4** werden beim Start automatisch und idempotent angelegt; manuelle SQL-Schritte sind nicht erforderlich. Die vollständige Bedien-, Rollen-, PDF-, Update-, Prüf- und Rückfallanleitung steht unter [`docs/UPDATE-2.14.4.md`](docs/UPDATE-2.14.4.md); die produktive Ubuntu-Installation und der laufende IT-Betrieb sind unter [`docs/INSTALL-UBUNTU.md`](docs/INSTALL-UBUNTU.md) dokumentiert.

---

## 🛠️ Technologie-Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite, Lucide Icons
- **Backend**: Node.js, Express, TypeScript
- **Datenbank**: SQLite (via `better-sqlite3`)
- **PDF-Generierung**: PDFKit
- **Authentifizierung**: JWT (JSON Web Tokens)

---

## 📄 Lizenz & Copyright

Erstellt von Maximilian Hartwich - [Medien der Sinne](https://medien-der-sinne.de)

*PodCore ist eine proprietäre Software. Alle Rechte vorbehalten.*
