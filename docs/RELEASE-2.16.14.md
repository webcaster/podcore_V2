# PodCore v2.16.14 – Datenintegrität, Admin-Papierkorb und Wiederherstellung

Version **2.16.14** stärkt die lokale SQLite-Datenhaltung und ergänzt eine zentrale, rollenbasierte Wiederherstellungsverwaltung.

## Papierkorb und Wiederherstellung

Benutzer mit den bisherigen Löschrechten können Episoden, Ideen, Sponsoren und Medien weiterhin aus ihren jeweiligen Arbeitsbereichen löschen. Diese Kerninhalte werden jetzt jedoch zunächst in einen **Papierkorb** verschoben. Episoden behalten einen Snapshot gelöster Ideen- und Staffelplanverknüpfungen; Sponsoren behalten Verträge, Buchungen und Logos; Medien behalten die Originaldatei bis zur endgültigen Bereinigung.

Im Bereich **Administration → Papierkorb** können ausschließlich Benutzer mit der neuen Berechtigung **„Papierkorb verwalten und Inhalte wiederherstellen“** die Einträge ansehen, wiederherstellen oder nach einer ausdrücklichen Bestätigung endgültig entfernen. Diese Berechtigung ist standardmäßig nur für Administratoren aktiv, kann bei Bedarf aber bewusst in der Rollenverwaltung vergeben werden.

Bereits vor diesem Update gelöschte Ideen werden einmalig in den zentralen Papierkorb übernommen. Bestehende Ideen-Papierkorb-Aktionen wurden so angepasst, dass die endgültige Bereinigung ebenfalls die neue Administrationsberechtigung verlangt.

> Die 30-Tage-Angabe im Papierkorb dokumentiert den vorgesehenen Aufbewahrungszeitraum. Eine endgültige Bereinigung wird nicht automatisch ausgeführt, sondern bleibt eine bewusste Administratorentscheidung.

## Datenbank und Backups

Der Datenbank-Tab zeigt nun SQLite-Integrität, Fremdschlüsselprüfung, WAL-Größe und Journalmodus an. Die Aktion **„Integrität prüfen & warten“** führt nur nicht destruktive SQLite-Wartung aus: passive WAL-Prüfung und Optimierung.

Vollständige Backups enthalten ab dieser Version eine SHA-256-Prüfsumme. Diese wird vor Vorschau und Import geprüft. Sicherungsdateien sowie wiederhergestellte eingebettete Dateien werden atomar geschrieben, damit ein abgebrochener Vorgang keine halbfertige Datei hinterlässt. Ältere Sicherungen ohne Prüfsumme bleiben weiterhin importierbar.

## Prüfung

Die Client- und Server-TypeScript-Prüfung sowie der Produktions-Build waren erfolgreich. Mit einer isolierten SQLite-Testinstanz wurden Datenbankintegrität, Wartung, Löschen/Wiederherstellen von Episode, Sponsor und Idee, endgültige Admin-Bereinigung, Backup-Prüfsumme sowie die Sperre des Papierkorbs für einen Redakteur erfolgreich geprüft.
