# PodCore v2.14.8 – Update-, Bedien- und Prüfanleitung

**Release:** 21. Juli 2026
**Ausgangsversion:** PodCore 2.14.3 oder neuer
**Zielversion:** PodCore 2.14.8

## Zweck des Releases

PodCore v2.14.8 stabilisiert zentrale PDF- und Archivierungsabläufe und erweitert die redaktionelle Arbeit mit klaren Wiederherstellungs- und Exportwegen. Der Release schließt insbesondere Lücken bei mehrseitigen Fragen-Pool-Dokumenten, bei der persönlichen Vorbereitung von Interview-Partnern und bei der vollständigen Ablage einer abgeschlossenen Episode.

> Die Ideenmappe bleibt die zentrale redaktionelle Sammelstelle einer Folge. Die in diesem Release ergänzten Papierkorb-, Partnerfilter- und Archivfunktionen sorgen dafür, dass diese Inhalte einerseits sauber kontextbezogen bleiben und andererseits nachvollziehbar wiederhergestellt oder langfristig abgelegt werden können.

| Bereich | Ergebnis in v2.14.8 |
|---|---|
| Allgemeiner Fragen-Pool | Fragen-Pool-PDFs halten Fragenblöcke zusammen; Themen lassen sich umbenennen und bleiben dadurch übersichtlich gruppiert. |
| Persönliche Interview-Unterlagen | Für einen Interview-Partner kann ein persönliches PDF mit Anschreiben und zugehörigen Fragen erzeugt werden. |
| Ideenmappen | Gelöschte Ideenmappen werden zunächst in den Papierkorb verschoben und können wiederhergestellt werden. |
| Fragen in der Ideenmappe | In der Fragenverwaltung stehen nur die Interview-Partner der aktuell geöffneten Ideenmappe zur Auswahl. |
| Staffelplan-PDF | Logo und Überschrift der modernen Staffelplanung sind im Kopfbereich getrennt angeordnet. |
| Episodenarchiv | Archivierte Episoden lassen sich als vollständige ZIP-Archivmappe mit strukturierten Daten und verfügbaren Dateien herunterladen. |

## Vor dem Update

Erstellen Sie vor jeder Aktualisierung ein vollständiges Backup über **Einstellungen → Branding & Backup** und bewahren Sie die Sicherungsdatei außerhalb des PodCore-Servers auf. Prüfen Sie anschließend die im Seitenkopf angezeigte Version. Für Installationen ab PodCore **2.14.3** ist der integrierte, verifizierte Update-Weg vorgesehen.

Der integrierte Ablauf prüft die Struktur des ZIP-Pakets, die Zielversion und die Buildfähigkeit in einem Staging-Bereich. Vor der Übernahme wird der bisherige Programmstand gesichert. Die Anwendung bestätigt den Abschluss erst, nachdem sie mit der erwarteten Zielversion neu gestartet wurde.

## Update über die Anwendung

1. Öffnen Sie **Einstellungen → App-Update**.
2. Wählen Sie die Release-Datei **`PodCore-v2.14.8.zip`** aus.
3. Starten Sie zunächst die Paketprüfung und anschließend die Übernahme.
4. Warten Sie, bis PodCore den Neustart und die Zielversion **2.14.8** bestätigt.
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

Für v2.14.8 sind keine manuellen SQL-Schritte erforderlich. Die vorhandenen Datenbankergänzungen für Ideenmappen-Papierkorb, Interview-Partnerstatus und flexible Staffelnummern werden beim Serverstart abwärtskompatibel und idempotent geprüft.

## Bedienung: Fragen-Pool und persönliche Interview-Unterlagen

Öffnen Sie **RedaktionsHub → Interviews** und wechseln Sie zum allgemeinen Fragen-Pool. Die Fragen sind nach Themen gruppiert; umfangreiche Themenbereiche können für eine konzentrierte Arbeitsansicht ein- und ausgeklappt werden. Über die Themenaktion kann ein vorhandener Themenname geändert werden. Alle Pool-Fragen dieses Themas werden dabei in die neue Gruppe übernommen.

Beim PDF-Export berechnet PodCore vor dem Schreiben einer Frage den benötigten Platz. Falls der verbleibende Seitenbereich nicht ausreicht, beginnt der vollständige Fragenblock auf der nächsten Seite. Dadurch erscheinen Frage, Kategorie und vorhandene Hintergrundinformation nicht mehr über zwei Seiten getrennt.

Für individuelle Gesprächsvorbereitungen öffnen Sie einen Interview-Partner und wählen den persönlichen PDF-Export. Das Dokument bündelt das Anschreiben sowie die zugeordneten Fragen in einer partnerbezogenen Unterlage. Verwenden Sie bei Bedarf den individuellen Dokumenttitel und das für Interview-Unterlagen vorgesehene PDF-Layout.

| Arbeitsschritt | Erwartetes Ergebnis |
|---|---|
| Thema im Fragen-Pool umbenennen | Alle allgemeinen Pool-Fragen des alten Themas erscheinen unter dem neuen Themenamen. |
| Fragen-Pool als PDF herunterladen | Lange Fragenblöcke bleiben vollständig und lesbar; keine Frage beginnt am Seitenende und endet auf der Folgeseite. |
| Persönliche Interview-PDF erzeugen | Anschreiben und partnerbezogene Fragen sind gemeinsam im exportierten PDF enthalten. |

## Bedienung: Ideenmappe, Partner und Papierkorb

Die Fragenverwaltung einer Ideenmappe lädt nur die Interview-Partner, die dieser Ideenmappe direkt zugeordnet sind. Beim Anlegen oder Bearbeiten einer Frage ist deshalb ausschließlich der relevante Partnerkreis auswählbar. Das verhindert versehentliche Zuordnungen zu Gesprächspartnern anderer Folgen.

Wird eine Ideenmappe gelöscht, entfernt PodCore sie nicht sofort dauerhaft. Die Ideenmappe wird in den **Papierkorb** verschoben und kann dort wiederhergestellt werden. Nach der Wiederherstellung steht sie wieder mit ihren verknüpften redaktionellen Daten im regulären Ideenbereich zur Verfügung.

> Der Papierkorb ist ein Wiederherstellungsweg, kein Ersatz für regelmäßige Backups. Löschen Sie Sicherungsdateien oder Serverdaten daher nicht, bevor das reguläre Backup geprüft wurde.

## Bedienung: Staffelplan-PDF

Öffnen Sie **RedaktionsHub → Staffelplanung**, wählen Sie die passende Staffel und klicken Sie auf **PDF**. Der Layouttyp **„Staffelplanung Modern“** bleibt der passende Standard für die strategische Planung. Der Kopfbereich führt Logo und Dokumenttitel nun in getrennten Bereichen, sodass beide Elemente bei langen Titeln lesbar bleiben.

## Bedienung: ZIP-Archivmappe für abgeschlossene Episoden

Eine Archivmappe kann nur für eine tatsächlich archivierte Episode erzeugt werden. Archivieren Sie die Episode deshalb zunächst über den vorgesehenen Archivierungsablauf. Öffnen Sie danach die Archivansicht und wählen Sie bei der gewünschten Episode **Archivmappe herunterladen**.

Die ZIP-Datei ist als eigenständige, nachvollziehbare Übergabe- und Sicherungsmappe aufgebaut. Sie enthält einen lesbaren Überblick sowie strukturierte JSON-Daten. Lokale Dateien werden aufgenommen, wenn sie am registrierten Speicherort verfügbar sind. Nicht verfügbare Dateien werden transparent im Dateimanifest vermerkt.

| Ordner oder Datei | Inhalt |
|---|---|
| `ARCHIVMAPPE.md` | Lesbarer Überblick zu Episode, Archivdatum und enthaltenen Unterlagen. |
| `Daten/manifest.json` | Format-, Versions- und Umfangsangaben der erzeugten Archivmappe. |
| `Daten/episode.json` | Stammdaten der archivierten Episode. |
| `Daten/ideenmappe.json` | Verknüpfte Ideenmappe einschließlich Notizen, Checklisten, Recherche und Upload-Referenzen. |
| `Daten/interviews.json` | Zugeordnete Interview-Partner und Interview-Fragen. |
| `Daten/sponsoring.json` | Sponsoring-Buchungen, zugehörige Verträge und direkte Sponsor-Daten der Episode. |
| `Daten/medien.json` | Verknüpfte Medien und ein nachvollziehbares Dateimanifest. |
| `Daten/episode-workflow.json` | Kommentare und Versionseinträge des Episoden-Workflows. |
| `Dateien/Ideenmappe` und `Dateien/Medien` | Verfügbare hochgeladene Ideen- und Mediendateien. |

## Prüfliste nach dem Update

| Prüfung | Soll-Ergebnis |
|---|---|
| Versionsanzeige | Der Seitenkopf zeigt **v2.14.8**. |
| Allgemeiner Fragen-Pool | Themen sind einklappbar; ein Thema kann umbenannt werden. |
| Fragen-Pool-PDF | Mehrseitige Exporte zeigen vollständige Fragenblöcke ohne abgeschnittene Fortsetzung. |
| Persönliche Interview-PDF | Anschreiben und Fragen des gewählten Partners erscheinen im selben Dokument. |
| Ideenmappen-Papierkorb | Eine gelöschte Ideenmappe erscheint im Papierkorb und kann wiederhergestellt werden. |
| Ideenmappen-Partner | Im Fragenformular der Ideenmappe sind nur deren zugeordnete Partner auswählbar. |
| Staffelplan-PDF | Logo und Titel überlappen sich im Kopfbereich nicht. |
| Archivmappe | Eine archivierte Episode liefert eine ZIP mit `ARCHIVMAPPE.md`, `Daten/manifest.json` und den verfügbaren inhaltlichen Daten. |

## Rückfall bei Problemen

Brechen Sie eine laufende Aktualisierung nicht ab. Sollte die Anwendung nach einer manuellen Installation nicht starten, stellen Sie zunächst den vorherigen Programmstand und das vor dem Update erzeugte Vollbackup wieder her. Prüfen Sie anschließend die Serverprotokolle sowie die Paketversionen von Root, Client und Server, bevor Sie den Update-Vorgang wiederholen.

## Abgrenzung

Dieses Wartungsrelease verändert keine inhaltlichen Rollenmodelle oder zusätzlichen Abrechnungsabläufe. Die vorhandenen Berechtigungen für Redaktion, Interviews, Episoden, PDF-Export und Archiv bleiben maßgeblich. Fehlt eine Schaltfläche oder Aktion, prüfen Sie daher zuerst die zugewiesene Rolle und die individuellen Rechte des angemeldeten Kontos.
