# PodCore Tutorial Hub für WordPress

Das Plugin stellt veröffentlichte PodCore-Tutorials auf einer WordPress-Seite dar. Es zeigt Titel, Beschreibung, alle Schritte, Screenshots, nummerierte Annotationen und bietet einen kompatiblen JSON-Download für den Import in PodCore.

## Installation

1. Im WordPress-Backend **Plugins → Installieren → Plugin hochladen** öffnen.
2. Die Datei `podcore-tutorials-wp-plugin.zip` auswählen.
3. Das Plugin installieren und anschließend aktivieren.
4. Unter **Einstellungen → Permalinks** einmal auf **Änderungen speichern** klicken, falls eine Tutorial-Seite oder ein Archiv zunächst einen 404-Fehler zeigt.

## Tutorial aus PodCore veröffentlichen

1. In PodCore den exklusiven Entwickler-Modus aktivieren.
2. In der Tutorial-Verwaltung das Tutorial als JSON exportieren.
3. Im WordPress-Backend **PodCore Tutorials → Neu hinzufügen** öffnen.
4. Einen Titel eintragen. Die Beschreibung kann im normalen WordPress-Editor stehen; alternativ wird die `description` aus dem JSON verwendet.
5. Den vollständigen Inhalt der JSON-Datei ohne zusätzliche Kommentare in das Feld **Vollständiger Tutorial-Export aus PodCore** einfügen.
6. Optional Zielrollen eintragen, zum Beispiel `admin, redakteur, produktion`.
7. Rechts oben auf **Veröffentlichen** klicken. Ein gespeicherter Entwurf wird auf der Webseite nicht angezeigt.

Das Plugin akzeptiert die üblichen PodCore-Felder `steps`, `content`, `description`, `text`, `image`, `imageUrl`, `screenshotUrl`, `screenshot`, `imageData` und `annotations`. Base64-Bilder sowie öffentliche Bild-URLs werden direkt dargestellt. Annotationen werden als nummerierte Punkte über dem Screenshot und zusätzlich als Liste unterhalb des Bildes angezeigt.

## Shortcode einfügen

Auf der gewünschten WordPress-Seite den Shortcode einfügen:

```text
[podcore_tutorial_hub]
```

Als Alias funktioniert ebenfalls:

```text
[podcore_tutorials]
```

Die Seite muss veröffentlicht sein. Der Shortcode wird am zuverlässigsten in einem **Shortcode-Block** des WordPress-Editors eingefügt, nicht in einem reinen HTML- oder Code-Block. Die Einzelansicht eines veröffentlichten `PodCore Tutorial` zeigt die Schritte zusätzlich automatisch unterhalb des normalen Beitragsinhalts; dort ist kein zweiter Shortcode erforderlich.

## Download für Endnutzer

Jede veröffentlichte Tutorial-Karte besitzt einen Button **Tutorial herunterladen (.json)**. Der Download enthält die PodCore-kompatiblen Tutorial-Daten einschließlich `roles`, `enabled`, `description`, `steps` und Screenshots/Annotationen. Die Datei kann anschließend in der Tutorial-Verwaltung von PodCore importiert werden.

## Wenn nichts angezeigt wird

Prüfe zunächst, ob das Plugin aktiviert ist, ob mindestens ein Tutorial den Status **Veröffentlicht** besitzt und ob der Shortcode exakt geschrieben wurde. Für die automatische Einzelansicht muss außerdem der JSON-Export im Feld **Vollständiger Tutorial-Export aus PodCore** gespeichert sein. Wenn die Seite nach der Plugin-Aktualisierung leer bleibt oder 404 anzeigt, speichere die Permalink-Einstellungen erneut. Bei einem Tutorial ohne gültiges `steps`-Array zeigt die Seite eine gelbe Warnung direkt in der Tutorial-Karte an.

## Entwickler-Modus in PodCore

In PodCore ist die Tutorial-Verwaltung für Erstellen, Bearbeiten, Importieren und Exportieren durch den exklusiven Entwickler-Modus geschützt. Die serverseitige Prüfung bleibt aktiv; eine bloß sichtbare URL reicht nicht aus. Die Tutorial-Verwaltung wird nur nach der geheimen Freischaltung und mit aktivem Entwickler-Modus angezeigt.
