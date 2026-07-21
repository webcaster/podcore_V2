# PodCore – Vorab-Audit v2.14.6 (Stand vor den Korrekturen für v2.14.7)

**Prüfdatum:** 21. Juli 2026  
**Prüfziel (Ausgangslage):** Abgleich der angeforderten Hotfixes und Erweiterungen mit dem aktuellen Stand des Quellcodes sowie der Build-Prüfung.

## Technischer Prüfstatus

| Prüfpunkte | Ergebnis | Befund |
|---|---:|---|
| Client-TypeScript- und Vite-Build | Bestanden | Der Client baut nach Installation der lokalen Abhängigkeiten ohne TypeScript- oder Vite-Fehler. |
| Server-TypeScript-Build | Bestanden | Der Server kompiliert ohne TypeScript-Fehler. |
| Synchronisation der öffentlichen Dateien | Bestanden | Die gebauten Client-Dateien wurden in `server/dist/public` synchronisiert. |
| GitHub-Stand vor der laufenden Korrektur | Synchron | `main` und `origin/main` zeigten auf Commit `720206a` („Bump version to 2.14.6“). |

## Funktionsabgleich

| Anforderung | Prüfstatus | Feststellung |
|---|---:|---|
| Medien-Upload im Episoden-Editor standardmäßig zugeklappt | Übernommen | Der Zustand des Medienbereichs startet mit `media: false`. |
| Hinweis auf verknüpfte Ideenmappe im Episoden-Editor | Übernommen | Ein sichtbarer Hinweis auf die Ideenmappe ist vorhanden. |
| Kommentare und Versionsverlauf einklappbar | Unvollständig | Zustände für eingeklappte Bereiche existieren, werden aber nicht zur Steuerung von `CommentThread` und `ChangeHistory` verwendet. Beide Komponenten werden dauerhaft angezeigt. |
| Flexible Folgennummerierung inklusive Folge 0 | Unvollständig | Die bisherige Anpassung betrifft nicht den strategischen Folgenablauf. Eine frei wählbare Folgennummer pro Planposition und die Übernahme in die Episode fehlen. |
| Staffelplan-PDF modernisieren | Teilweise | Der Export existiert und verwendet Header-/Abschnitts-Hilfen. Ein eigener auswählbarer PDF-Layouttyp für die Staffelplanung ist jedoch nicht registriert. |
| Ideenmappe vor Episode in strategischer Staffelplanung | Nicht umgesetzt | Der aktuelle Weiterführen-Endpunkt erzeugt beziehungsweise verknüpft Ideenmappe und Episode in einem Schritt. |
| Episode aus Ideenmappe an Staffelposition binden | Nicht umgesetzt | Die vorhandene Folgenerstellung aus der Ideenmappe übergibt keine Staffel- oder Planpositionsverknüpfung. |
| Fragen eines Interview-Partners sortieren | Teilweise | Ein Reorder-Endpunkt im Backend besteht, aber Client-API und Bedienoberfläche fehlen. |
| Partnerfrage in allgemeinen Fragen-Pool übernehmen | Nicht umgesetzt | In der Partnerfragen-Oberfläche existiert keine Aktion zur Übernahme; der allgemeine Pool kann bislang nur separat gepflegt werden. |
| Fragen-Pool / Themen einklappbar und übersichtlich | Teilweise | Der Pool hat Kategorien, Such- und Zuordnungsfunktionen. Eine einklappbare Gruppierung nach Themen ist nicht vorhanden. |
| Nur zur Ideenmappe gehörende Interview-Partner anzeigen | Nicht umgesetzt | Der Episoden-Editor lädt derzeit die allgemeine Partnerliste; eine kontextbezogene Ideenmappen-Filterung fehlt. |
| Status des Interview-Partners im RedaktionsHub | Nicht umgesetzt | Für die Partnerverwaltung ist kein eigener redaktioneller Status sichtbar oder editierbar. |
| Beim Erstellen eines Sponsors Vertragslaufzeit als erster Vertrag anlegen | Nicht umgesetzt | Der Sponsor-POST speichert Laufzeitfelder am Sponsor, erzeugt aber keinen Datensatz in `sponsor_contracts`. |
| Sponsorenliste primär nach Firmenname | Übernommen | Die Anzeige wurde angepasst. |
| Vollständiges Backup | Vorhanden, separat zu prüfen | Der erweiterte Backup-Code ist vorhanden; ein inhaltlicher Roundtrip-Test steht noch aus. |
| Fragen-Pool-PDF ohne abgeschnittene Fragen | Vorhanden, separat zu prüfen | Die Umbau-Logik für Seitenumbruch/Zeilenfluss wurde gefunden; ein visueller Exporttest steht noch aus. |

## Schlussfolgerung

Der aktuelle Quellcode ist technisch baubar, aber mehrere fachliche Anforderungen sind nur teilweise oder noch nicht umgesetzt. Vor einem Versions- und GitHub-Update müssen insbesondere der Ideenmappen-Workflow der Staffelplanung, die Frageverwaltung, die Sponsoren-Vertragsautomatik, das PDF-Layout sowie die einklappbaren Editor-Bereiche korrigiert werden.

Diese Datei dient als Arbeitsprotokoll und wird nach den Korrekturen durch eine finale Prüf- und Änderungsdokumentation ersetzt.
