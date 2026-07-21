# PodCore v2.14.9 – Update-, Bedien- und Prüfanleitung

**Release:** 21. Juli 2026
**Ausgangsversion:** PodCore 2.14.3 oder neuer
**Zielversion:** PodCore 2.14.9

## Zweck des Releases

PodCore v2.14.9 ordnet den Arbeitsablauf zur **Fertigstellung einer Episode** neu. Interview-Partner, Fragen, Freigaben und Abschlussstatus werden unabhängig vom Erstellungsweg der Folge einheitlich behandelt. Dies gilt sowohl für Folgen aus einer Ideenmappe als auch für direkt manuell erstellte Folgen.

Gleichzeitig erläutert die Anwendung den tatsächlichen Ort der Betriebsdaten, Medien und Sicherungen verständlich. Die aktive Datenbank wird transparent ausgewiesen. Eine externe MySQL- oder MariaDB-Datenbank kann als überprüfte Datenkopie vorbereitet werden, ohne dass ein Endnutzer versehentlich den laufenden Betrieb umstellt. Außerdem korrigiert das Release den Löschablauf zwischen Episoden und der strategischen Staffelplanung.

| Bereich | Ergebnis in v2.14.9 |
|---|---|
| Interview-Blöcke | **„+ Interview“** und **„Interview-Fragen“** erzeugen denselben vollständigen Interview-Block. |
| Partner und Fragen | Ein Partner kann in jedem Interview-Block ausgewählt werden; seine Fragen werden mit Status und Reihenfolge in die Folge übernommen. |
| Manuelle Fragen | Fragen können direkt im Block eingegeben, bearbeitet, zentral gespeichert und zur Freigabe eingereicht werden. |
| Fragen-Sortierung | Die Reihenfolge der Partnerfragen kann im Episoden-Editor geändert und dauerhaft gespeichert werden. |
| Fragenfreigabe | Offene Fragen können im RedaktionsHub oder direkt aus dem Episoden-Editor zur Freigabe angefordert werden. |
| Episodenabschluss | Der Abschluss-Check macht fehlende Partner, Fragen und notwendige Freigaben sichtbar, bevor eine Episodenfreigabe angefordert wird. |
| Datenbank | Administration zeigt die aktive Datenbank, Datenbankdatei, Datenordner und Medienablage transparent an. |
| Datenspeicher | Der Speicherbereich zeigt Betriebsdaten, Medien, Sicherungen und das wirksame Medienziel getrennt an. |
| Staffelplanung | Nach dem Löschen einer Episode können verknüpfte oder ältere verwaiste Staffelplan-Positionen wieder gelöscht werden. |

## Vor dem Update

Erstellen Sie vor jeder Aktualisierung ein vollständiges Backup über **Einstellungen → Branding & Backup → Backup & Export** und bewahren Sie die Sicherungsdatei außerhalb des PodCore-Servers auf. Prüfen Sie anschließend die Versionsanzeige im Seitenkopf. Für Installationen ab PodCore **2.14.3** ist der integrierte, verifizierte Update-Weg vorgesehen.

Der integrierte Ablauf prüft die Struktur des ZIP-Pakets, die Zielversion und die Buildfähigkeit in einem getrennten Staging-Bereich. Vor der Übernahme wird der bisherige Programmstand gesichert. Die Anwendung bestätigt den Abschluss erst, nachdem sie mit der erwarteten Zielversion neu gestartet wurde.

## Update über die Anwendung

1. Öffnen Sie **Einstellungen → App-Update**.
2. Wählen Sie die Release-Datei **`PodCore-v2.14.9.zip`** aus.
3. Starten Sie zunächst die Paketprüfung und anschließend die Übernahme.
4. Warten Sie, bis PodCore den Neustart und die Zielversion **2.14.9** bestätigt.
5. Aktualisieren Sie den Browser vollständig und prüfen Sie die Versionsanzeige im Seitenkopf.

## Manuelle Aktualisierung

Wenn der integrierte Update-Weg nicht verwendet werden kann, führen Sie die Aktualisierung im Anwendungsverzeichnis durch. Die folgenden Befehle installieren die zum Projekt gehörenden Abhängigkeiten anhand der Lockdateien und erstellen anschließend den Produktions-Build.

```bash
git pull
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Für v2.14.9 sind keine manuellen SQL-Schritte erforderlich. Zusätzliche Felder für die Freigabe von Interview-Fragen werden beim Serverstart abwärtskompatibel und idempotent ergänzt.

## Bedienung: Interview-Block in einer Episode fertigstellen

Öffnen Sie eine vorhandene Episode oder erstellen Sie eine Folge ohne Ideenmappe. Wechseln Sie in den **Script**-Bereich. Die beiden Aktionen **„+ Interview“** und **„Interview-Fragen“** führen nun in denselben strukturierten Interview-Block. Dadurch gibt es keinen zweiten, eingeschränkten Interviewweg mehr.

1. Fügen Sie einen Interview-Block hinzu.
2. Wählen Sie den Gesprächspartner im Feld **Interview-Partner** aus. Bei einer Folge mit Ideenmappe werden die zugehörigen Partner bereitgestellt; bei einer manuellen Folge steht der reguläre Partnerbestand zur Verfügung.
3. Übernehmen Sie die angezeigten Partnerfragen in den Block. Jede übernommene Frage behält ihre Quelle, ihren Freigabestatus und ihre Antwortzeit.
4. Ergänzen Sie bei Bedarf eine eigene Frage über **Frage hinzufügen**. Der Eingabebereich ist direkt im Block editierbar.
5. Speichern Sie eine neue manuelle Frage im RedaktionsHub, wenn sie zentral nachnutzbar und freigabefähig sein soll.
6. Ändern Sie die Fragenreihenfolge mit den Sortieraktionen im Block. Speichern Sie danach die Episode.

| Arbeitsschritt | Erwartetes Ergebnis |
|---|---|
| Interview-Block anlegen | Die Partnerauswahl und der Frageneditor erscheinen unmittelbar. |
| Partner auswählen | Die zum Partner hinterlegten Fragen stehen für die Übernahme bereit. |
| Manuelle Frage eingeben | Der Text bleibt im Block editierbar und kann zentral gespeichert werden. |
| Fragen sortieren | Die sichtbare Reihenfolge ändert sich und bleibt nach dem Neuladen bestehen. |
| Episode speichern | Partnerzuordnung, Fragen, Freigabestatus und Reihenfolge werden dauerhaft abgelegt. |

> Eine manuelle Frage kann zunächst als Blockinhalt bestehen bleiben. Für eine zentrale Freigabe muss sie über die vorgesehene Aktion im RedaktionsHub gespeichert werden. Erst danach besitzt sie einen nachverfolgbaren Fragenstatus.

## Bedienung: Freigabe von Interview-Fragen anfordern

Interview-Fragen besitzen einen nachvollziehbaren Status. Eine Freigabe kann entweder in **RedaktionsHub → Interviews** oder im jeweiligen Interview-Block des Episoden-Editors angefordert werden. Die anfordernde Person und der Zeitpunkt werden gespeichert, damit die Freigabeübersicht nur tatsächlich eingereichte Fragen zeigt.

| Status | Bedeutung | Nächster Schritt |
|---|---|---|
| Offen | Die Frage ist angelegt, aber noch nicht eingereicht. | Freigabe anfordern oder bei Bedarf bearbeiten. |
| Angefragt | Die Frage wartet auf eine Entscheidung. | Im Freigabe-Center durch berechtigte Personen prüfen lassen. |
| Freigegeben | Die Frage ist für den vorgesehenen Workflow bestätigt. | Für die Folge verwenden oder erneut sortieren. |
| Abgelehnt | Die Frage wurde nicht freigegeben. | Begründung prüfen, Frage überarbeiten und erneut anfordern. |

Wenn in **Einstellungen → Freigaben** eine Freigabe für Interview-Fragen vorgeschrieben ist, berücksichtigt der Episoden-Fertigstellungscheck diese Voraussetzung. Die Freigabe der gesamten Episode wird nachvollziehbar blockiert, solange ein angelegter Interview-Block keinen Partner enthält, keine verwendbaren Fragen hat oder verpflichtende Fragen noch nicht freigegeben sind.

## Bedienung: Datenbank und Datenspeicher verstehen

PodCore verwendet im Standardbetrieb eine **lokale SQLite-Datenbank**. Der laufende Datenbanktyp und die zugehörigen Speicherorte werden administrativ sichtbar gemacht, damit Endnutzer zwischen Betriebsdatenbank, Medienablage und Sicherungen unterscheiden können.

Öffnen Sie **Administration → Datenbank** und wählen Sie **Status laden**. Die Ansicht zeigt den aktiven Datenbanktyp, die Datenbankdatei, den Datenordner, die lokale Medienablage und eine kompakte Bestandsübersicht.

> Die angezeigten vollständigen Pfade sind ausschließlich für administrative Konten bestimmt. Sie helfen bei Backup, Serverumzug und Support, enthalten aber keine Zugangsdaten.

### SQLite und MySQL/MariaDB

SQLite ist der aktive und unterstützte Standardbetrieb dieser Version. Der Bereich **Datenkopie: SQLite → MySQL / MariaDB** erstellt bei korrekter, zuvor getesteter Verbindung eine vollständige Kopie in eine vorhandene externe Datenbank. Die aktive PodCore-Instanz bleibt dabei bewusst auf SQLite. So entsteht keine unkontrollierte oder nur scheinbar erfolgreiche Laufzeitumstellung.

| Anforderung | Vorgehen |
|---|---|
| SQLite weiterverwenden | Es ist keine Konfiguration notwendig; sichern Sie regelmäßig den PodCore-Datenordner. |
| MySQL/MariaDB vorbereiten | Zielserverdaten eintragen, Verbindung testen und erst danach die Datenkopie erstellen. |
| Produktiven Serverwechsel planen | Vorher ein Vollbackup erstellen, die Datenkopie prüfen und den Wechsel separat als kontrollierten Administrationsvorgang durchführen. |

### Medien-, Daten- und Sicherungsspeicher

Öffnen Sie **Einstellungen → Branding & Backup → Speicher**. Die Statuskarte trennt die drei Speicherarten klar voneinander: **Betriebsdaten**, **Medienablage** und **Sicherungen**. Zusätzlich sehen Sie das aktuelle Medienziel.

Für die Medienablage stehen abhängig von der Installation ein lokaler Pfad, WebDAV oder S3-kompatibler Speicher zur Verfügung. Testen Sie eine Änderung immer zuerst über **Verbindung testen**. Bestehende Dateien werden beim Wechsel eines Zielpfads nicht automatisch verschoben. SFTP/SSH wird ausdrücklich als derzeit nicht verfügbar angezeigt und kann deshalb nicht versehentlich ausgewählt werden.

> Ein Wechsel des Medienziels verändert nicht den Ort der PodCore-Betriebsdatenbank oder der Sicherungen. Erstellen Sie vor jeder Pfadänderung ein vollständiges Backup.

## Bedienung: Verwaiste Staffelplan-Position entfernen

Wird eine Episode gelöscht, gibt PodCore die damit verknüpfte Staffelplan-Position und Ideenmappe wieder frei. Öffnen Sie danach **RedaktionsHub → Staffelplanung** und aktualisieren Sie die Ansicht.

Falls eine Planposition mit einer älteren PodCore-Version verwaist ist, kann sie nun direkt in der Staffelplanung gelöscht werden. Ein fehlender Episodeneintrag verhindert diese Bereinigung nicht mehr.

## Prüfliste nach dem Update

| Prüfung | Soll-Ergebnis |
|---|---|
| Versionsanzeige | Der Seitenkopf und der Browser-Titel zeigen **v2.14.9**. |
| Manueller Interview-Block | **„+ Interview“** zeigt Partnerauswahl und Frageneditor. |
| Ideenmappen-Folge | Der zugehörige Interview-Partner und dessen Fragen lassen sich in die Folge übernehmen. |
| Manuelle Frage | Eine Frage kann direkt im Block eingegeben, zentral gespeichert und erneut geladen werden. |
| Fragenfreigabe | Eine gespeicherte Frage kann angefordert und im Freigabe-Center verarbeitet werden. |
| Sortierung | Die Reihenfolge der Partnerfragen bleibt nach Speichern und Neuladen erhalten. |
| Episodenabschluss | Unvollständige Interview-Blöcke oder verpflichtend offene Freigaben werden klar ausgewiesen. |
| Datenbankstatus | Administration zeigt **SQLite (lokal, aktiv)**, Datenbankdatei und Datenordner an. |
| Datenspeicher | Speicherstatus zeigt Betriebsdaten, Medienablage, Sicherungen und das aktive Medienziel an. |
| Lokaler Speichertest | Ein gültiger lokaler Medienpfad meldet erfolgreich seine Erreichbarkeit. |
| Staffelplan-Löschung | Eine nach Episodenlöschung verwaiste Planposition lässt sich entfernen. |

## Rückfall bei Problemen

Brechen Sie eine laufende Aktualisierung nicht ab. Sollte die Anwendung nach einer manuellen Installation nicht starten, stellen Sie zunächst den vorherigen Programmstand und das vor dem Update erzeugte Vollbackup wieder her. Prüfen Sie anschließend die Serverprotokolle sowie die Paketversionen von Root, Client und Server, bevor Sie den Update-Vorgang wiederholen.

## Abgrenzung

Dieses Wartungsrelease führt keine automatische produktive Laufzeitumstellung von SQLite auf MySQL/MariaDB aus. Die sichtbare Datenkopie bereitet einen solchen Wechsel sicher vor und vermeidet einen irreführenden Status. Bestehende Rollen und Rechte für Redaktion, Interviews, Freigaben, Staffelplanung und Administration bleiben weiterhin maßgeblich.
