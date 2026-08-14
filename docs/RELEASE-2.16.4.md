# PodCore v2.16.4 – Echtzeit-Kollaboration

PodCore v2.16.4 ergänzt die Podcast-Produktion um eine authentifizierte Echtzeit-Zusammenarbeit. Nutzer sehen im Episoden-Editor und im Redaktions-Hub, wer gerade im gleichen Arbeitsbereich aktiv ist. Skript-Blöcke können während der Bearbeitung temporär gesperrt werden, damit parallele Änderungen nicht unbemerkt überschrieben werden.

## Neue Funktionen

### Live-Presence

Der bestehende WebSocket-Kanal `/api/realtime` verwendet weiterhin die PodCore-Session zur Authentifizierung. Beim Öffnen einer Episode tritt der Client dem Raum `episode:<episodeId>` bei. Im Redaktions-Hub wird der Raum `editorial:hub` verwendet. Die Oberfläche zeigt Verbindungsstatus und aktive Teammitglieder; die Anzeige ist informativ und ersetzt keine Berechtigungskontrolle.

### Skript-Block-Locking

Beim Fokussieren eines Skript-Blocks meldet PodCore den Nutzer als Bearbeiter und fordert eine Sperre für die Block-ID an. Eine aktive Sperre gilt 45 Sekunden und wird bei geöffneter Bearbeitung automatisch erneuert. Wird der Block verlassen, die Seite geschlossen oder die Verbindung beendet, wird die Sperre freigegeben. Abgelaufene Sperren werden serverseitig spätestens innerhalb des nächsten Bereinigungsintervalls entfernt.

Wenn eine andere Person den Block bereits bearbeitet, erscheint deren Name am Block und die betroffenen Eingabefelder sowie Aktionen werden deaktiviert. Andere Blöcke derselben Episode bleiben bearbeitbar. Die bestehende serverseitige optimistische Konfliktprüfung und die Rollenrechte bleiben zusätzlich aktiv.

### Redaktions-Hub

Im Kopfbereich des Redaktions-Hubs zeigt PodCore, welche Teammitglieder aktuell im Hub arbeiten. Der aktive Tab wird als Arbeitskontext übertragen, sodass beispielsweise „Ideenpool“ oder „Recherche“ als aktueller Bereich sichtbar bleiben können.

## Installation und Update

1. Erstelle vor dem Update ein vollständiges PodCore-Backup und sichere das persistente Datenverzeichnis außerhalb des Anwendungsverzeichnisses.
2. Entpacke `PodCore-v2.16.4-app.zip` in ein neues Anwendungsverzeichnis oder verwende den geprüften In-App-Updateprozess.
3. Installiere die Abhängigkeiten entsprechend der vorhandenen Installationsanleitung und starte den gebauten Server.
4. Prüfe den Health-Endpunkt unter `/api/health`; er muss die Version `2.16.4` melden.
5. Aktualisiere den Browser vollständig und öffne eine Episode mit mindestens zwei berechtigten Benutzern in getrennten Browserfenstern, um Presence und Block-Locking zu testen.

Das WebSocket-Protokoll benötigt keine externe Internetverbindung: Es funktioniert lokal über denselben Host und Port wie die Anwendung. In einer Reverse-Proxy-Installation muss der Proxy WebSocket-Upgrades für `/api/realtime` weiterleiten.

## Rollen und Sicherheit

Presence und Locks zeigen ausschließlich authentifizierte Nutzer an. Der Locking-Mechanismus ist ein Schutz gegen versehentliches paralleles Bearbeiten, kein Ersatz für die serverseitige Berechtigungsprüfung. Schreiben und Speichern bleiben an die vorhandenen Rechte wie `canEditEpisodes` gebunden. Ohne WebSocket-Verbindung bleibt der Editor nutzbar; lediglich die Live-Anzeige und die zusätzliche Lock-Hilfe stehen dann nicht zur Verfügung.

## Funktionsprüfung

| Bereich | Prüfschritt | Erwartetes Ergebnis |
|---|---|---|
| Episode öffnen | Zwei berechtigte Nutzer öffnen dieselbe Episode | Beide erscheinen im Live-Banner |
| Block-Presence | Nutzer A fokussiert einen Skript-Block | Nutzer B sieht Namen und Bearbeitungsindikator am Block |
| Locking | Nutzer B versucht denselben Block zu bearbeiten | Eingabefelder sind deaktiviert und ein verständlicher Hinweis erscheint |
| Parallele Arbeit | Nutzer B bearbeitet einen anderen Block | Der andere Block bleibt frei bearbeitbar |
| Freigabe | Nutzer A verlässt den Block | Die Sperre verschwindet und Nutzer B kann übernehmen |
| Abbruch | Browserfenster von Nutzer A schließen | Lock läuft spätestens nach der TTL automatisch aus |
| Redaktions-Hub | Zwei Nutzer öffnen den Hub und wechseln Tabs | Die Presence-Leiste zeigt aktive Nutzer und den Live-Status |
| Offline/LAN | Anwendung ohne Internet, aber lokal erreichbar | App und bestehende lokale Daten funktionieren; Live-Presence funktioniert im lokalen Netz |
| Proxy | Reverse Proxy mit WebSocket-Unterstützung | `/api/realtime` wird auf `101 Switching Protocols` upgraded |

## Bekannte Grenzen

Die Presence-Daten und Locks sind bewusst flüchtig und werden nicht in der SQLite-Datenbank gespeichert. Nach einem Serverneustart müssen Nutzer ihre Arbeitsbereiche neu öffnen. Die eigentlichen Episodenänderungen bleiben durch die reguläre Speicherung, Revisionen und Backups geschützt.

[PodCore GitHub Repository](https://github.com/webcaster/podcore_V2)
