# PodCore v2.16.37 – Produktionsgates für verlässliche Podcast-Abläufe

Version **2.16.37** setzt die Prioritäten aus dem Workflow-Abgleich um. Der neue Tab **„Qualitätsgate“** im Episodeneditor verbindet die redaktionelle Episode mit einer nachvollziehbaren Produktionskette: Aufnahme, Audio-Abnahme, Veröffentlichung, Rechte und externe Übergaben.

## Aufnahmebereitschaft

Für jede Episode kann ein Studio- oder Aufnahmeprofil benannt und mit einer verbindlichen Checkliste ergänzt werden. Sie umfasst Mikrofon, Interface und Kopfhörer, Raum und Pegel, Speicherplatz, Testaufnahme, Gastverbindung sowie erforderliche Einverständnisse. Eine freie Notiz dokumentiert Besonderheiten vor der Aufnahme.

## Audio-Abnahme

Die Audio-Abnahme ergänzt den bestehenden Audio-Editor, die Marker und die Schnittlisten. Sie hält finale Dateiversion, zuständige Person, Schnitt, Störgeräuschprüfung, Klangbild, Kapitel, Musik sowie die Bestätigung der finalen Datei als separaten Qualitätsstatus fest. Abnahmenotizen bleiben direkt bei der Episode.

## Release-Paket und Rechte

Das Release-Paket bündelt Titel, Beschreibung, Show Notes, Promotion-Text und Hosting-Status. Es kann als Markdown-Datei exportiert und für Website, Podcast-Host oder redaktionelle Abstimmungen weiterverwendet werden. Das Rechte-Register dokumentiert je Asset Rechteinhaber, Nutzungsumfang, Ablaufdatum, Nachweis und Prüfstatus für Musik, Jingles, Zitate, Stockmaterial oder Gästefreigaben.

## Übergaben

Für externe Beteiligte lassen sich Aufgaben mit verantwortlicher Person, Fälligkeit, Abnahmekriterium und Erledigtstatus erfassen. Ein JSON-Übergabepaket exportiert den vollständigen Qualitätsstatus, Rechte-Register und alle Übergaben zusammen mit den Kerndaten der Episode.

## Technische Einordnung

Die Workflowdaten werden in der bestehenden JSON-Struktur der technischen Episodendaten gespeichert. Dadurch ist keine Datenbankmigration nötig; vorhandene Episoden bleiben kompatibel. Historisch als Objekt gespeicherte Workflowdaten werden beim Öffnen robust normalisiert. Das Bearbeitungsrecht folgt der bestehenden Berechtigung `canEditEpisodes`.

## Prüfung

Der Client- und Server-TypeScript-Build einschließlich Produktionssynchronisierung wurde erfolgreich ausgeführt. Zusätzlich wurde der produzierte Server auf einem freien lokalen Port gestartet; der Health-Endpunkt antwortete erfolgreich. Während der Prüfung wurde ein belegter Standardport erkannt und der Test ohne Eingriff in den bestehenden Prozess über Port 3010 durchgeführt.
