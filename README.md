# PodCore – Podcast Management App

**PodCore** ist eine umfassende, selbstgehostete Webanwendung zur professionellen Verwaltung von Podcasts. Entwickelt für Podcast-Produzenten, Redaktionen und Agenturen, vereint PodCore alle Aspekte der Podcast-Produktion in einem zentralen Tool: Von der ersten Idee über die Redaktionsplanung, Sponsoren-Verwaltung und Skript-Erstellung bis hin zur fertigen Episode.

**Aktuelle Version: 2.16.32**

*Erstellt von Maximilian Hartwich - Medien der Sinne (https://medien-der-sinne.de)*

---

## Lizenzierung mit WordPress und WooCommerce

PodCore 2.16.32 enthält eine eigene Lizenzanbindung für das Plugin [`PodCore Licensing for WooCommerce`](wordpress-plugin/podcore-licensing). Unterstützt werden Monatsabo, Jahresabo und Sonderabo. Lizenzen können online über die eigene WordPress-REST-API aktiviert oder als Ed25519-signiertes Dokument offline importiert werden. Ein lesbarer Lizenznachweis lässt sich unter **Einstellungen → Lizenzierung → Lizenz-PDF** exportieren. Die vollständige Einrichtung steht in [`docs/RELEASE-2.16.32.md`](docs/RELEASE-2.16.32.md).

## 🌟 Kernfunktionen

### Neu in v2.16.11: Persönlicher Workflow und sichere Speicherverwaltung

Jedes Benutzerkonto kann das Dashboard mit eigener Widget-Reihenfolge, Sichtbarkeit, Dichte und Begrüßung dauerhaft gestalten. Episoden-Skript-PDFs verwenden zeichenstabile Überschriften sowie fortlaufende Seitenzahlen. Das Sponsoring-Matching berücksichtigt nun explizite Kundeninteressen und erläutert seine Bewertung. Unter **Einstellungen → Speicher & Backup** bleibt die lokale Datenbank führend; vollständige Sicherungen werden als kontrollierte Datei für den eigenen Cloud-Ordner erzeugt. Details: [`docs/RELEASE-2.16.11.md`](docs/RELEASE-2.16.11.md).

### Hotfix v2.16.12: Sponsor-Detailansicht

Historische und aktuelle Sponsoren-Datensätze werden vor der Detailansicht defensiv normalisiert. Dadurch führen nicht aufgelöste Interessen-, Themen- oder Formatlisten nicht mehr zu einer schwarzen Seite. Details: [`docs/RELEASE-2.16.12.md`](docs/RELEASE-2.16.12.md).

### Neu in v2.16.13: Sponsoring-Preise und vollständige Preislisten

Sponsorenbuchungen berechnen Pauschalpreise, Preise pro Folge und CPM serverseitig, centgenau und transparent. Das Buchungsformular zeigt vor dem Speichern eine vollständige Preisvorschau; zeitliche Überschneidungen werden als Hinweis gemeldet. Die Preislisten-PDF führt jede Werbe-Position mit Preisen, Beschreibung, Standardtext, Exklusivität, Status und weiteren hinterlegten Daten auf eigenen, mehrseitigen Karten auf. Details: [`docs/RELEASE-2.16.13.md`](docs/RELEASE-2.16.13.md). Die Prüfung und der nächste Verbesserungsplan sind in [`docs/QUALITAETSPRUEFUNG-2.16.13.md`](docs/QUALITAETSPRUEFUNG-2.16.13.md) dokumentiert.

### Neu in v2.16.14: Wiederherstellung und Datenbankdiagnose

Gelöschte Episoden, Ideen, Sponsoren und Medien werden zunächst in einen zentralen Admin-Papierkorb verschoben. Nutzer mit Löschrecht können weiterhin aus ihren Bereichen löschen; Wiederherstellung und endgültige Bereinigung benötigen die neue, standardmäßig nur Administratoren zugewiesene Berechtigung `canManageTrash`. Der Datenbank-Tab zeigt Integritäts- und Fremdschlüsselstatus; neue vollständige Backups werden mit Prüfsumme und atomaren Schreibvorgängen gesichert. Details: [`docs/RELEASE-2.16.14.md`](docs/RELEASE-2.16.14.md).

### Neu in v2.16.15: Nutzertestkorrekturen und verlässliche Arbeitswege

Sponsoring-Buchungen speichern und aktualisieren Preis-, Rabatt-, Hörer- und Laufzeitdaten konsistent; die Buchungsliste übernimmt den bestätigten Serverstand unmittelbar. Tutorialfortschritte bleiben pro Benutzer dauerhaft erhalten und einzelne Tutorials lassen sich vollständig als JSON-Datei exportieren. Der Audio-Editor bietet PDF-Schnittlisten und Adobe-Audition-CSV-Markerexport. Direkte Papierkorbzugriffe und eine absichtlich bestätigte finale Löschung erleichtern die sichere Datenverwaltung. Details: [`docs/RELEASE-2.16.15.md`](docs/RELEASE-2.16.15.md).

### Neu in v2.16.16: Interaktive Tutorialführung und klare Werbeplatzaktionen

Tutorialschritte weisen nun ausdrücklich auf den violett hervorgehobenen Menüpunkt oder Bedienelement hin und führen bei Bedarf zur passenden Seite. Im Episoden-Editor ersetzt eine klare Werbeplatzbuchungs-Leeransicht den technischen v2-Hinweis und bietet berechtigten Nutzern direkt die Aktion zum Anlegen einer Buchung. Details: [`docs/RELEASE-2.16.16.md`](docs/RELEASE-2.16.16.md).

### Neu in v2.16.17: Promovideo-Designsystem

Die Standardoberfläche übernimmt die warme Obsidian-Violett-Sprache des PodCore-Promovideos: geschichtete Studioflächen, prägnante primäre Aktionen, aktive Navigationspillen, sanfte Kartenverläufe und zurückhaltende Tiefeneffekte. Persönliche Akzent- und Sidebarfarben sowie der helle Modus bleiben weiterhin verfügbar. Details: [`docs/RELEASE-2.16.17.md`](docs/RELEASE-2.16.17.md).

### Neu in v2.16.18: Automatische Backups und skalierbare Arbeitsansichten

Formulare sind kompakter, der Redaktions-Hub bietet Suche, Filter und Seitenaufteilung für große Interview- und Fragenlisten, und Werbekategorien werden im Sponsoring klarer erläutert. Persönliche Designeinstellungen werden sicher normalisiert. Die neue Sicherungsverwaltung verbindet In-App-Backups mit einer optionalen täglichen Systemplanung für geschlossene App-Instanzen. Details: [`docs/RELEASE-2.16.18.md`](docs/RELEASE-2.16.18.md) und [`docs/AUTOMATISCHE-BACKUPS.md`](docs/AUTOMATISCHE-BACKUPS.md).

### Neu in v2.16.19: Klickgeführte Tutorials und Wiederaufnahme

Tutorialschritte können nun als Hinweis, als Klickziel oder als bewusste Bestätigung aufgebaut werden. Klickt ein Nutzer auf ein markiertes Menü oder Bedienelement, führt PodCore automatisch zum nächsten Schritt. Nicht abgeschlossene Führungen lassen sich später am gespeicherten Schritt fortsetzen. Details: [`docs/RELEASE-2.16.19.md`](docs/RELEASE-2.16.19.md).

### Neu in v2.16.20: Klickaufzeichnung und optionale Screenshots

Im Entwickler-Modus können Tutorialautoren Klickziele direkt in der App aufzeichnen und daraus Route, Zielkennung und Call-out übernehmen. Die interaktive App-Führung funktioniert vollständig ohne Screenshot; Bilder und Markierungen sind optional und vor allem für WordPress, PDF und JSON-Download vorgesehen. Details: [`docs/RELEASE-2.16.20.md`](docs/RELEASE-2.16.20.md).

### Neu in v2.16.21: Mehrstufige Klicksequenzen

Die Aufzeichnung bleibt jetzt über mehrere Klicks aktiv. Autoren können komplexe Abläufe als geordnete Folge von Zielklicks, Unterschritten, Hinweisen und optionalen Zwischenbildern erfassen. Das WordPress Tutorial Hub v2.16.11 zeigt diese Sequenzen samt Interaktionshinweisen und gestaltbaren Titelbildern an. Details: [`docs/RELEASE-2.16.21.md`](docs/RELEASE-2.16.21.md).

### 📝 Redaktions-Hub & Ideenpool
- Sammeln von Themenideen, Recherchen und Links
- Verwaltung von Interview-Gästen inkl. Fragenkatalog
- Fragenbibliothek mit thematischer Gruppierung, natürlicher deutscher Sortierung, Suche, Auswahl, Zuweisung, Kopieren, dauerhafter manueller Reihenfolge und PDF-Export
- Checklisten und Notizen pro Idee
- Nahtlose Übernahme von Ideen in fertige Episoden
- Übernahme verknüpfter Themenentwürfe in Beschreibung, Show Notes, Notizen oder Script-Blöcke
- Durchsuchbare globale und ideenbezogene Textbausteine direkt im Episoden-Editor
- Freie Texte als eigenständiger Recherchetyp ohne erforderliche URL
- Vollständiger Themenwerkstatt-Abschnitt im Ideenmappen-PDF mit allen befüllten Entwurfsfeldern
- Strategische Staffelplanung mit Reihenfolge, Alternativen, Themen, Formaten, Partnern, Rollen, Status und Staffelziel
- Verbindlicher strategischer Ablauf: Aus einer Planposition wird zuerst eine vollständige Ideenmappe angelegt; erst aus dieser Ideenmappe wird eine Episode erstellt
- Flexible Folgennummerierung in der Staffelplanung, einschließlich Pilot- oder Sonderfolge **0**
- Staffelplan-PDF mit eigenem Layouttyp **„Staffelplanung Modern“**, individuellem Dokumenttitel, Staffelübersicht, Reihenfolge, Alternativen und Informationskarten

### 🎙️ Episoden-Editor
- Rich-Text-Editor für Show-Notes und Skripte
- Drag & Drop Blöcke für Intro, Segmente, Werbung, Interviews und Outro
- Vorlagen-System für wiederkehrende Episoden-Strukturen
- Erfassung technischer Daten (Mikrofone, Interface, DAW, Lizenzen)
- Integrierte Medien-Bibliothek für Audio-Assets
- **PDF-Export**: Professionelle Tabellen-Skripte für die Aufnahme
- Verknüpfte Staffelplan-Episoden mit Herkunftshinweis und Rücksprung zur strategischen Planung
- Standardmäßig eingeklappter Medien-Upload sowie einklappbare Bereiche für Kommentare & Feedback und Versionsverlauf
- Sichtbarer Hinweis auf die verknüpfte Ideenmappe und auf diese Ideenmappe gefilterte Interview-Partner
- Einheitliche Interview-Blöcke für Ideenmappen- und manuelle Folgen mit Partnerauswahl, Fragenübernahme und editierbaren manuellen Fragen
- Partnerspezifische Fragen-Sortierung, zentrale Speicherung manueller Fragen und direkt anforderbare Fragenfreigabe
- Abschluss-Check für Interview-Partner, Fragen und verpflichtende Fragenfreigaben vor der Episodenfreigabe
- **Live-Kollaboration**: Anzeige aktiver Teammitglieder pro Episode und im Redaktions-Hub über den authentifizierten WebSocket-Kanal
- **Skript-Block-Sperren**: Ein Block wird während der Bearbeitung temporär gesperrt, erhält eine TTL-Erneuerung und wird nach Freigabe oder Verbindungsabbruch automatisch freigegeben

### 💰 Sponsoren & Monetarisierung (v2)
- CRM für Sponsoren und Werbepartner
- Verwaltung von Werbekategorien (Pre-Roll, Mid-Roll, Post-Roll, Folgen-Sponsoring)
- Erstellung individueller Angebote mit frei benennbaren Varianten
- Automatische Generierung von PDF-Angeboten mit den individuellen Optionsnamen im Corporate Design
- Optionaler Sponsor-Logo-Upload mit Anzeige in Übersicht und Detailseite
- Sponsor-Adresse und Kontaktperson als getrennte Stammdaten
- Automatische Anlage eines verwaltbaren Erstvertrags bei vollständiger Vertragslaufzeit einer Sponsor-Neuanlage
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
- Vollständig anpassbare PDF-Exporte (Farben, Typografie, Logos) mit gebündelten Unicode-Schriften für plattformunabhängige Sonderzeichendarstellung
- Verschiedene Layout-Typen für Skripte, Angebote, Rechnungen und Kalender
- Wasserzeichen-Unterstützung (z.B. "Entwurf", "Vertraulich")
- Visueller Layout-Manager mit Kartenansicht, Vorschau, DejaVu-Schriftfamilien, Textausrichtung und Überschriftenstilen

### 👥 Team & Berechtigungen
- Rollen-basiertes Zugriffssystem (Admin, Redakteur, Moderator, Gast)
- Granulare Rechte für jeden Bereich der App, einschließlich getrenntem Lesen, Bearbeiten, PDF-Export und Editorübergang in der Staffelplanung
- Freigabe-Workflows für Episoden und gespeicherte Interview-Fragen mit nachvollziehbaren Anforderungs- und Statusübergängen
- Integrierter Team-Chat
- Live-Presence im Redaktions-Hub: Teammitglieder sehen, wer gerade im Ideenpool, in der Planung oder in Recherche arbeitet
- Rollen- und benutzerbezogene Bearbeitung bleibt durch bestehende Berechtigungen geschützt

### 📚 In-App-Handbuch
- Durchsuchbares Endnutzer-Nachschlagewerk für sämtliche Hauptbereiche
- Kategorisierte, aufklappbare Anleitungen zu Episoden, RedaktionsHub, Medien, Sponsoring, Statistiken, PDF-Exporten und Einstellungen
- Kennzeichnung berechtigungsabhängiger Administrationsfunktionen
- Kompakte und übersichtliche Versionshistorie

---

## 🆕 Neue Features in v2.16.2

### ☁️ Tutorial-Cloud und Endnutzer-Import
Die Tutorial-Verwaltung ist über den exklusiven Entwickler-Modus erreichbar. Endnutzer können freigegebene Tutorials aus einem Online-Katalog laden oder `.json`-Tutorials manuell importieren. Tutorial-Screenshots werden lokal verfügbar gehalten; vorhandene lokale Tutorials bleiben bei einer Synchronisation erhalten.

### 🎓 Tutorial-Führung und Wiki
Tutorials starten nicht automatisch. Nach dem Login erscheint nur ein Hinweis, wenn Tutorials für die aktuelle Rolle verfügbar sind. Das Wiki bleibt als Nachschlagewerk geöffnet, während die eigentliche Führung mit sichtbaren Zielmarkierungen, Screenshots, nummerierten Annotationen, Fortschrittsanzeige und Navigation arbeitet.

### 🎧 Audio-Editor und persönliche Partnerfragen-PDFs
Der Audio-Editor bietet Waveform, Wiedergabegeschwindigkeit, Loop-Modus, Marker, zeitbezogene Kommentare und Schnittplan-Export. Der Exporttyp `interview_partner` ist in der PDF-Layout-Auswahl berücksichtigt, sodass das persönliche Partnerfragen-PDF als eigenes Layout bearbeitet und verwendet werden kann.

### 🟢 Kostenloser Stabilitätsmodus in v2.16.9
PodCore ist bis zu einem ausdrücklich angekündigten Stabilitäts-Update vollständig kostenlos nutzbar. Die Lizenzverwaltung ist in der App-Oberfläche ausgeblendet, damit keine Aktivierung oder Funktionseinschränkung erfolgt. Die technische DLM-Vorbereitung bleibt erhalten und wird erst nach der Stabilisierung erneut geprüft und aktiviert. Details stehen in [`docs/FREE-STABILITY-MODE.md`](docs/FREE-STABILITY-MODE.md).

### ✦ Vektor-Branding und Subline in v2.16.10
PodCore verwendet ein eigenes skalierbares SVG-Signet als Favicon und als integriertes Standardlogo für Login, Desktop- und Mobilnavigation. Die Marken-Subline lautet **„Dein Podcast. Dein Workflow.“**. App-spezifische Branding-Hinweise sind in [`docs/BRANDING-2.16.10.md`](docs/BRANDING-2.16.10.md) dokumentiert.

## 🆕 Neue Features in v2.15.x

### 🎨 Light/Dark Mode
PodCore unterstützt jetzt ein helles und dunkles Design. Umschalten unter **Einstellungen → Mein Design → Erscheinungsbild**. Das Theme wird im Benutzerprofil gespeichert und bei jedem Login automatisch angewendet.

### 🎓 Rollenbasiertes Tutorial-System
Administratoren können anpassbare Onboarding-Tutorials erstellen und für einzelne Benutzer aktivieren:
- **Administration → Tutorials** – Tutorials erstellen und verwalten
- Schritte mit Titel, Beschreibung, Hervorhebung, Bild-Upload und Tooltip-Position
- Per-User-Aktivierung mit optionaler Theme-Wahl (Light/Dark)
- Automatischer Start beim ersten Login des Benutzers

### 🗑️ Kaskadierendes Löschen mit Papierkorb
- Gelöschte Ideenmappen landen im Papierkorb
- Wiederherstellung oder permanentes Löschen möglich
- Alle verknüpften Daten (Checklisten, Notizen, Uploads) werden mitgelöscht

### 🔐 Sichere Auto-Updates
- Elevation-Token-System für Updates (One-Time-Token, 5 Min gültig)
- Verhindert versehentliche Updates
- Token wird automatisch angefordert und nach Verwendung gelöscht

### 📄 Erweiterter PDF-Export
- Persönliches PDF für Interview-Partner im PDF-Layout-Manager konfigurierbar
- Benutzerdefinierter Dokumentname
- Episode-Informationen im PDF einbindbar

### 🔔 Freigabeanfragen-System
- Episoden und Fragen zur Genehmigung anfordern
- Automatische Benachrichtigungen an Genehmiger
- Integration mit dem Notification Center

---

## 🚀 Installation & Setup

PodCore ist als Node.js-Anwendung konzipiert und verwendet **SQLite als aktive Standarddatenbank**, wodurch keine externe Datenbank-Einrichtung erforderlich ist. Administrativ kann eine überprüfte Datenkopie nach MySQL oder MariaDB vorbereitet werden; diese stellt die laufende Anwendung bewusst nicht automatisch um.

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

### Optional: Demo-Content „Der Podcast“ importieren

Für eine gefüllte Test- und Präsentationsumgebung enthält PodCore den idempotenten Importer `seed-der-podcast-demo.mjs`. Er erzeugt Inhalte für den fiktiven Podcast **„Der Podcast“**, ohne vorhandene Nutzer oder eigene Inhalte zu löschen. Beende PodCore vor dem Import und führe im Projektordner aus:

```bash
node seed-der-podcast-demo.mjs
```

Der vollständige Inhalt und sichere Bereinigungsweg sind unter [`docs/DEMO-DER-PODCAST.md`](docs/DEMO-DER-PODCAST.md) dokumentiert.

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

Aktuelle Release-ZIPs finden Sie unter [Releases](https://github.com/webcaster/podcore_V2/releases). Vor jedem Update muss das persistente PodCore-Datenverzeichnis extern gesichert werden. Die vollständige Bedien-, Speicher-, Prüf- und Rückfallanleitung für den aktuellen Stand befindet sich unter [`docs/UPDATE-2.14.10.md`](docs/UPDATE-2.14.10.md).

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
- **Datenbank**: SQLite als aktiver Standardbetrieb (via `better-sqlite3`); optionale vorbereitbare Datenkopie nach MySQL/MariaDB (via `mysql2`)
- **PDF-Generierung**: PDFKit
- **Authentifizierung**: JWT (JSON Web Tokens)

---

## 📄 Lizenz & Copyright

Erstellt von Maximilian Hartwich - [Medien der Sinne](https://medien-der-sinne.de)

*PodCore ist eine proprietäre Software. Alle Rechte vorbehalten.*
