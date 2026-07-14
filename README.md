# PodCore – Podcast Management App

**PodCore** ist eine umfassende, selbstgehostete Webanwendung zur professionellen Verwaltung von Podcasts. Entwickelt für Podcast-Produzenten, Redaktionen und Agenturen, vereint PodCore alle Aspekte der Podcast-Produktion in einem zentralen Tool: Von der ersten Idee über die Redaktionsplanung, Sponsoren-Verwaltung und Skript-Erstellung bis hin zur fertigen Episode.

**Aktuelle Version: 2.14.2**

*Erstellt von Maximilian Hartwich - Medien der Sinne (https://medien-der-sinne.de)*

---

## 🌟 Kernfunktionen

### 📝 Redaktions-Hub & Ideenpool
- Sammeln von Themenideen, Recherchen und Links
- Verwaltung von Interview-Gästen inkl. Fragenkatalog
- Checklisten und Notizen pro Idee
- Nahtlose Übernahme von Ideen in fertige Episoden
- Übernahme verknüpfter Themenentwürfe in Beschreibung, Show Notes, Notizen oder Script-Blöcke
- Durchsuchbare globale und ideenbezogene Textbausteine direkt im Episoden-Editor
- Freie Texte als eigenständiger Recherchetyp ohne erforderliche URL
- Vollständiger Themenwerkstatt-Abschnitt im Ideenmappen-PDF mit allen befüllten Entwurfsfeldern

### 🎙️ Episoden-Editor
- Rich-Text-Editor für Show-Notes und Skripte
- Drag & Drop Blöcke für Intro, Segmente, Werbung, Interviews und Outro
- Vorlagen-System für wiederkehrende Episoden-Strukturen
- Erfassung technischer Daten (Mikrofone, Interface, DAW, Lizenzen)
- Integrierte Medien-Bibliothek für Audio-Assets
- **PDF-Export**: Professionelle Tabellen-Skripte für die Aufnahme

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
- Granulare Rechte für jeden Bereich der App
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

PodCore verfügt über ein integriertes Update-System. Neue Versionen können direkt über die Einstellungen in der App als ZIP-Datei hochgeladen werden. Die App entpackt das Update, führt notwendige Datenbank-Migrationen durch und startet sich selbst neu.

Aktuelle Release-ZIPs finden Sie unter [Releases](https://github.com/webcaster/podcore_V2/releases). Vor jedem Update sollte das persistente PodCore-Datenverzeichnis gesichert werden.

Für ein manuelles Update installieren Sie nach `git pull` die Abhängigkeiten in **allen drei Paketverzeichnissen** erneut und erstellen anschließend den Produktions-Build:

```bash
git pull
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Alternativ können Sie für die drei Installationsschritte `pnpm run install:all` verwenden. Für **2.14.2** sind keine manuellen SQL-Schritte erforderlich. Eine ausführliche Bedien- und Update-Anleitung steht unter [`docs/UPDATE-2.14.2.md`](docs/UPDATE-2.14.2.md).

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
