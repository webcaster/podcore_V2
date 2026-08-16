# PodCore v2.16.13 – Qualitätsprüfung und Weiterentwicklungsplan

## Durchgeführte Prüfung

Die Prüfung kombinierte Client- und Server-TypeScript, Produktions-Build, eine isolierte SQLite-Initialisierung sowie ausgewählte, authentifizierte API- und PDF-Tests. Die Testinstanz nutzte ein separates Datenverzeichnis; produktive PodCore-Daten wurden nicht verwendet.

| Prüfbereich | Ergebnis | Nachweis |
|---|---|---|
| Versionskonsistenz | Bestanden | Root, Client, Server und HTML führen v2.16.13. |
| TypeScript | Bestanden | Client und Server ohne Typfehler. |
| Produktions-Build | Bestanden | Client-Build, Server-Build und Synchronisierung nach `server/public`. |
| Datenbankmigration | Bestanden | Isolierte Datenbank startete; `price_model` wurde ohne Eingriff in Bestandsdaten ergänzt. |
| Preis pro Folge | Bestanden | Beispiel: 100 EUR × 3 Folgen × 2 Platzierungen, 20 EUR Anpassung, 50 EUR Hörerbeteiligung und 10 % Rabatt ergeben 603,00 EUR. |
| Konflikthinweis | Bestanden | Eine überlappende Buchung lieferte die bestehende Buchung als Konflikthinweis zurück. |
| Preislisten-PDF | Bestanden | Vollständige Positionskarten wurden in einem dreiseitigen, lesbaren A4-Querformat-PDF erzeugt und visuell geprüft. |

> Die interaktive Abnahme in der tatsächlichen Endnutzerinstallation bleibt zusätzlich erforderlich, insbesondere für individuelle Rollen, reale Bestandsdaten, lokale Druckertreiber und kundenspezifische PDF-Layouts.

## Statische Kernprüfung

Fünf zentrale Komponenten wurden zusätzlich auf Datenintegrität, Fehlerbehandlung und Wartbarkeit geprüft: Authentifizierung, Dashboard, Episodenrouter, Sponsoring-V2-Router und Sponsor-Detailansicht.

| Priorität | Verbesserung | Begründung | Empfohlene Umsetzung |
|---|---|---|---|
| P1 | Automatische Werbeplatz-Zuweisung beim Speichern von Episoden atomar ausführen | Ein Fehler bei der verbundenen Werbeplatzanlage darf keine teilweise gespeicherte Episode hinterlassen. | Episoden-Update und Ad-Slot-Zuweisung in einer SQLite-Transaktion bündeln. |
| P1 | API-Payloads für Episoden, Buchungen und Angebote zentral validieren | Datums-, Zahlen- und JSON-Fehler sollen vor der Datenbank erkannt werden. | Gemeinsame Schema-Validierung und einheitliche 400-Antworten einführen. |
| P1 | Authentifizierungs-Rate-Limit belastbar gestalten | Die aktuelle lokale Speicherstruktur braucht eine Bereinigung abgelaufener Einträge und eine vertrauenswürdige Proxy-Konfiguration. | Middleware mit Ablaufbereinigung, vertrauenswürdigen Proxies und dokumentierten Limits verwenden. |
| P2 | Sponsor-Detailseite in Unterkomponenten aufteilen | Stammdaten, Verträge, Buchungen, Angebote und Abrechnung liegen in einer sehr großen Komponente. | Tab-Komponenten und gemeinsame Formular-/JSON-Hilfen auslagern. |
| P2 | PDF-Erzeugung als gemeinsame Dienste strukturieren | Mehrere Router enthalten vergleichbare Header-, Footer-, Seitenumbruch- und Fehlerbehandlung. | Wiederverwendbare Exportdienste mit PDF-Tests erstellen. |
| P2 | Dashboard-Anfragen mit sichtbarem Wiederholen absichern | Hintergrundfehler dürfen nicht still bleiben, wenn Widgets keine Daten liefern. | Einheitliche Statusanzeige, Retry-Aktion und typisierte API-Modelle ergänzen. |
| P3 | Vorlagen- und Freigabelisten paginieren | Große Installationen sollen nicht alle Vorlagen und Freigaben auf einmal laden. | Serverseitige Paginierung und Filter hinzufügen. |

## Empfohlene nächste Abnahme

Die produktive Abnahme sollte mit mindestens zwei Benutzerrollen erfolgen. Dabei sind ein personalisiertes Dashboard, eine vorhandene Sponsor-Detailseite mit Interessen und Angeboten, eine Preislisten-PDF mit mehreren Positionen, eine Buchung mit Vertragslaufzeit und eine mehrseitige Episoden-Skript-PDF zu prüfen.
