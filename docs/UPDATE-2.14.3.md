# PodCore 2.14.3 – Bedien- und Update-Anleitung

Version **2.14.3** verbessert vor allem die Zuverlässigkeit des integrierten ZIP-Updates. Ein Paket wird vor der Übernahme in einem getrennten Staging-Bereich geprüft und gebaut. PodCore sichert den bisherigen Programmstand, übernimmt das vorbereitete Update rollbackfähig und meldet den Erfolg erst, wenn der neu gestartete Server die erwartete Zielversion bestätigt. Das Update ergänzt außerdem einen allgemeinen Fragen-Pool im RedaktionsHub und überarbeitet die PDF-Ausgabe von Sponsor-Buchungsbestätigungen.

> Erstellen Sie vor jedem Update ein aktuelles Vollbackup und bewahren Sie es außerhalb des PodCore-Servers auf. Die automatische Programmsicherung des Updateablaufs ersetzt keine Sicherung des persistenten Datenverzeichnisses.

> **Einmaliges Reparaturupdate:** Der in Version 2.14.2 und älteren Ständen enthaltene ZIP-Updatehandler ist selbst von dem hier behobenen Fehler betroffen. Er kann eine Erfolgsmeldung anzeigen, obwohl die laufende Anwendung nicht ersetzt wurde. Installieren Sie **2.14.3 daher einmalig manuell** und verwenden Sie den integrierten ZIP-Weg erst, wenn die laufende Anwendung bereits Version 2.14.3 oder neuer meldet.

## Funktionsübersicht

| Bereich | Änderung in 2.14.3 | Bedienweg |
|---|---|---|
| App-Update | Prüfung und Build im Staging, automatische Programmsicherung, rollbackfähige Übernahme und bestätigter Neustart | Einstellungen → App-Update |
| Update-Navigation | Die bisherige Updatekarte in der Administration führt zum zentralen, verifizierten Update-Reiter | Administration → App-Update verwalten |
| Allgemeiner Fragen-Pool | Themenbezogene Fragen unabhängig von einzelnen Ideen, Gästen oder Partnern verwalten | RedaktionsHub → Interview → Allgemeiner Fragen-Pool |
| Pool-Zuweisung | Ausgewählte Pool-Fragen kontrolliert in einen Interviewkontext übernehmen | Allgemeiner Fragen-Pool → Frage auswählen beziehungsweise zuweisen |
| Fragen-Pool-PDF | Alle, gefilterte oder ausgewählte Fragen mit Dokumenttitel und PDF-Layout exportieren | Allgemeiner Fragen-Pool → PDF exportieren |
| Buchungsbestätigungen | Gewähltes Layout, robuste Seitenumbrüche und vollständige mehrseitige Einzel- und Sammeldokumente | Sponsoren → Sponsor öffnen → Buchungen |
| Ideenfragen | Fragen bleiben beim Speichern und Bearbeiten korrekt mit der zugehörigen Idee verbunden | RedaktionsHub → Idee öffnen → Interview |
| Installation | Server-Abhängigkeiten werden reproduzierbar aus dem eigenen Workspace und Lockfile installiert | `install.sh` oder manuelle pnpm-Befehle |

## Einmaliger Übergang von 2.14.2 oder älter

Der alte Updatehandler berechnet das aktive Anwendungsverzeichnis fehlerhaft. Dadurch können Quelldateien in einem falschen Unterverzeichnis landen, während der unveränderte Server neu startet. Wiederholen Sie bei einer scheinbar erfolgreichen, aber wirkungslosen Aktualisierung nicht denselben In-App-Vorgang.

Führen Sie stattdessen einmalig ein kontrolliertes manuelles Update aus. Das persistente Datenverzeichnis, beispielsweise `/var/lib/podcore`, bleibt dabei unverändert:

1. Erstellen Sie einen integrierten Datenexport und eine vollständige externe Sicherung des persistenten Datenverzeichnisses.
2. Prüfen Sie `PodCore-v2.14.3.zip` mit der veröffentlichten Datei `PodCore-v2.14.3.zip.sha256`.
3. Beenden Sie den PodCore-Dienst oder den laufenden Prozess.
4. Benennen Sie das bisherige Anwendungsverzeichnis als Rollback-Kopie um.
5. Entpacken Sie das 2.14.3-ZIP in ein neues Anwendungsverzeichnis.
6. Führen Sie `./install.sh` aus beziehungsweise installieren Sie Root-, Client- und Server-Abhängigkeiten und erstellen Sie den Produktions-Build.
7. Starten Sie PodCore und kontrollieren Sie am Health-Endpunkt sowie in der Oberfläche, dass Version **2.14.3** läuft.
8. Bewahren Sie Sicherung und Rollback-Kopie bis zur fachlichen Abnahme auf.

Für Ubuntu mit `systemd`, `/opt/podcore` als Programmverzeichnis und `/var/lib/podcore` als Datenverzeichnis enthält [`INSTALL-UBUNTU.md`](INSTALL-UBUNTU.md) die vollständigen Befehle. Bei anderen Installationsarten verwenden Sie die dazugehörige Prozessverwaltung, ändern aber nicht das konfigurierte `PODCORE_DATA_DIR`.

## In-App-Updates ab installierter Version 2.14.3

Dieser Abschnitt gilt erst, wenn die laufende Anwendung bereits **2.14.3 oder neuer** meldet. Öffnen Sie dann **Einstellungen → App-Update**. Alternativ führt die Updatekarte im Administrationsbereich direkt zu diesem Reiter. Ab Version 2.14.3 gibt es nur noch diesen zentralen, verifizierten Updateweg in der Benutzeroberfläche.

### 1. Update vorbereiten

Beenden Sie während des Wartungsfensters nach Möglichkeit die aktive redaktionelle Arbeit. Erstellen Sie ein aktuelles Vollbackup und laden Sie es auf einen getrennten Datenträger oder ein zentrales Sicherungssystem herunter. Prüfen Sie außerdem den freien Speicherplatz sowie die SHA-256-Prüfsumme des Release-ZIPs.

| Vorbereitung | Erwartetes Ergebnis |
|---|---|
| Vollbackup erstellen | Eine aktuelle, lesbare Sicherungsdatei liegt außerhalb des Servers vor. |
| Release-ZIP prüfen | Dateiname, Zielversion und SHA-256-Prüfsumme entsprechen der Freigabe. |
| Freien Speicher kontrollieren | Ausreichend Platz für ZIP, Staging-Build und Programmsicherung ist verfügbar. |
| Wartungsfenster aktivieren | Während Übernahme und Neustart werden keine Änderungen durch Benutzer vorgenommen. |

### 2. Paket hochladen und prüfen

Wählen Sie **PodCore-v2.14.3.zip** und starten Sie die Paketprüfung. PodCore kontrolliert die Archivstruktur, erforderliche Server- und Paketdateien, die Zielversion und die Node.js-Kompatibilität. Ein ungültiges oder unvollständiges Paket wird nicht zur Anwendung freigegeben.

Wenden Sie das Update erst an, wenn die Oberfläche die Prüfung ohne Fehler abgeschlossen hat und die angezeigte Zielversion **2.14.3** lautet.

### 3. Update anwenden

Beim Anwenden führt PodCore die kritischen Schritte in einer abgesicherten Reihenfolge aus. Installations- und Buildbefehle laufen ausdrücklich nicht interaktiv, damit der Vorgang auch innerhalb eines Dienstprozesses zuverlässig abgeschlossen werden kann.

| Phase | Verhalten von PodCore |
|---|---|
| Staging | Das ZIP wird in einem getrennten Arbeitsbereich entpackt und geprüft. |
| Abhängigkeiten | Root-, Client- und Server-Abhängigkeiten werden anhand der Lockdateien installiert. |
| Vorab-Build | Client und Server werden vor der Übernahme als Produktionsversion gebaut. |
| Programmsicherung | Der bisherige Anwendungsstand wird vor dem Dateiaustausch gesichert. |
| Übernahme | Die geprüften Dateien und Build-Artefakte werden in das Anwendungsverzeichnis übernommen. |
| Verifikation | Die installierten Paketversionen werden mit der erwarteten Zielversion verglichen. |
| Neustart | Der Serverprozess wird beendet und durch die vorhandene Dienstverwaltung neu gestartet. |
| Abschluss | Erfolg wird erst gemeldet, wenn der neue Prozess erreichbar ist und Version 2.14.3 bestätigt. |

Lassen Sie den Update-Dialog während dieses Ablaufs geöffnet. Ein kurzfristiger Verbindungsabbruch beim Prozesswechsel ist normal. Die Oberfläche fragt den Update-Status erneut ab und zeigt den bestätigten Abschluss nach dem Neustart an.

### 4. Fehler und automatischer Rückfall

Schlägt Installation, Build, Übernahme oder Versionsprüfung fehl, beendet PodCore den Ablauf mit einer Fehlermeldung. Wurden bereits Programmdateien ausgetauscht, versucht der Updatepfad, den gesicherten vorherigen Programmstand wiederherzustellen. Das hochgeladene temporäre ZIP und Staging-Artefakte werden anschließend bereinigt.

Startet der Dienst nach einem Fehler nicht automatisch, prüfen Sie den Systemdienst und das Updateprotokoll. Stellen Sie bei Bedarf sowohl den vorherigen Programmstand als auch die unmittelbar vor dem Update erstellte Datensicherung wieder her.

## Allgemeiner Fragen-Pool

Der allgemeine Fragen-Pool verwaltet wiederverwendbare Interviewfragen unabhängig von einer einzelnen Idee, Episode oder einem bestimmten Gesprächspartner. Er eignet sich für Standardfragen, thematische Fragensammlungen, wiederkehrende Gesprächsblöcke und redaktionelle Reservefragen.

### Fragen erfassen und strukturieren

Öffnen Sie **RedaktionsHub → Interview → Allgemeiner Fragen-Pool** und wählen Sie **Frage erstellen**. Erfassen Sie den Fragetext, ordnen Sie ein Thema zu und ergänzen Sie bei Bedarf interne Notizen. Gespeicherte Fragen erscheinen nach Themen gruppiert.

| Funktion | Verwendung |
|---|---|
| Suche | Durchsucht Fragetext, Thema und ergänzende Angaben. |
| Themenfilter | Begrenzt die Ansicht auf eine fachliche Gruppe. |
| Auswahlmodus | Markiert mehrere Fragen für Zuweisung oder Export. |
| Bearbeiten | Ändert Fragetext, Thema und Notizen. |
| Kopieren | Erstellt eine unabhängige Kopie als Ausgangspunkt für eine Variante. |
| Löschen | Entfernt die Pool-Frage nach Bestätigung. Bereits zugewiesene Interviewfragen bleiben eigenständige Datensätze. |

Pool-Fragen und normale Interviewfragen sind serverseitig getrennt. Reguläre Ideen-, Partner- und Episodenrouten können Pool-Einträge weder versehentlich auflisten noch verändern.

### Fragen zuweisen

Wählen Sie eine oder mehrere Pool-Fragen aus und übernehmen Sie sie in den vorgesehenen Interviewkontext. PodCore verhindert doppelte Zuweisungen desselben Pool-Eintrags zum gleichen Ziel. Die übernommene Interviewfrage kann anschließend im Zielkontext weiterbearbeitet werden, ohne den ursprünglichen Pool-Eintrag zu verändern.

Ideenbezogene Fragen speichern ihre `ideaId` wieder vollständig. Dadurch bleiben sie nach Erstellen und Bearbeiten der richtigen Idee zugeordnet und werden beim erneuten Öffnen zuverlässig geladen.

### Fragen-Pool als PDF exportieren

Öffnen Sie den PDF-Dialog des Fragen-Pools. Sie können einen individuellen Dokumenttitel und ein vorhandenes PDF-Layout wählen. Je nach Arbeitsweise exportieren Sie den gesamten Pool, die aktuell gefilterten Themen oder nur die markierten Fragen.

| Exportoption | Ergebnis |
|---|---|
| Alle Fragen | Vollständiger Fragen-Pool, nach Themen gegliedert |
| Themenfilter | Nur Fragen der gewählten Themen |
| Auswahl | Ausschließlich die im Auswahlmodus markierten Fragen |
| Dokumenttitel | Individuelle Überschrift im erzeugten Dokument |
| PDF-Layout | Verwendung des gewählten PodCore-Layouts für Seitengestaltung und Branding |

## Sponsor-Buchungsbestätigungen

Einzelne Buchungsbestätigungen und der Gesamtexport aller Buchungen eines Sponsors verwenden das im Exportdialog ausgewählte PDF-Layout. Inhalte werden anhand ihrer tatsächlichen Höhe umbrochen; lange Adressen, Ansprechpartner, Notizen, Laufzeiten, Preise und Folgendarstellungen laufen dadurch kontrolliert über mehrere A4-Seiten.

| Export | Bedienweg | Verhalten in 2.14.3 |
|---|---|---|
| Einzelbestätigung | Sponsor öffnen → Buchungen → gewünschte Buchung exportieren | Vollständige Buchung mit ausgewähltem Layout und automatischem Seitenumbruch |
| Sammelbestätigung | Sponsor öffnen → Buchungen → alle Buchungen exportieren | Alle Buchungen in einem durchgehend paginierten Dokument |

Prüfen Sie nach dem Export insbesondere Sponsorname, Buchungszeitraum, Werbeform, Preisangaben, Status, Folgendarstellung, Header, Footer und Seitenzahl. Auch sehr lange Inhalte dürfen nicht abgeschnitten werden oder außerhalb der Seitenränder erscheinen.

## Manuelle Installation und Aktualisierung mit pnpm

Dieser Abschnitt ist insbesondere für das einmalige Reparaturupdate von **2.14.2 oder älter auf 2.14.3** maßgeblich. Stoppen Sie vor dem Dateiaustausch den laufenden PodCore-Prozess, sichern Sie das bisherige Anwendungsverzeichnis als Rollback-Kopie und lassen Sie das persistente Datenverzeichnis unverändert.

PodCore verwendet getrennte Paketverzeichnisse für Root, Client und Server. Version 2.14.3 grenzt auch den Server als eigenständigen pnpm-Workspace ab. Dadurch verwendet `pnpm --dir server install --frozen-lockfile` zuverlässig die Server-Lockdatei und installiert den für den Build benötigten TypeScript-Compiler.

Aktivieren Sie pnpm bei Bedarf über Corepack:

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

Führen Sie nach `git pull` im PodCore-Root-Verzeichnis folgende Befehle aus:

```bash
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Alternativ führt `pnpm run install:all` die drei Installationsschritte nacheinander aus. Für eine neue Installation können Sie die mitgelieferten Installations- und Startskripte verwenden.

| Plattform | Installieren und bauen | Produktionsstart |
|---|---|---|
| Linux und macOS | `chmod +x install.sh && ./install.sh` | `./start-unix.sh` |
| Windows | `install.bat` | `start-windows.bat` |

Die Datenbankerweiterungen für den Fragen-Pool werden beim Serverstart automatisch und idempotent angelegt. Es sind keine manuellen SQL-Befehle erforderlich.

## Prüfung nach dem Update

| Prüfung | Erwartetes Ergebnis |
|---|---|
| Einstellungen → App-Update öffnen | Der zentrale ZIP-Updatebereich wird angezeigt. |
| Updatekarte in der Administration öffnen | Die Navigation führt direkt zum App-Update-Reiter der Einstellungen. |
| Browser-Titel und Health-Endpunkt prüfen | Beide melden Version 2.14.3. |
| Testfrage im allgemeinen Pool anlegen | Die Frage erscheint sofort im richtigen Thema. |
| Suche und Themenfilter verwenden | Nur passende Pool-Fragen werden angezeigt. |
| Pool-Frage bearbeiten und kopieren | Änderung und unabhängige Kopie bleiben erhalten. |
| Pool-Frage einem Interviewkontext zuweisen | Die Frage erscheint einmal im Ziel; eine doppelte Zuweisung wird verhindert. |
| Ideenfrage anlegen, bearbeiten und neu laden | Die Frage bleibt der richtigen Idee zugeordnet. |
| Pool-PDF mit Auswahl und Layout exportieren | Dokumenttitel, ausgewählte Fragen, Themengruppen und Layout erscheinen korrekt. |
| Einzelne lange Buchungsbestätigung exportieren | Alle Inhalte werden vollständig auf A4-Seiten umbrochen. |
| Alle Buchungen eines Sponsors exportieren | Das mehrseitige Sammeldokument enthält alle Buchungen und einheitliche Seitenangaben. |
| Dienstprozess neu starten | Version und vorhandene Anwendungsdaten bleiben erhalten. |

## Rückfall und Datensicherung

Bewahren Sie die vor dem Update erstellte Sicherung auf, bis die technische und fachliche Prüfung abgeschlossen ist. Für einen manuellen Rollback stoppen Sie PodCore, stellen den vorherigen Programmstand wieder her und verwenden bei Datenproblemen zusätzlich die zum Wartungsfenster gehörende Sicherung des persistenten Datenverzeichnisses.

Die vollständige produktive Installation, Dienstverwaltung, Dateisystemsicherung und Wiederherstellung unter Ubuntu ist in [`INSTALL-UBUNTU.md`](INSTALL-UBUNTU.md) beschrieben. Die zusammengefassten Änderungen aller Versionen stehen im [`CHANGELOG.md`](../CHANGELOG.md).
