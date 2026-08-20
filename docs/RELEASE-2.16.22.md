# PodCore v2.16.22 – Tutorial-Editor und Stabilitätsprüfung

Version **2.16.22** ergänzt den Tutorial-Editor um präzise Screenshot-Detailausschnitte und eine strukturierte Untermenüauswahl. Der Patch konzentriert sich auf zuverlässige Erstellung komplexer Anleitungen sowie die Absicherung fehleranfälliger Kernabläufe vor der Bereitstellung.

## Screenshot-Detailausschnitte

Jeder vorhandene Screenshot eines Tutorialschritts enthält im Editor die Aktion **„Ausschnitt“**. Nach dem Aufziehen eines Bildbereichs stehen zwei sichere Übernahmewege zur Verfügung: Der Ausschnitt ersetzt den Screenshot des aktuellen Schritts oder wird als neuer Zwischenschritt direkt unter dem Ursprungsschritt eingefügt. Beim zweiten Weg bleibt der Original-Screenshot unverändert erhalten.

Markierungen innerhalb des gewählten Bereichs werden in den Detailausschnitt übertragen und proportional ausgerichtet. Damit können kleine Bedienelemente, Einstellungen und wichtige Hinweise verständlich vergrößert dokumentiert werden. Punkte, Kreise und Zeichen bleiben dabei im Datenformat des Tutorialsystems erhalten.

## Untermenü-Klickziele im Editor

Die Zielauswahl ist nach **Hauptnavigation**, **Einstellungen**, **Administration**, **Branding & Backup** sowie **Redaktions-Hub** gruppiert. Jeder Untermenüeintrag speichert die stabile Zielkennung und die vollständige Route einschließlich Tab-Parameter. Screenshotmodus und Klickaufzeichnung öffnen somit direkt den ausgewählten Tab, statt nur zur übergeordneten Seite zu navigieren.

Die Klickaufzeichnung sichert weiterhin den aktuellen Pfad gemeinsam mit den Suchparametern. Dadurch bleiben aufgezeichnete Schritte wie `settings-tab-theme`, `admin-tab-trash` oder `editorial-tab-interviews` auch beim späteren Import, Export und bei der Tutorialwiedergabe eindeutig.

## Fehler- und Releasecheck

Der vollständige Versions-, Client-, Server- und Produktionscheck war erfolgreich. Zusätzlich wurde eine isolierte Serverinstanz mit temporärer SQLite-Datenbank genutzt, um Gesundheitsstatus, Frontend-Auslieferung, Anmeldung, Berechtigungsschutz, Tutorialzugriff, Systemdiagnose und Sicherungsstatus zu prüfen. Die detaillierte Checkliste steht in [QA-2.16.22.md](QA-2.16.22.md).

> Für installationsspezifische Daten, Rollen, externe Speicher, Podigee und WordPress bleibt eine kurze manuelle Abnahme mit einer eigenen Sicherungskopie erforderlich. Die dabei empfohlenen Schritte sind im Prüfprotokoll enthalten.
