import React, { useState, useMemo } from 'react';
import {
  BookOpen, Search, ChevronRight, ChevronDown, Mic2, LayoutDashboard,
  Library, Megaphone, BarChart3, TrendingUp, Image, Shield, Settings,
  Lightbulb, FileText, Users, HelpCircle, Tag, Clock, Star,
  Upload, Play, MessageSquare, Download, Mail, Lock, UserCheck,
  Database, Folder, Globe, AlertCircle, CheckCircle, Info, Zap,
  Calendar, PenTool, Headphones, Package, ArrowRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

interface WikiArticle {
  id: string;
  title: string;
  summary: string;
  content: WikiSection[];
  tags: string[];
  icon: React.ReactNode;
}

interface WikiSection {
  heading?: string;
  text?: string;
  list?: string[];
  tip?: string;
  warning?: string;
  table?: { headers: string[]; rows: string[][] };
}

interface WikiCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  articles: WikiArticle[];
}

// ─────────────────────────────────────────────────────────────────────────────
// WIKI CONTENT
// ─────────────────────────────────────────────────────────────────────────────

const wikiData: WikiCategory[] = [
  {
    id: 'overview',
    label: 'Übersicht & Einstieg',
    icon: <LayoutDashboard size={16} />,
    color: 'text-accent-purple',
    articles: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        summary: 'Die Startseite von PodCore — alle wichtigen Kennzahlen auf einen Blick.',
        icon: <LayoutDashboard size={18} />,
        tags: ['start', 'übersicht', 'kennzahlen', 'statistiken'],
        content: [
          {
            text: 'Das Dashboard ist die Startseite von PodCore und gibt dir einen schnellen Überblick über den aktuellen Stand deines Podcasts. Es zeigt die wichtigsten Kennzahlen zusammengefasst an, ohne dass du durch verschiedene Bereiche navigieren musst.',
          },
          {
            heading: 'Anzeigebereiche',
            list: [
              'Episoden gesamt — Gesamtanzahl aller angelegten Episoden unabhängig vom Status',
              'Aktive Episoden — Episoden in Bearbeitung (Entwurf, Aufnahme, Produktion)',
              'Veröffentlichte Episoden — bereits live gegangene Folgen',
              'Offene Ideen — Ideen im Redaktions-Hub mit Status "Neu" oder "Bewertet"',
              'Aktive Sponsoren — Sponsoren mit laufenden Werbe-Platzierungen',
              'Medien-Assets — Anzahl der hochgeladenen Dateien in der Media Library',
            ],
          },
          {
            heading: 'Letzte Aktivitäten',
            text: 'Im unteren Bereich des Dashboards werden die zuletzt bearbeiteten Episoden und neu angelegten Ideen angezeigt. Ein Klick auf einen Eintrag öffnet den jeweiligen Bereich direkt.',
          },
          {
            tip: 'Das Dashboard aktualisiert sich automatisch beim Laden der Seite. Für aktuelle Zahlen einfach die Seite neu laden (F5).',
          },
        ],
      },
      {
        id: 'navigation',
        title: 'Navigation & Sidebar',
        summary: 'Aufbau der Seitenleiste und Zugriff auf alle Bereiche.',
        icon: <ArrowRight size={18} />,
        tags: ['navigation', 'sidebar', 'menü', 'benutzer'],
        content: [
          {
            text: 'Die Seitenleiste auf der linken Seite ist die zentrale Navigation von PodCore. Sie ist in thematische Gruppen unterteilt und zeigt nur die Bereiche an, für die der angemeldete Benutzer eine Berechtigung hat.',
          },
          {
            heading: 'Sidebar ein-/ausklappen',
            text: 'Mit dem Pfeil-Button oben rechts an der Sidebar kann diese auf eine schmale Icon-Leiste reduziert werden, um mehr Platz für den Inhalt zu gewinnen. Beim Hovern über ein Icon wird der vollständige Name als Tooltip angezeigt.',
          },
          {
            heading: 'Benutzerbereich',
            text: 'Am unteren Ende der Sidebar befinden sich der Avatar mit dem Anzeigenamen, die Abmelden-Schaltfläche sowie der Link zum Impressum und zum Wiki.',
          },
          {
            heading: 'Berechtigungen',
            text: 'Nicht alle Navigationspunkte sind für jeden Benutzer sichtbar. Welche Bereiche angezeigt werden, hängt von der zugewiesenen Rolle und den individuellen Berechtigungen ab. Administratoren sehen alle Bereiche.',
          },
        ],
      },
    ],
  },
  {
    id: 'episodes',
    label: 'Episoden',
    icon: <Mic2 size={16} />,
    color: 'text-accent-purple',
    articles: [
      {
        id: 'episodes-overview',
        title: 'Episoden-Übersicht',
        summary: 'Alle Episoden auf einen Blick — filtern, suchen und neue Folgen anlegen.',
        icon: <Mic2 size={18} />,
        tags: ['episoden', 'liste', 'filter', 'erstellen', 'status'],
        content: [
          {
            text: 'Die Episoden-Übersicht zeigt alle angelegten Podcast-Folgen in einer Listenansicht. Jede Episode wird als Karte mit Titel, Nummer, Status, Datum und einer kurzen Beschreibung dargestellt.',
          },
          {
            heading: 'Episode erstellen',
            text: 'Über den Button "Neue Episode" oben rechts öffnet sich ein Modal. Dort werden Titel, Episodennummer, Status und eine optionale Kurzbeschreibung eingegeben. Nach dem Erstellen wird die Episode sofort in der Liste angezeigt und kann im Editor weiter bearbeitet werden.',
          },
          {
            heading: 'Filtern & Suchen',
            list: [
              'Suchfeld — Volltextsuche über Titel und Beschreibung',
              'Status-Filter — zeigt nur Episoden eines bestimmten Status',
            ],
          },
          {
            heading: 'Status-Workflow',
            table: {
              headers: ['Status', 'Bedeutung'],
              rows: [
                ['Idee', 'Erste Konzeptphase, noch nicht in Produktion'],
                ['Entwurf', 'Gliederung und Inhalte werden erarbeitet'],
                ['Aufnahme', 'Aufnahme ist geplant oder läuft'],
                ['Produktion', 'Schnitt, Bearbeitung und Mastering'],
                ['Geplant', 'Fertig produziert, Veröffentlichungsdatum gesetzt'],
                ['Veröffentlicht', 'Live auf der Podcast-Plattform'],
                ['Archiviert', 'Nicht mehr aktiv, aber archiviert'],
              ],
            },
          },
        ],
      },
      {
        id: 'episode-editor',
        title: 'Episoden-Editor',
        summary: 'Der zentrale Arbeitsbereich für eine einzelne Episode — Script, Metadaten, Produktion und Technik.',
        icon: <PenTool size={18} />,
        tags: ['editor', 'script', 'blöcke', 'shownotes', 'kapitelmarken', 'pdf', 'produktion'],
        content: [
          {
            text: 'Der Episoden-Editor ist der Hauptarbeitsbereich für eine einzelne Folge. Er ist in vier Tabs unterteilt, die verschiedene Aspekte der Episodenproduktion abdecken.',
          },
          {
            heading: 'Tab 1: Script & Blöcke',
            text: 'Hier wird das Script der Episode in strukturierten Blöcken aufgebaut. Jeder Block repräsentiert einen Abschnitt der Sendung.',
          },
          {
            heading: 'Verfügbare Block-Typen',
            table: {
              headers: ['Block-Typ', 'Verwendung'],
              rows: [
                ['Intro', 'Begrüßung und Einstieg in die Episode'],
                ['Segment', 'Inhaltlicher Abschnitt mit eigenem Thema'],
                ['Interview', 'Gesprächsabschnitt mit einem Gast'],
                ['Werbung', 'Werbeblock / Sponsoren-Einblendung'],
                ['Jingle', 'Musikalische Überleitung'],
                ['Outro', 'Verabschiedung und Abschluss'],
                ['Benutzerdefiniert', 'Freier Block für individuelle Inhalte'],
              ],
            },
          },
          {
            heading: 'Textformatierung im Block',
            text: 'Jeder Block verfügt über einen Rich-Text-Editor mit einer Formatierungs-Toolbar. Verfügbare Formatierungen: Fett (Strg+B), Kursiv (Strg+I), Unterstrichen (Strg+U), Überschrift 1 & 2, Zitat, Code-Block, Aufzählung, nummerierte Liste sowie Ausrichtung (links, zentriert, rechts).',
          },
          {
            heading: 'Tab 2: Metadaten & Shownotes',
            list: [
              'Titel und Episodennummer',
              'Beschreibung / Shownotes (formatierbar)',
              'Kapitelmarken mit Zeitstempel und Titel',
              'Tags für die Kategorisierung',
              'Veröffentlichungsdatum',
              'Verknüpfte Ideen aus dem Redaktions-Hub',
            ],
          },
          {
            heading: 'Tab 3: Produktionsinfos',
            text: 'Dieser Tab ist für das Produktionsteam gedacht und enthält interne Hinweise, die nicht veröffentlicht werden. Hier können Aufnahmeanweisungen, Schnitthinweise, Sounddesign-Notizen und andere produktionsrelevante Informationen hinterlegt werden.',
          },
          {
            heading: 'Tab 4: Technische Daten',
            text: 'Speicherort der Audiodatei, verwendetes Equipment, Aufnahmeformat, Bitrate, Sample-Rate und weitere technische Spezifikationen können hier dokumentiert werden.',
          },
          {
            heading: 'PDF-Export',
            text: 'Über den Button "PDF Export" oben rechts oder "Als PDF exportieren" in der Seitenleiste wird ein vollständiges Dokument der Episode generiert. Das PDF enthält alle Script-Blöcke mit Formatierung, Metadaten, Kapitelmarken und Produktionsinfos.',
          },
          {
            tip: 'Änderungen werden nicht automatisch gespeichert. Regelmäßig auf "Speichern" klicken oder Strg+S verwenden. Ungespeicherte Änderungen werden durch einen orangefarbenen Punkt im Tab-Titel angezeigt.',
          },
        ],
      },
    ],
  },
  {
    id: 'editorial',
    label: 'Redaktions-Hub',
    icon: <Lightbulb size={16} />,
    color: 'text-accent-cyan',
    articles: [
      {
        id: 'editorial-overview',
        title: 'Redaktions-Hub — Übersicht',
        summary: 'Die Vorbereitungsphase vor der Episoden-Produktion — Ideen, Planung, Interviews und Notizen.',
        icon: <Lightbulb size={18} />,
        tags: ['redaktion', 'hub', 'vorbereitung', 'ideen', 'planung'],
        content: [
          {
            text: 'Der Redaktions-Hub ist die Vorbereitungsphase im Podcast-Workflow. Hier werden Ideen gesammelt, bewertet und geplant, bevor sie zu fertigen Episoden werden. Der Hub ist in vier Tabs unterteilt.',
          },
          {
            heading: 'Workflow: Von der Idee zur Episode',
            list: [
              '1. Idee im Ideen-Pool anlegen und beschreiben',
              '2. Idee bewerten und priorisieren',
              '3. Idee in den Redaktionsplan einplanen',
              '4. Interview-Partner und Fragen vorbereiten',
              '5. Notizen und Recherche-Ergebnisse sammeln',
              '6. Idee in eine Episode umwandeln (Button "Als Episode anlegen")',
            ],
          },
          {
            tip: 'Eine Idee kann direkt aus dem Ideen-Pool in eine Episode umgewandelt werden. Dabei werden Titel, Beschreibung und Tags automatisch übernommen.',
          },
        ],
      },
      {
        id: 'ideas',
        title: 'Ideen-Pool',
        summary: 'Ideen sammeln, bewerten und priorisieren.',
        icon: <Lightbulb size={18} />,
        tags: ['ideen', 'pool', 'sammeln', 'bewerten', 'priorität', 'tags'],
        content: [
          {
            text: 'Der Ideen-Pool ist der erste Schritt im Redaktionsprozess. Hier werden alle Themenideen für zukünftige Episoden gesammelt, unabhängig davon, ob sie bereits konkret ausgearbeitet sind.',
          },
          {
            heading: 'Idee anlegen',
            text: 'Über "Neue Idee" wird ein Formular geöffnet. Pflichtfeld ist nur der Titel. Optional können Beschreibung, Status, Priorität, Tags und eine Zuweisung an ein Teammitglied ergänzt werden.',
          },
          {
            heading: 'Status-Optionen',
            table: {
              headers: ['Status', 'Bedeutung'],
              rows: [
                ['Neu', 'Frisch eingetragen, noch nicht bewertet'],
                ['Bewertet', 'Idee wurde geprüft und für gut befunden'],
                ['Geplant', 'Konkrete Planung hat begonnen'],
                ['Umgesetzt', 'Idee wurde als Episode produziert'],
                ['Abgelehnt', 'Idee wird nicht weiterverfolgt'],
              ],
            },
          },
          {
            heading: 'Priorität',
            list: [
              'Hoch — dringlich, sollte bald umgesetzt werden',
              'Mittel — Standard-Priorität',
              'Niedrig — kann warten',
            ],
          },
          {
            heading: 'Tags',
            text: 'Tags helfen beim Kategorisieren und Filtern von Ideen. Sie können frei vergeben werden (z.B. "Interview", "Solo", "Technik", "Gesellschaft").',
          },
          {
            heading: 'Idee anpinnen',
            text: 'Wichtige Ideen können über das Pin-Symbol oben in der Karte angeheftet werden. Angepinnte Ideen erscheinen immer am Anfang der Liste.',
          },
        ],
      },
      {
        id: 'editorial-plan',
        title: 'Redaktionsplan',
        summary: 'Geplante Episoden in einem Kalender-ähnlichen Plan organisieren.',
        icon: <Calendar size={18} />,
        tags: ['redaktionsplan', 'planung', 'kalender', 'datum'],
        content: [
          {
            text: 'Der Redaktionsplan zeigt alle Episoden, die sich in Planung befinden, geordnet nach geplantem Veröffentlichungsdatum. Er gibt einen Überblick über den Produktionskalender.',
          },
          {
            heading: 'Einträge im Plan',
            text: 'Jeder Eintrag zeigt den Episodentitel, das geplante Datum, den aktuellen Status und die zugewiesene Person. Einträge können direkt aus dem Plan heraus bearbeitet werden.',
          },
          {
            tip: 'Episoden werden automatisch im Redaktionsplan angezeigt, sobald sie ein Veröffentlichungsdatum haben.',
          },
        ],
      },
      {
        id: 'interviews',
        title: 'Interview-Partner & Fragen',
        summary: 'Gäste verwalten, Fragen vorbereiten und Zusammenfassungen versenden.',
        icon: <Users size={18} />,
        tags: ['interview', 'gast', 'fragen', 'e-mail', 'versenden'],
        content: [
          {
            text: 'Im Interview-Bereich werden Gäste (Interview-Partner) angelegt und die vorbereiteten Fragen für das Gespräch verwaltet. Fragen können nach Kategorien strukturiert werden.',
          },
          {
            heading: 'Interview-Partner anlegen',
            text: 'Für jeden Gast werden Name, Unternehmen, Rolle/Position, E-Mail-Adresse und optionale Notizen hinterlegt. Die E-Mail-Adresse wird für den Versand der Fragenliste benötigt.',
          },
          {
            heading: 'Fragen verwalten',
            text: 'Fragen können einer Kategorie zugeordnet, mit Notizen versehen und in der Reihenfolge sortiert werden. Jede Frage kann einer bestimmten Episode zugeordnet werden.',
          },
          {
            heading: 'Zusammenfassung versenden',
            text: 'Über "Zusammenfassung anzeigen" wird eine druckbare HTML-Seite mit allen Fragen generiert. Diese kann kopiert oder als Vorlage für eine E-Mail verwendet werden.',
          },
          {
            heading: 'E-Mail direkt versenden',
            text: 'Wenn in den Einstellungen ein SMTP-Server konfiguriert ist, können die Interview-Fragen direkt per E-Mail an den Gast gesendet werden. Ohne SMTP-Konfiguration steht nur die Zusammenfassungs-Ansicht zur Verfügung.',
          },
          {
            tip: 'Die Zusammenfassungs-Seite öffnet sich in einem neuen Tab und kann direkt ausgedruckt oder als PDF gespeichert werden.',
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notizen',
        summary: 'Freie Notizen und Recherche-Ergebnisse für den Podcast.',
        icon: <FileText size={18} />,
        tags: ['notizen', 'recherche', 'freitext'],
        content: [
          {
            text: 'Der Notizen-Bereich ist ein freier Bereich für Recherche-Ergebnisse, Ideen-Skizzen, Links, Zitate und andere Informationen, die noch keiner konkreten Episode zugeordnet sind.',
          },
          {
            heading: 'Notiz anlegen',
            text: 'Notizen haben einen Titel und einen Freitext-Inhalt. Sie können mit Tags versehen und einer Episode zugeordnet werden.',
          },
        ],
      },
    ],
  },
  {
    id: 'media',
    label: 'Media Library',
    icon: <Library size={16} />,
    color: 'text-accent-blue',
    articles: [
      {
        id: 'media-library',
        title: 'Media Library',
        summary: 'Alle Mediendateien zentral verwalten — Audio, Bilder und Dokumente.',
        icon: <Library size={18} />,
        tags: ['media', 'dateien', 'audio', 'upload', 'player', 'kommentare'],
        content: [
          {
            text: 'Die Media Library ist das zentrale Archiv für alle Mediendateien des Podcasts. Hier werden Audiodateien, Bilder, Dokumente und andere Assets gespeichert und verwaltet.',
          },
          {
            heading: 'Dateien hochladen',
            text: 'Über den Upload-Button oder per Drag & Drop können Dateien hochgeladen werden. Unterstützte Formate: MP3, WAV, FLAC, AAC (Audio), JPG, PNG, WebP (Bilder), PDF, DOCX (Dokumente).',
          },
          {
            heading: 'Audio-Player',
            text: 'Audiodateien können direkt in der Media Library abgespielt werden. Der eingebaute Player unterstützt Play/Pause, Lautstärke und Zeitnavigation.',
          },
          {
            heading: 'Kommentare',
            text: 'Jede Datei kann mit Kommentaren versehen werden. Dies ist nützlich für Feedback zwischen Teammitgliedern (z.B. "Bitte ab 2:30 nochmal schneiden").',
          },
          {
            heading: 'Speicherort',
            text: 'Der Speicherort für Mediendateien kann in den Branding & Backup-Einstellungen konfiguriert werden: Lokal auf dem Server, WebDAV (Nextcloud, OneDrive) oder S3-kompatibel (AWS, MinIO, Backblaze).',
          },
          {
            tip: 'Große Audiodateien sollten vor dem Upload bereits in das finale Format konvertiert werden (MP3, 192 kbps oder höher für Podcast-Qualität).',
          },
        ],
      },
    ],
  },
  {
    id: 'sponsors',
    label: 'Sponsoring',
    icon: <Megaphone size={16} />,
    color: 'text-accent-orange',
    articles: [
      {
        id: 'sponsors-overview',
        title: 'Sponsoren-Verwaltung',
        summary: 'Sponsoren anlegen, Werbe-Slots definieren und Platzierungen verfolgen.',
        icon: <Megaphone size={18} />,
        tags: ['sponsoren', 'werbung', 'slots', 'platzierung', 'kategorien'],
        content: [
          {
            text: 'Das Sponsoring-Modul ermöglicht die vollständige Verwaltung von Werbekunden, Werbe-Slots und Platzierungen. Es deckt den gesamten Prozess von der Akquise bis zur Abrechnung ab.',
          },
          {
            heading: 'Sponsor anlegen',
            text: 'Über "Neuer Sponsor" werden Firmenname, Ansprechpartner, Kontaktdaten, Website und interne Notizen hinterlegt. Jedem Sponsor kann ein Status zugewiesen werden.',
          },
          {
            heading: 'Sponsor-Status',
            table: {
              headers: ['Status', 'Bedeutung'],
              rows: [
                ['Aktiv', 'Laufende Zusammenarbeit'],
                ['Inaktiv', 'Keine aktuelle Kampagne'],
                ['Interessent', 'In Verhandlung, noch kein Vertrag'],
                ['Archiviert', 'Ehemalige Zusammenarbeit'],
              ],
            },
          },
          {
            heading: 'Werbe-Kategorien',
            text: 'Werbe-Kategorien definieren die Art und den Typ einer Werbeplatzierung. Beispiele: "Pre-Roll 30s", "Mid-Roll 60s", "Sponsored Segment", "Host-Read Ad". Kategorien können frei erstellt und mit einem Preis versehen werden.',
          },
          {
            heading: 'Werbemittel-Lieferung',
            text: 'Bei jeder Platzierung wird festgehalten, wie das Werbemittel bereitgestellt wird:',
            list: [
              'Sponsor liefert selbst — der Sponsor stellt eine fertige Audiodatei bereit',
              'Wir produzieren — das Podcast-Team spricht die Werbung ein und produziert sie',
              'Beides — Sponsor liefert Skript, Team produziert',
            ],
          },
        ],
      },
      {
        id: 'placements',
        title: 'Werbe-Platzierungen',
        summary: 'Einzelne Werbeschaltungen pro Episode verfolgen und abrechnen.',
        icon: <Tag size={18} />,
        tags: ['platzierung', 'schaltung', 'episode', 'abrechnung', 'status'],
        content: [
          {
            text: 'Eine Platzierung verbindet einen Sponsor mit einer konkreten Episode und einem Werbe-Slot. Jede Platzierung durchläuft einen Status-Workflow von der Planung bis zur Abrechnung.',
          },
          {
            heading: 'Platzierungs-Status',
            table: {
              headers: ['Status', 'Bedeutung'],
              rows: [
                ['Geplant', 'Platzierung ist vereinbart, Episode noch nicht veröffentlicht'],
                ['Bestätigt', 'Sponsor hat bestätigt, Werbemittel liegt vor'],
                ['Ausgestrahlt', 'Episode mit Werbung wurde veröffentlicht'],
                ['Abgerechnet', 'Rechnung gestellt und bezahlt'],
                ['Storniert', 'Platzierung wurde abgesagt'],
              ],
            },
          },
          {
            heading: 'Platzierung anlegen',
            text: 'Im Sponsor-Detail-Bereich können neue Platzierungen angelegt werden. Es werden Episode, Werbe-Kategorie, Preis, Werbemittel-Status und ein optionaler Hinweistext angegeben.',
          },
          {
            tip: 'Platzierungen mit Status "Ausgestrahlt" werden automatisch in den Sponsor-Auswertungen berücksichtigt.',
          },
        ],
      },
      {
        id: 'sponsor-reports',
        title: 'Sponsor-Auswertungen',
        summary: 'Leistungsberichte für Sponsoren erstellen und exportieren.',
        icon: <BarChart3 size={18} />,
        tags: ['auswertung', 'bericht', 'export', 'statistik', 'kunde'],
        content: [
          {
            text: 'Die Sponsor-Auswertungen bieten einen Überblick über alle Werbeaktivitäten und ermöglichen die Erstellung von Kundenberichten.',
          },
          {
            heading: 'Übersichts-Statistiken',
            list: [
              'Gesamtumsatz über alle Sponsoren',
              'Anzahl aktiver Kampagnen',
              'Platzierungen nach Status',
              'Umsatz pro Sponsor (Ranking)',
              'Platzierungen pro Episode',
            ],
          },
          {
            heading: 'Kundenbericht exportieren',
            text: 'Für jeden Sponsor kann ein individueller Bericht als PDF exportiert werden. Der Bericht enthält alle Platzierungen, Ausstrahlungsdaten, Episodentitel und den Gesamtwert der Kampagne.',
          },
          {
            heading: 'Zeitraum-Filter',
            text: 'Die Auswertungen können auf einen bestimmten Zeitraum gefiltert werden, um z.B. Quartalsberichte zu erstellen.',
          },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Podcast-Statistiken',
    icon: <TrendingUp size={16} />,
    color: 'text-accent-green',
    articles: [
      {
        id: 'podigee',
        title: 'Podigee-Integration',
        summary: 'Podcast-Statistiken aus Podigee direkt in PodCore abrufen.',
        icon: <TrendingUp size={18} />,
        tags: ['podigee', 'statistiken', 'downloads', 'hörer', 'analytics'],
        content: [
          {
            text: 'PodCore kann Statistiken direkt von der Podcast-Hosting-Plattform Podigee abrufen. Dafür muss einmalig der Podigee API-Token in den Einstellungen hinterlegt werden.',
          },
          {
            heading: 'Podigee API-Token einrichten',
            list: [
              '1. In Podigee einloggen und zu Einstellungen → API navigieren',
              '2. Einen neuen API-Token erstellen (Leserechte für Statistiken)',
              '3. Token kopieren',
              '4. In PodCore unter Einstellungen → Podigee einfügen',
              '5. Podcast-Subdomain eingeben (z.B. "meinpodcast" für meinpodcast.podigee.io)',
            ],
          },
          {
            heading: 'Verfügbare Statistiken',
            list: [
              'Gesamt-Downloads im gewählten Zeitraum',
              'Downloads pro Episode (Top-Episoden)',
              'Hörer nach Gerät/Client (Apple Podcasts, Spotify, etc.)',
              'Geografische Verteilung der Hörer',
              'Download-Verlauf über Zeit',
            ],
          },
          {
            heading: 'Zeitraum-Filter',
            text: 'Die Statistiken können für verschiedene Zeiträume abgerufen werden: letzte 7 Tage, 30 Tage, 90 Tage oder ein benutzerdefinierter Zeitraum.',
          },
          {
            warning: 'Die Podigee-API hat Rate-Limits. Bei sehr häufigem Abrufen kann es zu temporären Fehlern kommen. Die Daten werden nicht gecacht — jeder Seitenaufruf ruft neue Daten ab.',
          },
        ],
      },
    ],
  },
  {
    id: 'branding',
    label: 'Branding & Backup',
    icon: <Image size={16} />,
    color: 'text-accent-pink',
    articles: [
      {
        id: 'branding',
        title: 'Branding-Einstellungen',
        summary: 'Logo und Podcast-Cover hochladen und verwalten.',
        icon: <Image size={18} />,
        tags: ['branding', 'logo', 'cover', 'bild', 'upload'],
        content: [
          {
            text: 'Im Branding-Bereich können das Podcast-Logo und das Podcast-Cover hochgeladen und verwaltet werden. Diese Assets stehen dann in der gesamten Anwendung zur Verfügung.',
          },
          {
            heading: 'Logo hochladen',
            text: 'Das Logo wird in der Anwendung und in PDF-Exporten verwendet. Empfohlenes Format: PNG mit transparentem Hintergrund, mindestens 400×400 Pixel.',
          },
          {
            heading: 'Podcast-Cover',
            text: 'Das Cover-Bild entspricht dem Artwork des Podcasts auf den Plattformen. Empfohlenes Format: JPG oder PNG, 3000×3000 Pixel (Podcast-Standard), mindestens 1400×1400 Pixel.',
          },
        ],
      },
      {
        id: 'storage',
        title: 'Speicher-Konfiguration',
        summary: 'Mediendateien lokal, auf einem WebDAV-Server oder in der Cloud speichern.',
        icon: <Database size={18} />,
        tags: ['speicher', 'storage', 'lokal', 'webdav', 's3', 'cloud', 'nextcloud'],
        content: [
          {
            text: 'PodCore unterstützt drei verschiedene Speicher-Backends für Mediendateien. Die Konfiguration erfolgt im Branding & Backup-Bereich.',
          },
          {
            heading: 'Lokal (Standard)',
            text: 'Dateien werden auf dem Server gespeichert, auf dem PodCore läuft. Der Speicherpfad ist standardmäßig ~/.podcore/uploads/ und kann angepasst werden. Diese Option erfordert keine weitere Konfiguration.',
          },
          {
            heading: 'WebDAV',
            text: 'Kompatibel mit Nextcloud, ownCloud, OneDrive (Business) und anderen WebDAV-Servern. Benötigt: Server-URL, Benutzername und Passwort.',
          },
          {
            heading: 'S3-kompatibel',
            text: 'Kompatibel mit Amazon S3, Backblaze B2, MinIO und anderen S3-kompatiblen Diensten. Benötigt: Endpoint-URL, Access Key, Secret Key und Bucket-Name.',
          },
          {
            warning: 'Nach einer Änderung des Speicher-Backends werden bereits hochgeladene Dateien nicht automatisch migriert. Bestehende Dateien müssen manuell übertragen werden.',
          },
        ],
      },
      {
        id: 'backup',
        title: 'Backup & Export',
        summary: 'Episoden und Ideen sichern und wiederherstellen.',
        icon: <Download size={18} />,
        tags: ['backup', 'export', 'import', 'sicherung', 'wiederherstellen'],
        content: [
          {
            text: 'PodCore bietet integrierte Backup-Funktionen für alle wichtigen Daten. Backups werden als JSON-Dateien exportiert und können jederzeit wieder importiert werden.',
          },
          {
            heading: 'Was wird gesichert?',
            list: [
              'Episoden — alle Episoden mit Script-Blöcken, Metadaten und Kapitelmarken',
              'Ideen — alle Einträge aus dem Ideen-Pool mit Tags und Notizen',
              'Vollständige Datenbank — alle Daten als SQLite-Export',
            ],
          },
          {
            heading: 'Backup erstellen',
            text: 'Im Branding & Backup-Bereich gibt es separate Export-Buttons für Episoden, Ideen und die vollständige Datenbank. Der Export erfolgt als JSON-Datei (Episoden/Ideen) oder als .db-Datei (Datenbank).',
          },
          {
            heading: 'Backup wiederherstellen',
            text: 'JSON-Backups können über den Import-Button wieder eingespielt werden. Dabei wird geprüft, ob bereits Einträge mit gleicher ID existieren — diese werden übersprungen, um Duplikate zu vermeiden.',
          },
          {
            tip: 'Es empfiehlt sich, vor größeren Änderungen oder Updates immer ein vollständiges Datenbank-Backup zu erstellen.',
          },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: <Shield size={16} />,
    color: 'text-accent-red',
    articles: [
      {
        id: 'users',
        title: 'Benutzerverwaltung',
        summary: 'Benutzer anlegen, bearbeiten und Rollen zuweisen.',
        icon: <Users size={18} />,
        tags: ['benutzer', 'user', 'anlegen', 'rollen', 'passwort'],
        content: [
          {
            text: 'Im Admin-Bereich können Benutzerkonten für alle Teammitglieder verwaltet werden. Nur Administratoren haben Zugriff auf diesen Bereich.',
          },
          {
            heading: 'Benutzer anlegen',
            text: 'Über "Neuer Benutzer" werden Benutzername, Anzeigename, E-Mail, Passwort und Rolle festgelegt. Der Benutzername muss eindeutig sein und wird für den Login verwendet.',
          },
          {
            heading: 'Rollen',
            table: {
              headers: ['Rolle', 'Beschreibung'],
              rows: [
                ['Administrator', 'Vollzugriff auf alle Bereiche und Einstellungen'],
                ['Produktion', 'Zugriff auf Episoden, Media Library und Sponsoring'],
                ['Redakteur', 'Zugriff auf Redaktions-Hub und Episoden (kein Admin)'],
                ['Moderator', 'Lesezugriff auf die meisten Bereiche'],
                ['Leser', 'Nur Lesezugriff auf Episoden und Dashboard'],
              ],
            },
          },
          {
            heading: 'Individuelle Berechtigungen',
            text: 'Zusätzlich zur Rolle können für jeden Benutzer individuelle Berechtigungen gesetzt werden. Diese überschreiben die Standard-Berechtigungen der Rolle.',
          },
          {
            warning: 'Das Passwort des Standard-Admin-Benutzers (admin/admin123) sollte nach der ersten Anmeldung sofort geändert werden.',
          },
        ],
      },
      {
        id: 'roles',
        title: 'Rollen-Management',
        summary: 'Standard-Berechtigungen für Rollen definieren und anpassen.',
        icon: <Lock size={18} />,
        tags: ['rollen', 'berechtigungen', 'rechte', 'konfiguration'],
        content: [
          {
            text: 'Im Rollen-Tab des Admin-Bereichs können die Standard-Berechtigungen für jede Rolle definiert werden. Änderungen an einer Rolle wirken sich auf alle Benutzer aus, die diese Rolle haben.',
          },
          {
            heading: 'Berechtigungs-Gruppen',
            list: [
              'Episoden — Ansehen, Erstellen, Bearbeiten, Löschen, Veröffentlichen',
              'Redaktions-Hub — Ideen, Interviews, Notizen ansehen und bearbeiten',
              'Media Library — Dateien ansehen, hochladen, löschen',
              'Sponsoring — Sponsoren, Platzierungen, Berichte verwalten',
              'Administration — Benutzer, Einstellungen, Logs verwalten',
            ],
          },
          {
            heading: 'Eigene Rollen erstellen',
            text: 'Über "Neue Rolle" können benutzerdefinierte Rollen mit individuellen Berechtigungen erstellt werden. Diese können dann Benutzern zugewiesen werden.',
          },
          {
            tip: 'System-Rollen (Administrator, Produktion, Redakteur, Moderator, Leser) können bearbeitet, aber nicht gelöscht werden.',
          },
        ],
      },
      {
        id: 'logs',
        title: 'System-Logs',
        summary: 'Systemereignisse und Fehler überwachen.',
        icon: <AlertCircle size={18} />,
        tags: ['logs', 'fehler', 'ereignisse', 'monitoring'],
        content: [
          {
            text: 'Der Logs-Tab im Admin-Bereich zeigt alle Systemereignisse und Fehler an. Logs werden automatisch erstellt, wenn bestimmte Ereignisse in der Anwendung auftreten.',
          },
          {
            heading: 'Log-Level',
            table: {
              headers: ['Level', 'Farbe', 'Bedeutung'],
              rows: [
                ['INFO', 'Blau', 'Normale Systemereignisse (Login, Speichern, etc.)'],
                ['WARN', 'Orange', 'Warnungen, die keine sofortige Aktion erfordern'],
                ['ERROR', 'Rot', 'Fehler, die untersucht werden sollten'],
              ],
            },
          },
          {
            heading: 'Test-Log erstellen',
            text: 'Über den Button "Test-Log erstellen" kann manuell ein Info-Log-Eintrag erstellt werden, um die Funktion zu testen.',
          },
          {
            tip: 'Bei einer frischen Installation sind noch keine Logs vorhanden. Logs werden erst nach Benutzeraktionen erstellt.',
          },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Einstellungen',
    icon: <Settings size={16} />,
    color: 'text-text-secondary',
    articles: [
      {
        id: 'settings-profile',
        title: 'Profil-Einstellungen',
        summary: 'Eigenes Profil, Passwort und Avatar-Farbe anpassen.',
        icon: <UserCheck size={18} />,
        tags: ['profil', 'passwort', 'avatar', 'farbe', 'anzeigename'],
        content: [
          {
            text: 'Im Einstellungen-Bereich kann jeder Benutzer sein eigenes Profil anpassen. Diese Einstellungen betreffen nur den eigenen Account.',
          },
          {
            heading: 'Anzeigename',
            text: 'Der Anzeigename wird in der Sidebar, im Dashboard und in Aktivitäts-Protokollen angezeigt. Er kann jederzeit geändert werden.',
          },
          {
            heading: 'Avatar-Farbe',
            text: 'Da PodCore keine Profilbilder verwendet, kann stattdessen eine Farbe für den Avatar-Kreis gewählt werden. Die Initialen des Anzeigenamens werden in dieser Farbe dargestellt.',
          },
          {
            heading: 'Passwort ändern',
            text: 'Das aktuelle Passwort muss zur Bestätigung eingegeben werden, bevor ein neues gesetzt werden kann. Das neue Passwort muss mindestens 8 Zeichen lang sein.',
          },
        ],
      },
      {
        id: 'settings-app',
        title: 'Anwendungs-Einstellungen',
        summary: 'Podcast-Name, Podigee-Token und weitere globale Einstellungen.',
        icon: <Settings size={18} />,
        tags: ['einstellungen', 'podcast-name', 'podigee', 'smtp', 'konfiguration'],
        content: [
          {
            text: 'Die Anwendungs-Einstellungen betreffen die gesamte PodCore-Installation und sind nur für Administratoren zugänglich.',
          },
          {
            heading: 'Podcast-Grunddaten',
            list: [
              'Podcast-Name — wird in der Anwendung und in Exporten angezeigt',
              'Podcast-Beschreibung — kurze Beschreibung des Podcasts',
              'Podcast-Website — URL der Podcast-Website',
            ],
          },
          {
            heading: 'Podigee-Konfiguration',
            text: 'API-Token und Podcast-Subdomain für die Podigee-Integration. Der Token wird sicher in der Datenbank gespeichert.',
          },
          {
            heading: 'SMTP-Konfiguration',
            text: 'Für den E-Mail-Versand (Interview-Fragen an Gäste) muss ein SMTP-Server konfiguriert werden. Benötigt: Host, Port, Benutzername, Passwort und Absender-Adresse.',
          },
        ],
      },
    ],
  },
  {
    id: 'changelog',
    label: 'Versionshistorie',
    icon: <Package size={16} />,
    color: 'text-accent-green',
    articles: [
      {
        id: 'v2-1-2',
        title: 'v2.1.2 — Bugfix: Branding-Route & vollständiger App-Test',
        summary: 'Branding & Backup Seite war durch einen Route-Konflikt nicht erreichbar. Vollständiger systematischer App-Test durchgeführt.',
        icon: <Package size={18} />,
        tags: ['update', 'bugfix', 'branding', 'route', 'test'],
        content: [
          {
            heading: 'Bug-Fixes',
            list: [
              'Branding & Backup Seite: Route-Konflikt behoben — /branding war durch statische Asset-Route blockiert',
              'Trailing-Slash-Problem: /branding/ gab 404-Fehler zurück, jetzt korrekt zur React-App weitergeleitet',
              'Branding-Assets werden jetzt über /branding-assets (intern) ausgeliefert, ohne Konflikt mit der App-Navigation',
            ],
          },
          {
            heading: 'Getestete Funktionen (v2.1.2)',
            list: [
              'Dashboard: Alle Widgets, Redaktionsplan-Monatsübersicht, Schnellzugriff',
              'Ideen-Arbeitsmappe: Alle 6 Tabs (Übersicht, Recherche, Interview, Notizen, Checkliste, Episode erstellen)',
              'Recherche-Tab: Quellen mit URL, Typ, Beschreibung und Notizen hinzufügen',
              'Interview-Tab: Partner und Fragen anlegen',
              'Notizen-Tab: Notizen erstellen und speichern',
              'Checkliste-Tab: Aufgaben per Enter-Taste hinzufügen',
              'Media Library: Assets werden korrekt angezeigt',
              'Sponsoring: Sponsor erstellen, Sponsor-Detail-Seite',
              'Administration: Benutzerverwaltung, Rollen',
              'Einstellungen: PDF CI-Farben, Freigabe-Workflow',
              'Wiki: Versionshistorie vollständig',
            ],
          },
          {
            tip: 'Die Branding & Backup Seite ist jetzt wieder vollständig erreichbar. Alle Podcast-Logo und Cover-Upload-Funktionen funktionieren korrekt.',
          },
        ],
      },
      {
        id: 'v2-1-0',
        title: 'v2.1.1 — Ideen-Arbeitsmappe & Deployment-Fix',
        summary: 'Ideen sind jetzt vollständige Episoden-Vorbereitungsmappen mit Recherche, Uploads, Interview, Notizen, Checklisten und Episode-Erstellung. Deployment-Bug behoben.',
        icon: <Package size={18} />,
        tags: ['update', 'ideen', 'recherche', 'interview', 'checkliste', 'episode', 'deployment'],
        content: [
          {
            heading: 'Neue Features',
            list: [
              'Ideen-Arbeitsmappe: Jede Idee hat eine eigene Detail-Seite mit 6 Tabs',
              'Tab Übersicht: Titel, Beschreibung, Status, Priorität, Tags und verknüpfte Episode',
              'Tab Recherche: Recherche-Quellen mit Links, Typ (Web, Buch, Video, etc.) und Notizen',
              'Tab Uploads: Dateien direkt zur Idee hochladen (PDF, Bilder, Audio, etc.)',
              'Tab Interview: Interview-Partner und Fragen direkt in der Idee verwalten',
              'Tab Notizen: Ideen-spezifische Notizen unabhängig von globalen Notizen',
              'Tab Checkliste: Aufgaben anlegen und abhaken (z.B. Recherche, Kontakt, Skript)',
              'Episode erstellen: Alle gesammelten Infos werden in eine neue Episode übertragen',
              'Ideenpool: Auge-Icon öffnet die Detailansicht einer Idee direkt',
            ],
          },
          {
            heading: 'Bug-Fixes',
            list: [
              'Deployment-Fix: index.html wurde nicht korrekt aktualisiert (alter Bundle wurde geladen)',
              'Assets: Asset-Anzeige nach Upload funktioniert jetzt korrekt',
              'Notizen: Notizen werden korrekt gespeichert und geladen',
            ],
          },
          {
            tip: 'Öffne eine Idee im Ideenpool über das Auge-Icon um die vollständige Arbeitsmappe zu nutzen. Am Ende kannst du direkt eine Episode aus allen gesammelten Infos erstellen.',
          },
        ],
      },
      {
        id: 'v2-0-9',
        title: 'v2.0.9 — Notizen-Fix, Redaktionsplan-Dashboard, Cover-Sidebar',
        summary: 'Notizen-Bug behoben, Redaktionsplan-Monatsübersicht im Dashboard, Podcast-Cover in der Seitenleiste.',
        icon: <Package size={18} />,
        tags: ['update', 'notizen', 'dashboard', 'redaktionsplan', 'cover', 'sidebar'],
        content: [
          {
            heading: 'Neue Features',
            list: [
              'Dashboard: Redaktionsplan-Monatsübersicht mit Navigation (Vorwärts/Rückwärts) direkt im Dashboard',
              'Dashboard: Redaktionsplan-Einträge mit Datum, Titel, Zuständigem und Status-Badge',
              'Seitenleiste: Podcast-Cover wird oben links angezeigt (statt Logo); Logo als Fallback wenn kein Cover vorhanden',
            ],
          },
          {
            heading: 'Bug-Fixes',
            list: [
              'Notizen: Notizen werden jetzt korrekt gespeichert und angezeigt (Build-Cache-Problem behoben)',
              'Versions-Anzeige: Auto-Reload-Mechanismus verbessert — App lädt automatisch neu wenn ein neuer Build verfügbar ist',
            ],
          },
          {
            tip: 'Das Podcast-Cover kann unter Branding & Backup hochgeladen werden. Es erscheint dann automatisch oben links in der Seitenleiste.',
          },
        ],
      },
      {
        id: 'v2-0-8',
        title: 'v2.0.8 — Freigabe-Workflows & Abrechnung',
        summary: 'Interview-Fragen-Freigabe, Episoden-Freigabe-Workflow, PDF CI-Farben, Sponsoring-Abrechnung und Rollen-Bug-Fix.',
        icon: <Package size={18} />,
        tags: ['update', 'freigabe', 'sponsoring', 'abrechnung', 'rollen', 'ci-farben'],
        content: [
          {
            heading: 'Neue Features',
            list: [
              'Interview-Fragen: Fragen können jetzt bearbeitet werden (Edit-Funktion)',
              'Interview-Fragen: Freigabe-Workflow — Moderator kann Fragen freigeben/zurückziehen',
              'Interview-Fragen: Personalisierter Begleittext pro Gast (Gast-Intro)',
              'Interview-Fragen: Begleittext wird beim E-Mail-Versand vorausgefüllt',
              'Episoden-Freigabe: Optionaler Freigabe-Workflow für Episoden (Admin-Einstellung)',
              'Episoden-Freigabe: Freigabe durch Benutzer mit Berechtigung canApproveEpisodes',
              'Episoden-Freigabe: Freigabe-Status-Badge und Freigabe-Karte in der Episode-Detailseite',
              'Sponsoring-Abrechnung: Preise und Rechnungsstatus für gebuchte Positionen',
              'Sponsoring-Abrechnung: Abrechnungs-Tab pro Sponsor mit Gesamtübersicht',
              'Sponsoring-Abrechnung: PDF-Rechnungsexport pro Sponsor',
              'PDF CI-Farben: Admin kann Primär- und Akzentfarbe für PDF-Exporte einstellen',
              'Workflow-Einstellungen: Freigabe-Workflow kann in den Einstellungen aktiviert/deaktiviert werden',
            ],
          },
          {
            heading: 'Bug-Fixes',
            list: [
              'Rollen-Bug: Beim Ändern der Benutzerrolle werden jetzt automatisch die Standard-Berechtigungen der neuen Rolle gesetzt',
              'Versions-Anzeige: App zeigt jetzt immer die korrekte Version an (Auto-Reload bei veralteten Bundles)',
              'Login-Seite: Versionsnummer wird jetzt dynamisch aus dem Build eingelesen',
            ],
          },
          {
            heading: 'Neue Berechtigungen',
            list: [
              'canApproveEpisodes — Episoden freigeben (Standard: Moderator, Admin)',
              'canRequestApproval — Freigabe anfordern (Standard: Redakteur, Moderator, Admin)',
              'canApproveInterviewQuestions — Interview-Fragen freigeben (Standard: Moderator, Admin)',
            ],
          },
          {
            tip: 'Der Freigabe-Workflow für Episoden ist optional und kann in Einstellungen → Workflow deaktiviert werden. Wenn deaktiviert, können Episoden ohne Freigabe veröffentlicht werden.',
          },
        ],
      },
      {
        id: 'v2-0-6',
        title: 'v2.0.6 — Vorherige Version',
        summary: 'Stabilitätsverbesserungen und kleinere Anpassungen.',
        icon: <Package size={18} />,
        tags: ['update', 'v2.0.6'],
        content: [
          {
            text: 'Version 2.0.6 enthielt Stabilitätsverbesserungen, Performance-Optimierungen und kleinere UI-Anpassungen.',
          },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function ArticleContent({ sections }: { sections: WikiSection[] }) {
  return (
    <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
      {sections.map((section, idx) => (
        <div key={idx}>
          {section.heading && (
            <h3 className="font-semibold text-text-primary mt-5 mb-2 first:mt-0">{section.heading}</h3>
          )}
          {section.text && <p>{section.text}</p>}
          {section.list && (
            <ul className="space-y-1 mt-2">
              {section.list.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight size={14} className="text-accent-purple flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {section.table && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-surface-border">
                    {section.table.headers.map((h, i) => (
                      <th key={i} className="text-left py-2 px-3 text-text-muted font-medium uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-surface-border/50 hover:bg-obsidian-700/30">
                      {row.map((cell, ci) => (
                        <td key={ci} className={`py-2 px-3 ${ci === 0 ? 'font-medium text-text-primary' : ''}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {section.tip && (
            <div className="flex items-start gap-2 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-lg mt-2">
              <Info size={14} className="text-accent-blue flex-shrink-0 mt-0.5" />
              <p className="text-accent-blue/90">{section.tip}</p>
            </div>
          )}
          {section.warning && (
            <div className="flex items-start gap-2 p-3 bg-accent-orange/10 border border-accent-orange/20 rounded-lg mt-2">
              <AlertCircle size={14} className="text-accent-orange flex-shrink-0 mt-0.5" />
              <p className="text-accent-orange/90">{section.warning}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function WikiPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<WikiArticle | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['overview', 'episodes']));

  // Flatten all articles for search
  const allArticles = useMemo(() =>
    wikiData.flatMap(cat => cat.articles.map(a => ({ ...a, categoryId: cat.id, categoryLabel: cat.label }))),
    []
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q)) ||
      a.content.some(s =>
        (s.text || '').toLowerCase().includes(q) ||
        (s.heading || '').toLowerCase().includes(q) ||
        (s.list || []).some(l => l.toLowerCase().includes(q))
      )
    );
  }, [search, allArticles]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openArticle = (article: WikiArticle, categoryId?: string) => {
    setActiveArticle(article);
    if (categoryId) setActiveCategory(categoryId);
    setSearch('');
  };

  return (
    <div className="flex gap-6 h-full animate-fade-in" style={{ minHeight: 'calc(100vh - 6rem)' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 space-y-2">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Wiki durchsuchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-8 text-sm w-full"
          />
        </div>

        {/* Search results */}
        {search.trim() && (
          <div className="card space-y-1 mb-4">
            <p className="text-xs text-text-muted mb-2">{searchResults.length} Ergebnisse</p>
            {searchResults.length === 0 ? (
              <p className="text-text-muted text-xs">Keine Treffer gefunden.</p>
            ) : (
              searchResults.map(a => (
                <button
                  key={a.id}
                  onClick={() => openArticle(a, a.categoryId)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-obsidian-700 transition-colors"
                >
                  <p className="text-text-primary text-xs font-medium">{a.title}</p>
                  <p className="text-text-muted text-xs truncate">{a.categoryLabel}</p>
                </button>
              ))
            )}
          </div>
        )}

        {/* Category tree */}
        {!search.trim() && wikiData.map(cat => (
          <div key={cat.id} className="card p-0 overflow-hidden">
            <button
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-obsidian-700/50 transition-colors"
            >
              <span className={`flex items-center gap-2 text-sm font-medium ${cat.color}`}>
                {cat.icon}
                {cat.label}
              </span>
              {expandedCategories.has(cat.id)
                ? <ChevronDown size={14} className="text-text-muted" />
                : <ChevronRight size={14} className="text-text-muted" />
              }
            </button>
            {expandedCategories.has(cat.id) && (
              <div className="border-t border-surface-border">
                {cat.articles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => openArticle(article, cat.id)}
                    className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2 ${
                      activeArticle?.id === article.id
                        ? 'bg-accent-purple/10 text-accent-purple'
                        : 'text-text-secondary hover:bg-obsidian-700/50 hover:text-text-primary'
                    }`}
                  >
                    <span className="flex-shrink-0 opacity-60">{article.icon}</span>
                    {article.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        {!activeArticle ? (
          /* Welcome screen */
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center">
                  <BookOpen size={20} className="text-accent-purple" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary">PodCore Wiki</h1>
                  <p className="text-text-muted text-sm">Dokumentation und Hilfe für alle Bereiche</p>
                </div>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                Willkommen im PodCore Wiki. Hier findest du Erklärungen zu allen Funktionen und Bereichen der Anwendung.
                Wähle links eine Kategorie und einen Artikel aus, oder nutze die Suche um schnell eine Antwort zu finden.
              </p>
            </div>

            {/* Quick access grid */}
            <div className="grid grid-cols-2 gap-3">
              {wikiData.map(cat => (
                <div key={cat.id} className="card hover:border-accent-purple/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setExpandedCategories(prev => new Set([...prev, cat.id]));
                    openArticle(cat.articles[0], cat.id);
                  }}
                >
                  <div className={`flex items-center gap-2 mb-2 ${cat.color}`}>
                    {cat.icon}
                    <span className="font-semibold text-sm">{cat.label}</span>
                  </div>
                  <p className="text-text-muted text-xs">{cat.articles.length} Artikel</p>
                  <div className="mt-2 space-y-0.5">
                    {cat.articles.slice(0, 3).map(a => (
                      <p key={a.id} className="text-text-secondary text-xs truncate">· {a.title}</p>
                    ))}
                    {cat.articles.length > 3 && (
                      <p className="text-text-muted text-xs">· +{cat.articles.length - 3} weitere</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Article view */
          <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <button onClick={() => setActiveArticle(null)} className="hover:text-text-primary transition-colors">
                Wiki
              </button>
              <ChevronRight size={12} />
              <span className="text-text-secondary">
                {wikiData.find(c => c.id === activeCategory)?.label}
              </span>
              <ChevronRight size={12} />
              <span className="text-text-primary">{activeArticle.title}</span>
            </div>

            {/* Article header */}
            <div className="card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center flex-shrink-0 text-accent-purple">
                  {activeArticle.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-text-primary">{activeArticle.title}</h1>
                  <p className="text-text-secondary text-sm mt-1">{activeArticle.summary}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {activeArticle.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-obsidian-700 text-text-muted text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Article content */}
            <div className="card">
              <ArticleContent sections={activeArticle.content} />
            </div>

            {/* Related articles */}
            {(() => {
              const cat = wikiData.find(c => c.id === activeCategory);
              const related = cat?.articles.filter(a => a.id !== activeArticle.id) || [];
              if (related.length === 0) return null;
              return (
                <div className="card">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Weitere Artikel in dieser Kategorie</h3>
                  <div className="space-y-2">
                    {related.map(a => (
                      <button
                        key={a.id}
                        onClick={() => openArticle(a, activeCategory!)}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-obsidian-700/50 transition-colors group"
                      >
                        <span className="text-text-muted group-hover:text-accent-purple transition-colors">{a.icon}</span>
                        <div>
                          <p className="text-text-secondary text-sm group-hover:text-text-primary transition-colors">{a.title}</p>
                          <p className="text-text-muted text-xs">{a.summary}</p>
                        </div>
                        <ChevronRight size={14} className="text-text-muted ml-auto flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
