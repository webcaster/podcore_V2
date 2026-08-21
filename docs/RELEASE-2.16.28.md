# PodCore v2.16.28 – Eigenes WordPress-Lizenzplugin

Version **2.16.28** löst die bisherige Digital-License-Manager-Kompatibilität vollständig ab. PodCore verwendet nun ausschließlich das eigene WordPress-Plugin **PodCore Licensing for WooCommerce** für Lizenzaktivierung, Statusprüfung, Deaktivierung und signierte Offline-Lizenzdokumente.

## Vereinfachte Aktivierung

In PodCore werden nur noch die Lizenz-Webseite, der Lizenzschlüssel und eine frei wählbare Installationsbezeichnung benötigt. Die Eingaben **Consumer Key**, **Consumer Secret** und **Software-ID (DLM Pro)** wurden aus der Lizenzoberfläche entfernt. Die App erzeugt für jede Installation eine eigene technische Kennung und erhält vom WordPress-Plugin einen zufälligen Aktivierungstoken.

## Eigene Lizenzschnittstelle

Die eigene Schnittstelle befindet sich unter `/wp-json/podcore-licensing/v1/`. Aktivierung, Validierung und Deaktivierung nutzen POST-Anfragen und eine Kombination aus Lizenzschlüssel, Installationskennung und Bearer-Token. Dadurch werden keine WooCommerce-REST- oder WordPress-Administrationszugangsdaten in der PodCore-App gespeichert.

## Offline-Nutzung

Das WordPress-Plugin stellt weiterhin Ed25519-signierte Lizenzdokumente im Format `podcore-license-v1` aus. PodCore prüft die Signatur lokal, unterstützt die bestehende 14-Tage-Offline-Grace-Period und kann einen lesbaren Lizenznachweis als PDF exportieren.

## Repository-Abgrenzung

Das WordPress-Lizenzplugin wird als separates Paket bereitgestellt und gehört nicht mehr zum PodCore-App-Repository oder zum Endnutzer-App-ZIP. Der GitHub-Stand enthält damit weiterhin ausschließlich PodCore-App-Code und App-Dokumentation.
