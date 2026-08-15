# Analyse: Zeichencodierung im Episoden-Skript

## Verifizierter Befund

Der bereitgestellte Screenshot hat eine Auflösung von **1042 × 50 Pixeln** und wurde in zwei überlappenden Ausschnitten von links nach rechts geprüft.

| Bereich | Verifizierter Inhalt | Befund |
|---|---|---|
| Linke Header-Zelle | Vor dem Text „Sprechtext / Inhalt (Stichpunkte)“ steht eine fehlerhafte Zeichenfolge, sichtbar als `Ø‹R™` beziehungsweise vergleichbarer Mojibake-Text. | Defekter Sonderzeichenwert im Header-Text. |
| Mittlere Header-Zelle | „Details & Regieanweisung“ | Korrekt dargestellt. |
| Rechte Header-Zelle | „#⏱ Dauer“ | Der Zeit-/Dauer-Marker ist fehlerhaft beziehungsweise nicht eindeutig als gewünschtes Symbol darstellbar. |

Die Überlappung zwischen den Ausschnitten enthält keine zusätzliche oder abweichende Beschriftung. Der Fehler betrifft damit den Inhalt der Header-Zeichen selbst, nicht die Trennung der Tabellenzellen.

## Folgerung für die Korrektur

Die Script- und Exportvorlagen müssen fehlerhafte, bereits gespeicherte Mojibake-Sequenzen normalisieren und neue Inhalte konsequent als UTF-8 ausgeben. Als robustes Ersatzkonzept werden eindeutige, barrierearme Textlabels verwendet; ein Symbol wird nur ergänzt, wenn es im gewählten PDF-/HTML-Font zuverlässig verfügbar ist.
