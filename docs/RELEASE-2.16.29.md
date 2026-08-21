# PodCore v2.16.29 – Verschiebbare Tutorialführung und Lizenzkundenbereich

Version **2.16.29** verbessert die Fehlerhilfe in interaktiven Tutorials und erweitert die eigene WordPress-Lizenzlösung um Kundenverwaltung, Kündigungen und zusätzliche Schutzmaßnahmen.

## Verschiebbares Tutorialfenster

Das Tutorialfenster kann während einer interaktiven Führung über seinen Kopfbereich verschoben werden. Dadurch bleibt es zugänglich, wenn ein Zielbereich oder eine Anwendungsschicht ausnahmsweise über dem Fenster liegt. Nach einer manuellen Verschiebung erscheint die Aktion **„Position zurücksetzen“**, die das Fenster wieder automatisch am hervorgehobenen Ziel ausrichtet.

## Eigene Lizenzarchitektur

PodCore verwendet ausschließlich das separate Plugin **PodCore Licensing for WooCommerce**. Die Lizenzoberfläche der App benötigt nur noch Lizenz-Webseite, Lizenzschlüssel und Installationsbezeichnung. Digital License Manager, WooCommerce Consumer Key, Consumer Secret und Software-ID wurden entfernt.

Das Plugin stellt die tokenbasierte Schnittstelle `/wp-json/podcore-licensing/v1/` für Aktivierung, Statusprüfung, Deaktivierung und Offline-Lizenzdokumente bereit. Der Aktivierungstoken ist an eine einzelne Installation gebunden und wird nur beim Aktivieren ausgegeben.

## Kundenbereich und Kündigungen

Im WooCommerce-Konto erscheint der Bereich **PodCore-Lizenzen**. Kunden sehen dort ihre eigenen Lizenzschlüssel, Laufzeiten, aktiven Installationen und können signierte Offline-Dokumente laden. Für aktive Subscription-Abos steht eine Kündigung zum Laufzeitende bereit. Die Kündigung wird nach Sicherheitsbestätigung vorgemerkt; der Zugriff bleibt bis zum Ende der bezahlten Laufzeit erhalten.

## Zusätzliche Schutzmaßnahmen

Kundenaktionen prüfen Besitz und WordPress-Nonce. REST-Antworten werden nicht zwischengespeichert, Aktivierung, Validierung und Deaktivierung sind ratenbegrenzt und Statusantworten geben den Aktivierungstoken nicht erneut aus. Das WordPress-Plugin ist ein separates Paket und bleibt außerhalb des PodCore-App-Repositorys.
