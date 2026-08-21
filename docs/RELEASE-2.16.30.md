# PodCore v2.16.30 – Erststart-Lizenzierung und Kundenverwaltung

Version **2.16.30** korrigiert die Lizenzierung bei Neuinstallationen und erweitert das separate WordPress-Lizenzplugin um eine zentrale Kundenverwaltung.

## 14-Tage-Testzeit ohne App-Anmeldung

PodCore startet bei einer Neuinstallation eine lokale Testzeit von 14 Tagen. Der Anmeldebildschirm zeigt den verbleibenden Zeitraum sowie einen direkten Hinweis auf **podcore.de**. Statusprüfung, Lizenzaktivierung und Offline-Lizenzimport sind für diesen Erststart zugänglich und verlangen keine vorherige PodCore-Anmeldung mehr. Eine unvollständige Aktivierung liefert eine konkrete Eingabeprüfung statt der Meldung **„Nicht authentifiziert“**.

Nach Ablauf der Testzeit kann eine Lizenz online über podcore.de aktiviert oder ein signiertes Offline-Lizenzdokument importiert werden. Die Lizenz-Webseite muss für Produktivsysteme HTTPS verwenden; lokale HTTP-Adressen bleiben ausschließlich für Entwicklungsumgebungen möglich.

## WordPress-Lizenzplugin v1.3.0

Das separate Plugin enthält unter **WooCommerce → PodCore-Kunden** eine zentrale Kundenansicht. Administratoren sehen dort die zugeordneten Lizenzen, aktivierte Installationen und einen Link zum vorhandenen WordPress-Konto. Lizenzdaten können im Bereich **WooCommerce → PodCore-Lizenzen** bearbeitet werden. Aktivierungen lassen sich widerrufen; eine Lizenz wird nur nach ausdrücklicher Sicherheitsbestätigung endgültig gelöscht.

Für jede aktive Installation einer aktiven Lizenz kann ein Administrator ein signiertes Offline-Lizenzdokument laden. Dieses Notfall-Dokument ist installationsbezogen und wird in PodCore über **Einstellungen → Lizenzierung → Offline-Lizenz importieren** verwendet.

## Prüfung

Die Client- und Server-TypeScript-Builds sowie die PHP-Syntax des WordPress-Lizenzplugins waren erfolgreich. Ein isolierter Server-Smoketest bestätigte, dass der öffentliche Lizenzstatus einer Neuinstallation HTTP 200 mit 14 verbleibenden Testtagen liefert. Eine unvollständige Aktivierung wird mit HTTP 400 und einer konkreten Eingabeprüfung beantwortet; die vorherige nicht passende Authentifizierungsmeldung tritt nicht mehr auf.
