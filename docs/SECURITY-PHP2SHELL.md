# Sicherheitsinformation: PHP2Shell und PodCore

## Betroffenheit

PodCore ist eine Node.js-/Express-Anwendung. Der PodCore-Server enthält keine PHP-Dateien und verwendet für seine HTTP-Anfragen keinen PHP-Interpreter. Die PHP2Shell-Schwachstellen CVE-2026-109618 und CVE-2026-109619 treffen daher nicht den PodCore-Node-Prozess selbst.

Betroffen sein kann aber derselbe Rechner oder Webserver, wenn dort WordPress, das PodCore-WordPress-Plugin oder ein anderer PHP-Dienst betrieben wird. Diese PHP-Komponenten müssen unabhängig von PodCore geprüft und aktualisiert werden. Das wieder aufgenommene Plugin-Paket `podcore-licensing` ist in Version 1.0.5 gehärtet; die PHP-Webruntime muss trotzdem separat gepatcht werden.

## Maßnahmen für WordPress-/PHP-Systeme

PHP-Webruntime sofort inventarisieren und patchen. Die am 21. Oktober 2026 veröffentlichten korrigierten Versionen sind PHP 8.2.35, 8.3.36, 8.4.27 und 8.5.12. Für PHP 8.1 und älter muss der Paket- oder LTS-Anbieter auf einen Backport geprüft werden; ein nicht unterstützter PHP-Dienst sollte nicht internetseitig erreichbar bleiben.

Die PHP-Version der Webruntime muss geprüft werden, nicht nur die CLI-Version. Dazu gehören PHP-FPM, Apache `mod_php`, `php-cgi`, FrankenPHP, LiteSpeed sowie PHP-Versionen, die in Containern oder Hosting-Produkten gebündelt sind. Nach dem Update müssen alle alten PHP-Worker neu gestartet oder ersetzt werden.

Falls ein sofortiges Patchen nicht möglich ist, sollte der PHP-Dienst vom Internet isoliert werden. Temporäre PHP-Maßnahmen wie deaktivierter Upload-Progress und begrenzte Request-Größen reduzieren nur einzelne Angriffswege und ersetzen kein Update.

## PodCore-Härtung in v2.16.51

Der PodCore-Server lässt fremde CORS-Ursprünge nicht mehr pauschal zu. Zusätzliche Origins müssen über `CORS_ORIGINS` ausdrücklich freigegeben werden; Same-Origin- und lokale Entwicklungszugriffe bleiben möglich.

JSON-Requests sind auf 10 MB und URL-encoded Requests auf 2 MB begrenzt. Dateiimporte laufen weiterhin über eigene Multipart-Routen mit ihren fachlich notwendigen Dateigrenzen, aber zusätzlich mit Grenzen für Dateien, Formularfelder und Multipart-Teile.

Der öffentliche Health-Endpunkt gibt keine lokalen Datenpfade, Netzwerkadressen oder Portinformationen mehr aus. Express verrät außerdem nicht mehr den Standard-Header `X-Powered-By`. Der Standard-Login wird nur noch im Nicht-Produktionsmodus in der Serverkonsole ausgegeben.

## Prüfung nach der Installation

Nach dem Update sollte der Betreiber die PHP-Version des tatsächlichen Webdienstes, WordPress und alle Plugins prüfen. Für PodCore selbst sollte `GET /api/health` weiterhin nur Status, Version und Zeitstempel liefern. Ein Zugriff von einer nicht freigegebenen Fremd-Origin darf keine CORS-Freigabe erhalten.

Für das WordPress-Plugin 1.0.5 zusätzlich prüfen: REST-Zugänge besitzen nur die benötigten WooCommerce-Leserechte, die Lizenzschlüssel und Aktivierungstoken werden nicht in Logs oder Tickets veröffentlicht, und die Plugin-ZIP enthält den Ordner `podcore-licensing` direkt unterhalb des ZIP-Wurzelverzeichnisses. Die ZIP-Datei ist kein Ersatz für Updates von WordPress, WooCommerce, WooCommerce Subscriptions und PHP.

## Quellen

- CISA: „Critical Vulnerabilities in PHP Require Immediate Patching“ vom 21.10.2026
- CERT-EU Security Advisory 2026-018
- PHP Security Advisory und Release Notes zu CVE-2026-109618 und CVE-2026-109619
