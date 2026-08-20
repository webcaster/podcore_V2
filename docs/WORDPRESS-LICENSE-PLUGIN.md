# PodCore-Lizenzierung mit WordPress und WooCommerce

**Stand: PodCore 2.16.26**

PodCore enthält ab dieser Version eine eigene Lizenzschnittstelle für ein WordPress-Backend mit WooCommerce. Das WordPress-Plugin in Version 1.0.1 liegt unter [`wordpress-plugin/podcore-licensing`](../wordpress-plugin/podcore-licensing). Es verwaltet Monatsabo, Jahresabo und Sonderabo, erzeugt Lizenzcodes und liefert signierte Lizenzdokumente.

## Betriebsarten

| Betriebsart | Internet erforderlich | Beschreibung |
|---|---:|---|
| Online | Für Aktivierung und regelmäßige Validierung | PodCore ruft die eigene WordPress-API über HTTPS auf. |
| Offline | Nein | Eine signierte JSON-Lizenzdatei wird einmalig in PodCore importiert und lokal geprüft. |
| PDF-Nachweis | Nein für die Anzeige | PodCore exportiert den aktuellen Lizenzstatus als PDF. Die kryptografische Vertrauensquelle bleibt die Signatur im Lizenzdokument. |

Die Offlineprüfung verwendet Ed25519. PodCore prüft Format, Signatur, Status und Ablaufdatum. Ein PDF kann die Lizenz lesbar darstellen, ist aber nicht die eigentliche Signaturdatei.

## WordPress einrichten

Installiere und aktiviere das Plugin. Lege anschließend WooCommerce-Produkte an. Für die Monats- und Jahresvariante wird jeweils ein WooCommerce-Subscriptions-Produkt mit der passenden Abrechnungsperiode angelegt. Im Produkteditor wird **PodCore-Tarif** auf „Monatsabo“ oder „Jahresabo“ gestellt. Für individuelle Fälle wird „Sonderabo“ gewählt; die Laufzeit wird in Tagen gesetzt, wobei `0` für unbefristet steht.

Bei einer abgeschlossenen Bestellung erzeugt das Plugin einen Lizenzcode. Bei Verlängerungen wird das Ablaufdatum fortgeschrieben. Bei Kündigung nach Ablauf oder bei Ablauf wird die Lizenz widerrufen. Die App kann dadurch online den aktuellen Zustand übernehmen oder offline mit dem zuletzt importierten signierten Dokument arbeiten.

## PodCore verbinden

Unter **Einstellungen → Lizenzierung** werden WordPress-Adresse, Lizenzcode, WooCommerce Consumer Key und Consumer Secret eingetragen. Die Credentials bleiben serverseitig in PodCore. Die Lizenzseite zeigt zusätzlich den Tarif, Ablauf, letzten Prüfzeitpunkt und den Prüfmodus an.

Für einen Offlinebetrieb exportiert die WordPress-Administration beziehungsweise die Lizenzintegration das signierte Dokument als JSON. In PodCore wird **Offline-Lizenz importieren** verwendet. Nach erfolgreicher Prüfung erscheint der Modus **Offline-Signatur**. Mit **Lizenz-PDF** wird der lesbare Nachweis erzeugt.

## Versionshinweis

Dieses korrigierte Update verwendet **PodCore 2.16.26**. Das Plugin trägt die Version **1.0.1**. Die Versionsnummer darf bei weiteren kleineren Änderungen fortgeschrieben werden, bis ausdrücklich ein finales Update verlangt wird.

## Technischer Hinweis

Die WooCommerce-REST-API stellt Consumer-Key/Secret-basierte Authentifizierung bereit. WooCommerce-Subscriptions stellt Aktionen für Zahlungsabschluss, fehlgeschlagene Zahlungen und Statusänderungen bereit. Das Plugin nutzt diese Ereignisse, statt einen eigenen Polling-Dienst zu betreiben. Die offizielle Dokumentation beschreibt sowohl die Subscription-Status-Hooks als auch den Verlängerungsablauf.[1] [2]

## Referenzen

[1]: https://woocommerce.com/document/subscriptions/develop/action-reference/ "WooCommerce Subscriptions Action Reference"
[2]: https://woocommerce.com/document/subscriptions/renewal-process/ "WooCommerce Subscription Renewal Process"
