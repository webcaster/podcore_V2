# PodCore v2.16.15 – Nutzertestkorrekturen und Workflow-Verbesserungen

PodCore v2.16.15 bündelt die bestätigten Korrekturen aus dem abschließenden Nutzertest. Der Schwerpunkt liegt auf belastbaren Sponsoring-Buchungen, dauerhaften Tutorialfortschritten, klaren Datenverwaltungswegen und einem praxistauglicheren Audio-Workflow.

## Sponsoring und Werbeplatzbuchungen

Sponsoring-Buchungen werden serverseitig beim Erstellen und Bearbeiten vollständig neu berechnet. Preis je Folge, Platzierungsanzahl, Preisanpassung, Rabatt und optionale Hörerbeteiligung fließen konsistent in Brutto-, Zwischen- und Endpreis ein. Die Oberfläche übernimmt das vom Server bestätigte Buchungsobjekt direkt in die Liste und lädt anschließend den vollständigen Sponsorstatus erneut. Dadurch bleiben neue und bearbeitete Buchungen unmittelbar sichtbar und erneut editierbar.

Das Buchungsformular verwendet ein einheitliches, responsives Feldraster. Die technische Bezeichnung im Episoden-Editor wurde durch **„Werbeplatzbuchungen“** ersetzt; die nicht benötigte Live-Vorschau wurde entfernt.

## Tutorials und Website-Austausch

Der Abschluss eines Tutorials wird pro Benutzer inklusive Abschlusszeit in der Datenbank gespeichert. Teilaktualisierungen bewahren einen bereits erreichten Abschlussstatus. Hinweis, Wiki und Fortschrittsanzeige verwenden denselben gespeicherten Status.

In der Tutorialverwaltung steht für jedes einzelne Tutorial ein eigener JSON-Export bereit. Der Einzelexport bewahrt Rollen, Schritte, Markierungen und Bilddaten, sodass die Datei offline gesichert, auf der Website angeboten und wieder in PodCore importiert werden kann.

## Audio-Editor

Der WaveSurfer-Audio-Editor kann Marker, Regionen, Kommentare und Dateiinformationen als druckbare PDF-Schnittliste exportieren. Zusätzlich erzeugt er eine Adobe-Audition-kompatible CSV-Markerliste. In Adobe Audition kann diese im Marker-Bedienfeld über **Import Markers** übernommen werden; CSV liefert dabei Name, Startzeit, Endzeit und Kommentar je Marker.

## Papierkorb und endgültige Löschung

Der zentrale Papierkorb kann aus Sponsoring, Episoden und Medien direkt mit einem passenden Bereichsfilter geöffnet werden. Ideen behalten ihren bestehenden Bereichszugang. Die finale Bereinigung ist weiterhin ausschließlich für Benutzer mit `canManageTrash` verfügbar und erfordert neben dem Warnhinweis die exakte Eingabe des Elementnamens. Wiederherstellung und endgültige Bereinigung bleiben dadurch klar getrennt.

## Prüfung

Geprüft wurden Client- und Server-TypeScript, Produktions-Build, Tutorialabschluss einschließlich Teilaktualisierung in einer isolierten SQLite-Instanz, Erstellung/Bearbeitung/erneutes Laden einer Sponsor-Buchung über die v2-API sowie die PHP-Syntax des aktualisierten WordPress-Tutorial-Plugins. Das WordPress-Plugin v2.16.9 liefert zusätzlich einen vollständigen App-Katalog unter `/wp-json/app-tutorials/v1/catalog`.
