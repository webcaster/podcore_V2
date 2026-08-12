# Digital License Manager – Integrationsnotizen

Quelle: [REST API](https://docs.codeverve.com/digital-license-manager/rest-api/), [Authentication](https://docs.codeverve.com/digital-license-manager/rest-api/authentication/), [Query Parameters](https://docs.codeverve.com/digital-license-manager/rest-api/authentication/query-parameters/), [Activate](https://docs.codeverve.com/digital-license-manager/rest-api/licenses/activate/), [Validate](https://docs.codeverve.com/digital-license-manager/rest-api/licenses/validate/), [Deactivate](https://docs.codeverve.com/digital-license-manager/rest-api/licenses/deactivate/).

Die REST-API benötigt eine Authentifizierung. Für die Query-Parameter-Variante werden `consumer_key` und `consumer_secret` verwendet. Die Basisstruktur lautet `https://podcore.de/wp-json/dlm/v1/`.

Lizenzaktivierung: `GET /licenses/activate/{license_key}`. Unterstützte Parameter sind `label` und in der Pro-Version optional beziehungsweise je nach Konfiguration erforderlich `software`. Die Antwort enthält unter anderem einen öffentlichen Aktivierungs-Token. Dieser Token wird lokal gespeichert und für spätere Validierung und Deaktivierung verwendet.

Lizenzvalidierung: `GET /licenses/validate/{activation_token}`. Der Aktivierungs-Token identifiziert die einzelne Aktivierung. Die Antwort kann Lizenzdaten wie Ablaufzeitpunkt, Status und Deaktivierungszeitpunkt enthalten.

Deaktivierung: `GET /licenses/deactivate/{activation_token}`. Die Aktivierung wird deaktiviert; danach ist `deactivated_at` gesetzt. Eine erneute Aktivierung kann später einen neuen Token erzeugen, sofern das Lizenzlimit dies zulässt.

Sicherheitsentscheidung für PodCore: API-Schlüssel und Secret werden ausschließlich serverseitig in der lokalen PodCore-Konfiguration verarbeitet. Das Frontend erhält nur einen maskierten Status. Die Lizenzprüfung wird mit Timeout und einem begrenzten Offline-Toleranzfenster implementiert, damit ein kurzfristiger Ausfall von podcore.de nicht sofort den laufenden Betrieb unterbricht.
