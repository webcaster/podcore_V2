# PodCore – Release Notes

## v2.14.9 – Verlässliche Interview-Fertigstellung, transparente Speicherung und bereinigte Staffelplanung

Version **2.14.9** vereinheitlicht den Abschluss einer Episode rund um Interview-Blöcke. Unabhängig davon, ob eine Episode aus einer Ideenmappe entsteht oder manuell angelegt wird, stehen jetzt dieselbe Partnerauswahl, die Übernahme zugehöriger Fragen, direkte manuelle Fragen und nachvollziehbare Freigaben bereit. Die Anwendung macht zudem Datenbank, Datenordner, Medienablage und Sicherungen transparent sichtbar. Verwaiste Staffelplan-Positionen lassen sich nach dem Löschen einer Episode wieder zuverlässig entfernen.

| Bereich | Änderung |
|---|---|
| Einheitlicher Interview-Block | Die Aktionen **„+ Interview“** und **„Interview-Fragen“** erzeugen denselben strukturierten Block. Beide Wege bieten Partnerauswahl, Fragenübernahme und Bearbeitung. |
| Partner und Fragen | Ein ausgewählter Interview-Partner übergibt seine Fragen mit Quellenbezug, Freigabestatus und Antwortzeit in die Episode. Dies gilt für Ideenmappen- und manuell erstellte Folgen. |
| Manuelle Fragen | Manuelle Fragen lassen sich im Block direkt eingeben, bearbeiten, zentral im RedaktionsHub speichern und anschließend erneut verwenden. |
| Fragen-Sortierung | Fragen eines Interview-Partners können im Editor sichtbar umsortiert werden; die Reihenfolge bleibt nach dem Speichern und Neuladen erhalten. |
| Fragenfreigabe | Für gespeicherte Interview-Fragen kann im RedaktionsHub und direkt im Episoden-Editor eine Freigabe angefordert werden. Der Status unterscheidet offen, angefragt, freigegeben und abgelehnt. |
| Fertigstellungscheck | Die Episodenfreigabe weist klar auf fehlende Partner, offene Fragen oder notwendige noch nicht freigegebene Fragen hin und verhindert einen unvollständigen Abschluss. |
| Staffelplan-Löschung | Beim Löschen einer Episode werden verknüpfte Staffelplan-Positionen und Ideen wieder freigegeben. Bereits mit älteren Versionen entstandene verwaiste Planpositionen können nachträglich gelöscht werden. |
| Datenbankstatus | Administration zeigt die tatsächlich aktive Datenbank, Datenbankdatei, Datenordner, Medienablage und eine komprimierte Bestandsübersicht an. |
| SQLite und MySQL/MariaDB | SQLite bleibt der aktive Standardbetrieb. Die Administration bietet eine klar abgegrenzte, testbare und gesicherte **Datenkopie** nach MySQL/MariaDB; eine scheinbare Laufzeitumstellung wird nicht mehr suggeriert. |
| Datenspeicher | **Branding & Backup → Speicher** zeigt Betriebsdaten, Medien, Sicherungen und das aktive Medienziel getrennt an. Lokale Pfade lassen sich vor dem Speichern testen; nicht verfügbare SFTP/SSH-Speicherung ist sichtbar deaktiviert. |
| Qualitätssicherung | Produktions-Build, isolierter API-Ende-zu-Ende-Test, visuelle Editorprüfung, Persistenzprüfung, Datenbankstatus, lokaler Speichertest und Staffelplan-Löschung wurden erfolgreich durchgeführt. |

### Aktualisierung

Ab einer bestehenden Installation von PodCore **2.14.3 oder neuer** kann das Release-ZIP über **Einstellungen → App-Update** verifiziert eingespielt werden. Erstellen Sie vorher ein Vollbackup des persistenten Datenverzeichnisses. Für v2.14.9 sind keine manuellen SQL-Schritte erforderlich; die zusätzlichen Freigabemetadaten werden beim Serverstart abwärtskompatibel und idempotent ergänzt. Die vollständige Installations-, Bedien-, Prüf- und Rückfallanleitung befindet sich unter [`docs/UPDATE-2.14.9.md`](docs/UPDATE-2.14.9.md).

## v2.14.8 – Stabile PDF-Unterlagen, wiederherstellbare Ideenmappen und vollständige Episodenarchive

Version **2.14.8** stabilisiert die PDF- und Archivierungsabläufe des RedaktionsHub. Der allgemeine Fragen-Pool bleibt auch bei langen Fragen vollständig lesbar, Interview-Partner erhalten persönliche Unterlagen mit Anschreiben, und archivierte Episoden können als nachvollziehbare ZIP-Archivmappe abgelegt werden. Ergänzend schützt ein Papierkorb versehentlich gelöschte Ideenmappen und die Fragenverwaltung einer Ideenmappe beschränkt ihre Partnerauswahl auf den jeweils passenden Folgenkontext.

| Bereich | Änderung |
|---|---|
| Fragen-Pool-PDF | Der Export berechnet den Platz für einen vollständigen Fragenblock vor dem Seitenwechsel. Frage, Kategorie und Hintergrundinfo werden nicht mehr abgeschnitten oder unlesbar getrennt. |
| Fragen-Pool-Themen | Themen im allgemeinen Pool können umbenannt werden. Die Gruppierung bleibt dadurch ohne manuelle Einzelbearbeitung übersichtlich. |
| Persönliche Interview-PDF | Für einzelne Interview-Partner steht ein persönliches Dokument mit Anschreiben und den zugehörigen Fragen zur Verfügung. |
| Ideenmappen-Papierkorb | Das Löschen einer Ideenmappe erfolgt als Soft-Delete. Die Idee bleibt im Papierkorb verfügbar und kann wiederhergestellt werden. |
| Ideenmappen-Partnerfilter | Die Fragenverwaltung lädt nur Partner, die der gerade geöffneten Ideenmappe zugeordnet sind. |
| Staffelplan-PDF | Das moderne Staffelplan-Layout trennt Logo und Überschrift im Kopfbereich, sodass keine Überlappung mehr entsteht. |
| ZIP-Archivmappe | Archivierte Episoden können als ZIP mit lesbarer Übersicht, Manifest, Episoden-, Ideen-, Interview-, Sponsoring-, Medien- und Workflow-Daten sowie verfügbaren lokalen Dateien heruntergeladen werden. |
| Qualitätssicherung | Produktions-Build sowie Ende-zu-Ende-Tests für Papierkorb und Wiederherstellung, Partnerfilter, persönliche Interview-PDF, Fragen-Pool-Themenumbenennung, mehrseitige Fragen-Pool-PDF, Staffelplan-PDF und Archivmappe wurden erfolgreich durchgeführt. |

### Aktualisierung

Ab einer bestehenden Installation von PodCore **2.14.3 oder neuer** kann das Release-ZIP über **Einstellungen → App-Update** verifiziert eingespielt werden. Erstellen Sie vorher ein Vollbackup des persistenten Datenverzeichnisses. Für dieses Wartungsrelease sind keine manuellen Datenbankeingriffe erforderlich; vorhandene Migrationen werden beim Serverstart weiterhin idempotent geprüft. Die vollständige Installations-, Bedien-, Prüf- und Rückfallanleitung befindet sich unter [`docs/UPDATE-2.14.8.md`](docs/UPDATE-2.14.8.md).

## v2.14.7 – Verifizierter Ideenmappen-Workflow, Redaktions- und Sponsoring-Optimierungen

Version **2.14.7** konsolidiert die angeforderten Hotfixes und erweitert den strategischen Produktionsablauf verbindlich: Aus einer strategischen Planposition wird zuerst eine Ideenmappe als redaktionelle Sammelstelle erzeugt. Eine Episode entsteht erst anschließend aus dieser vorbereiteten Ideenmappe. Der Release enthält zudem eine geprüfte Verbesserung der Staffelplan-PDF, des Episoden-Editors, der Interview-Verwaltung und der Sponsor-Verträge.

| Bereich | Änderung |
|---|---|
| Strategische Staffelplanung | Planpositionen führen jetzt zuerst in eine Ideenmappe; erst aus dieser Ideenmappe wird eine Episode erzeugt. Der Übergang bleibt gegen Doppelanlage abgesichert und übernimmt die Staffelverknüpfung. |
| Flexible Folgennummer | Die Folgennummer ist optional und akzeptiert ausdrücklich **0** für Pilot-, Trailer- oder Sonderfolgen. Sie ist von der Planposition getrennt und wird bis in die erzeugte Episode übernommen. |
| Ideenmappe als Produktionsgrundlage | Staffelziel, Titel, Zusammenfassung, Themen, Schwerpunkte, Termin, Notizen und zugeordnete Interview-Partner werden in der Ideenmappe als Ausgangspunkt der weiteren Folgenarbeit gesammelt. |
| Staffelplan-PDF | Der neue Exporttyp **„Staffelplanung Modern“** ist in Layoutverwaltung und Exportdialog verfügbar. Das Querformat-PDF enthält eine kompakte Staffel-Übersicht und klar abgegrenzte Informationskarten; Dokumenttitel bleiben individuell anpassbar. |
| Episoden-Editor | Medien-Upload startet eingeklappt. Kommentare & Feedback sowie Versionsverlauf sind als einklappbare Seitenbereiche umgesetzt. Verknüpfte Ideenmappen werden sichtbar ausgewiesen. |
| Interview-Partner im Editor | Partner werden im Ideenmappen-Kontext gefiltert. Neue Partner aus dem Editor werden zuverlässig mit der verknüpften Ideenmappe gespeichert und erscheinen anschließend direkt in der gefilterten Auswahl. |
| Interview-Verwaltung | Partnerstatus ist sichtbar und bearbeitbar. Partnerfragen lassen sich sortieren sowie einzeln in den allgemeinen Fragen-Pool übernehmen. Themenbereiche im Pool sind einklappbar. |
| Sponsoring | Bei einer Sponsor-Neuanlage mit vollständig angegebener Laufzeit wird automatisch ein **Erstvertrag** erzeugt und in der bestehenden Vertragsverwaltung angezeigt. |
| Vollständigkeit | Fragen-Pool-PDF, Backup-Erweiterung und Firmenanzeige in der Sponsorenübersicht aus den vorherigen Hotfixes bleiben Bestandteil des geprüften Standes. |
| Qualitätssicherung | Produktions-Build, Login, Ideenmappe-zuerst-Ablauf, Folge 0, Folgenerstellung, Editor-Integration, Partnerzuordnung, Status, Fragen-Archivierung, Themenansicht, Erstvertrag und Staffelplan-PDF wurden lokal funktional geprüft. |

### Aktualisierung

Ab einer bestehenden Installation von PodCore **2.14.3 oder neuer** kann das Release-ZIP über **Einstellungen → App-Update** verifiziert eingespielt werden. Erstellen Sie vorher ein Vollbackup des persistenten Datenverzeichnisses. Die Datenbankergänzungen für Folgennummern und Interviewstatus werden beim ersten Serverstart automatisch und idempotent ausgeführt. Eine vollständige Installations-, Bedien-, Prüf- und Rückfallanleitung befindet sich unter [`docs/UPDATE-2.14.7.md`](docs/UPDATE-2.14.7.md).

## v2.14.4 – Strategische Staffelplanung, Editorübergang und Rollenrechte

Version **2.14.4** führt eine strategische Planungsebene für ganze Podcast-Staffeln ein. Redaktionsteams können Reihenfolge, Alternativen, Themen, Formate, Schwerpunkte und Partner vor der operativen Produktion festlegen. Bestätigte Planpositionen werden ohne doppelte Datenerfassung in eine Ideenmappe und anschließend in den Episoden-Editor überführt. Der neue Ablauf ist berechtigt, idempotent, PDF-exportierbar und über Rücknavigation mit der strategischen Quelle verbunden.

| Bereich | Änderung |
|---|---|
| Strategische Staffelplanung | Neuer Tab **RedaktionsHub → Staffelplanung** mit Staffelziel, geordneter Folgenliste, Alternativen, Themen, Formaten, Priorität, Status, Zielterminen, Schwerpunkten, Partnern und internen Notizen. |
| Staffeleinstieg | Die bestehende Staffelverwaltung erhält **Planung öffnen**. Der Link öffnet den passenden Staffelkontext im RedaktionsHub, ohne eine weitere Hauptnavigation einzuführen. |
| Reihenfolge und Alternativen | Planpositionen werden getrennt als verbindliche Reihenfolge oder Reserve verwaltet und können fortlaufend aktualisiert sowie umsortiert werden. |
| Partnerübernahme | Mehrere vorgemerkte Gesprächspartner können inklusive Rolle und Bestätigungsstatus einer Planposition zugeordnet werden. Eine additive Zuordnungstabelle vermeidet, dass bestehende Ideen-Partnerbeziehungen überschrieben oder verschoben werden. |
| Übergang in den Episoden-Editor | **Im Episoden-Editor weiterarbeiten** legt atomar eine Ideenmappe und eine Staffel-Episode an oder verwendet vorhandene Verknüpfungen wieder. Titel, Beschreibung, Themen, Priorität, Schwerpunkte, Notizen und Partner stehen anschließend über den bestehenden Ideenpfad im Editor zur Verfügung. |
| Duplikatschutz | Der Editorübergang ist idempotent: Wiederholtes Ausführen öffnet dieselbe verknüpfte Episode statt weitere Ideen oder Episoden zu erzeugen. |
| Editor-Rücknavigation | Verknüpfte Episoden zeigen ein Hinweisfeld zur strategischen Staffelplanung und führen über **Zurück zur Planung** oder den Zurück-Pfeil in den passenden RedaktionsHub-Kontext. |
| Staffelplan-PDF | Strategische Planung kann mit individuellem Dokumenttitel und vorhandenem Episoden-CI-Layout als mehrseitige PDF inklusive Reihenfolge, Alternativen, Metadaten, Partnern und Notizen exportiert werden. |
| Neue Rechte | `canViewSeasonPlanning`, `canEditSeasonPlanning`, `canExportSeasonPlanning` und `canTransitionSeasonPlanningToEpisode` steuern Lesen, Bearbeiten, Export und Übergabe getrennt auf Client und Server. |
| Rollenmatrix | Administration und Redaktion erhalten alle Staffelplan-Rechte; Moderation darf lesen und exportieren; Produktion erhält keinen Zugang zur strategischen Planung. Einzelne Benutzerrechte bleiben gezielte Überschreibungen. |
| Rechtevererbung | Bestehende individuelle Benutzerkonfigurationen erben neue Rollenrechte, ohne ausdrücklich gesetzte Sperren zu verlieren. Dadurch bleiben eingeschränkte Konten auch nach der Migration kontrolliert. |
| Datenbank | Die Tabellen für Planpositionen, Planpartner, Staffelziel und Rückverknüpfungen zu Idee und Episode werden beim Start automatisch und idempotent ergänzt. |
| Qualitätssicherung | Server- und Client-Build, isolierter End-to-End-Test mit Planposition, Aktualisierung, PDF, atomarem Editorübergang, Duplikatschutz, Moderations- und Produktionsrechten, Rechtevererbung sowie individueller Sperre wurden erfolgreich durchgeführt. |

### Aktualisierung

Sichern Sie vor dem Update das persistente PodCore-Datenverzeichnis. Ab laufender Version **2.14.3** kann **PodCore-v2.14.4.zip** über **Einstellungen → App-Update** verifiziert eingespielt werden. Bei einer manuellen Aktualisierung installieren Sie Root-, Client- und Server-Abhängigkeiten mit den jeweiligen Lockdateien und erstellen anschließend den Produktions-Build. Die Datenbankmigration für die strategische Staffelplanung erfolgt beim Serverstart automatisch. Die vollständige Bedien-, Rollen-, PDF-, Prüf- und Rückfallanleitung steht unter [`docs/UPDATE-2.14.4.md`](docs/UPDATE-2.14.4.md).

## v2.14.3 – Verifiziertes App-Update, allgemeiner Fragen-Pool und robuste Buchungs-PDFs

Version **2.14.3** behebt den Fehler, bei dem ein eingespieltes ZIP als erfolgreich gemeldet wurde, obwohl die laufende Anwendung nicht auf die neue Version wechselte. Der Updatepfad prüft und baut Pakete nun vorab im Staging, installiert Laufzeitabhängigkeiten nicht interaktiv, sichert den vorherigen Programmstand, übernimmt Dateien rollbackfähig und bestätigt den Erfolg erst nach einem echten Prozessneustart mit der erwarteten Zielversion. Zusätzlich erhält der RedaktionsHub einen allgemeinen Fragen-Pool; Sponsor-Buchungsbestätigungen werden layouttreu und zuverlässig über mehrere Seiten ausgegeben.

| Bereich | Änderung |
|---|---|
| ZIP-Update | Der in 2.14.2 und älteren Versionen enthaltene Handler kann sich wegen der fehlerhaften Anwendungswurzel nicht zuverlässig selbst ersetzen; 2.14.3 wird deshalb einmalig manuell installiert. Ab laufender Version 2.14.3 bleiben Upload und Prüfung getrennt, bevor Archivstruktur, Paketversionen und Buildfähigkeit im Staging verifiziert werden. |
| Installation im Updateprozess | Root-, Client- und Server-Abhängigkeiten werden mit `CI=true` nicht interaktiv installiert. Der Server verwendet einen eigenen pnpm-Workspace und eine synchronisierte Lockdatei einschließlich `ws` und `@types/ws`. |
| Sicherung und Rollback | Vor dem Dateiaustausch wird der bisherige Programmstand gesichert. Fehler bei Übernahme, Installation oder Verifikation lösen den Rückfall auf diesen Stand aus; temporäre ZIP- und Staging-Dateien werden bereinigt. |
| Neustart und Abschlusskontrolle | Der Serverprozess wird nach erfolgreicher Übernahme wirklich ersetzt. PodCore fragt den Status nach dem Verbindungswechsel erneut ab und bestätigt den Abschluss erst, wenn der neue Prozess erreichbar ist und die Zielversion meldet. |
| Update-Oberfläche | Die alte Admin-Installation mit verfrühter Erfolgsmeldung wurde aus der Oberfläche entfernt. Die Administrationskarte führt direkt zu **Einstellungen → App-Update**, sodass nur noch der verifizierte ZIP-Pfad angeboten wird. |
| Allgemeiner Fragen-Pool | Wiederverwendbare Interviewfragen können thematisch gruppiert erstellt, gesucht, gefiltert, bearbeitet, kopiert, ausgewählt, zugewiesen und gelöscht werden. Reguläre Interviewrouten sind serverseitig strikt von Pool-Einträgen getrennt. |
| Fragen-Pool-PDF | Alle, gefilterte oder ausgewählte Fragen lassen sich mit individuellem Dokumenttitel und vorhandenem PDF-Layout als A4-Dokument exportieren. |
| Ideenfragen | Die bestehende `idea_id`-Zuordnung wird beim Filtern, Erstellen und Bearbeiten vollständig berücksichtigt. Fragen bleiben dadurch zuverlässig mit der richtigen Idee verbunden. |
| Sponsor-Buchungsbestätigung | Einzel- und Sammelbestätigungen verwenden das gewählte PDF-Layout. Höhenberechnung, Textumbruch, Seitennummerierung und Seitenwechsel behandeln auch sehr lange Sponsor-, Buchungs- und Notizdaten vollständig. |
| Datenbank | Die Migration für Pool-Herkunft und Zuweisungen ist idempotent und mit passenden Indizes versehen. Es sind keine manuellen SQL-Schritte erforderlich. |
| Qualitätssicherung | Produktions-Builds, Neuinstallation über `install.sh`, authentifizierter ZIP-Update-Test mit echtem Neustart, Zielversionsprüfung, Datenerhalt und Backup-Nachweis, Fragen-Pool-Integration, Ideenfragen-Regression, mehrseitiger Buchungs-PDF-Stresstest, Diff-Hygiene und produktive Abhängigkeitsaudits wurden erfolgreich durchgeführt. |
| Technik | Root, Client, Server, Browser-Titel und In-App-Handbuch melden einheitlich Version 2.14.3. |

### Aktualisierung

Erstellen Sie vor dem Update ein aktuelles Vollbackup und bewahren Sie es außerhalb des Servers auf. Installieren Sie **PodCore-v2.14.3.zip aus Version 2.14.2 oder älter einmalig manuell**, da der alte ZIP-Handler selbst von dem behobenen Fehler betroffen ist und Erfolg melden kann, ohne die aktive Anwendung zu ersetzen. Erst wenn PodCore bereits Version **2.14.3 oder neuer** meldet, ist für Folgereleases **Einstellungen → App-Update** der empfohlene verifizierte ZIP-Weg. Die vollständige Bedien-, Update-, Prüf- und Rückfallanleitung steht unter [`docs/UPDATE-2.14.3.md`](docs/UPDATE-2.14.3.md).

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
