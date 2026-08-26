# PodCore v2.16.40 – Responsive Tutorialnavigation ohne abgeschnittene Buttons

Version **2.16.40** behebt den sichtbaren Überlauf der Tutorial-Aktionsleiste. In schmalen oder hohen Arbeitsansichten konnten Hilfsaktionen die verfügbare Breite überschreiten, sodass insbesondere der Weiter-Button angeschnitten war.

## Neue Anordnung der Aktionen

Die Fußleiste unterscheidet nun zwischen drei Gruppen:

| Gruppe | Aktionen | Verhalten |
|---|---|---|
| Navigation | Zurück | Bleibt als eigener, gut erreichbarer Rückweg erhalten. |
| Hilfsaktionen | Wiki, Überspringen, Position zurück | Umbrechen bei fehlender Breite innerhalb einer eigenen Gruppe. |
| Primäre Aktion | Zum Bereich, Weiter, Abschließen oder Erledigt | Behält auf kleinen Ansichten eine volle, klar erkennbare Zeile. |

Die bisherige Beschriftung **„Position zurücksetzen“** wurde auf **„Position zurück“** verkürzt. Der Tooltip erklärt weiterhin, dass das Tutorialfenster wieder automatisch am Zielbereich ausgerichtet wird.

## Responsive Verhalten

Ab mittleren Ansichtsbreiten kann die Aktionsleiste in mehrere Zeilen umbrechen. Unter 768 Pixel Breite nimmt die primäre Aktion eine eigene volle Zeile ein. Unter 480 Pixel Breite werden Zurück und jede weitere Aktion vertikal angeordnet. Es gibt keine horizontale Überlaufroute mehr, über die der Weiter-Button abgeschnitten werden kann.

## Prüfung

Ein isolierter Render-Test prüfte alle gleichzeitig sichtbaren Aktionen in einer breiten Ansicht von 1002 × 1556 Pixel und einer Mobilansicht von 390 × 844 Pixel. In beiden Fällen blieben alle Aktionen innerhalb der Tutorialkarte sichtbar. Client- und Server-Build wurden nach der Änderung erfolgreich ausgeführt.
