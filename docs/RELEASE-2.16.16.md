# PodCore v2.16.16 – Geführte Tutorials und klare Werbeplatzaktionen

Version **2.16.16** verbessert die unmittelbare Orientierung während eines Tutorials und entfernt technische Sprache aus dem Arbeitsablauf für Werbeplatzbuchungen.

## Interaktive Führung in der App

Tutorialschritte mit einem Ziel navigieren weiterhin bei Bedarf auf die passende Seite und heben das konfigurierte Menü oder Bedienelement sichtbar hervor. Die Infokarte formuliert nun zusätzlich klar die nächste Aktion: Nutzer sehen, dass sie auf den violett hervorgehobenen Bereich klicken sollen. Das gilt sowohl für Menüpunkte der Seitenleiste als auch für mit `data-tutorial-id` markierte Bedienelemente innerhalb der jeweiligen Seite.

Die interaktive App-Führung und die WordPress-Dokumentation verwenden damit denselben Schritt, dieselbe Beschreibung und dieselben Markierungen: Die Website erklärt die Funktion nachvollziehbar; die App zeigt den konkreten Klickweg direkt im Arbeitskontext.

## Werbeplatzbuchungen im Episoden-Editor

Der technische Hinweis „Keine v2-Buchungen für diese Episode“ wurde entfernt. Stattdessen erscheint eine handlungsorientierte Leeransicht mit der Bezeichnung **„Noch keine Werbeplatzbuchung“**. Sie erläutert kurz den Nutzen der Zuordnung und stellt berechtigten Benutzern direkt die Aktion **„Werbeplatz buchen“** bereit.

## Ergänzendes WordPress-Plugin

Das separate Paket **PodCore Tutorial Hub v2.16.10** übernimmt Schritttexte, Bilder und Marker aus mehreren PodCore-Exportvarianten. Screenshot-Markierungen werden in der WordPress-Detailansicht nummeriert, kontrastreich und mit ihrer Erklärung ausgegeben. Das Plugin bleibt bewusst außerhalb des App-GitHub-Repositories.

## Prüfung

Die Client- und Server-TypeScript-Prüfung sowie der Produktions-Build wurden für PodCore v2.16.16 ausgeführt. Für das WordPress-Plugin wurden PHP-Syntax, Bildschutz, Schritttext-Varianten, Markerfeldnamen und Prozent-/Dezimalkoordinaten in einer isolierten Testumgebung geprüft.
