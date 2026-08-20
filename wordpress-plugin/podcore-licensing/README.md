# PodCore Licensing for WooCommerce

**Version 1.0.0** ist ein eigenständiges WordPress-Plugin für die PodCore-Lizenzierung. Es benötigt WooCommerce; für wiederkehrende Monats- und Jahreszahlungen wird WooCommerce Subscriptions empfohlen. Das Plugin erstellt keine Zahlungsabwicklung selbst, sondern reagiert auf die bereits abgeschlossenen WooCommerce-Bestellungen und Subscription-Statusänderungen.

## Tarifmodelle

| Tarif | Standardlaufzeit | Verwendung |
|---|---:|---|
| Monatsabo | 30 Tage | Wiederkehrendes Monatsprodukt |
| Jahresabo | 365 Tage | Wiederkehrendes Jahresprodukt |
| Sonderabo | frei konfigurierbar oder unbefristet | individuelle Kunden, Kulanz, Test- oder Sonderkonditionen |

Im WooCommerce-Produkteditor stehen die Felder **PodCore-Tarif**, **Sonderabo-Laufzeit** und **Max. Aktivierungen** zur Verfügung. Produktnamen mit „monatlich“, „monthly“, „jährlich“, „yearly“ oder „annual“ werden automatisch erkannt, wenn kein Tarif manuell gesetzt wurde.

## Installation

1. Den Ordner `podcore-licensing` als ZIP verpacken.
2. In WordPress unter **Plugins → Installieren → Plugin hochladen** installieren und aktivieren.
3. WooCommerce aktivieren. Für automatische Verlängerungen zusätzlich WooCommerce Subscriptions und ein kompatibles Zahlungsgateway verwenden.
4. Unter **WooCommerce → PodCore-Lizenzen** einen Testcode erzeugen und den öffentlichen Signaturschlüssel prüfen.
5. Für PodCore-Onlineaktivierung einen WooCommerce-REST-Schlüssel mit Leserechten anlegen. Die PodCore-App verwendet die Endpunkte unter `/wp-json/dlm/v1/` aus Kompatibilitätsgründen mit der bestehenden App-Route; die Lizenzlogik selbst gehört vollständig zu diesem Plugin.

## Eigene API und Offlinebetrieb

Jede Lizenzantwort enthält ein Dokument im Format `podcore-license-v1`. Die Nutzdaten werden mit einem beim Plugin-Aktivieren erzeugten **Ed25519-Schlüssel** signiert. Der öffentliche Schlüssel ist im Dokument enthalten und wird von PodCore vor dem Import geprüft. Dadurch kann PodCore ein Lizenzdokument ohne Internetverbindung importieren und validieren.

Die App importiert die JSON-Datei unter **Einstellungen → Lizenzierung → Offline-Lizenz importieren**. Der PDF-Export unter **Lizenz-PDF** ist ein lesbarer Nachweis; die JSON-Signatur bleibt die technische Quelle der Offlineprüfung.

## REST-Endpunkte

| Methode | Endpoint | Zweck |
|---|---|---|
| GET | `/wp-json/dlm/v1/licenses/activate/{license_key}` | Aktivierung mit `consumer_key`, `consumer_secret`, `label`, `software` |
| GET | `/wp-json/dlm/v1/licenses/validate/{activation_token}` | Aktivierung online validieren |
| GET | `/wp-json/dlm/v1/licenses/deactivate/{activation_token}` | Aktivierung beenden |
| GET | `/wp-json/dlm/v1/licenses/document/{license_key}` | Signiertes Lizenzdokument abrufen |
| GET | `/wp-json/dlm/v1/public-key` | Öffentlichen Ed25519-Schlüssel abrufen |
| POST | `/wp-json/dlm/v1/licenses/issue` | Administrativer Code-Generator für Integrationen |

## WooCommerce-Lebenszyklus

Bei einer abgeschlossenen Bestellung wird genau ein PodCore-Lizenzcode je passendem Produkt erzeugt und in den Bestellmetadaten gespeichert. Eine erfolgreiche Subscription-Verlängerung verlängert die Laufzeit. Bei `cancelled` oder `expired` wird die Lizenz widerrufen; bei `active` wird sie nach einer Pause wieder aktiviert. Status- und Zahlungsereignisse werden über offizielle WooCommerce-Subscriptions-Actions verarbeitet.

## Sicherheitshinweise

Die privaten Signaturschlüssel verbleiben in den WordPress-Optionen und werden nicht über die öffentliche API ausgegeben. API-Zugangsdaten werden nicht in Lizenzdokumenten gespeichert. Für Onlineaufrufe soll ausschließlich HTTPS verwendet werden. Das PDF ersetzt nicht die Signaturprüfung und ist nicht als alleiniger Manipulationsschutz gedacht.
