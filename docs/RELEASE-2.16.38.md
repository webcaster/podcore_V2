# PodCore v2.16.38 – Vollständige Datenbereichstrennung für mehrere Podcasts

Version **2.16.38** entwickelt die bisherige Profilverwaltung zu einer echten Mehrfach-Podcast-Arbeitsweise weiter. Episoden, Medien und Sponsoringdaten werden nicht mehr nur über einen sichtbaren Profilwechsel organisiert, sondern serverseitig einem eindeutigen Podcastbereich zugeordnet.

## Getrennte Datenbereiche

Für Episoden, Medien, Medienordner, Sponsoren, Werbeplätze, Platzierungen, Episodenbuchungen, Sponsoringverträge, Buchungen und Angebote steht eine eigene Podcast-ID zur Verfügung. Neue Episoden, Uploads, Ordner, Sponsoren, Verträge, Buchungen und Angebote erhalten den aktiven Podcast automatisch. Daten aus dem Qualitätsgate, einschließlich Rechte-Register, Audio-Abnahme, Release-Paket und Übergaben, liegen in den technischen Daten der Episode und sind damit automatisch derselben Zuordnung unterstellt.

Die aktiven Datenbereiche werden sowohl im Client als auch auf dem Server berücksichtigt. Der Client speichert die aktive Auswahl lokal und übergibt sie mit normalen API-Aufrufen. Der Server prüft sie zusätzlich gegen die gespeicherten Podcastprofile. Ein unbekannter oder veralteter Header fällt sicher auf das konfigurierbare aktive Profil zurück.

## Schutz von Zugriffen und Exporten

Listen, Detailansichten, Bearbeitungen, Löschungen, Medienstreams, Schnittmarker, Kommentare, Episodenfreigaben sowie Episoden-PDFs und Archivmappen respektieren den aktiven Podcastbereich. Sponsoring-v2 prüft bei Verträgen, Buchungen und Angeboten außerdem die zugehörige Sponsor-ID im aktuellen Bereich. Datenbanktrigger übertragen die Podcast-ID bei untergeordneten Sponsoringdatensätzen aus Sponsor, Werbeplatz oder Episode, damit auch Spezialwege und Importdaten konsistent bleiben.

## Sichere Migration bestehender Daten

Vor v2.16.38 vorhandene Einzelpodcastdaten besitzen naturgemäß keine Podcast-ID. Wenn bereits ein aktives Podcastprofil existiert, werden nur diese unzugeordneten Datensätze beim Datenbankstart einmalig diesem Profil zugeteilt. Bei einer Installation ohne Podcastprofile bleibt der bestehende Einzelpodcastbetrieb unverändert. Wird das erste Profil später angelegt und aktiviert, löst die Einstellungenverwaltung dieselbe einmalige Erstzuordnung aus. Bereits getrennte Daten bleiben unverändert.

## Prüfung

Ein isolierter Rauchtest bestätigt die Auflösung des aktiven Profils, den gültigen Header-Override, den sicheren Fallback bei unbekannter Auswahl sowie den Einzelpodcast-Fallback. Client- und Server-TypeScript-Build wurden nach den Bereichsänderungen erfolgreich ausgeführt. Die vollständige Produktionsprüfung wird vor der Veröffentlichung erneut ausgeführt.
