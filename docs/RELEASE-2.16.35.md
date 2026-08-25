# PodCore 2.16.35 – Add-on Mehrere Podcasts

## Überblick

PodCore 2.16.35 ergänzt ein neues Add-on für die Verwaltung mehrerer Podcast-Profile innerhalb einer Installation. Administrierende Nutzer können Profile anlegen, bearbeiten, aktivieren und entfernen. Die Profile werden über die bestehende, geschützte App-Einstellung gespeichert.

## Bedienung

Der neue Bereich ist nach dem Login unter **Podcast-Verwaltung** beziehungsweise unter `/podcasts` erreichbar. Für die Anzeige und Bearbeitung ist die Berechtigung `canManageSettings` erforderlich; Administratoren besitzen sie automatisch.

| Aktion | Beschreibung |
|---|---|
| Podcast hinzufügen | Erstellt ein neues Profil mit Name, Untertitel, Host, Kategorie, Sprache, Website, RSS-Feed, Beschreibung und Akzentfarbe. |
| Bearbeiten | Ändert die Stammdaten eines vorhandenen Profils. |
| Aktiv setzen | Markiert ein Profil als aktuell aktiven Podcast. Es kann immer nur ein Profil aktiv sein. |
| Löschen | Entfernt ein Profil nach einer Sicherheitsabfrage. Wird das aktive Profil gelöscht, wird automatisch das nächste vorhandene Profil aktiviert. |

Die Auswahl wird in den zentralen App-Einstellungen unter `podcasts` und `activePodcastId` abgelegt. Bestehende globale Podcast-Einstellungen bleiben unverändert, sodass das Add-on ohne Datenmigration aktiviert werden kann.

## Technischer Hinweis

Die aktuelle Version stellt die Profilverwaltung und die persistente Auswahl bereit. Die vorhandenen Episoden-, Redaktions- und Sponsoring-Daten werden in diesem kleinen Update noch nicht automatisch nach Podcast getrennt. Die aktive Auswahl dient damit als belastbare Grundlage für eine spätere vollständige Datenbereichszuordnung, ohne bestehende Inhalte unbeabsichtigt zu verschieben.

## Qualitätssicherung

Der Client-Build wurde mit TypeScript-Prüfung und Vite-Build erfolgreich ausgeführt. Die neue Seite wird lazy geladen, ist nur für berechtigte Nutzer sichtbar und verwendet die vorhandene Admin-Einstellungs-API mit JSON-Persistenz.

## Versionsänderung

Die Versionsnummer wurde in Root-, Client- und Server-`package.json` sowie im HTML-Titel auf **2.16.35** aktualisiert.
