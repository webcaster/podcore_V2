# PodCore v2.16.18 – Stabilität, Übersicht und automatische Sicherung

Version **2.16.18** konzentriert sich auf dichte Arbeitsansichten, verlässliche persönliche Gestaltung und die Absicherung lokaler PodCore-Daten.

## Kompaktere Arbeitsoberfläche

Standardfelder wurden in Höhe und Innenabstand verdichtet. Für Filterleisten, Zahlenwerte und editornahe Eingaben stehen zusätzlich die Klassen `input-compact`, `select-compact` und `input-number-compact` zur Verfügung. Die Änderungen reduzieren übergroße Felder wie die im Nutzertest gemeldete Dauerangabe, ohne die Lesbarkeit oder die Bedienbarkeit auf Touch-Geräten einzuschränken.

Im **Redaktions-Hub** lassen sich Interviewpartner nach Name, Unternehmen, Rolle oder E-Mail durchsuchen und nach Status filtern. Große Listen werden in Seiten zu jeweils zwölf Partnern aufgeteilt. Umfangreiche Fragenkataloge erhalten eine Volltextsuche, einen Freigabefilter und eine Seitenaufteilung zu jeweils sechzehn Fragen; Freigabe, Sortierung und Bearbeitung bleiben dabei unverändert verfügbar.

## Sponsoring und persönliches Design

Werbekategorien werden in den Sponsoring-Slots als kompakte Übersicht mit Kategorie, Farbe, Beschreibung und Preisorientierung dargestellt. Bei Angebotspositionen wird die Kategorie im Auswahlfeld mit ihrer Beschreibung erläutert. Dadurch sind Kategorie, Platzierung und Preismodell klarer voneinander getrennt.

Die persönlichen Designeinstellungen werden beim Speichern serverseitig normalisiert und im Client konsequent neu angewendet. Ungültige Farbwerte, zu kleine oder zu große Schriftgrößen sowie unvollständige Themen werden dadurch abgefangen. Beim Wechsel des Kontos oder Zurücksetzen des Designs werden vorherige CSS-Überschreibungen vollständig entfernt. Der zulässige Bereich der Schriftgröße liegt bei 85 bis 125 Prozent.

## Automatische Backups – A + B

PodCore kombiniert zwei lokale Sicherungswege:

| Weg | Funktion |
|---|---|
| **A – In-App-Sicherung** | Erstellt bei laufendem PodCore fällige vollständige Sicherungen. Standard: täglich, 14 Sicherungen, inklusive eingebetteter Dateien. Intervall, Aufbewahrung und Dateieinbettung sind unter **Einstellungen → Speicher & Backup** anpassbar. |
| **B – Systemplanung** | Die mitgelieferten Einrichtungsdateien planen eine tägliche Sicherung um 20:00 Uhr, auch wenn PodCore geschlossen ist. Sie verwenden denselben atomaren Schreib-, Prüfsummen- und Aufbewahrungsablauf. |

Automatische Dateien erhalten eindeutige Millisekunden-Zeitstempel, werden atomar geschrieben und durch SHA-256 geprüft. Sobald die gewählte Aufbewahrungszahl überschritten wird, entfernt PodCore nur ältere automatisch erstellte Sicherungen. Manuell exportierte Backups bleiben unangetastet.

Details zu Einrichtung, Wiederherstellung und Grenzen stehen in [`docs/AUTOMATISCHE-BACKUPS.md`](AUTOMATISCHE-BACKUPS.md).

## Prüfung

Client- und Server-TypeScript sowie der Produktions-Build waren erfolgreich. Die systemgeplante Sicherungsroutine wurde in einer isolierten Datenbank geprüft: zwei direkt aufeinanderfolgende Sicherungen erhielten eindeutige Dateinamen; die SHA-256-Prüfsumme beider Sicherungen war gültig. Die globale Formularverdichtung, die Redaktions-Hub-Suche und Seitenaufteilung sowie die Theme-Normalisierung wurden durch den Produktions-Build geprüft.
