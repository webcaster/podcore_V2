# Verwaltung

## Benutzer und Rollen

Verwalten Sie Benutzerkonten und weisen Sie verschiedene Rollen und Berechtigungen zu. Rechte sollten nach dem Prinzip der erforderlichen Berechtigung vergeben werden: Mitarbeitende erhalten nur Zugriff auf die Funktionen, die sie für ihre aktuelle Aufgabe benötigen.

### Rechte für die strategische Staffelplanung

Seit **PodCore 2.14.4** ist die strategische Staffelplanung im Bereich **Administration → Rollen und Berechtigungen** granular steuerbar. Die vier Rechte sind unabhängig voneinander zuweisbar und können sowohl über Rollen als auch individuell pro Benutzerkonto gesetzt werden.

| Berechtigung in der Administration | Erlaubt |
|---|---|
| Staffelplanung ansehen | Den Staffelplan-Tab öffnen sowie Staffeln, Ziele und Planpositionen lesen. |
| Staffelplanung bearbeiten | Staffelziele und Planpositionen anlegen, bearbeiten, umsortieren, als Alternative ablegen oder löschen. |
| Staffelplanung exportieren | Die strategische Staffelplanung als PDF ausgeben. |
| Staffelplanung in Episode überführen | Eine geeignete Planposition in Idee und Episode überführen und den Episoden-Editor öffnen. |

Die Standardrollen folgen dem redaktionellen Ablauf.

| Rolle | Lesen | Bearbeiten | PDF-Export | In Episode überführen |
|---|---:|---:|---:|---:|
| Administration | Ja | Ja | Ja | Ja |
| Redaktion | Ja | Ja | Ja | Ja |
| Moderation | Ja | Nein | Ja | Nein |
| Produktion | Nein | Nein | Nein | Nein |

> **Bestandskonten nach dem Update:** Neue Staffelplan-Rechte werden für vorhandene Benutzerkonten anhand ihrer Rolle automatisch ergänzt. Individuell ausdrücklich gesetzte Einschränkungen bleiben erhalten. Ein Redaktionskonto kann die Staffelplanung daher beispielsweise weiterhin lesen, aber nicht bearbeiten, wenn dieses einzelne Recht bewusst deaktiviert wurde.

## Sponsoren

Verwalten Sie Ihre Sponsoren, deren Kontaktdaten, Verträge und Buchungen.

## Medienbibliothek

Die Medienbibliothek ist der zentrale Bestand für Audiodateien, Bilder, Dokumente und weitere Medien, die Sie in Episoden verwenden.

## PDF-Layout-Manager

Passen Sie die Layouts Ihrer PDF-Exporte an Ihre Corporate Identity an. Staffelplan-PDFs wählen ein bestehendes Episoden-CI-Layout und übernehmen daraus Kopf, Fuß, Farben und Branding.

## App-Update

> **Einmaliger Übergang aus 2.14.2 oder älter:** Installieren Sie Version 2.14.3 manuell nach der mitgelieferten Update- beziehungsweise Ubuntu-Anleitung. Der alte ZIP-Handler kann Erfolg melden, obwohl die aktive Anwendung unverändert bleibt. Verwenden Sie den integrierten ZIP-Weg erst, wenn PodCore bereits Version 2.14.3 oder neuer meldet.

Ab laufender Version **2.14.3** können Administrationskonten mit der Berechtigung zur Systemeinstellungsverwaltung Folgereleases unter **Einstellungen → App-Update** einspielen. Für **PodCore 2.14.4** laden Sie das offizielle Archiv `PodCore-v2.14.4.zip` hoch, prüfen die zugehörige SHA-256-Datei und wenden die Übernahme erst nach erfolgreicher Paketprüfung an. Die Updatekarte in der Administration führt ebenfalls direkt zu diesem zentralen Bereich; ein zweiter, abweichender Installationsweg wird nicht mehr angeboten.

| Phase | Bedeutung |
|---|---|
| Vorbereitung | Wartungsfenster festlegen, Benutzeraktivität beenden und eine vollständige externe Sicherung des persistenten PodCore-Datenverzeichnisses erstellen. |
| ZIP hochladen | Ausschließlich das unveränderte offizielle Release-ZIP auswählen. |
| Paket prüfen | PodCore kontrolliert Archivstruktur, Paketversionen und Node.js-Kompatibilität und führt Installation sowie Produktions-Build zunächst im Staging aus. |
| Update anwenden | Erst nach erfolgreicher Vorabprüfung wird der vorhandene Programmstand gesichert und das vorbereitete Ergebnis rollbackfähig übernommen. |
| Neustart bestätigen | Der Dialog überbrückt den Verbindungswechsel und meldet den Abschluss erst, wenn der neue Serverprozess erreichbar ist und die erwartete Zielversion bestätigt. |
| Abschluss prüfen | Version, Anmeldung, Redaktions-Hub, Staffelverwaltung, einen Planungsübergang und einen PDF-Export kontrollieren. Bei einem Ubuntu-Systemdienst zusätzlich `update.log` und `journalctl -u podcore` prüfen. |

> **Fehlerfall ab Version 2.14.3:** Scheitern Übernahme, Laufzeitinstallation oder Versionsverifikation, stellt PodCore den gesicherten vorherigen Programmstand wieder her. Das ersetzt nicht die vorab erstellte externe Datensicherung.

Die vollständige Anleitung für 2.14.4 steht unter [`docs/UPDATE-2.14.4.md`](../docs/UPDATE-2.14.4.md).
