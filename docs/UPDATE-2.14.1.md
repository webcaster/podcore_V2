# PodCore 2.14.1 – Bedien- und Update-Anleitung

Version **2.14.1** ist ein Wartungsupdate für RedaktionsHub, Episoden-Editor, Sponsorverwaltung, Wiki und PDF-Exporte. Diese Anleitung beschreibt die neuen Bedienwege sowie die Aktualisierung einer bestehenden Installation.

## Funktionsübersicht

| Funktion | Status in 2.14.1 | Bedienweg |
|---|---|---|
| Wiki-Seite | Repariert und mit Inhalten befüllt | Seitenleiste → Wiki |
| Sponsor-Dossier | Export-Route und Dialog verbunden | Sponsor öffnen → Dossier → PDF exportieren |
| Sponsor-Adresse | In Schema, Migration, API und Formular enthalten | Sponsor öffnen → Stammdaten → Adresse |
| Sponsor-Übersicht | Sponsorname primär, Kontaktperson sekundär | Sponsoren |
| Sponsor-Logo | Optional hochladen, austauschen oder entfernen | Sponsor öffnen → Stammdaten → Optionales Sponsor-Logo |
| Individuelle PDF-Optionsnamen | `label`, `title` und `name` werden unterstützt | Angebot bearbeiten → Mehrfach-Optionen |
| RedaktionsHub-Übernahme | Themenentwurf und Textbausteine im Editor verfügbar | Episode öffnen → RedaktionsHub-Inhalte |

## RedaktionsHub-Inhalte im Episoden-Editor

Wenn eine Episode mit einer Idee verknüpft ist, lädt der Editor den zugehörigen Themenentwurf und die ideenbezogenen Textbausteine. Zusätzlich stehen globale Textbausteine zur Verfügung. Eine Suche filtert nach Titel und Inhalt; der Typfilter grenzt die Liste beispielsweise auf Intro, Übergang, Call-to-Action oder freie Bausteine ein.

| Quelle | Verfügbare Ziele |
|---|---|
| Leitfrage und Kernaussage | Episodennotizen oder neuer Script-Block |
| Teaser und Episodenbeschreibung | Episodenbeschreibung oder neuer Script-Block |
| Show Notes | Show Notes der Episode oder neuer Script-Block |
| Call-to-Action | Neuer Script-Block oder Show Notes |
| Textbaustein | Neuer Script-Block, Beschreibung, Show Notes oder Notizen |

Bei Textfeldern wird vorhandener Inhalt nicht still ersetzt. Neue Inhalte werden mit einer Trennung angehängt. Bei Script-Zielen erstellt PodCore einen neuen Block, sodass der übernommene Inhalt anschließend unabhängig bearbeitet, verschoben oder gelöscht werden kann.

## Optionales Sponsor-Logo

Öffnen Sie einen Sponsor und wechseln Sie in den Stammdatenbereich. Unter **Optionales Sponsor-Logo** kann eine Datei ausgewählt und hochgeladen werden. Unterstützt werden **JPG, PNG, WebP und GIF** bis maximal **10 MB**. Ein vorhandenes Logo lässt sich über denselben Dialog austauschen oder entfernen.

Die Logo-Datei liegt im persistenten PodCore-Datenverzeichnis im Unterordner `sponsor-logos`. Das Logo wird über eine berechtigungsgeschützte Route ausgeliefert und erscheint in der Sponsor-Übersicht sowie im Detailkopf. Ohne Logo verwendet die Oberfläche weiterhin den farbigen Initialen-Platzhalter. Beim normalen Speichern der Sponsor-Stammdaten bleibt ein vorhandenes Logo erhalten.

## Sponsor-Angebote und PDF-Optionsnamen

Mehrfach-Optionen eines Angebots können frei benannt werden. Der PDF-Export übernimmt vorrangig das aktuelle UI-Feld `label`. Für bereits gespeicherte ältere Datensätze werden alternativ `title` oder `name` gelesen. Nur wenn keines dieser Felder einen Inhalt enthält, wird ein neutraler Name wie **Option 1** verwendet. Der individuelle Name erscheint sowohl im Optionskopf als auch in der zugehörigen Gesamtsumme.

## Installationsskripte

Die Installationsskripte `install.sh` für Linux und macOS sowie `install.bat` für Windows prüfen Node.js und pnpm, installieren die Abhängigkeiten in Root, `client/` und `server/` und erstellen danach einen vollständigen Produktions-Build. Falls pnpm fehlt, versuchen die Installer die Aktivierung über Corepack. Die Startskripte verändern keine Pakete mehr; sie prüfen lediglich, ob Abhängigkeiten und Build vorhanden sind, und verweisen andernfalls auf den jeweiligen Installer.

| Plattform | Erstinstallation | Produktionsstart |
|---|---|---|
| Linux und macOS | `chmod +x install.sh && ./install.sh` | `./start-unix.sh` |
| Windows | `install.bat` | `start-windows.bat` |

## Aktualisierung über das integrierte Update-System

Erstellen Sie zuerst eine Sicherung des persistenten PodCore-Datenverzeichnisses. Öffnen Sie anschließend die Update-Funktion in den Einstellungen, wählen Sie das Release-ZIP **PodCore-v2.14.1.zip** und starten Sie die Aktualisierung. Nach dem automatischen Neustart sollte die Oberfläche Version 2.14.1 anzeigen.

## Manuelle Installation und Aktualisierung mit pnpm

PodCore enthält drei eigenständige Paketverzeichnisse. Die Root-Datei `pnpm-workspace.yaml` bindet Client und Server nicht als gemeinsame Workspace-Pakete ein. Deshalb müssen die Abhängigkeiten im Root-Verzeichnis sowie separat in `client/` und `server/` installiert beziehungsweise nach einem Update erneut abgeglichen werden.

Aktivieren Sie pnpm bei Bedarf zunächst über Corepack:

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

Führen Sie bei einer Erstinstallation nach dem Klonen oder bei einem Update nach `git pull` folgende Befehle im PodCore-Root-Verzeichnis aus:

```bash
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Alternativ führt `pnpm run install:all` die drei Installationsschritte nacheinander aus. Der anschließende Befehl `pnpm run build` baut den Client nach `server/public`, kompiliert den Server und synchronisiert das Frontend plattformneutral nach `server/dist/public`.

PodCore führt erforderliche Datenbankmigrationen beim Serverstart automatisch aus. Die Sponsor-Tabelle erhält bei älteren Installationen das Adressfeld, sofern es noch nicht vorhanden ist. Manuelle SQL-Befehle sind nicht erforderlich.

## Prüfung nach dem Update

| Prüfung | Erwartetes Ergebnis |
|---|---|
| Wiki öffnen | Kategorien und Artikel werden unmittelbar angezeigt. |
| Verknüpfte Episode öffnen | Themenentwurf und passende Textbausteine erscheinen im RedaktionsHub-Bereich. |
| Textbaustein übernehmen | Das gewählte Zielfeld wird ergänzt oder ein neuer Script-Block erstellt. |
| Sponsor-Adresse speichern | Die Adresse bleibt nach Neuladen erhalten. |
| Sponsor-Logo hochladen | Vorschau erscheint in Detailseite und Sponsor-Übersicht. |
| Dossier exportieren | Ein PDF wird ohne 404-Fehler heruntergeladen. |
| Angebot mit benannter Variante exportieren | Der individuelle Variantenname steht im Optionskopf und in der Gesamtsumme. |

## Rückfall und Datensicherung

Falls ein Rollback erforderlich ist, stoppen Sie PodCore, stellen Sie den vorherigen Anwendungsstand wieder her und verwenden Sie die vor dem Update erstellte Sicherung des Datenverzeichnisses. Da Logo-Dateien im persistenten Datenverzeichnis gespeichert werden, müssen sie Bestandteil der Sicherung sein.
