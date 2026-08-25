# PodCore v2.16.34 – Stabile Tutorialhilfe und PDF-Markierungen

Version **2.16.34** behebt zwei gemeldete Tutorialprobleme und ergänzt eine klare Alternative zur interaktiven Führung. Der Release basiert auf dem bereits aktuellen Quellstand v2.16.33 und hebt die App daher auf die nächste Patch-Version an.

## Tutorialstart ohne leeren Bereich

PodCore prüft beim Start eines Tutorials jetzt, ob das Tutorial aktiviert ist und eine gültige Schrittfolge enthält. Fehlen die Schritte oder sind historische Daten unvollständig, wird die Führung nicht mehr mit einer leeren Fläche geöffnet. Stattdessen erhält der Nutzer eine verständliche Meldung und kann direkt in die Wissensbase wechseln. Ein zusätzlicher Schutz im Tutorialfenster fängt auch inkonsistente Laufzeitdaten ab, ohne die übrige App-Oberfläche zu blockieren.

## Direkter Wiki-Zugang

Im Fußbereich einer laufenden interaktiven Führung befindet sich nun die Aktion **„Wiki“**. Sie beendet die Führung bewusst und öffnet das vollständige PodCore-Wiki. Auch die Hilfe & Wissensbase besitzt eine sichtbare **„Wiki“**-Aktion. Das zentrale Wiki enthält einen neuen Artikel zur Wahl zwischen Tutorial und Wiki, zur Behandlung nicht startbarer Tutorials und zu Screenshot-Markierungen.

## Tutorial-PDF mit Markierungen

Der Export rendert Punkt-, Kreis- und Zeichenmarkierungen zusätzlich direkt im jsPDF-Koordinatensystem über dem Screenshot. So bleiben Markierungen sichtbar, wenn der Screenshot nicht als Canvas nachbearbeitet werden kann. Der Export berücksichtigt weiterhin die PDF-Layout-Option **„Markierungen und Erklärungen anzeigen“**. Wird sie bewusst ausgeschaltet, werden weder Überlagerungen noch Markierungslegende ausgegeben.

Ein visueller Rauchtest erzeugte eine einseitige A4-PDF, in der ein nummerierter Punkt, ein farbiger Kreis und ein Zeichen über einem Screenshotbereich sichtbar sind.

## Add-on-Plan

Die neue Dokumentation [`ADDON-PLAN-2.16.34.md`](ADDON-PLAN-2.16.34.md) führt die vorhandene Add-on-Konzeption weiter. Sie trennt den bestehenden WordPress-Add-on-Katalog von der späteren sicheren Paketverwaltung in PodCore, definiert deklarative Pakettypen, Signatur- und Kompatibilitätsprüfungen, Offline-Grace-Perioden, Produktkategorien und eine schrittweise Umsetzungsreihenfolge. Mit diesem Release werden keine Add-ons aktiviert, installiert oder verkauft.

## Prüfung

Client- und Server-TypeScript-Build einschließlich Produktionssynchronisierung wurden erfolgreich ausgeführt. Der isolierte PDF-Rauchtest wurde als A4-Dokument mit genau einer Seite erzeugt und visuell auf die drei Markierungstypen geprüft.
