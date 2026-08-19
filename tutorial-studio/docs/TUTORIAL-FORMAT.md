# Tutorial Studio – Datenformat und PodCore-Kompatibilität

## Ziel

Tutorial Studio verwendet ein portables JSON-Projektformat. Es eignet sich für Anleitungen zu beliebigen Desktop-Anwendungen und Webanwendungen, ohne dass eine Verbindung zu PodCore notwendig ist. Der Datenvertrag ist jedoch auf die Felder abgestimmt, die PodCore 2.16.21 für Tutorialschritte nutzt.

| Feldgruppe | Tutorial Studio | PodCore 2.16.21 | Bedeutung |
| --- | --- | --- | --- |
| Tutorial | `id`, `title`, `description`, `enabled` | `id`, `title`, `description`, `enabled` | Grunddaten des Tutorials |
| Zielgruppen | `audience` | `roles` / `role` | Allgemeine Zielgruppen werden bei der PodCore-Übernahme den lokalen Rollen zugeordnet |
| Schritt | `title`, `description`, `target`, `route`, `position`, `allowSkip` | `title`, `description`, `target`, `position`, `allowSkip` | Anweisung und Platzierung des geführten Hinweises |
| Aufzeichnung | `interaction`, `route` | Aufzeichnungsaktionen aus `TutorialRecordingContext` | Die Aktion kann bei der Übernahme in Schritte übersetzt werden |
| Screenshot | `image` | `image` | Base64-Data-URL für portablen Export |
| Markierungen | `annotations` | `annotations` | Prozentuale Position, Label und Erläuterung |

## Zuverlässiger Export und Import

Der Export enthält alle Schritte, Annotationen und eingebetteten Bilder in einer Datei. Eine Importdatei wird erst übernommen, wenn sie mindestens einen Titel und eine Schritt-Liste enthält. Das Studio schreibt die Schema-Version `1.0`; spätere Versionen können darüber migrationsfähig erweitert werden.

> **Speicherhinweis:** Da Screenshots direkt in die JSON-Datei eingebettet werden, kann die Dateigröße bei vielen großen Bildern steigen. Für lange Tutorials sollten Screenshots vor dem Import in einer sinnvollen Bildschirmauflösung gespeichert werden.

## Übergabe nach PodCore

1. In Tutorial Studio das Projekt als `.tutorial.json` exportieren.
2. In PodCore als Nutzerin oder Nutzer mit aktivem Entwickler-Modus die **Tutorial-Verwaltung** öffnen.
3. Die Datei importieren und anschließend die Zielgruppen den in PodCore vorhandenen Rollen zuordnen.
4. Im Vorschau-Tab die Ausrichtung von Zielen und Markierungen prüfen.
5. Erst danach das Tutorial aktivieren oder über den bestehenden WordPress-Katalog bereitstellen.

Die Regeln für ein Einstiegs-Tutorial bleiben erhalten: Wenn mehrere Rollen einem Tutorial zugeordnet werden oder kein spezifisches Ziel definiert ist, startet das Tutorial im Standard-Dashboard.
