# PodCore v2.16.21 – Mehrstufige Tutorialsequenzen

Version **2.16.21** erweitert die Klickaufzeichnung zu einer vollständigen Sequenz. Komplexe Menüs, Dialoge und mehrteilige Eingaben können jetzt in einem zusammenhängenden Durchlauf als mehrere geordnete Tutorialschritte erfasst werden.

## Sequenzaufzeichnung in der App

Ein Administrator startet den Aufzeichnungsmodus im Tutorial-Editor und arbeitet den tatsächlichen Ablauf in der App ab. Nach jedem Klick auf ein vorbereitetes Tutorialziel wird ein Schritt mit Zielkennung, aktueller Route, sichtbarer Bezeichnung, Hinweistext und Interaktionsmodus zur Sequenz hinzugefügt. Der Aufzeichnungsmodus bleibt aktiv, sodass unmittelbar der nächste Klick oder eine weitere Zwischenaktion erfasst werden kann.

Die Schaltfläche **„Sequenz fertig“** übergibt alle aufgezeichneten Aktionen in der ursprünglichen Reihenfolge an den Tutorial-Editor. Dort entstehen normale, weiter bearbeitbare Schritte. Bei einer vorhandenen Schrittposition wird die erste Aktion in diesen Schritt übernommen; nachfolgende Aktionen werden als klar nummerierte Unterschritte direkt danach eingefügt.

## Zwischenbilder

Für jeden erfassten Klick kann optional **„Zwischenbild dieses Schritts aufnehmen“** aktiviert werden. PodCore erzeugt dann eine Momentaufnahme der aktuellen App-Ansicht und ordnet sie genau diesem Sequenzschritt zu. Screenshots bleiben optional: Sie unterstützen besonders WordPress, PDF und JSON-Download, während die interaktive App-Führung auch ohne Bild vollständig funktioniert.

## WordPress Tutorial Hub v2.16.11

Das separate WordPress-Plugin übernimmt nun Zielroute, Interaktionsmodus und Reihenfolge der Sequenzschritte. Auf der Tutorialseite wird bei jedem Schritt erklärt, ob in PodCore ein markierter Bereich angeklickt, eine Aufgabe bestätigt oder nur ein Hinweis gelesen werden soll.

Tutoriale erhalten zusätzlich ein gestaltbares Titelbild. Autoren können im WordPress-Editor das normale **Beitragsbild** setzen. Beim JSON-Import werden alternativ `titleImage`, `coverImage` oder `featuredImage` berücksichtigt; eingebettete Titelbilder werden in die Mediathek übertragen und für Grid sowie Detailansicht verwendet.

## Bugfix: Im Tutorial-Editor weiterarbeiten

Das Speichern eines Tutorials führt nicht mehr automatisch zurück zur Tutorialübersicht. Der Editor übernimmt den vom Server bestätigten Datensatz direkt in den aktuellen Bearbeitungszustand, zeigt die Erfolgsmeldung **„Tutorial gespeichert“** und bleibt auf dem Tab **Schritte** geöffnet. Neue Tutorials erhalten dadurch nach dem ersten Speichern ihre echte ID und können ohne Duplikate weiter bearbeitet werden. Die Rückkehr zur Übersicht erfolgt nur noch über die vorhandene bewusste Zurück-Aktion.

## Bugfix: Scrollbares Tutorialfenster

Das Tutorialfenster richtet sich jetzt konsequent am sichtbaren Viewport aus. Lange Schritttexte, Screenshots, Markierungslisten und die Aktionsleiste bleiben innerhalb der Karte scrollbar und erreichbar. Dies gilt auch für kleinere Fensterhöhen; das Tutorialfenster wird nicht mehr unterhalb des Bildschirms abgeschnitten.

## Erweiterte Screenshot-Markierungen

Der Screenshot-Editor bietet neben nummerierten Punkten nun drei Markierungsarten: **Punkt**, **Kreis** und **Zeichen**. Kreise können in klein, mittel oder groß gesetzt werden; Zeichen stehen für `!`, `?`, `✓`, `→` und `⚠` bereit. Jede Markierung hat eine eigene Farbe, Position und Erklärung. Die Formen werden in der App wiedergegeben und beim Import sicher normalisiert, sodass sie auch in exportierten Tutorialdaten erhalten bleiben.

## Prüfung

Der Client- und Server-TypeScript-Build sowie die Produktionssynchronisierung waren erfolgreich. Die WordPress-Plugin-Datei wurde auf PHP-Syntax geprüft. Eine isolierte JSON-Prüfung bestätigte Titelbild, Klicksequenz, Zielroute, Interaktionsmodus, Bildschutz, Markierungen und Rollen.
