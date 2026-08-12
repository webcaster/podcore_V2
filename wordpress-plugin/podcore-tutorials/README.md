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

Wenn ein Theme oder Page-Builder die automatische Einzelansicht nicht ausgibt, nutze den manuellen Shortcode. Für ein Tutorial mit der ID 123:

```text
[podcore_single_tutorial id="123"]
```

Alternativ kann der Slug verwendet werden:

```text
[podcore_single_tutorial slug="erste-schritte"]
```

Der Shortcode kann in einem WordPress-Shortcode-Block, Elementor-Shortcode-Widget oder Divi-Code-Modul eingefügt werden. Ohne `id` oder `slug` wird das zuletzt veröffentlichte PodCore-Tutorial verwendet.

Die Seite muss veröffentlicht sein. Der Shortcode wird am zuverlässigsten in einem **Shortcode-Block** des WordPress-Editors eingefügt, nicht in einem reinen HTML- oder Code-Block. Die Einzelansicht eines veröffentlichten `PodCore Tutorial` zeigt die Schritte zusätzlich automatisch unterhalb des normalen Beitragsinhalts; dort ist kein zweiter Shortcode erforderlich.

## Download für Endnutzer

Jede veröffentlichte Tutorial-Karte besitzt einen Button **Tutorial herunterladen (.json)**. Der Download enthält die PodCore-kompatiblen Tutorial-Daten einschließlich `roles`, `enabled`, `description`, `steps` und Screenshots/Annotationen. Die Datei kann anschließend in der Tutorial-Verwaltung von PodCore importiert werden.

## Wenn nichts angezeigt wird

Prüfe zunächst, ob das Plugin aktiviert ist, ob mindestens ein Tutorial den Status **Veröffentlicht** besitzt und ob der Shortcode exakt geschrieben wurde. Für die automatische Einzelansicht muss außerdem der JSON-Export im Feld **Vollständiger Tutorial-Export aus PodCore** gespeichert sein. Wenn die Seite nach der Plugin-Aktualisierung leer bleibt oder 404 anzeigt, speichere die Permalink-Einstellungen erneut. Bei einem Tutorial ohne gültiges `steps`-Array zeigt die Seite eine gelbe Warnung direkt in der Tutorial-Karte an.

## Entwickler-Modus in PodCore

In PodCore ist die Tutorial-Verwaltung für Erstellen, Bearbeiten, Importieren und Exportieren durch den exklusiven Entwickler-Modus geschützt. Die serverseitige Prüfung bleibt aktiv; eine bloß sichtbare URL reicht nicht aus. Die Tutorial-Verwaltung wird nur nach der geheimen Freischaltung und mit aktivem Entwickler-Modus angezeigt.

## Neue Funktionen in Version 2.16.1

Der Tutorial-Hub besitzt jetzt ein responsives Kartenlayout mit Suchfeld, Rollenfilter und Trefferzähler. Die Karten können per **Schritte anzeigen** auf- und zugeklappt werden; Screenshots werden lazy geladen und auf mobilen Geräten automatisch skaliert.

Das Erscheinungsbild unterstützt helle und dunkle WordPress-Themes über `prefers-color-scheme: dark`. Die Oberfläche verwendet ein neutrales PodCore-Design mit Hover-Zuständen, klaren Download-Schaltflächen und zugänglichen Formularbeschriftungen.

Im Backend wird der JSON-Export während der Eingabe live geprüft. Der Editor zeigt die erkannte Schrittanzahl, meldet ungültiges JSON und besitzt die Schaltfläche **JSON formatieren**. Die Bildverarbeitung akzeptiert nur sichere `data:image`, HTTPS- und relative Bildpfade.

Die Shortcodes bleiben kompatibel:

```text
[podcore_tutorial_hub]
[podcore_single_tutorial slug="erste-schritte"]
[podcore_tutorial slug="erste-schritte"]
```

Alle Funktionen sind ohne externe JavaScript- oder CSS-Bibliothek enthalten.

## The7 und WPBakery

Version 2.16.2 registriert ein natives WPBakery-Element namens **PodCore Tutorial**. Dadurch muss der Shortcode nicht mehr manuell in ein Textfeld geschrieben werden.

### Empfohlene Einrichtung

1. Das Plugin aktivieren und im WordPress-Backend eine Seite mit WPBakery bearbeiten.
2. Auf **Element hinzufügen** klicken.
3. In der Kategorie **PodCore** das Element **PodCore Tutorial** auswählen.
4. Im Feld **Tutorial-Slug** `erste-schritte` eintragen. Alternativ kann die Tutorial-ID verwendet werden; die ID hat Vorrang.
5. Speichern, die Seite aktualisieren und anschließend veröffentlichen.

Das WPBakery-Element erzeugt intern den kompatiblen Shortcode. Es ist zuverlässiger als ein **Raw HTML**-Element. Falls das Element nicht sichtbar ist, WPBakery und das Plugin deaktivieren/aktivieren und den WordPress-Cache leeren.

### Alternative mit Text Block

Wenn das native Element nicht angeboten wird, den Inhalt in ein WPBakery-Element **Text Block** einfügen:

```text
[podcore_tutorial slug="erste-schritte"]
```

Nicht das Element **Raw HTML** verwenden, weil viele Page-Builder darin Shortcodes als reinen Text behandeln.

### The7-Cache

Nach der Plugin-Aktualisierung unter **The7 → Settings → Performance** den Theme-Cache leeren. Zusätzlich vorhandene Cache-, CDN- und Minify-Caches löschen. Danach die Seite in einem privaten Browserfenster testen.

## Version 2.16.3: Diagnose und The7/WPBakery-Fallback

Unter **PodCore Tutorials → Diagnose** zeigt das Plugin für jedes Tutorial den Veröffentlichungsstatus, ob das JSON erkannt wurde und wie viele Schritte gefunden wurden. Ein Tutorial sollte dort mindestens einen Schritt anzeigen, bevor die Frontend-Seite getestet wird.

Die JSON-Erkennung repariert jetzt Byte-Order-Marks, HTML-Entities, Markdown-Codeblöcke und zusätzlichen Text um den JSON-Export herum. Die Ausgabe wird zusätzlich früh über `wp_body_open` und ersatzweise über `wp_footer` eingebunden, falls The7 oder WPBakery den normalen Inhaltsfilter nicht verwendet.

Für WPBakery ist weiterhin das native Element **PodCore Tutorial** mit dem Slug `erste-schritte` die bevorzugte Methode. Nach jeder Plugin-Aktualisierung müssen The7-Cache, WPBakery-Cache, Cache-Plugin und gegebenenfalls CDN-Cache geleert werden.
