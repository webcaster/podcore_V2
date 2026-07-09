# PodCore – Podcast Management App

**PodCore** ist eine umfassende, selbstgehostete Webanwendung zur professionellen Verwaltung von Podcasts. Entwickelt für Podcast-Produzenten, Redaktionen und Agenturen, vereint PodCore alle Aspekte der Podcast-Produktion in einem zentralen Tool: Von der ersten Idee über die Redaktionsplanung, Sponsoren-Verwaltung und Skript-Erstellung bis hin zur fertigen Episode.

*Erstellt von Maximilian Hartwich - Medien der Sinne (https://medien-der-sinne.de)*

---

## 🌟 Kernfunktionen

### 📝 Redaktions-Hub & Ideenpool
- Sammeln von Themenideen, Recherchen und Links
- Verwaltung von Interview-Gästen inkl. Fragenkatalog
- Checklisten und Notizen pro Idee
- Nahtlose Übernahme von Ideen in fertige Episoden

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
- Erstellung individueller Angebote mit Varianten (Option A/B/C)
- Automatische Generierung von PDF-Angeboten im Corporate Design
- Buchungs-Verwaltung mit Konflikt-Prüfung im Kalender
- Automatische Abrechnung mit Preisanpassungen und variabler Hörerbeteiligung
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

---

## 🚀 Installation & Setup

PodCore ist als Node.js-Anwendung konzipiert und verwendet SQLite als Datenbank, wodurch keine externe Datenbank-Einrichtung erforderlich ist.

### Voraussetzungen
- Node.js (v18 oder höher)
- npm, yarn oder pnpm

### Lokale Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/webcaster/podcore_V2.git
   cd podcore_V2
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Anwendung bauen**
   ```bash
   npm run build
   ```

4. **Server starten**
   ```bash
   npm start
   ```

Die Anwendung ist nun unter `http://localhost:3001` erreichbar.

### Start-Skripte
Für einen noch einfacheren Start liegen Skripte bei:
- **Windows**: `start-windows.bat` ausführen
- **Linux/Mac**: `./start-unix.sh` ausführen

---

## 🔄 Updates

PodCore verfügt über ein integriertes Update-System. Neue Versionen können direkt über die Einstellungen in der App als ZIP-Datei hochgeladen werden. Die App entpackt das Update, führt notwendige Datenbank-Migrationen durch und startet sich selbst neu.

Aktuelle Release-ZIPs finden Sie unter [Releases](https://github.com/webcaster/podcore_V2/releases).

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
