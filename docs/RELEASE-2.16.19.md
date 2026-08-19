# PodCore v2.16.19 – Interaktive Tutorialführung

Version **2.16.19** entwickelt Tutorials von einer reinen Schrittanzeige zu einer kontextbezogenen Lernführung weiter. Die Oberfläche erklärt nicht nur einen Bereich, sondern unterstützt Nutzer dabei, die nächste Aktion in der Anwendung auszuführen.

## Interaktionsmodi pro Schritt

Der Entwickler-Modus bietet im Schritt-Editor zusätzlich zum Ziel-Element und der Tooltip-Position einen Interaktionsmodus. Damit kann für jeden Schritt festgelegt werden, wie sich die Führung verhält.

| Modus | Verhalten in der App | Geeignet für |
|---|---|---|
| **Hinweis & weiter** | Der hervorgehobene Bereich wird erklärt; der Nutzer wechselt selbst zum nächsten Schritt. | Orientierung und Lesen |
| **Klick auf Ziel abwarten** | Der passende Bereich wird markiert. Erst wenn der Nutzer das Ziel anklickt, öffnet sich automatisch der nächste Schritt. | Navigation und einfache Bedienhandlungen |
| **Schritt bestätigen** | Der Nutzer erledigt die beschriebene Aufgabe und bestätigt sie anschließend bewusst. | Prüfschritte und mehrteilige Eingaben |

Für ältere Tutorials bleibt das Verhalten kompatibel: Ein vorhandenes Ziel wird standardmäßig als Klickziel interpretiert, sofern kein anderer Interaktionsmodus gespeichert ist.

## Wiederaufnahme und Fortschritt

Alle Navigations- und Interaktionsschritte sichern weiterhin den aktuellen Fortschritt pro Benutzerkonto. Der Tutorialdialog macht sichtbar, dass sich eine Führung jederzeit schließen und später am selben Schritt wieder aufnehmen lässt. Bereits abgeschlossene Tutorials beginnen auf Wunsch erneut bei Schritt eins, während nicht abgeschlossene Tutorials an der letzten gespeicherten Stelle fortgesetzt werden.

> Rollen, Berechtigungen, Zielnavigation und Screenshot-Markierungen bleiben unverändert wirksam. Ein Tutorial führt deshalb nur zu Bereichen, die für die jeweilige Zielrolle vorgesehen sind.

## Import und Website-Tutorials

Der neue Interaktionsmodus wird beim Import von Tutorialdaten aus PodCore-JSON oder dem Website-Katalog sicher übernommen. Zulässig sind ausschließlich die Werte `guide`, `click` und `confirm`; unbekannte Werte werden nicht übernommen.

## Prüfung

Die Versionsprüfung sowie der Client- und Server-TypeScript-Produktions-Build waren erfolgreich. Geprüft wurden außerdem die Hook-Reihenfolge der Overlay-Führung, die klickdurchlässige Hervorhebung, die Fortschrittsspeicherung beim Schrittwechsel und die Normalisierung des Interaktionsmodus beim Tutorialimport.
