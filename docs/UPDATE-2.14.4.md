# PodCore 2.14.4 – Strategische Staffelplanung

Version **2.14.4** ergänzt PodCore um eine strategische Planungsebene für ganze Podcast-Staffeln. Redaktionsteams können geplante Folgen in einer dramaturgischen Reihenfolge aufbauen, alternative Themen verwalten, Partner und Rollen vormerken, die Planung als PDF ausgeben und bestätigte Positionen ohne doppelte Datenerfassung in den Episoden-Editor übernehmen.

Die bisherige Trennung bleibt dabei klar: Der **Ideenpool** sammelt lose Themen, die **strategische Staffelplanung** verdichtet daraus eine staffelbezogene Reihenfolge, der **Redaktionsplan** terminiert die Arbeit und der **Episoden-Editor** führt die konkrete Produktion fort.

> Erstellen Sie vor jedem Update ein aktuelles Vollbackup und bewahren Sie es außerhalb des PodCore-Servers auf. Die automatische Programmsicherung des integrierten Updateablaufs ersetzt keine Sicherung des persistenten Datenverzeichnisses.

## Funktionsübersicht

| Bereich | Neu in 2.14.4 | Bedienweg |
|---|---|---|
| Strategische Staffelplanung | Folgenpositionen, Reihenfolge, Alternativen, Themen, Formate, Schwerpunkte und Status je Staffel | RedaktionsHub → Staffelplanung |
| Staffeleinstieg | Direkter Aufruf der Planung aus der bestehenden Staffelverwaltung | Staffeln → Planung öffnen |
| Partner und Rollen | Mehrere vorgemerkte Partner mit Rolle und Bestätigungsstatus je Planposition | Staffelplanung → Planposition bearbeiten |
| Übergang in den Editor | Idee und Episode werden konsistent erstellt oder wiederverwendet und direkt geöffnet | Planposition → Im Episoden-Editor weiterarbeiten |
| Rücknavigation | Verknüpfte Episoden zeigen ihren Planungsursprung und führen zur passenden Staffelplanung zurück | Episoden-Editor → Zurück zur Planung |
| Staffelplan-PDF | Geordnete oder alternative Positionen mit CI-Layout und frei wählbarem Dokumenttitel exportieren | Staffelplanung → PDF exportieren |
| Rollen und Rechte | Lesen, Bearbeiten, PDF-Export und Editorübergang sind getrennt steuerbar | Administration → Rollen und Berechtigungen |

## Update auf 2.14.4

Ab einer laufenden Version **2.14.3 oder neuer** können Sie das offizielle Release-ZIP über **Einstellungen → App-Update** einspielen. Laden Sie `PodCore-v2.14.4.zip` hoch, starten Sie die Paketprüfung und wenden Sie das Update erst an, wenn die Zielversion **2.14.4** bestätigt wird.

| Prüfschritt | Erwartetes Ergebnis |
|---|---|
| SHA-256-Prüfsumme | ZIP und veröffentlichte `.sha256`-Datei stimmen überein. |
| Paketprüfung | Archivstruktur, Zielversion, Abhängigkeiten und Produktions-Build sind erfolgreich. |
| Übernahme | Der bisherige Programmstand wird vor dem Austausch gesichert. |
| Neustart | PodCore meldet nach dem Prozesswechsel Version 2.14.4. |
| Datenbankstart | Die Tabellen und Rechte für die Staffelplanung werden automatisch und idempotent ergänzt. |

> **Upgrade aus 2.14.2 oder älter:** Installieren Sie zuerst das Reparaturrelease 2.14.3 manuell gemäß [`UPDATE-2.14.3.md`](UPDATE-2.14.3.md) beziehungsweise [`INSTALL-UBUNTU.md`](INSTALL-UBUNTU.md). Erst ab einer laufenden Version 2.14.3 ist der integrierte ZIP-Updateweg verlässlich verfügbar.

## Strategische Staffelplanung verwenden

### Planung öffnen und Staffelziel festlegen

Öffnen Sie im **RedaktionsHub** den Tab **Staffelplanung**. Wählen Sie dort eine vorhandene Staffel aus oder wechseln Sie über **Staffeln → Planung öffnen** direkt in den passenden Kontext. Hinterlegen Sie zunächst das redaktionelle Staffelziel, beispielsweise Zielgruppe, Leitfrage, Themenbogen oder gewünschte Dramaturgie.

Die Seite unterscheidet zwei Bereiche:

| Bereich | Zweck |
|---|---|
| Reihenfolge | Bestätigte oder in Arbeit befindliche Folgenpositionen in der vorgesehenen Staffelreihenfolge |
| Alternativen | Reserve- und Variantenideen, die noch nicht in die verbindliche Folgeabfolge gehören |

### Planpositionen anlegen und priorisieren

Erstellen Sie eine Planposition und pflegen Sie die Informationen, die für die strategische Entscheidung und den späteren Redaktionsstart relevant sind.

| Feld | Bedeutung |
|---|---|
| Titel und Kurzbeschreibung | Arbeitstitel und fachliche Einordnung der geplanten Folge |
| Themen | Wiederverwendbare Themenbegriffe für Suche und spätere Ideenübernahme |
| Format | Beispielsweise Interview, Gespräch, Reportage oder Solo-Folge |
| Schwerpunkte | Leitfragen, Lernziele oder dramaturgische Ankerpunkte |
| Priorität und Status | Kennzeichnen Bedeutung und Reifegrad der Position |
| Geplantes Datum | Unverbindlicher Zieltermin; die operative Terminierung bleibt im Redaktionsplan |
| Partner und Rollen | Vorgemerkte Gesprächspartner, Rollenplatzhalter und Bestätigungsstatus |
| Interne Notizen | Kontext, Abhängigkeiten, Rechercheansätze oder Übergabehinweise |

Verschieben Sie Positionen innerhalb der Reihenfolge, wenn sich die Dramaturgie ändert. Alternativen können erst nach fachlicher Freigabe in die verbindliche Reihenfolge überführt werden.

## Vom Redaktions-Hub in den Episoden-Editor

Die Aktion **Im Episoden-Editor weiterarbeiten** ist der kontrollierte Übergang von der strategischen zur operativen Arbeit. Sie steht nur für Positionen zur Verfügung, die nicht mehr bloße Alternative sind und für die das entsprechende Recht vergeben wurde.

PodCore führt bei der ersten Übergabe atomar folgende Schritte aus:

1. Eine zugehörige Ideenmappe wird erzeugt oder eine bereits verknüpfte Ideenmappe wiederverwendet.
2. Arbeitstitel, Kurzbeschreibung, Themen, Priorität, Schwerpunkte und interne Notizen werden als redaktioneller Ausgangspunkt in die Idee übertragen.
3. Vorgemerkte Partner werden inklusive Rolle und Bestätigungsstatus mit der Ideenmappe verknüpft, ohne vorhandene Partnerbeziehungen zu überschreiben.
4. Eine neue Episode wird mit Staffel- und Ideenbezug angelegt oder eine bereits vorhandene verknüpfte Episode wiederverwendet.
5. Die Planposition wird auf den tatsächlichen Arbeitsstand zurückverknüpft und der Episoden-Editor wird geöffnet.

> Die Aktion ist **idempotent**: Ein erneuter Klick erzeugt weder eine zweite Idee noch eine zweite Episode, sondern öffnet die bereits verknüpfte Episode.

Im Episoden-Editor erscheint ein violettes Hinweisfeld **„Strategische Staffelplanung“**. Es macht die Herkunft der Episode sichtbar und enthält den Befehl **„Zurück zur Planung“**. Der Zurück-Pfeil führt bei einer verknüpften Episode ebenfalls in den passenden Staffelplan-Kontext; bei anderen Episoden bleibt er beim bisherigen Rücksprung zur Episodenübersicht.

### Danach im Editor weiterarbeiten

Die erzeugte Episode verwendet den bestehenden Ideen-Import. Dadurch stehen im Editor die bereits übergebenen redaktionellen Daten als Ausgangspunkt für Script, Show-Notes, Metadaten, Interviewvorbereitung, Checklisten und weitere Produktionsschritte bereit. Die Staffelplanung bleibt dabei die strategische Quelle; operative Änderungen erfolgen wie gewohnt im Episoden-Editor und im Redaktionsplan.

## Staffelplanung als PDF exportieren

Wählen Sie in der Staffelplanung **PDF exportieren**. Im Dialog können Sie einen individuellen Dokumenttitel und ein vorhandenes PodCore-PDF-Layout auswählen. Der Export enthält das Staffelziel, die geordnete Folgenabfolge und – je nach Auswahl – auch Alternativen mit Themen, Format, Priorität, Status, Partnern und Notizen.

| Exportoption | Ergebnis |
|---|---|
| Dokumenttitel | Eine projektspezifische Überschrift für Besprechung, Freigabe oder Archiv |
| PDF-Layout | Bestehendes Episoden-CI-Layout mit Kopf, Fuß, Farben und Branding |
| Reihenfolge | Die aktuelle dramaturgische Abfolge der Planpositionen |
| Alternativen | Reservepositionen getrennt von der verbindlichen Abfolge |
| Mehrseitigkeit | Lange Beschreibungen, Partnerlisten und Notizen werden mit Seitenumbruch ausgegeben |

Prüfen Sie nach dem Export insbesondere Reihenfolge, Titel, Themen, Status, Partnerrollen und Seitennummern.

## Rollen und Berechtigungen

Die Staffelplanung verwendet vier getrennte Rechte. Sie sind im Administrationsbereich für Rollen und einzelne Benutzerinnen beziehungsweise Benutzer konfigurierbar.

| Berechtigung | Erlaubt |
|---|---|
| `canViewSeasonPlanning` | Staffeln, Ziel und Planpositionen lesen sowie den Staffelplan-Tab öffnen |
| `canEditSeasonPlanning` | Staffelziel und Planpositionen anlegen, bearbeiten, löschen und umsortieren |
| `canExportSeasonPlanning` | Strategische Staffelplanung als PDF ausgeben |
| `canTransitionSeasonPlanningToEpisode` | Planposition in Idee und Episode überführen und den Editor öffnen |

Die Standardrollen wurden bewusst nach dem redaktionellen Arbeitsablauf abgestuft:

| Rolle | Lesen | Bearbeiten | PDF | In Editor überführen |
|---|---:|---:|---:|---:|
| Administration | Ja | Ja | Ja | Ja |
| Redaktion | Ja | Ja | Ja | Ja |
| Moderation | Ja | Nein | Ja | Nein |
| Produktion | Nein | Nein | Nein | Nein |

Individuelle Benutzerrechte bleiben dabei gezielte Überschreibungen. Neue Rollenrechte werden für bestehende Benutzerprofile ergänzt, ohne ausdrücklich gesetzte Sperren aufzuheben. Ein eingeschränkter Redakteur kann beispielsweise die Staffelplanung lesen, aber nicht bearbeiten, wenn `canEditSeasonPlanning` individuell auf `false` gesetzt ist.

## Prüfung nach dem Update

| Prüfung | Erwartetes Ergebnis |
|---|---|
| RedaktionsHub öffnen | Tab **Staffelplanung** ist für berechtigte Benutzer sichtbar. |
| Staffelverwaltung öffnen | Die Aktion **Planung öffnen** führt zur ausgewählten Staffel im RedaktionsHub. |
| Planposition anlegen | Titel, Themen, Partner und Status erscheinen direkt in der passenden Liste. |
| Planposition umsortieren oder aktualisieren | Reihenfolge und Notizen bleiben nach dem Neuladen erhalten. |
| Staffelplan-PDF exportieren | Eine gültige, mehrseitige PDF mit gewähltem Layout wird heruntergeladen. |
| Im Episoden-Editor weiterarbeiten | Idee und Episode werden einmalig verknüpft und der Editor öffnet sich. |
| Aktion wiederholen | Dieselbe Episode wird wieder geöffnet, ohne Duplikate zu erzeugen. |
| Zurück zur Planung | Der Episoden-Editor führt zur richtigen Staffelplanung zurück. |
| Moderationskonto | Planung lesen und PDF exportieren, aber keine Position ändern oder in den Editor überführen. |
| Produktionskonto | Staffelplanung bleibt nicht zugänglich. |
| Individuelle Sperre | Explizit deaktiviertes Bearbeitungsrecht bleibt trotz Redaktionsrolle wirksam. |
| Health-Endpunkt und Browser-Titel | Beide melden Version 2.14.4. |

## Rückfall und Datensicherung

Bewahren Sie die vor dem Update erstellte Sicherung auf, bis die technische und fachliche Prüfung abgeschlossen ist. Für einen manuellen Rollback stoppen Sie PodCore, stellen den vorherigen Programmstand wieder her und verwenden bei Datenproblemen zusätzlich die Sicherung des persistenten Datenverzeichnisses.

Die produktive Installation und Wiederherstellung unter Ubuntu ist in [`INSTALL-UBUNTU.md`](INSTALL-UBUNTU.md) dokumentiert. Die Release-Historie steht im [`CHANGELOG.md`](../CHANGELOG.md).
