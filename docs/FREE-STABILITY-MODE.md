# PodCore – Kostenloser Stabilitätsmodus

Stand: **v2.16.9**

## Zweck

PodCore bleibt bis zu einem ausdrücklich angekündigten Stabilitäts-Update vollständig kostenlos nutzbar. Die Lizenztechnik und die Anbindung an den Digital License Manager bleiben für die spätere Aktivierung vorbereitet, sind jedoch in der Anwendung nicht sichtbar und schränken keine Funktion ein.

## Aktueller Funktionsumfang

Alle Funktionen stehen ohne Lizenzschlüssel zur Verfügung. Dazu zählen insbesondere Episoden und Skripte, Redaktions-Hub, Audio-Editor, PDF-Layouts und -Exporte, Backups, Rollen und Berechtigungen, lokale Tutorials, manuelle Tutorial-Importe, Tutorial-Cloud, Kollaboration und lokale Netzwerkfunktionen.

## Sichtbarkeit in der App

Der Reiter **Lizenzierung** ist in den Einstellungen ausgeblendet. Die Anbindung wurde nicht entfernt; die zentrale Konstante `LICENSING_ENABLED` in `client/src/pages/SettingsPage.tsx` bleibt bis zum Stabilitäts-Release auf `false`.

## Spätere Aktivierung

Vor der späteren Freischaltung wird das in `todo.md` festgehaltene Lizenzmodell erneut vollständig geprüft: 14 Tage Volltest, 14 Tage Offline-Grace-Period, Danach-Nur-Lese-Modus sowie Basis-, Studio- und Lifetime-Stufen. Zugriffe auf eigene Daten, Backups und Exporte müssen auch nach Ablauf immer möglich bleiben.
