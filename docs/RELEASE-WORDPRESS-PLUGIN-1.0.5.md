# PodCore Licensing for WooCommerce 1.0.5

## Sicherheitsupdate

Version 1.0.5 härtet das WordPress-/WooCommerce-Plugin gegen missbräuchliche Eingaben und typische RCE-nahe Angriffspfade. Lizenzschlüssel und Aktivierungstoken werden vor Datenbankzugriffen strikt validiert. Tarif, Laufzeit, Aktivierungslimit, Texte und Metadaten werden begrenzt; unbekannte Tarife fallen sicher auf `special` zurück.

Die REST-Authentifizierung akzeptiert nur WooCommerce-API-Schlüssel mit `read` oder `read_write`. Eine beliebige eingeloggte WordPress-Sitzung reicht nicht mehr aus. Die zusätzlichen WooCommerce-Produktfelder werden nur nach erfolgreicher Capability- und Nonce-Prüfung verarbeitet. Das Plugin enthält keine dynamische PHP-Ausführung, keine Dateieinschlüsse aus Benutzereingaben und keine Shell-Funktionen.

## Installation

1. Vorher WordPress, WooCommerce, WooCommerce Subscriptions und die PHP-Webruntime aktualisieren.
2. Die Datei `podcore-licensing-1.0.5.zip` in WordPress unter **Plugins → Installieren → Plugin hochladen** auswählen.
3. Das bestehende Plugin aktualisieren und anschließend aktivieren. Die vorhandenen Lizenzen und Signaturschlüssel bleiben erhalten.
4. Unter **WooCommerce → PodCore-Lizenzen** prüfen, ob die Lizenzliste geladen wird.
5. Den PodCore-REST-Schlüssel auf die erforderlichen Leserechte beschränken und die Online- sowie Offline-Lizenzprüfung testen.

## Download und Paketstruktur

Die ZIP-Datei enthält direkt den Ordner `podcore-licensing/` mit der Datei `podcore-licensing.php`. Sie darf nicht nochmals in einen zusätzlichen Projektordner verschachtelt werden.

## Wichtiger Hinweis

Das Plugin kann eine verwundbare PHP-Webruntime nicht reparieren. Die PHP-Version von PHP-FPM, Apache, LiteSpeed, FrankenPHP oder dem Hostingpanel muss separat geprüft und gepatcht werden. Die vollständigen Hinweise stehen in [`SECURITY-PHP2SHELL.md`](SECURITY-PHP2SHELL.md).
