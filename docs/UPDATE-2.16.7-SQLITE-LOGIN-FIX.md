# PodCore v2.16.7 – SQLite-Login-Fix

Dieses Update behebt den Fehler **„Interner Serverfehler“** beim Anmelden, wenn die lokale PodCore-Datenbank zeitweise durch einen anderen Vorgang belegt ist.

## Ursache

SQLite erlaubt pro Datenbankdatei nur einen gleichzeitigen Schreibvorgang. In betroffenen Installationen führten parallele Zugriffe beim Start – insbesondere Sitzungs-, Tutorial- und Fehlerlog-Einträge – dazu, dass Anfragen mit `database is locked` abgebrochen wurden. Das betraf auch den Login.

## Korrektur

| Maßnahme | Wirkung |
|---|---|
| **WAL-Journalmodus** | Lesezugriffe können parallel zu Schreibvorgängen erfolgen. |
| **Busy-Timeout von 10 Sekunden** | Kurzzeitige Schreibsperren werden abgewartet, statt den Login sofort abzubrechen. |
| **Fallback-Fehlerlog** | Bei einer gesperrten Datenbank wird der Fehler nicht erneut in SQLite geschrieben; das verhindert eine Fehlerkaskade. |
| **Klare 503-Rückmeldung** | Bei einer länger anhaltenden externen Sperre erhält der Client eine verständliche Meldung statt eines allgemeinen 500-Fehlers. |
| **Single-Instance-Sperre** | Eine zweite PodCore-Serverinstanz mit demselben Datenordner wird vor dem Datenbankzugriff beendet. |
| **SQLite-WASM-Sperrbereinigung** | Ein leeres, verwaistes Verzeichnis `podcore.db.lock` wird unter Linux nur dann automatisch entfernt, wenn kein Prozess die Datenbank geöffnet hält. |

## Aktualisierung einer bestehenden Installation

1. Beende PodCore vollständig. Prüfe insbesondere, ob nicht noch ein zweites Terminal, ein Hintergrunddienst oder eine zweite PodCore-Instanz auf dieselbe Datenbank zugreift.
2. Ersetze die App-Dateien durch das aktualisierte Paket **PodCore v2.16.7**.
3. Starte PodCore genau einmal neu.
4. Melde dich erneut an.

> Die Datei `podcore.db` im Datenordner wird **nicht** ersetzt oder gelöscht. Vorhandene Nutzer, Episoden, Einstellungen und Medien bleiben erhalten.

## Falls die Datenbank weiterhin gesperrt bleibt

Eine dauerhaft bestehende Sperre bedeutet in der Regel, dass eine andere Instanz noch dieselbe Datei geöffnet hält. Die neue PodCore-Version verhindert künftig, dass eine zweite Instanz unbemerkt startet. Bei einem Startversuch zeigt sie stattdessen die PID des bereits laufenden Servers an.

Für eine bereits blockierte Installation gehst du auf Linux wie folgt vor:

```bash
# Prozess ermitteln, der die Datenbank geöffnet hält
fuser -v ~/.podcore/podcore.db

# Nur den angezeigten alten PodCore-/Node-Prozess kontrolliert beenden
kill <PID>
```

Falls `~/.podcore/podcore.db.lock` als **leeres Verzeichnis** vorhanden ist, handelt es sich um einen verwaisten Sperrmarker der SQLite-WASM-Bibliothek. Die neue Version bereinigt ihn automatisch. Bei einer alten, noch nicht aktualisierten Installation darfst du ihn erst entfernen, nachdem PodCore beendet wurde und `fuser` keinen Prozess mehr meldet:

```bash
rmdir ~/.podcore/podcore.db.lock
```

> Entferne ausschließlich das leere Verzeichnis `podcore.db.lock`. Lösche **niemals** `podcore.db` oder die zugehörigen Datenordner.

Danach startest du PodCore einmal neu. Die detaillierte Fallback-Protokollierung befindet sich unter `~/.podcore/logs/backend-fallback.log`.
