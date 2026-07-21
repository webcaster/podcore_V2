# PodCore v2.14.7 – Funktionsprüfung

**Prüfdatum:** 21. Juli 2026  
**Geprüfter Stand:** Lokaler Produktions-Build von PodCore v2.14.7

## Geprüfte Abläufe

| Bereich | Prüfschritt | Ergebnis |
|---|---|---|
| Strategische Staffelplanung | Teststaffel angelegt und strategische Planung geöffnet | Erfolgreich; keine endlose Ladeanzeige bei neuer Staffel |
| Flexible Folgennummer | Planposition mit expliziter Folgennummer `0` gespeichert | Erfolgreich; die Kartenansicht zeigt „Folge 0“ |
| Ideenmappe zuerst | Aus einer strategischen Planposition eine Ideenmappe erzeugt | Erfolgreich; der Ablauf führt direkt in die Ideenmappe |
| Ideenmappe als Sammelstelle | Titel, Beschreibung, Kategorien, Schwerpunkte und Planungsnotizen in der Ideenmappe geprüft | Erfolgreich; die Angaben wurden aus der Planposition übernommen |
| Episode erst aus Ideenmappe | Episode über „Episode erstellen“ aus der Ideenmappe erzeugt | Erfolgreich; die Episode ist mit der Ideenmappe und der Staffelposition verknüpft |
| Episoden-Editor | Medienbereich, Kommentare & Feedback und Versionsverlauf als einklappbare Bereiche geprüft | Erfolgreich; Medien starten geschlossen, Kommentare und Verlauf lassen sich bedarfsorientiert öffnen |
| Ideenmappen-Hinweis | Redaktionshub der erzeugten Episode geöffnet | Erfolgreich; die verknüpfte Ideenmappe wird sichtbar erläutert |
| Interview-Partner-Filter | Ein Interview-Partner aus dem Episoden-Editor für die verknüpfte Ideenmappe erstellt | Fehler erkannt und behoben; neu erstellte Partner erscheinen nun direkt gefiltert im richtigen Ideenmappen-Kontext |

## Behobene Lücke während der Prüfung

Beim ersten End-to-End-Test wurde ein aus dem Episoden-Editor angelegter Interview-Partner zwar gespeichert, jedoch nicht der aktiven Ideenmappe zugeordnet. Ursache war die fehlende Übergabe und Persistierung der Ideenmappen-ID im Erstellungsprozess. Die Korrektur übergibt nun die Ideenmappen-ID aus dem Editor, speichert sie am Partner und legt zusätzlich den Datensatz in der Zuordnungstabelle an. Der erfolgreiche Retest mit „Testgast verknüpft“ bestätigt die Korrektur.

## Offene Tests für den Release-Check

Für die finale Freigabe werden ergänzend die Verwaltung des allgemeinen Fragen-Pools, der neue Staffelplan-PDF-Export, die automatische Erstanlage von Sponsor-Verträgen und die Build-/Git-Integrität geprüft.

## Testdaten

Die lokalen Testdaten (Teststaffel, Testidee, Testepisode und Testpartner) wurden ausschließlich in der lokalen Prüf-Datenbank unter `/home/ubuntu/.podcore/` angelegt. Sie sind nicht Teil des Quellcode-Downloads und werden nicht in Git übernommen.

## Ergänzende Oberflächenprüfung: Interview-Verwaltung

Der Redaktionshub zeigt die Interview-Partner mit dem gespeicherten Status **„Offen“** an. Der erfolgreich verknüpfte Testpartner ist in der Partner- und Fragenansicht auswählbar. Nach der Auswahl stehen die vorgesehenen Aktionen „Frage hinzufügen“, „Zusammenfassung“ und „Per E-Mail senden“ zur Verfügung. Als nächster Prüfschritt werden die Sortierung und die Übernahme einzelner Partnerfragen in den allgemeinen Fragen-Pool getestet.

Die Testfrage „Welche Erkenntnis aus diesem Projekt möchten Sie anderen Podcastern mitgeben?“ wurde mit der Kategorie „Abschluss“ und einer internen Notiz vorbereitet. Die Eingabemaske für Partnerfragen enthält alle erwarteten Felder. Im nächsten Schritt wird die Frage gespeichert und die nachgelagerte Sortier- sowie Pool-Archivierungsfunktion geprüft.

## Ergänzende Funktionsprüfung: Fragen-Sortierung und Archivierung

Die Testfrage wurde erfolgreich als **„Frage 1“** gespeichert. In der Kartenansicht werden die Aktionen **„Eine Position nach oben“**, **„Eine Position nach unten“**, **„In allgemeinen Fragen-Pool übernehmen“**, Bearbeiten und Löschen angezeigt. Die Übernahme in den allgemeinen Fragen-Pool wurde ausgelöst und vom System mit der Rückmeldung **„Frage in den allgemeinen Fragen-Pool übernommen“** bestätigt. Damit sind die funktionalen Wege für die gewünschte Reihenfolge und die Wiederverwendung individueller Partnerfragen verfügbar.

## Ergänzende Funktionsprüfung: Allgemeiner Fragen-Pool

Die aus einer Partnerfrage archivierte Testfrage erscheint im allgemeinen Fragen-Pool unter dem Thema **„Abschluss“** inklusive Notiz. Die Poolansicht bietet Suche, Themenfilter, Mehrfachauswahl, PDF-Export und Erfassung neuer Fragen. Der Themenbereich ließ sich über **„Einklappen“** schließen; anschließend wechselte die Aktion erwartungsgemäß zu **„Ausklappen“**. Damit ist die geforderte übersichtliche, einklappbare Themenstruktur erfolgreich verifiziert.

## Ergänzende Oberflächenprüfung: Sponsoring

Die Sponsor-Erfassungsmaske enthält die Felder **„Vertrag von“** und **„Vertrag bis“** sowie den klaren Hinweis, dass bei vollständiger Laufzeit automatisch ein Erstvertrag erzeugt wird. Die Vertragsautomatik ist damit in der Oberfläche transparent kommuniziert. Im folgenden Schritt wird die tatsächliche Anlage mit Testdaten geprüft.

## Ergänzende Funktionsprüfung: Erstvertrag bei Sponsoring

Ein lokaler Testsponsor wurde mit vollständiger Vertragslaufzeit gespeichert. Die Detailansicht öffnete sich mit dem Tab **„Verträge (1)“** und der Erfolgsrückmeldung **„Sponsor und Erstvertrag erstellt“**. Damit ist die automatische Anlage eines verwaltbaren Erstvertrags bei einer Sponsor-Neuanlage erfolgreich Ende-zu-Ende geprüft.

## Ergänzende Funktionsprüfung: Vertragsdetails und Staffelplanung

Der angelegte Erstvertrag ist in der Sponsor-Detailansicht sichtbar und verwaltbar. Er zeigt die Laufzeit **1. August 2026 bis 30. September 2026**, den Status **„aktiv“** sowie den Hinweis, dass er automatisch aus der Vertragslaufzeit der Sponsor-Anlage entstanden ist.

Die strategische Staffelplanung zeigt die überarbeitete, übersichtliche Kartenansicht mit separater Planpositionsnummer, Ablaufbeschreibung und Status. Die geprüfte Position weist sichtbar **„Folge 0“** aus. Der Hinweis zum verbindlichen Ablauf „Ideenmappe zuerst, Episode anschließend“ ist in der Oberfläche vorhanden. Außerdem steht eine eigenständige **PDF**-Aktion für die strategische Staffelplanung bereit.

## Ergänzende Funktionsprüfung: Staffelplan-PDF

Der Staffelplan-Exportdialog bietet den eigenen Layouttyp **„Staffelplanung Modern (Standard)“** und einen anpassbaren Dokumenttitel. Der Export wurde mit dem neuen Layout erfolgreich ausgelöst; die Anwendung bestätigte dies mit **„Strategische Staffelplanung als PDF exportiert“**. Die PDF berücksichtigt nach der Exportbeschreibung Staffelziel, geplante Reihenfolge, Themen, Partner, Schwerpunkte und Alternativen.

## Visuelle Nachschärfung: erneuter PDF-Export

Nach der Überarbeitung des Renderers wurde der Staffelplan erneut mit **„Staffelplanung Modern (Standard)“** exportiert. Der folgende visuelle Vergleich dient der Freigabe des bereinigten Kopfbereichs und der neuen Kartenstruktur.

## Visuelle Freigabe: Staffelplan-PDF

Die finale PDF-Prüfung bestätigt eine deutlich modernisierte und übersichtlichere Darstellung: Der doppelte Dokumenttitel wurde entfernt, eine kompakte **Staffel-Übersicht** ergänzt und jede Planposition als klar abgegrenzte Informationskarte mit farblicher Kennzeichnung, Titel, Folgennummer, Status, Themen, Schwerpunkten und Notizen ausgegeben. Der Export ist damit für den Release freigegeben.

## Abschließender Build-Nachweis

Nach allen Funktions-, Dokumentations- und PDF-Anpassungen wurde der vollständige Produktions-Build mit `pnpm run build` erfolgreich ausgeführt. Client-TypeScript, Vite-Bundle, Server-TypeScript und die Synchronisierung der öffentlichen Dateien in `server/dist/public` wurden ohne Fehler abgeschlossen.
