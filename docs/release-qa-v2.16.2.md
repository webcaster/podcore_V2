# PodCore v2.16.2 – Release-QA

## Durchgeführte Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Versionsabgleich Root/Client/Server/Browser-Titel | Erfolgreich: v2.16.2 |
| Client-TypeScript | Erfolgreich |
| Server-TypeScript | Erfolgreich |
| Client-/Server-Build und Public-Synchronisation | Erfolgreich |
| Runtime-Smoke-Test `/api/health` | Erfolgreich; Server meldet v2.16.2 |
| Ungeschützter Zugriff auf `/api/tutorial-cloud/status` | Erwartet abgewiesen: HTTP 401 |
| WordPress-Plugin PHP-Syntax | Erfolgreich: keine Syntaxfehler |
| Audio-Editor statische Funktionsprüfung | Waveform, Wiedergabegeschwindigkeit, Loop, Marker, Kommentare und Schnittplan-Export vorhanden |
| Tutorial-Führung statische Funktionsprüfung | Hinweis statt Auto-Start, Rollenfilterung, Navigation, Screenshots und Annotationen vorhanden |
| PDF-Layout-Picker statische Prüfung | Exporttyp `interview_partner` ist integriert; Layouts werden nach Exporttyp geladen |

## Externer Cloud-Befund

Am 14.08.2026 lieferte `https://podcore.de/wp-json/app-tutorials/v1/tutorials?per_page=5` HTTP 404 mit `rest_no_route`. Die lokale PodCore-Route und der neue versionierte Plugin-Code sind dagegen geprüft. Der externe 404 bedeutet, dass auf podcore.de die aktualisierte Plugin-Datei noch nicht aktiv ist, die Rewrite-Regeln noch nicht neu gespeichert wurden oder dort eine ältere Plugin-Variante läuft. Der Release enthält deshalb die korrigierte Plugin-Version mit der Route `app-tutorials/v1` sowie eine Anleitung zur Aktivierung und Cache-/Permalink-Prüfung.
