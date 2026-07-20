# RedaktionsHub

Der RedaktionsHub ist der zentrale Ort für Ideenfindung, Recherche und redaktionelle Vorbereitung von Podcast-Episoden. Seit **PodCore 2.14.4** enthält er zusätzlich den Tab **Staffelplanung**. Dieser ordnet Themen und potenzielle Folgen strategisch einer Staffel zu, bevor die operative Ausarbeitung im Episoden-Editor beginnt.

> **Arbeitsprinzip:** Der Ideenpool sammelt lose Themen, die Staffelplanung formt daraus eine dramaturgische Reihenfolge, der Redaktionsplan terminiert die Arbeit und der Episoden-Editor führt Produktion und Veröffentlichung fort.

## Strategische Staffelplanung

Öffnen Sie im RedaktionsHub den Tab **Staffelplanung**. Wählen Sie eine bestehende Staffel aus oder öffnen Sie den passenden Kontext direkt über **Staffeln → Planung öffnen**. Pflegen Sie zuerst das Staffelziel und die Leitgedanken, beispielsweise Zielgruppe, Leitfrage, Themenbogen oder gewünschte Dramaturgie.

| Bereich | Zweck |
|---|---|
| Geplante Reihenfolge | Verbindliche oder in Arbeit befindliche Folgenpositionen in der gewünschten Staffelabfolge. |
| Alternativen und Überhang | Reserve- und Variantenideen, die noch nicht zur verbindlichen Folgeabfolge gehören. |
| Staffelziel und Leitgedanken | Redaktioneller Rahmen für Themenmix, Dramaturgie und Schwerpunktsetzung. |

### Planposition anlegen und priorisieren

Wählen Sie **Folge planen**, um eine strategische Position anzulegen. Eine Position kann später verschoben, bearbeitet, als Alternative abgelegt oder – sofern berechtigt – in den Episoden-Editor überführt werden.

| Feld | Bedeutung |
|---|---|
| Arbeitstitel und Kurzbeschreibung | Vorläufige Benennung und fachliche Einordnung der geplanten Folge. |
| Bereich | Einordnung als geplante Reihenfolge oder Alternative beziehungsweise Überhang. |
| Themen und Schwerpunkte | Wiederverwendbare Suchbegriffe, Leitfragen, Lernziele oder dramaturgische Ankerpunkte. |
| Format, Priorität und Status | Kennzeichnen Form, Bedeutung und Reifegrad der Position. |
| Geplanter Termin | Unverbindlicher Zieltermin; die operative Terminierung erfolgt weiterhin im Redaktionsplan. |
| Partner und Rollen | Vorgemerkte Gesprächspartner, Rollenplatzhalter und Bestätigungsstatus. |
| Planungsnotizen | Kontext, Abhängigkeiten, Rechercheansätze oder Übergabehinweise. |

Nutzen Sie die Pfeilaktionen an einer Position, wenn sich die Dramaturgie ändert. Alternativen können erst nach redaktioneller Entscheidung in die verbindliche Reihenfolge überführt werden.

## In den Episoden-Editor überführen

Die Aktion **Im Episoden-Editor weiterarbeiten** überführt eine Position der geplanten Reihenfolge ohne doppelte Datenerfassung. PodCore erstellt oder verwendet dabei eine verknüpfte Ideenmappe, übernimmt Arbeitstitel, Kurzbeschreibung, Themen, Priorität, Schwerpunkte, Notizen und vorgemerkte Partner und öffnet anschließend die zugehörige Episode.

> Der Übergang ist **idempotent**. Wird die Aktion erneut ausgeführt, öffnet PodCore die bereits verknüpfte Episode, statt eine zusätzliche Idee oder Episode anzulegen.

Im Episoden-Editor kennzeichnet ein Hinweisfeld **Strategische Staffelplanung** den Ursprung der Episode. Wählen Sie dort **Zurück zur Planung**, um zum korrekten Staffelplan zurückzukehren. Nach der ersten Übergabe zeigt die Planposition die Aktion **Episode weiterbearbeiten** und den aktuellen Arbeitsstand.

## Ideenmanagement

Verwalten Sie Podcast-Ideen, ihren Status und zugehörige Informationen. Ideen dienen als flexible Sammlung für Themen, die noch keiner verbindlichen Folgenposition zugeordnet sind.

## Interviewfragen und Zeitstempel

Erstellen und organisieren Sie Interviewfragen. Mit der **automatischen Zeitstempel-Funktion** können Sie Interviewfragen mit Zeitstempeln versehen, indem PodCore eingebettete Audiomarker aus hochgeladenen MP3- oder WAV-Dateien ausliest oder Audiometadaten analysiert.

## Allgemeiner Fragen-Pool

Der allgemeine Fragen-Pool speichert wiederverwendbare Interviewfragen unabhängig von einer einzelnen Idee, Episode oder Interviewperson. Öffnen Sie im RedaktionsHub den Bereich **Interview** und anschließend **Allgemeiner Fragen-Pool**.

| Aufgabe | Vorgehen |
|---|---|
| Frage anlegen | Wählen Sie **Neue Pool-Frage**, tragen Sie Fragetext und Thema ein und ergänzen Sie bei Bedarf interne Notizen. |
| Bestand ordnen | Nutzen Sie Volltextsuche und Themenfilter. Die Ansicht gruppiert passende Fragen nach Thema. |
| Frage bearbeiten oder kopieren | Öffnen Sie das Aktionsmenü der Frage. Beim Kopieren entsteht ein unabhängiger neuer Pool-Eintrag. |
| Mehrere Fragen auswählen | Aktivieren Sie den Auswahlmodus und markieren Sie die benötigten Fragen. Die Auswahl kann anschließend gemeinsam exportiert oder zugewiesen werden. |
| Fragen zuweisen | Wählen Sie das Ziel im Zuweisungsdialog. Eine bereits vorhandene identische Zuweisung wird nicht doppelt erzeugt. |
| Fragen löschen | Löschen entfernt den Pool-Eintrag. Bereits bewusst zugewiesene Interviewfragen bleiben als eigenständige Arbeitskopien erhalten. |
| PDF erzeugen | Öffnen Sie **PDF-Export**, wählen Sie alle, gefilterte oder markierte Fragen, vergeben Sie optional einen Dokumenttitel und wählen Sie ein vorhandenes PDF-Layout. |

> **Abgrenzung:** Pool-Fragen werden ausschließlich über die Pool-Oberfläche verwaltet. Ideen-, Partner- und Episodenfragen bleiben in ihren jeweiligen Interviewansichten und werden serverseitig getrennt behandelt.

## Recherche und Notizen

Sammeln Sie Recherchematerial, Links und Notizen zu Ihren Episoden-Ideen. Ergänzen Sie die strategische Planung erst, wenn ein Thema ausreichend konkret ist, um es zuverlässig einer Staffelposition oder einer Alternative zuzuordnen.
