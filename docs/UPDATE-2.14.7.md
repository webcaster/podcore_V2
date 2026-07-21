# PodCore v2.14.7 – Update-, Bedien- und Prüfanleitung

**Release:** 21. Juli 2026  
**Ausgangsversion:** PodCore 2.14.3 oder neuer  
**Zielversion:** PodCore 2.14.7

## Zweck des Releases

PodCore v2.14.7 bündelt die geprüften Hotfixes der Redaktions-, Staffelplanungs-, Sponsoring- und PDF-Abläufe. Der zentrale Produktionsprozess wurde so geschärft, dass eine strategisch geplante Folge nicht mehr unmittelbar als Episode entsteht. Stattdessen wird zunächst eine **Ideenmappe** als vollständige redaktionelle Arbeitsgrundlage angelegt. Erst danach erzeugt die Redaktion aus dieser Ideenmappe die Episode.

> Eine Ideenmappe ist in diesem Ablauf die verbindliche Sammelstelle für Themen, Recherche, Notizen, Schwerpunkte, Gesprächspartner und weitere vorbereitende Informationen einer geplanten Folge.

| Bereich | Ergebnis in v2.14.7 |
|---|---|
| Strategische Staffelplanung | Planpositionen werden zuerst als Ideenmappe vorbereitet und anschließend als Episode weitergeführt. |
| Folgenzählung | Flexible Folgennummern einschließlich **Folge 0** für Pilot-, Trailer- oder Sonderfolgen. |
| Staffelplan-PDF | Eigenes, modernes Layout mit Staffelübersicht und Informationskarten. |
| Episoden-Editor | Einklappbare Bereiche für Feedback und Verlauf, eingeklappter Medien-Upload sowie Ideenmappen-Hinweis. |
| Interview-Verwaltung | Status, Sortierung, Übernahme einzelner Fragen in den allgemeinen Pool und einklappbare Themenbereiche. |
| Sponsoring | Automatischer Erstvertrag bei vollständiger Vertragslaufzeit einer Sponsor-Neuanlage. |

## Vor dem Update

Erstellen Sie vor jeder Aktualisierung ein vollständiges Backup über **Branding & Backup**. Bewahren Sie die heruntergeladene Sicherungsdatei außerhalb des PodCore-Servers auf. Prüfen Sie danach, dass die aktuell laufende Version im Seitenkopf angezeigt wird.

Für Installationen ab PodCore **2.14.3** ist der integrierte, verifizierte Update-Weg vorgesehen. Dieser prüft Archivstruktur, Version und Buildfähigkeit, legt eine Sicherung des bisherigen Programmstands an und startet die Anwendung erst nach erfolgreicher Übernahme neu.

## Update über die Anwendung

1. Öffnen Sie **Einstellungen → App-Update**.
2. Wählen Sie die Release-Datei **`PodCore-v2.14.7.zip`** aus.
3. Starten Sie die Prüfung und Übernahme des Updates.
4. Warten Sie, bis PodCore den echten Neustart und die Zielversion **2.14.7** bestätigt.
5. Aktualisieren Sie den Browser einmal vollständig und prüfen Sie die Versionsanzeige im Seitenkopf.

## Manuelle Aktualisierung

Wenn die integrierte Update-Funktion nicht verwendet werden kann, installieren Sie die Version manuell im Anwendungsverzeichnis.

```bash
git pull
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Die Datenbankergänzungen für die freie Folgennummer und den Interview-Partnerstatus werden beim ersten Serverstart automatisch und idempotent durchgeführt. Es sind keine manuellen SQL-Schritte erforderlich.

## Bedienung: Strategische Staffelplanung

Öffnen Sie **Redaktions-Hub → Staffelplanung** und wählen Sie die gewünschte Staffel. Legen Sie über **Folge planen** eine Planposition mit Titel, Zusammenfassung, Themen, Schwerpunkten, möglichen Gesprächspartnern und optionaler Folgennummer an. Für eine Pilot- oder Sonderfolge darf als Nummer ausdrücklich **0** verwendet werden.

Die Reihenfolge der Planung bleibt unabhängig von der späteren Episodennummer. Eine Planposition mit Nummer 0 kann daher an erster Stelle stehen, ohne die übrige Zählung zu beeinträchtigen.

Nach der Planung führt die Aktion zur **Ideenmappe**. Dort werden alle redaktionellen Inhalte vervollständigt. Erst die Aktion zur Folgenerstellung innerhalb der Ideenmappe erstellt die Episode und übernimmt die Verknüpfung mit Staffel, Planposition und gewählter Folgennummer.

| Arbeitsschritt | Erwartetes Ergebnis |
|---|---|
| Planposition anlegen | Strategischer Platz in der Staffel mit optionaler Folgennummer. |
| Ideenmappe vorbereiten | Zentrale Sammelstelle für Inhalte, Recherche, Fragen, Partner und Notizen. |
| Episode aus Ideenmappe erzeugen | Verknüpfte Episode mit übernommener Staffel- und Folgennummer. |
| Erneut öffnen | Bereits verknüpfte Ideenmappe oder Episode wird wiederverwendet; keine Doppelanlage. |

## Bedienung: Staffelplan als PDF exportieren

1. Öffnen Sie die gewünschte Staffel im Tab **Staffelplanung**.
2. Klicken Sie auf **PDF**.
3. Definieren Sie bei Bedarf einen eigenen Dokumenttitel.
4. Wählen Sie **„Staffelplanung Modern (Standard)“** oder ein eigenes Layout der Kategorie Staffelplanung.
5. Klicken Sie auf **PDF herunterladen**.

Das Standardlayout verwendet das Querformat und enthält eine Staffelübersicht, klare Abschnittsüberschriften und pro Planposition eine Karte mit Titel, Folgennummer, Status, Priorität, Format, Zusammenfassung, Themen, Schwerpunkten, Partnern und Notizen.

## Bedienung: Episoden-Editor und Ideenmappe

Eine aus einer Ideenmappe erzeugte Episode zeigt ihren redaktionellen Ursprung deutlich an. Im RedaktionsHub-Bereich des Editors werden nur die Gesprächspartner der verknüpften Ideenmappe geladen. Wird ein neuer Gesprächspartner im Editor angelegt, wird er automatisch dieser Ideenmappe zugeordnet.

Der Medien-Upload bleibt beim Öffnen des Editors eingeklappt. Die Bereiche **Kommentare & Feedback** und **Versionsverlauf** können bei Bedarf separat aufgeklappt werden. Damit bleibt die Arbeitsfläche bei der täglichen Bearbeitung übersichtlich.

## Bedienung: Interview-Verwaltung und allgemeiner Fragen-Pool

Öffnen Sie **Redaktions-Hub → Interviews**. Jeder Interview-Partner besitzt nun einen sichtbaren und bearbeitbaren Status. In der Partnerfragen-Verwaltung können Fragen mit den Sortieraktionen nach oben oder unten verschoben werden. Die Reihenfolge wird persistent gespeichert.

Über **In Fragen-Pool übernehmen** lässt sich eine einzelne Partnerfrage als wiederverwendbare Frage archivieren. Im allgemeinen Fragen-Pool sind Fragen nach Themen gruppiert. Die Themenbereiche können ein- und ausgeklappt werden, um umfangreiche Pools übersichtlich zu halten.

## Bedienung: Erstvertrag bei Sponsoren

1. Öffnen Sie **Sponsoring → Neuer Sponsor**.
2. Tragen Sie Kontakt- oder Firmenname sowie optional weitere Stammdaten ein.
3. Füllen Sie **Vertrag von** und **Vertrag bis** vollständig aus.
4. Speichern Sie den Sponsor.

PodCore erzeugt in diesem Fall automatisch einen aktiven **Erstvertrag**. Nach dem Speichern öffnet sich die Sponsor-Detailansicht; im Tab **Verträge** ist der Vertrag mit der angegebenen Laufzeit sofort sichtbar und normal verwaltbar.

## Prüfliste nach dem Update

| Prüfung | Soll-Ergebnis |
|---|---|
| Versionsanzeige | Seitenkopf zeigt **v2.14.7**. |
| Strategische Position | Planposition kann mit Folgennummer **0** gespeichert werden. |
| Ideenmappen-Workflow | Die Aktion aus der Planposition öffnet zuerst eine Ideenmappe, nicht unmittelbar eine Episode. |
| Folgenerstellung | Episode wird aus der Ideenmappe erzeugt und bleibt mit Staffel sowie Planposition verknüpft. |
| Staffelplan-PDF | Exportdialog zeigt **„Staffelplanung Modern (Standard)“**; PDF ist lesbar und kartengestützt aufgebaut. |
| Episoden-Editor | Ideenmappen-Hinweis, eingeklappter Medien-Upload und einklappbare Feedback-/Verlaufsbereiche sind vorhanden. |
| Interview-Partner | Nur Partner der Ideenmappe werden angezeigt; neue Partner werden darin unmittelbar sichtbar. |
| Fragen-Pool | Partnerfrage kann übernommen werden; Themenbereiche sind einklappbar. |
| Sponsoring | Vollständige Vertragslaufzeit erzeugt einen verwaltbaren Erstvertrag. |

## Rückfall bei Problemen

Brechen Sie eine laufende Aktualisierung nicht ab. Falls die Anwendung nach einem manuellen Update nicht startet, stellen Sie den zuvor gesicherten Programmstand und das vor dem Update erzeugte Vollbackup wieder her. Prüfen Sie anschließend die Serverprotokolle und wiederholen Sie die Aktualisierung erst nach Klärung der Ursache.

## Abgrenzung

Die Modulverwaltung in der Administration wurde in diesem Release nicht mit zusätzlichen fachlichen Funktionen verändert, da dafür noch keine konkreten Zielabläufe oder Berechtigungsregeln definiert wurden. Die vorhandene Administration bleibt unverändert verfügbar. Für eine gezielte Erweiterung sollten die gewünschten Module, Aktionen, Rollen und Erfolgskriterien benannt werden.
