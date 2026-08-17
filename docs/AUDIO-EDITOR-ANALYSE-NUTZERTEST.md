# Audio-Editor – Analyse aus dem laufenden Nutzertest

## Geplante Ergänzung: PDF-Schnittliste

Der WaveSurfer-Audio-Editor soll einen zusätzlichen **PDF-Export** erhalten. Die Schnittliste soll Dateiname, Dauer, Exportzeitpunkt, Markierungen, Regionsbereiche und zeitbezogene Kommentare enthalten. Alle Zeitwerte werden sowohl in Sekunden als auch in lesbarem Timecode ausgegeben. Damit kann die Redaktion eine verbindliche, druckbare Übergabe an Schnitt und Produktion erstellen.

## Adobe Audition: empfohlener Importweg

Adobe Audition arbeitet mit Punkt- und Bereichsmarkern; Bereichsmarker enthalten einen Start- und Endzeitpunkt und passen damit zu den vorhandenen WaveSurfer-Regions. Adobe beschreibt Marker als Navigations- und Bearbeitungspunkte und erlaubt deren Bearbeitung im Markers-Panel.[1]

Für PodCore ist deshalb ein **Audition-kompatibler CSV-Markerexport** der zuverlässigste Standardweg. Er sollte keine generische CSV sein, sondern exakt die CSV-Spaltenreihenfolge einer aus der Zielversion von Adobe Audition exportierten Beispiel-Markerliste übernehmen. Der Benutzer importiert die Datei anschließend in Audition über **Datei → Importieren → Marker aus Datei**.[2]

> Vor der endgültigen Implementierung wird ein Audition-Testexport gegen die beim Benutzer verwendete Audition-Version abgeglichen. So bleibt der CSV-Header sowie die Interpretation von Punkt- und Bereichsmarkern versionssicher.

| PodCore-Objekt | Audition-Ziel | Exportinhalt |
|---|---|---|
| Schnittmarke | Punktmarker | Timecode, Name, Typ „Schnittmarke“, Beschreibung |
| Zeitbezogener Kommentar | Punktmarker | Timecode, Kommentartext, Bearbeiter, Erstellzeitpunkt |
| WaveSurfer-Region | Bereichsmarker | Start, Ende, Dauer, Name, optionale Loop-Kennzeichnung |
| Kapitel | Punktmarker | Timecode, Kapitelname |

## Zusätzliche Verbesserungen in Prüfung

Die aktuelle Medienbibliothek enthält eine weiterentwickelte WaveSurfer-Variante mit Regionen, Hover-Timecode, Minimap und mehreren DAW-Exporten. Der separate Audio-Editor verwendet dagegen eine eigene, reduzierte Implementierung. Für den Patch soll geprüft werden, ob eine gemeinsame Editorbasis die Bedienung vereinheitlichen und doppelte Fehlerpfade vermeiden kann.

## Quellen

[1] [Adobe Help: Using markers in Audition](https://helpx.adobe.com/audition/desktop/editing-audio-files/markers.html)

[2] [Larry Jordan: Adobe Audition CC – Share Markers Between Sessions or Staff](https://larryjordan.com/articles/adobe-audition-cc-how-to-share-markers-between-projects/)
