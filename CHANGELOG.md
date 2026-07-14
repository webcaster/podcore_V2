# PodCore – Release Notes

## v2.14.2 – Stabilitätsupdate für Redaktion, Sponsoring und PDF-Exporte

Version **2.14.2** verbessert die Lesbarkeit und Vollständigkeit zentraler Redaktionsfunktionen, stabilisiert Sponsor-Buchungen und korrigiert mehrere geschäftsrelevante PDF-Exporte. Das In-App-Wiki wurde zugleich zu einem durchsuchbaren Endnutzer-Handbuch für alle PodCore-Bereiche ausgebaut.

| Bereich | Änderung |
|---|---|
| Textbaustein-Bibliothek | Eingabe- und Auswahlfelder verwenden kontrastfeste Vorder- und Hintergrundfarben. Titel, Inhalt, Typ und Schlagwörter bleiben dadurch auch im Dunkelmodus klar lesbar. |
| Recherche | Der neue Typ **Freier Text** ermöglicht eigenständige Rechercheeinträge ohne URL. Titel, Haupttext und eine optionale Zusammenfassung werden als übersichtliche Karte dargestellt. |
| Ideenmappen-PDF | Der neue Abschnitt **Themenwerkstatt** exportiert alle befüllten Inhalte aus Perspektive, Leitfrage, Kernaussage, Zielgruppennutzen, Arbeitstiteln, Teaser, Episodenbeschreibung, Show Notes, Call-to-Action und Haupttext. |
| Sponsor-Buchungen | Anlegen, vollständiges Bearbeiten und partielle Statusänderungen speichern alle Formularangaben konsistent. API-Rückgaben verwenden die vom Client erwarteten Feldnamen; nicht geänderte Buchungswerte werden bei Teilupdates nicht mehr überschrieben. Pflichtfelder und unzulässige Laufzeiten werden vor dem Speichern verständlich angezeigt. |
| Sponsor-Dossier | Der Export verwendet die korrekten Vertragsdaten, übernimmt den individuellen Dokumenttitel und exportiert die gewählten Bereiche Stammdaten, Verträge, Buchungen, Abrechnung und Notizen. Der zuvor mögliche interne Serverfehler und zusätzliche reine Footer-Seiten sind behoben. |
| Preislisten-PDF | Jede aktive Werbekategorie wird vollständig mit Beschreibung, Präsentationstext, Festpreis, Preis pro Folge, CPM-Preis, Währung, Farbe, Exklusivität und Status ausgegeben. Ausgewähltes PDF-Layout, Header, Footer, Wasserzeichen und Seitenumbrüche werden berücksichtigt. |
| PDF-Grundlayout | Der zentrale Footer-Renderer zeichnet Fußzeilen innerhalb der echten Seitenränder und erzeugt dadurch keine leeren Zusatzseiten mehr. |
| In-App-Wiki | Das Wiki ist ein vollständiges, durchsuchbares Endnutzer-Handbuch. Es erklärt Navigation, Episoden, RedaktionsHub, Media Library, Sponsoring, Statistiken, PDF-Exporte, Einstellungen, Datenpflege und Administration. Berechtigungsabhängige Inhalte sind gekennzeichnet; die Versionshistorie erscheint kompakt. |
| Technik | Root, Client, Server und Browser-Titel melden einheitlich Version 2.14.2. Für dieses Bugfix-Update sind keine manuellen Datenbankänderungen erforderlich. Ein isolierter Ende-zu-Ende-Test deckt Version, Freitext-Recherche, Themenwerkstatt, Sponsor-Buchungen einschließlich Teilupdate, Dossier und vollständige Preisliste ab. |

### Aktualisierung

Vor dem Update sollte das persistente PodCore-Datenverzeichnis gesichert werden. Das Release-ZIP **PodCore-v2.14.2.zip** kann über die integrierte Update-Funktion eingespielt werden. Bei einer manuellen Aktualisierung werden nach `git pull` die Abhängigkeiten mit pnpm in Root, `client/` und `server/` installiert und anschließend der Produktions-Build erstellt. Eine ausführliche Anleitung mit Bedienwegen und Prüfplan steht unter [`docs/UPDATE-2.14.2.md`](docs/UPDATE-2.14.2.md).

## v2.14.1 – RedaktionsHub-, Sponsoring- und PDF-Wartungsupdate

Version **2.14.1** vervollständigt die bidirektionale Zusammenarbeit zwischen RedaktionsHub und Episoden-Editor, erweitert die Sponsor-Stammdaten um einen optionalen Logo-Upload und schließt mehrere Lücken in Wiki-, Dossier- und Angebots-PDF-Funktionen.

| Bereich | Änderung |
|---|---|
| RedaktionsHub und Episoden-Editor | Verknüpfte Themenentwürfe können gezielt in Episodenbeschreibung, Show Notes, Notizen oder neue Script-Blöcke übernommen werden. Globale und ideenbezogene Textbausteine stehen im Editor mit Suche und Typfilter bereit. |
| Themenfindung | Leitfrage, Kernaussage, Teaser, Episodenbeschreibung, Show Notes und Call-to-Action eines verknüpften Themenentwurfs lassen sich einzeln übernehmen. |
| Sponsor-Logo | Sponsor-Logos sind optional als JPG, PNG, WebP oder GIF bis 10 MB hochladbar, austauschbar und entfernbar. Logo-Dateien werden im persistenten PodCore-Datenverzeichnis gespeichert und in Übersicht sowie Detailkopf angezeigt. |
| Sponsor-Adresse | Das Adressfeld wird im Datenbankschema, in der Migration, im Sponsor-Formular sowie in Erstellen- und Aktualisieren-Routen vollständig persistiert. |
| Sponsor-Übersicht | Der Sponsorname bleibt die primäre Information; Firma und Kontaktperson werden nachgeordnet dargestellt. |
| Sponsor-Dossier | Die fehlende Dossier-PDF-Route ist vorhanden und mit dem Exportdialog der Sponsor-Detailseite verbunden. |
| Angebot-PDF | Individuelle Optionsnamen werden aus dem in der Oberfläche gepflegten Feld `label` übernommen. Für ältere Datensätze bleiben `title` und `name` als Fallbacks erhalten. Der individuelle Name erscheint auch in der Optionssumme. |
| Wiki | Die Wiki-Seite enthält wieder direkt gerenderte Hilfetexte, eine aktualisierte Versionshistorie und eine pnpm-Installationsanleitung. |
| Installation und Start | `install.sh` und `install.bat` installieren mit pnpm reproduzierbar in Root, `client/` und `server/` und erstellen den Produktions-Build. Die Startskripte installieren nichts mehr nach, prüfen den Build-Zustand und berücksichtigen einen konfigurierten `PORT`. Der vollständige Installer und ein isolierter Produktionsstart wurden erfolgreich getestet. |

### Bedienung

Im **Episoden-Editor** erscheint bei einer mit einer Idee verknüpften Episode der Bereich **RedaktionsHub-Inhalte**. Vor der Übernahme zeigt jede Aktion ihr Ziel an. Bestehende Texte werden nicht still überschrieben: Für Beschreibung, Show Notes und Notizen wird neuer Inhalt angehängt; Script-Übernahmen erzeugen einen neuen Block.

Das **Sponsor-Logo** wird unter **Sponsoren → Sponsor öffnen → Stammdaten → Optionales Sponsor-Logo** verwaltet. Das normale Speichern der Stammdaten lässt ein vorhandenes Logo unverändert. Beim Löschen eines Sponsors wird dessen Logo-Datei ebenfalls entfernt.

### Aktualisierung

Vor dem Update sollte eine Sicherung des persistenten PodCore-Datenverzeichnisses erstellt werden. Bei einer manuellen Aktualisierung werden nach `git pull` die Abhängigkeiten mit pnpm im Root-Verzeichnis sowie separat in `client/` und `server/` installiert; anschließend folgen `pnpm run build` und `pnpm start`. Alternativ führt `pnpm run install:all` die drei Installationsschritte aus. Die Installationsskripte für Linux, macOS und Windows bilden denselben Ablauf ab. Die Datenbankmigrationen laufen beim Serverstart automatisch; für 2.14.1 sind keine manuellen SQL-Schritte erforderlich.

## v2.14.0 – Workflow-Update

Version 2.14.0 konzentrierte sich auf die Optimierung des Episoden-Workflows, die Zusammenarbeit und datenbasierte Automatisierungen.

| Bereich | Hauptänderungen |
|---|---|
| Editor | Inline-Editing, automatische Speicherung, Undo/Redo, Live-Vorschau und integrierte Medienverwaltung. |
| Zusammenarbeit | Feldbezogene Kommentare, Erwähnungen, Änderungsverlauf, Diff-Vergleich und Echtzeit-Benachrichtigungen. |
| Automatisierung | Audio-Zeitstempel, Analyse-Jobs und Sponsoring-Empfehlungen. |
| Technik | Erweiterte SQLite-Tabellen, zentrale WebSocket-Schicht und überarbeiteter Episoden-Editor. |

Für Version 2.14.0 wurden Datenbankänderungen ebenfalls automatisch beim Start angewendet.
