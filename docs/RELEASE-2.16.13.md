# PodCore v2.16.13 – Transparente Sponsorenbuchungen und vollständige Preislisten

Version **2.16.13** vereinheitlicht die Preisberechnung für Sponsorenbuchungen und erweitert den Preislisten-PDF-Export zu einer vollständigen Leistungsübersicht.

## Buchungen und Preise

Die Preisart wird jetzt pro Buchung dauerhaft gespeichert. PodCore berechnet den verbindlichen Gesamtpreis serverseitig aus Pauschalpreis, Preis pro Folge oder CPM, der Anzahl vereinbarter Folgen und Platzierungen, der Hörerzahl, Preisanpassungen, Hörerbeteiligung und Rabatt. Alle Geldwerte werden auf Cent gerundet. Ein vom Client übermittelter Endpreis kann die serverseitige Berechnung nicht mehr überschreiben.

Vor dem Speichern zeigt das Buchungsformular eine aufgeschlüsselte Preisvorschau. Bei zeitlichen Überschneidungen derselben Werbe-Position wird die Buchung weiterhin bewusst nicht automatisch blockiert, aber als nachvollziehbarer Konflikthinweis zurückgemeldet. Vertragszuordnungen werden auf die Laufzeit des gewählten Vertrags geprüft.

## Preisliste als PDF

Der Preislisten-Export gibt jede aktive und inaktive Werbe-Position als vollständige Informationskarte aus. Er enthält Name, Position, Dauer, Exklusivität, Status, Basispreis, Preis pro Folge, CPM, Währung, Beschreibung und vorhandenen Moderations- oder Standardtext. Nicht hinterlegte Werte werden ausdrücklich ausgewiesen. Der Export legt bei Bedarf weitere Seiten mit fortlaufendem Footer an, statt Einträge abzuschneiden.

## Prüfung

In einer isolierten Testdatenbank wurden Migration, Anmeldung, Sponsoranlage, Buchung mit Preis pro Folge, Cent-Rundung, Konflikthinweis und Preislisten-PDF geprüft. Die Client- und Server-Typprüfung sowie der Produktions-Build wurden erfolgreich ausgeführt. Einzelheiten stehen in [`QUALITAETSPRUEFUNG-2.16.13.md`](QUALITAETSPRUEFUNG-2.16.13.md).
