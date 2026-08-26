# PodCore 2.16.43 – Symbolmarkierungen in importierten Tutorials

## Anlass

Bei der visuellen Prüfung des korrigierten Erste-Schritte-Tutorials wurde festgestellt, dass eine Symbolmarkierung nach dem App-Import als verkürzter Text statt als grafischer Pfeil dargestellt wurde.

## Korrektur

| Bereich | Änderung |
|---|---|
| Importnormalisierung | Symbolkennungen werden nicht mehr auf zwei Zeichen gekürzt. Es werden ausschließlich die kompatiblen Werte `arrow`, `check`, `cross` und `info` vollständig übernommen. |
| Tutorial-Overlay | Die App ordnet Symbolkennungen jetzt sichtbaren Zeichen zu: Pfeil `→`, Haken `✓`, Kreuz `×` und Information `i`. Die gleiche Zuordnung gilt für die Markierungsliste. |

## Ergebnis

Nach einem erneuten Import zeigt das Erste-Schritte-Tutorial Screenshots, nummerierte Punkte und Symbolmarkierungen korrekt in der App. Der WordPress-Viewer verwendet dieselben unterstützten Symbolkennungen und stellt die Marker ebenfalls korrekt dar.
