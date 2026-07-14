# PodCore 2.14.2 – Bedien- und Update-Anleitung

Version **2.14.2** ist ein Stabilitätsupdate für Redaktion, Sponsoring, PDF-Exporte und die integrierte Hilfe. Es verbessert die Lesbarkeit der Textbaustein-Bibliothek, ergänzt freie Recherchetexte, exportiert die vollständige Themenwerkstatt in Ideenmappen und behebt Datenverlust sowie Exportfehler bei Sponsor-Buchungen, Sponsor-Dossiers und Preislisten.

> Die eigene Anwendungsschriftart ist ausdrücklich **nicht Bestandteil dieses Updates**. PodCore verwendet weiterhin die vorhandene Schriftkonfiguration.

## Funktionsübersicht

| Bereich | Änderung in 2.14.2 | Bedienweg |
|---|---|---|
| Textbaustein-Bibliothek | Kontrastfeste Eingabe- und Auswahlfelder | RedaktionsHub → Idee öffnen → Textbausteine |
| Recherche | Neuer Typ **Freier Text** ohne URL-Pflicht | RedaktionsHub → Idee öffnen → Recherche → Freier Text |
| Ideenmappen-PDF | Vollständiger Abschnitt **Themenwerkstatt** | RedaktionsHub → Idee öffnen → Ideenmappe als PDF exportieren |
| Sponsor-Buchungen | Vollständige Speicherung und sichere Teilupdates | Sponsoren → Sponsor öffnen → Buchungen |
| Sponsor-Dossier | Korrigierter Export mit wählbaren Inhalten und eigenem Titel | Sponsoren → Sponsor öffnen → Dossier exportieren |
| Preislisten-PDF | Vollständige Ausgabe aller Angaben einer Werbekategorie | Sponsoren → Werbekategorien → PDF exportieren |
| PDF-Fußzeilen | Keine leeren Zusatzseiten durch Footer mehr | Gilt zentral für die korrigierten PDF-Exporte |
| In-App-Handbuch | Durchsuchbares Nachschlagewerk für alle PodCore-Bereiche | Wiki → Bereich wählen oder Suchfeld verwenden |

## Lesbare Textbaustein-Bibliothek

Die Formularfelder der Textbaustein-Bibliothek verwenden explizite Vordergrund-, Hintergrund-, Rahmen- und Platzhalterfarben. Titel, Typ, Inhalt und Schlagwörter bleiben dadurch sowohl im hellen Erscheinungsbild als auch im Dunkelmodus klar erkennbar. Die Bedienung und bereits gespeicherte Textbausteine bleiben unverändert.

## Freie Texte in der Recherche

Mit **Freier Text** steht ein Rechercheelement für Inhalte zur Verfügung, die keine klassische Quelle und keine URL benötigen. Dieser Typ eignet sich unter anderem für eigene Beobachtungen, Gesprächsnotizen, Briefing-Inhalte, Argumentationsskizzen und redaktionelle Einordnungen.

| Feld | Verwendung |
|---|---|
| Titel | Kurze, eindeutige Bezeichnung des Rechercheeintrags |
| Haupttext | Vollständiger frei formulierter Inhalt |
| Zusammenfassung | Optionale Kurzfassung für die Rechercheübersicht |

Öffnen Sie eine Idee im RedaktionsHub, wechseln Sie zur Recherche und wählen Sie **Freier Text**. Erfassen Sie mindestens Titel und Haupttext und speichern Sie den Eintrag. Der Inhalt erscheint als eigenständige Karte; eine URL ist für diesen Typ nicht erforderlich.

## Themenwerkstatt im Ideenmappen-PDF

Der Export einer Ideenmappe enthält einen eigenen Abschnitt **Themenwerkstatt**. PodCore gibt jedes befüllte Feld aus und lässt leere Felder aus. Dadurch bleibt das Dokument vollständig, ohne unnötige Leerbereiche zu erzeugen.

| Reihenfolge | Feld im PDF |
|---:|---|
| 1 | Perspektive |
| 2 | Leitfrage |
| 3 | Kernaussage |
| 4 | Zielgruppennutzen |
| 5 | Arbeitstitel |
| 6 | Teaser |
| 7 | Episodenbeschreibung |
| 8 | Show Notes |
| 9 | Call-to-Action |
| 10 | Haupttext |

Die Darstellung verwendet das ausgewählte Ideenmappen-Layout einschließlich CI-Farben, Typografie, Logo, Dokumententitel und Wasserzeichen. Mehrere Arbeitstitel werden als Liste ausgegeben; längere Inhalte erhalten automatische Seitenumbrüche.

## Sponsor-Buchungen zuverlässig speichern

Die Buchungs-API und das Bearbeitungsformular verwenden jetzt eine konsistente Feldzuordnung. Beim Anlegen und vollständigen Bearbeiten werden alle Eingaben gespeichert und nach erneutem Öffnen wieder angezeigt. Wird nur ein Status geändert, bleiben die übrigen Buchungswerte erhalten.

### Buchung anlegen oder bearbeiten

Öffnen Sie einen Sponsor und wechseln Sie zu **Buchungen**. Erfassen Sie die Daten im Dialog **Buchung bearbeiten** und speichern Sie anschließend.

| Feldgruppe | Gespeicherte Angaben |
|---|---|
| Zuordnung | Werbe-Slot beziehungsweise Werbekategorie |
| Laufzeit | Laufzeit von und Laufzeit bis |
| Platzierung | Platzierungen pro Folge und einzelne Folgen mit Anzahl |
| Preis | Basispreis, Preisanpassung und Hörerbeteiligung pro 1.000 Hörer |
| Vertrag | Gesamtzahl der vereinbarten Folgen |
| Nachlass | Rabattwert und Rabattart in EUR oder Prozent |
| Bearbeitung | Buchungsstatus, Rechnungsstatus und Notizen |

**Werbe-Slot beziehungsweise Werbekategorie**, **Laufzeit von** und **Laufzeit bis** sind Pflichtangaben. Das Enddatum darf nicht vor dem Startdatum liegen. Folgen werden erst durch den Plus-Schalter zur Buchungsliste hinzugefügt.

### Buchung kontrollieren

Öffnen Sie die gespeicherte Buchung erneut und vergleichen Sie Slot, Laufzeit, Folgen, Preis, Rabatt und Status mit den zuvor erfassten Angaben. Ändern Sie danach testweise ausschließlich den Rechnungsstatus. Beim nächsten Öffnen müssen alle anderen Angaben unverändert sein.

## Sponsor-Dossier exportieren

Der Dossier-Export verwendet die korrekten Vertragsdaten und erzeugt keine zusätzlichen reinen Footer-Seiten mehr. Der individuelle Dokumenttitel wird übernommen.

Im Exportdialog stehen folgende Bereiche zur Auswahl:

| Bereich | Inhalt |
|---|---|
| Stammdaten | Sponsor- und Kontaktdaten |
| Verträge | Vertragsnummern, Laufzeiten, Status und Konditionen |
| Buchungen | Werbeformen, Laufzeiten, Preise und Status |
| Abrechnung | Berechnete und abrechnungsrelevante Werte |
| Notizen | Interne Hinweise, wenn ausdrücklich ausgewählt |

Wählen Sie mindestens einen Bereich, vergeben Sie einen aussagekräftigen Dokumenttitel und wählen Sie das gewünschte Sponsor-Dossier-Layout. Prüfen Sie das erzeugte PDF auf Titel, gewählte Abschnitte, Seitenzahl sowie Header und Footer.

## Vollständige Preisliste exportieren

Die Preislisten-PDF stellt jede aktive Werbekategorie als eigenen übersichtlichen Block dar. Die Ausgabe verwendet das ausgewählte PDF-Layout und übernimmt Header, Footer, Wasserzeichen, Farben und automatische Seitenumbrüche.

| Angabe je Werbekategorie | Ausgabe im PDF |
|---|---|
| Name | Überschrift des Kategorieblocks |
| Beschreibung | Sachliche Erläuterung der Werbeform |
| Präsentationstext | Vertrieblicher beziehungsweise kundengerichteter Text |
| Festpreis | Preis des festen Modells |
| Preis pro Folge | Folgenbezogener Preis |
| Preis pro 1.000 Hörer | CPM- beziehungsweise TKP-Preis |
| Währung | Zugehörige Währung aller Preise |
| Farbe | Visuelle Kategoriefarbe |
| Exklusivität | Kennzeichnung der exklusiven Belegung |
| Status | Aktiv beziehungsweise inaktiv |

Pflegen Sie vor dem Export alle benötigten Angaben unter **Sponsoren → Werbekategorien**. Wählen Sie beim PDF-Export das Preislisten-Layout. Leere Preisfelder werden nicht als scheinbarer Nullpreis ausgegeben.

## Neues In-App-Handbuch

Das bisherige Kurz-Wiki wurde zu einem vollständigen Endnutzer-Handbuch und Nachschlagewerk ausgebaut. Die Startseite bietet ein Suchfeld, eine kategorisierte Seitennavigation und aufklappbare Artikel.

| Handbuchbereich | Enthaltene Themen |
|---|---|
| Start & Navigation | Anmeldung, Dashboard, Navigation, Profil und persönliches Design |
| Episoden & Planung | Episodenliste, Editor, Script, Metadaten, Staffeln, Kommentare und Freigaben |
| RedaktionsHub | Ideen, Themenwerkstatt, Recherche, Interview, Textbausteine, Kalender und Archiv |
| Media & Produktion | Media Library, Metadaten, Audio-Editor, Marker, Regionen und DAW-Exporte |
| Sponsoring | Stammdaten, Werbekategorien, Verträge, Buchungen, Angebote, Abrechnung und Dossiers |
| Statistiken & Podigee | Manuelle Statistikwerte und Podigee-Auswertungen |
| PDF & Exporte | PDF-Layouts und vollständige Exportübersicht |
| Einstellungen & Daten | Podcast-Profil, Branding, Speicher, Backups, Import und Updates |
| Administration | Benutzer, Rollen, Module, System, Datenbank und Logs |
| Versionshistorie | Kompakte Übersicht der jüngsten Releases |

Geben Sie im Suchfeld einen Funktionsnamen, einen Formularbegriff oder einen Arbeitsschritt ein. Die Suche berücksichtigt Überschriften, Beschreibungen, Artikeltexte und Schlagwörter. Mit **Admin** gekennzeichnete Artikel sind nur bei entsprechender Berechtigung relevant.

## Aktualisierung über das integrierte Update-System

Erstellen und laden Sie vor dem Update ein aktuelles Vollbackup herunter. Öffnen Sie danach **Einstellungen → App-Update**, wählen Sie das Release-ZIP **PodCore-v2.14.2.zip** und starten Sie zunächst die Paketprüfung. Wenden Sie das Update erst an, wenn Struktur und Version akzeptiert wurden.

Nach dem automatischen Neustart muss die Oberfläche Version **2.14.2** anzeigen. Für dieses Update sind keine manuellen SQL-Befehle erforderlich. Bestehende Redaktions-, Sponsor-, Buchungs- und Layoutdaten bleiben erhalten.

## Manuelle Installation und Aktualisierung mit pnpm

PodCore verwendet drei Paketverzeichnisse. Die Abhängigkeiten müssen im Root-Verzeichnis sowie separat in `client/` und `server/` installiert beziehungsweise nach einem Update abgeglichen werden.

Aktivieren Sie pnpm bei Bedarf über Corepack:

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

Führen Sie nach `git pull` im PodCore-Root-Verzeichnis folgende Befehle aus:

```bash
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Alternativ führt `pnpm run install:all` die drei Installationsschritte nacheinander aus. Die Installationsskripte übernehmen Installation und Produktions-Build vollständig.

| Plattform | Aktualisieren und bauen | Produktionsstart |
|---|---|---|
| Linux und macOS | `chmod +x install.sh && ./install.sh` | `./start-unix.sh` |
| Windows | `install.bat` | `start-windows.bat` |

## Prüfung nach dem Update

| Prüfung | Erwartetes Ergebnis |
|---|---|
| Textbaustein-Bibliothek im Dunkelmodus öffnen | Texte, Platzhalter und Auswahlwerte sind deutlich lesbar. |
| Freien Recherchetext anlegen | Der Eintrag lässt sich ohne URL speichern und erscheint als Freitext-Karte. |
| Freitext mit Zusammenfassung neu laden | Haupttext und Zusammenfassung bleiben erhalten. |
| Themenwerkstatt vollständig befüllen und Ideenmappe exportieren | Alle zehn Felder erscheinen im Themenwerkstatt-Abschnitt. |
| Sponsor-Buchung mit allen Angaben speichern und neu öffnen | Slot, Laufzeit, Folgen, Preise, Rabatt, Status und Notizen sind vollständig vorhanden. |
| Nur den Rechnungsstatus einer Buchung ändern | Alle übrigen Buchungsdaten bleiben unverändert. |
| Sponsor-Dossier mit Vertrag und Buchung exportieren | Export endet ohne Serverfehler; Titel und ausgewählte Abschnitte erscheinen im PDF. |
| Vollständig gepflegte Werbekategorie als Preisliste exportieren | Beschreibung, Präsentationstext, alle Preise, Währung, Farbe, Exklusivität und Status erscheinen. |
| Preisliste und Dossier auf Seitenzahl prüfen | Es entstehen keine leeren reinen Footer-Seiten. |
| Wiki öffnen und nach „Buchung“ suchen | Passende Endnutzer-Artikel aus Sponsoring und Exporten werden angezeigt. |
| Browser-Titel und Health-Endpunkt prüfen | Die Anwendung meldet Version 2.14.2. |

## Rückfall und Datensicherung

Falls ein Rollback erforderlich ist, stoppen Sie PodCore, stellen Sie den vorherigen Anwendungsstand wieder her und verwenden Sie die vor dem Update erstellte Sicherung des persistenten Datenverzeichnisses. Da dieses Bugfix-Update keine neue Datenbankmigration benötigt, sind keine zusätzlichen manuellen Rückbauschritte vorgesehen.
