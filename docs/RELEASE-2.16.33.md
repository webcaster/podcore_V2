# Release 2.16.33 – WordPress-Lizenzroute korrigiert

PodCore verwendet für die Online-Lizenzierung die eigene WordPress-API unter `/wp-json/podcore-licensing/v1/`. Das Plugin registriert jetzt die von der App verwendeten POST-Endpunkte `/activate`, `/validate` und `/deactivate`. Die bisherigen DLM-kompatiblen GET-Routen bleiben für ältere Installationen bestehen.

Der Fehler „Es wurde keine Route gefunden, die mit der URL und der Anfragemethode übereinstimmt“ entstand durch die Abweichung zwischen dem App-Pfad beziehungsweise der POST-Methode und den zuvor registrierten DLM-GET-Routen. Bitte das Plugin aktualisieren und danach unter **Einstellungen → Lizenzierung** erneut aktivieren.

Die WordPress-Plugin-Version ist **1.0.5**, die PodCore-Anwendung **2.16.33**. Das Plugin-ZIP beginnt direkt mit `podcore-licensing/` und ist für **Plugins → Installieren → Plugin hochladen** vorbereitet.
