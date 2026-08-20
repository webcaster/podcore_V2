# PodCore v2.16.23 – Dashboard-Einstellungen im Tutorial

Version **2.16.23** korrigiert die Tutorialführung für den Bereich **„Dashboard Einstellungen“**. Der Klick auf das Zahnrad im Dashboard war bisher zwar als sichtbares Element vorhanden, konnte aber bei der Aufzeichnung den nachfolgenden Einstellungsbereich nicht zuverlässig öffnen und dadurch nicht sauber in eine mehrstufige Anleitung übernommen werden.

## Stabile Dashboard-Ziele

Das Zahnrad trägt nun die stabile Kennung `dashboard-settings-toggle`. Die geöffnete Anpassungsoberfläche besitzt zusätzlich die Kennung `dashboard-settings-panel`. Dadurch kann ein Tutorial entweder den Klick auf das Öffnen der Einstellungen anleiten oder direkt im bereits geöffneten Bereich fortgesetzt werden.

## Aufzeichnung und Wiedergabe

Bei der Aufzeichnung eines Klicks auf **Dashboard anpassen** wird nach dem bestätigten Schritt die Tutorialroute `/?tutorial=dashboard-settings` geöffnet. Das Dashboard reagiert auf diese Route und zeigt den Einstellungsbereich gezielt an. Die anschließenden Klicks, Eingaben oder Screenshots werden somit im richtigen Kontext aufgezeichnet.

In der Tutorialwiedergabe bleibt das Öffnen der Einstellungen als Klickschritt auf dem Dashboard; für einzelne Elemente innerhalb des Anpassungsbereichs kann anschließend das Ziel **„Dashboard Einstellungen bearbeiten“** ausgewählt werden. Die Zielauswahl im Tutorial-Editor enthält beide Varianten übersichtlich in der Gruppe **Dashboard**.

## Prüfung

Der Client-TypeScript- und Produktions-Build sowie die statische Prüfung der Dashboard-Zielkennungen, Aufzeichnungsroute und Tutorialzuordnung waren erfolgreich.
