# PodCore Sicherheits- und Menü-Audit v2.16.0

## Sicherheitsbefunde

| Bereich | Befund | Maßnahme |
|---|---|---|
| Login | Kein Schutz gegen wiederholte Fehlversuche | In-memory Rate-Limit: 10 Fehlversuche je Client in 15 Minuten; HTTP 429 mit Retry-After |
| Sessions | Abgelaufene Sessions blieben bis zur Bereinigung gespeichert | Abgelaufene Sessions werden beim erfolgreichen Login bereinigt |
| Session-Cookie | Cookie war immer `secure: false` | `COOKIE_SECURE=true` aktiviert Secure-Cookie für HTTPS-Installationen; lokale HTTP-Installationen bleiben nutzbar |
| CORS | Alle Origins waren zugelassen | Cross-Origin-Zugriffe sind nur noch über `CORS_ORIGINS` erlaubt; Same-Origin bleibt möglich |
| Medien-Stream | Dateiname und Bereichsanforderung waren nicht ausreichend validiert | Basename-Prüfung, Assets-Verzeichnis-Sandbox und validierte HTTP-Range-Antworten |
| Tutorial-Verwaltung | Menüausblendung allein wäre kein ausreichender Schutz | Serverseitige Entwickler-Modus-Prüfung bleibt aktiv; Navigation blendet Tutorial-Verwaltung zusätzlich aus |

## Menüprüfung

| Menü | Bewertung | Entscheidung |
|---|---|---|
| Episoden / Episoden-Dashboard | Unterschiedliche Arbeitsbereiche: Verwaltung versus Produktionsübersicht | Beide behalten, Beschreibungen im Tutorial klar trennen |
| Redaktions-Hub / Redaktionskalender | Inhaltliche Ideenarbeit versus Terminplanung | Beide behalten |
| Sponsoring / Buchungskalender / Sponsor-Auswertungen | Hauptmodul plus spezialisierte Unterbereiche | Behalten; optisch als Sponsoring-Gruppe weiterführen |
| Podigee Analytics / Podcast-Statistiken | Externe Feed-/Plattformanalyse versus interne Auswertung | Beide behalten, da unterschiedliche Datenquellen |
| Branding & Backup | Bezeichnung war irreführend, da Backup nicht ausschließlich Branding ist | Menü in **Branding** umbenannt; Backup bleibt im Verwaltungsbereich |
| Administration / Tutorial-Verwaltung | Tutorial-Erstellung ist kein normales Endnutzer-Menü | Tutorial-Verwaltung nur bei aktivem exklusivem Entwickler-Modus sichtbar |
| Hilfe / Wiki | Zentraler, rollenbasierter Wissenszugang | Beibehalten; alle veröffentlichten Tutorials werden dort gebündelt |
| Impressum | Rechtlicher Pflichtbereich | Beibehalten |

## Empfohlene nächste Sicherheitsfunktionen

1. Persistentes Audit-Log für Login, Logout, Passwortänderungen, Lizenzaktionen, Importe, Exporte und endgültige Löschungen.
2. Admin-Ansicht für aktive Sessions mit „Alle anderen Sessions abmelden“.
3. Zwei-Faktor-Authentifizierung für Administratoren.
4. Konfigurierbare Sessiondauer und automatische Abmeldung bei Passwortwechsel.
5. Backup-Verschlüsselung mit passwortgeschütztem Export und Integritäts-Hash.
6. Striktere Content-Security-Policy nach Prüfung aller benötigten externen Quellen.
7. Regelmäßige Bereinigung alter Sessions und temporärer Uploads als geplanter Wartungsvorgang.
8. Lifetime-Lizenzen nur anhand der DLM-Produktkennung bzw. eines eindeutig markierten DLM-Produkts akzeptieren; ein frei wählbares Label allein darf keine Lifetime-Freischaltung auslösen.

## Lizenzprodukte

PodCore unterstützt drei DLM-Produkte:

- **PodCore monatlich**: 30-Tage-Lizenz.
- **PodCore jährlich**: 365-Tage-Lizenz.
- **Lifetime**: lebenslange Lizenz ohne Ablaufdatum für exklusive oder Sonderkunden.

Die Tarifanzeige wird aus Produktname, DLM-Laufzeit und Ablaufdatum abgeleitet. Für den produktiven Betrieb sollte die Lifetime-Erkennung zusätzlich an eine feste DLM-Produkt-ID gebunden werden, sobald diese aus dem WordPress-System vorliegt.

## Funktionsvorschläge mit hohem Nutzen

| Priorität | Funktion | Nutzen |
|---|---|---|
| Hoch | Aktivitätsprotokoll | Nachvollziehbarkeit bei Änderungen, Löschungen und Lizenzaktionen |
| Hoch | Sessionverwaltung | Schutz bei verlorenen Geräten und gemeinsam genutzten Systemen |
| Hoch | Verschlüsselte Backups | Schutz sensibler Podcast-, Partner- und Mediendaten |
| Mittel | Globale Suche | Schnellere Navigation über Episoden, Ideen, Sponsoren und Tutorials |
| Mittel | Aufgaben-/Fälligkeitsübersicht | Verbindet Redaktion, Produktion und Sponsoring |
| Mittel | Medien-Vorschau mit Metadaten | Weniger Wechsel zwischen Media Library und Episoden |
| Niedrig | Individuelle Dashboard-Widgets | Mehr Personalisierung, aber kein Sicherheitsgewinn |

## Release-Hinweis

Vor v2.16.0 müssen TypeScript, Client-Build, Server-Build, Auth-Smoke-Tests, Backup-Import/Export, Papierkorb-Kaskaden, Lizenzstatus und alle geschützten Tutorial-Routen erneut geprüft werden.

> Wichtig: Die aktuelle Lifetime-Erkennung ist bewusst auf Produktbezeichnungen und Laufzeitdaten ausgelegt. Für eine manipulationsresistente Produktionslizenz sollte die WordPress-DLM-Produkt-ID als verbindliche Quelle ergänzt werden.
