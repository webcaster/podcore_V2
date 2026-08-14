# Anleitung: Einbindung des PodCore WordPress-Plugins auf podcore.de

Diese Anleitung beschreibt die Installation und Konfiguration des **PodCore Tutorial-Cloud Plugins** (v2.16.4) auf deiner WordPress-Seite. Das Plugin ermöglicht es, Tutorials zentral auf der Webseite zu verwalten, als Wiki anzuzeigen und direkt in die PodCore-App zu synchronisieren.

---

## 1. Installation des Plugins

Das Plugin wird als Standard-ZIP-Datei installiert:

1.  Logge dich in dein WordPress-Backend auf **podcore.de** ein.
2.  Navigiere zu **Plugins → Installieren → Plugin hochladen**.
3.  Wähle die Datei `podcore-tutorials-wp-plugin-v2.16.4.zip` aus und klicke auf **Jetzt installieren**.
4.  Klicke nach dem Hochladen auf **Plugin aktivieren**.

> **Hinweis:** Sollte WordPress melden, dass kein gültiges Plugin gefunden wurde, stelle sicher, dass du das ZIP verwendest, das ich dir bereitgestellt habe. Es enthält den Ordner `podcore-tutorials` direkt auf der obersten Ebene.

---

## 2. Wichtige Grundeinstellungen

Damit die PodCore-App mit der Webseite kommunizieren kann, muss die WordPress-REST-API korrekt funktionieren:

1.  **Permalinks prüfen**: Gehe zu **Einstellungen → Permalinks**. Wähle eine Struktur aus (empfohlen: *Beitragsname*) und klicke auf **Änderungen speichern**. Dies ist zwingend erforderlich, damit die Cloud-Routen (`/wp-json/app-tutorials/...`) erreichbar sind.
2.  **REST-API Test**: Öffne im Browser die Adresse `https://podcore.de/wp-json/app-tutorials/v1/tutorials`. Wenn du eine leere Liste `[]` oder JSON-Daten siehst, ist das Plugin bereit. Erhältst du einen 404-Fehler, speichere die Permalinks erneut.

---

## 3. Tutorials erstellen und verwalten

Nach der Aktivierung findest du im Menü den Punkt **PodCore Tutorials**.

### Tutorial manuell erstellen
1.  Klicke auf **Tutorials → Erstellen**.
2.  Gib einen Titel und eine Beschreibung ein.
3.  **JSON-Import**: Du kannst eine aus der App exportierte `.json`-Datei hochladen. Das Plugin extrahiert automatisch die Schritte und Bilder.
4.  **Rollen festlegen**: In der rechten Seitenleiste (Custom Fields) kannst du festlegen, für welche Rollen (z.B. `admin`, `redakteur`, `*` für alle) das Tutorial in der App erscheinen soll.

### Anzeige auf der Webseite (Wiki-Modus)
Das Plugin ist für **The7** und den **WPBakery Page Builder** optimiert:
-   Verwende den Shortcode `[podcore_tutorial_list]`, um eine Übersicht aller Tutorials auf einer Seite anzuzeigen.
-   Jedes Tutorial wird als eigener Beitrag im Stil deiner Webseite dargestellt.
-   Am Ende jedes Beitrags erscheint automatisch eine **Download-Box**, mit der Nutzer das Tutorial für ihre lokale PodCore-Instanz herunterladen können.

---

## 4. PodCore-App mit der Webseite verbinden

Um die automatische Synchronisation (Cloud-Sync) zu nutzen:

1.  Öffne die **PodCore-App**.
2.  Aktiviere den **Entwickler-Modus** (7 Klicks auf die Versionsnummer unten links).
3.  Gehe zu **Tutorial-Verwaltung → Tutorial-Cloud**.
4.  Trage die Basis-URL deiner Webseite ein: `https://podcore.de/wp-json/app-tutorials/v1`.
5.  Klicke auf **Verbindung prüfen** und anschließend auf **Synchronisieren**.

---

## 5. Fehlerbehebung (Troubleshooting)

| Problem | Lösung |
| :--- | :--- |
| **404 bei Cloud-Sync** | Permalinks in WordPress neu speichern. Cache (WP Rocket, Autoptimize etc.) leeren. |
| **Bilder fehlen offline** | Das Plugin v2.16.4 bettet Bilder als Base64 in das JSON ein. Stelle sicher, dass das Tutorial in WordPress mit Bildern gespeichert wurde. |
| **WPBakery zeigt nichts an** | Stelle sicher, dass in den WPBakery-Einstellungen der Post-Type `podcore_tutorial` für den Editor aktiviert ist. |

---

*Erstellt für Max (Mediengestalter Bild und Ton) zur Version v2.16.4.*
