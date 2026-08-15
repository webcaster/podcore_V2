# PodCore Add-on-Konzept

## Zielbild

PodCore kann nach dem Stabilitäts- und Lizenz-Release durch klar abgegrenzte Add-ons erweitert werden. Add-ons sollen konkrete Produktionsabläufe erweitern, ohne die stabile Basisinstallation, eigene Daten oder lokale Backups zu gefährden.

> In der aktuellen kostenlosen Stabilitätsphase werden keine Add-ons gekauft oder aktiviert. Dieses Dokument definiert ausschließlich die spätere Architektur.

## Sichere erste Add-on-Kategorien

| Kategorie | Beispiele | Nutzen |
|---|---|---|
| Produktionsvorlagen | Staffelplanung, Interview-Setups, Sponsoring-Pakete, Redaktions-Checklisten | Schnellere wiederkehrende Abläufe ohne neue Komplexität |
| PDF- und Markenpakete | PDF-Layouts, Briefpapier, Titelblätter, Schrift- und Farbsets | Einheitliche Außenwirkung pro Podcast oder Kunde |
| Publishing-Connectoren | Hoster-Export, RSS-Prüfung, Social-Publishing-Checklisten | Weniger Medienbrüche bis zur Veröffentlichung |
| Team-Workflow-Pakete | Freigabestufen, Übergabeprotokolle, Rollenprofile | Nachvollziehbare Zusammenarbeit in Redaktionen |
| Integrationspakete | Speicherziele, Kalender- oder Aufgaben-Anbindungen | Bestehende Werkzeuge besser in den Produktionsablauf einbinden |

## Produktprinzip

Die erste Add-on-Generation besteht aus **signierten Daten-, Vorlagen- und Konfigurationspaketen**. Sie führt keinen beliebigen Drittcode in der PodCore-App aus. Damit bleiben lokale Installationen berechenbar, Updates testbar und sensible Podcast-Daten geschützt.

Jedes Paket benötigt ein Manifest mit Add-on-ID, Titel, kompatibler PodCore-Mindestversion, Berechtigungsumfang, Versionsnummer, Prüfsumme, Abhängigkeiten und einer klaren Deinstallationsstrategie. Ein Add-on darf ausschließlich eigene Vorlagen und Einstellungen entfernen, niemals Episoden, Medien, Backups oder Benutzerkonten.

## Spätere Lizenz- und Shop-Anbindung

Eine vorgesehene Lizenzverwaltung übermittelt nach Kauf eine Add-on-Berechtigung zur Installation. PodCore speichert diese Berechtigung lokal und prüft sie mit derselben späteren Lizenzinfrastruktur. Offline-Nutzung bleibt möglich; Add-ons werden wie die Hauptlizenz mit einem klar kommunizierten lokalen Übergangszeitraum behandelt.

Ein künftiger Administrationsbereich zeigt verfügbare, installierte und aktualisierbare Add-ons getrennt. Nutzer sehen nur Funktionen, für die ihre Rolle und die Installation berechtigt sind.

## Empfohlene Reihenfolge

1. Stabilität, manuelle Updates und vollständige Lizenzaktivierung abschließen.
2. Add-on-Manifest, Prüfsummenprüfung und nur lesende Paketvorschau entwickeln.
3. Mit PDF-Layout- und Produktionsvorlagen starten.
4. Erst danach Connectoren und optionale Team-Workflow-Pakete ergänzen.
