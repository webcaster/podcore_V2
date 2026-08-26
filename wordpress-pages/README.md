# WordPress-Seiten für PodCore

Dieses Paket enthält zwei fertige HTML-Blöcke für WordPress:

| Datei | Verwendung |
|---|---|
| `entwickler.html` | Seite für Entwickler, Agenturen und technische Interessenten |
| `kontakt.html` | Kontaktseite mit vorbereiteter Formular-Einbindung |

## Einbau

Erstelle in WordPress eine neue Seite mit dem Titel **Entwickler**. Füge einen **HTML-Block** ein und kopiere den vollständigen Inhalt aus `entwickler.html` hinein. Speichere die Seite und passe den Link `/kontakt/` an den tatsächlichen Permalink deiner Kontaktseite an, falls dieser abweicht.

Erstelle anschließend eine neue Seite mit dem Titel **Kontakt**. Kopiere den Inhalt aus `kontakt.html` in einen HTML-Block. Installiere und aktiviere danach dein bevorzugtes Formularplugin, zum Beispiel **Contact Form 7** oder **WPForms**. Der eigentliche Formular-Shortcode sollte in WordPress in einem separaten **Shortcode-Block** unterhalb der Einleitung eingesetzt werden, nicht innerhalb des HTML-Blocks.

Für Contact Form 7 ersetzt du den Platzhalter durch einen Shortcode wie `[contact-form-7 id="123" title="Kontaktformular"]`. Für WPForms verwendest du beispielsweise `[wpforms id="123"]`. Ersetze `123` durch die echte Formular-ID deines Plugins.

Vor der Veröffentlichung müssen die E-Mail-Adresse, die Datenschutzseite und gegebenenfalls die Formularfelder des Plugins angepasst werden. Das Formularplugin übernimmt Validierung, Spam-Schutz und den Versand; die HTML-Vorlage stellt dafür nur die Gestaltung und den Einbettungsbereich bereit.

## Empfohlene Formularfelder

| Feld | Typ | Pflicht |
|---|---|---:|
| Name | Text | Ja |
| E-Mail-Adresse | E-Mail | Ja |
| Betreff | Textauswahl oder Text | Nein |
| Nachricht | Textbereich | Ja |
| Zustimmung zur Datenschutzerklärung | Checkbox | Ja |
