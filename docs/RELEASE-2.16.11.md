# PodCore v2.16.11 – Persönlicher Workflow, sichere Sicherungen und präziseres Matching

Version **2.16.11** bündelt Korrekturen für das persönliche Dashboard und für Skript-PDFs mit einer erweiterten Sponsoring- und Speicherverwaltung. Die Version bleibt vollständig lokal und offlinefähig nutzbar.

## Persönliches Dashboard

Jedes Benutzerkonto speichert seine Dashboard-Anpassung nun unabhängig. Reihenfolge, sichtbare Widgets, kompakte oder komfortable Dichte sowie die persönliche Begrüßung werden strukturiert im Benutzerprofil abgelegt. Vorhandene ältere Layouts werden beim nächsten Speichern automatisch in das neue, kompatible Format überführt.

## Episoden-Skript und PDF

Die Tabellenüberschriften des Produktionsskripts verwenden jetzt zeichenstabile Beschriftungen ohne Symbolschrift-Abhängigkeit. Wasserzeichen und Footer werden erst nach Abschluss aller Seitenumbrüche über jede tatsächlich erzeugte Seite verteilt. Dadurch werden die Seitenzahlen inklusive Gesamtseitenzahl einheitlich und fortlaufend ausgegeben.

## Sponsoring-Matching

Sponsoren erhalten ein eigenes Matching-Profil mit Kundeninteressen, passenden Themen, Zielgruppe, bevorzugten Formaten sowie einer optionalen Längenbegrenzung. In der Episodenansicht werden Interessen-Treffer, weitere Match-Gründe und die gewichteten Anteile der Bewertung angezeigt. Die Bewertung bleibt nachvollziehbar und erzeugt keine künstlichen Empfehlungen oder Bewertungen.

## Technik im Episoden-Editor

Der Technik-Tab zeigt die globalen Standards als wiederverwendbares Profil. Sie lassen sich gezielt auf eine Episode übernehmen oder bewusst wiederherstellen. Änderungen im Editor bleiben episodenbezogen und ändern die globalen Standards nicht.

## Speicher & Cloud-Backup

Die lokale PodCore-Datenbank bleibt die führende Arbeitsquelle. Unter **Einstellungen → Speicher & Backup** können Administratoren den Backup-Dateinamen, eingebettete Dateien und den letzten erfolgreichen Export verwalten. Über **„Vollbackup für Cloud erstellen“** erzeugt PodCore eine vollständige Backup-Datei, die anschließend bewusst in einen eigenen Cloud-Ordner gelegt wird.

> Die Version richtet keine externe Datenbank ein und verschiebt keine lokalen Originaldaten automatisch. Für eine spätere Online-Datenbank ist ein sicherer Wechsel zurück auf lokal vorgesehen: Vorsicherung, Datenvorschau, Integritätsprüfung und bestätigter Wechsel sind zwingend.

## Ersteinrichtung

Nach der ersten sicheren Administrator-Anmeldung zeigt das Dashboard die fehlende Speicher-Ersteinrichtung an und führt direkt zu den Speicher- und Backup-Einstellungen. Die Wahl bleibt jederzeit änderbar.
