# PodCore v2.16.47 – vollständige ZIP-Backups und sichere Wiederherstellung

Version **2.16.47** führt für neue Vollbackups das Archivformat `podcore-backup` v4.0.0 ein. Die Sicherung liegt als ZIP-Datei mit dem Manifest `podcore-backup.json` vor. Damit werden Fach- und Konfigurationsdaten zusammen mit den zugehörigen lokalen Medien und Bilddateien wiederherstellbar.

| Bereich | Verhalten in v2.16.47 |
|---|---|
| Vollbackup | Exportiert alle vorhandenen Fach- und Konfigurationstabellen mit Daten- und Tabellenmanifest. Sitzungen, Fehlerprotokolle und veraltete Übergangstabellen werden bewusst ausgeschlossen. |
| Dateien | Bindet Medienassets, Ideenmappe-Uploads, Brandingbilder und Sponsorlogos ein. Jede enthaltene Datei besitzt Größe, Wiederherstellungspfad und SHA-256-Prüfsumme. |
| Vorschau | Zeigt vor dem Import Format, Ersteller, Exportzeit, Tabellenübersicht, Archivstatus und Dateizusammenfassung. |
| Wiederherstellung | Validiert Manifest, Archivdateien und sichere Wiederherstellungspfade. Beschädigte oder manipulierte Dateien brechen den Import vor Datenübernahme ab. |
| Rückfall | Erstellt vor einem Vollimport ein `pre-import-…zip`. Dateiübernahme und Datenbankimport bilden einen gemeinsamen, rückrollbaren Ablauf. |
| Automatische Sicherung | In-App- und systemgeplante Sicherungen verwenden denselben ZIP-Standard. Die konfigurierbare Aufbewahrung entfernt nur ältere automatische Archive. |

## Bedienung

Ein vollständiges Archiv wird unter **Podcast-Einstellungen → Backups** oder über **Administration → Datenbank → Backup exportieren** erstellt. Für die Wiederherstellung wird unter **Administration → Backup importieren** eine ZIP- oder Legacy-JSON-Datei gewählt. Nach der Vorschau kann zwischen **Zusammenführen** und **Überschreiben** gewählt werden. Die Standardrollen einer frischen Installation werden beim Zusammenführen über ihren eindeutigen Namen erkannt, sodass kein Rollen-Unique-Konflikt entsteht.

> **Hinweis zu älteren Sicherungen:** JSON-Backups aus früheren PodCore-Versionen bleiben importierbar. Sie besitzen jedoch kein vollständiges ZIP-Dateimanifest; PodCore zeigt deshalb einen sichtbaren Legacy-Hinweis. Für neue Sicherungen wird ausschließlich das ZIP-Vollbackup empfohlen.

## Prüfung

Der Release wird mit synchronem Versionscheck, Client- und Server-Produktionsbuild sowie der Diff-Prüfung ausgeliefert. Zusätzlich wurden ein isolierter Brandingbild-Roundtrip, ein Asset-Audio-Roundtrip mit identischer SHA-256-Prüfsumme, die Importvorschau, die Ablehnung eines manipulierten Archivs ohne Assetübernahme und In-App- sowie System-Autobackups mit Aufbewahrungsgrenze geprüft.
