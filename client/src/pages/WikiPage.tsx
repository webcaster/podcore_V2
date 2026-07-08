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
            heading: 'Werbe-Kategorien & Preismodell',
            text: 'Werbe-Kategorien definieren die Art und den Typ einer Werbeplatzierung. Jede Kategorie unterstützt drei Preistypen:',
            table: {
              headers: ['Preistyp', 'Beschreibung', 'Verwendung'],
              rows: [
                ['Basispreis', 'Pauschalpreis pro Platzierung', 'Einmalige Gebühr unabhängig von Reichweite'],
                ['Folgenpreis', 'Preis pro Episode', 'Für Serien-Buchungen über mehrere Folgen'],
                ['TKP / CPM', 'Preis pro 1.000 Hörer', 'Dynamisch basierend auf tatsächlicher Reichweite'],
              ],
            },
          },
          {
            heading: 'Buchungskalender',
            text: 'Der Buchungskalender (Sponsoring → Buchungskalender) zeigt alle Werbe-Slots in einer Monatsansicht. Jeder Slot wird farblich nach Sponsor dargestellt. Klick auf einen Tag zeigt alle Buchungen für diesen Zeitraum. Konflikte (mehrere Slots gleicher Kategorie) werden farblich hervorgehoben.',
          },
          {
            heading: 'Folgensponsor-Automatisierung',
            text: 'Werbe-Slots mit einer definierten Laufzeit (Start- und Enddatum) werden im Episoden-Editor automatisch erkannt. Wenn eine Episode im Laufzeit-Zeitraum eines Slots liegt, erscheint ein Hinweis-Banner mit einem „Zuweisen"-Button für schnelle Buchung.',
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
            text: 'Im Sponsor-Detail-Bereich können neue Platzierungen angelegt werden. Beim Auswählen einer Werbe-Kategorie werden Laufzeit und alle drei Preistypen automatisch übernommen und können noch angepasst werden.',
          },
          {
            heading: 'Konflikt-Erkennung',
            text: 'Im Werbung-Tab des Episoden-Editors werden Kategorie-Konflikte automatisch erkannt: Sind zwei Sponsoren aus derselben Kategorie in einer Episode gebucht, erscheint eine gelbe Warnmeldung mit den betroffenen Sponsoren.',
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
      {
        id: 'sponsoring-v2',
        title: 'Sponsoring-System v2.12.0',
        summary: 'Das neue 3-Ebenen-Modell: Verträge, Slots und Buchungen für professionelles Sponsoring-Management.',
        icon: <Megaphone size={18} />,
        tags: ['v2.12.0', 'vertrag', 'buchung', 'slot', 'episoden-editor', 'schnellbuchung'],
        content: [
          {
            text: 'Mit Version 2.12.0 wurde das Sponsoring-System grundlegend überarbeitet. Das neue 3-Ebenen-Modell (Vertrag → Slot → Buchung) ermöglicht eine präzisere Verwaltung von Sponsoring-Kampagnen und eine nahtlose Integration in den Episoden-Editor.',
          },
          {
            heading: 'Das neue 3-Ebenen-Modell',
            table: {
              headers: ['Ebene', 'Beschreibung', 'Beispiel'],
              rows: [
                ['Vertrag', 'Rahmenvereinbarung mit dem Sponsor', 'Jahresvertrag 2025 mit Sponsor XY'],
                ['Slot', 'Konkreter Werbeplatz innerhalb eines Vertrags', 'Pre-Roll 30s, Mid-Roll 60s'],
                ['Buchung', 'Zuweisung eines Slots zu einer Episode', 'Episode #42 – Pre-Roll von Sponsor XY'],
              ],
            },
          },
          {
            heading: 'Verträge verwalten',
            text: 'Im Sponsor-Detail-Bereich (Tab „Verträge“) können Rahmenverträge mit Laufzeit, Gesamtbudget und Kontaktdaten hinterlegt werden. Jeder Vertrag kann mehrere Slots enthalten.',
          },
          {
            heading: 'Buchungen im Episoden-Editor',
            text: 'Im Werbung-Tab des Episoden-Editors gibt es jetzt einen neuen Abschnitt „Buchungen v2“. Dort werden alle Buchungen aus dem neuen System angezeigt. Über den Button „Buchung erstellen“ kann direkt aus dem Episoden-Kontext gebucht werden.',
          },
          {
            heading: 'Schnellbuchung mit Slot-Vorschlägen',
            text: 'Unterhalb der bestehenden Buchungen werden automatisch verfügbare Slots als Vorschläge angezeigt. Ein Klick auf „+ Buchen“ erstellt sofort eine Buchung für die aktuelle Episode – ohne den Episoden-Editor verlassen zu müssen.',
          },
          {
            heading: 'Buchungs-Status',
            table: {
              headers: ['Status', 'Bedeutung'],
              rows: [
                ['angefragt', 'Buchung wurde erstellt, Sponsor noch nicht bestätigt'],
                ['bestätigt', 'Sponsor hat die Buchung bestätigt'],
                ['ausgestrahlt', 'Episode wurde veröffentlicht, Werbung wurde ausgestrahlt'],
                ['storniert', 'Buchung wurde abgesagt'],
              ],
            },
          },
          {
            heading: 'Rechnungs-Status',
            table: {
              headers: ['Status', 'Bedeutung'],
              rows: [
                ['offen', 'Rechnung noch nicht erstellt'],
                ['versendet', 'Rechnung an den Sponsor gesendet'],
                ['bezahlt', 'Zahlung eingegangen'],
                ['storniert', 'Rechnung storniert'],
              ],
            },
          },
          {
            heading: 'Berechtigungen',
            text: 'Für das neue System sind folgende Berechtigungen relevant: „Sponsoren bearbeiten“ (canEditSponsors) für das Erstellen und Löschen von v2-Buchungen im Episoden-Editor, „Verträge verwalten“ (canManageSponsorContracts) für die Vertragsverwaltung und „Buchungen verwalten“ (canManageAdBookingsV2) für die vollständige Buchungsverwaltung.',
          },
          {
            tip: 'Das alte Buchungssystem (Platzierungen) bleibt vollständig erhalten und funktioniert parallel zum neuen System. Beide Systeme werden im Episoden-Editor angezeigt.',
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
        id: 'v2-12-4',
        title: 'v2.12.4 — Auto-Update, Episoden-Vorlagen, Rabatt/CPM & Abrechnungs-Erweiterungen',
        icon: <Package size={18} />,
        tags: ['update', 'vorlagen', 'rabatt', 'cpm', 'abrechnung', 'buchungskalender', 'v2.12.4'],
        summary: 'Auto-Update-System im Admin-Panel, Episoden-Vorlagen im Skript-Editor, Rabatt und CPM-Berechnung bei Buchungen, erweiterter Abrechnungs-Tab mit Vertragsfilter und Sammel-PDFs.',
        content: [
          {
            heading: 'Auto-Update-System',
            text: 'Im Admin-Bereich unter System > App-Update kann die App jetzt direkt auf neue GitHub-Versionen geprüft werden. Ein Klick auf „Update installieren“ führt automatisch git pull, npm install, den Build-Prozess und den Server-Neustart durch. Der Fortschritt wird live im Log angezeigt.',
          },
          {
            heading: 'Episoden-Vorlagen',
            list: [
              'Im Skript-Editor gibt es zwei neue Buttons: „Vorlage speichern“ und „Vorlage laden“',
              'Vorlagen speichern alle aktuellen Blöcke (Typ, Titel, Inhalt, Dauer)',
              'Beim Laden werden die aktuellen Blöcke durch die Vorlage ersetzt',
              'Vorlagen können benannt und gelöscht werden',
            ],
          },
          {
            heading: 'Buchungsmodal – Rabatt & CPM',
            table: {
              headers: ['Feld', 'Funktion'],
              rows: [
                ['Hörerzahl', 'Erscheint nur bei CPM-Preismodell – berechnet den Endbetrag automatisch'],
                ['Rabatt', 'Absolut (EUR) oder prozentual (%) – Endpreis wird live angezeigt'],
                ['Platzierungen pro Folge', 'Wie oft die Werbung in einer Folge geschaltet wird'],
                ['Folgen in der Laufzeit', 'Beliebig viele Folgen mit Platzierungsanzahl eintragbar'],
              ],
            },
          },
          {
            heading: 'Abrechnungs-Tab Erweiterungen',
            list: [
              'Vertragsfilter: Alle Buchungen eines Vertrags zusammenfassen und exportieren',
              'Sammel-PDF: Alle Buchungsbestätigungen in einem einzigen PDF',
              'Hinweistext am Ende der Leistungsübersicht ist anpassbar',
              'PDF-Textabschneidung behoben – alle Spalten umbrechen korrekt',
            ],
          },
          {
            heading: 'Vertragsmanagement',
            list: [
              'Sponsoring-Art im Vertrag eintragbar (z.B. „Folgensponsor“, „Pre-Roll Paket“)',
              'Kontaktdaten können direkt aus den Stammdaten übernommen werden',
              'Buchungen können einem Vertrag zugeordnet werden',
            ],
          },
          {
            heading: 'Buchungskalender',
            text: 'Der Buchungskalender wurde komplett überarbeitet. Monatsübergreifende Buchungen werden jetzt korrekt angezeigt (Overlap-Filterung). Legacy-Backend-Fehler blockieren nicht mehr die Anzeige von v2-Buchungen.',
          },
          {
            heading: 'Bugfixes',
            list: [
              'Schwarze Seite beim Öffnen eines Sponsors behoben (fehlende State-Deklaration)',
              'Sponsor löschen: Foreign-Key-Constraints werden jetzt korrekt aufgelöst',
              'Episoden-Vorlagen-Route: Konflikt mit /:id-Route behoben',
              'DB-Migration: ad_bookings_new enthält jetzt alle Spalten beim Serverstart',
            ],
          },
        ],
      },
      {
        id: 'v2-12-0',
        title: 'v2.12.0 — Neues Sponsoring-System, Episoden-Editor Integration & Berechtigungen',
        icon: <Package size={18} />,
        tags: ['sponsoring', 'v2.12.0', 'episoden-editor', 'buchung', 'vertrag', 'berechtigungen'],
        summary: 'Vollständige Überarbeitung des Sponsoring-Systems mit 3-Ebenen-Modell (Vertrag → Slot → Buchung), Integration in den Episoden-Editor mit Schnellbuchung und Slot-Vorschlägen sowie neue Sponsoring-Berechtigungen.',
        content: [
          {
            heading: 'Neues Sponsoring-System (3-Ebenen-Modell)',
            list: [
              'Neue Tabellen: sponsor_contracts (Rahmenverträge) und ad_bookings (Buchungen)',
              'Vertrag → Slot → Buchung: klare Hierarchie für präzises Kampagnen-Management',
              'Neue Sponsor-Detailseite (v2) mit 4 Tabs: Verträge, Slots, Buchungen, Abrechnung',
              'Buchungs-Status: angefragt, bestätigt, ausgestrahlt, storniert',
              'Rechnungs-Status: offen, versendet, bezahlt, storniert',
            ],
          },
          {
            heading: 'Episoden-Editor Integration',
            list: [
              'Neuer Abschnitt „Buchungen v2“ im Werbung-Tab des Episoden-Editors',
              'Schnellbuchung: Verfügbare Slots werden als Vorschläge angezeigt, 1-Klick-Buchung',
              'Buchungsmodal: Slot auswählen, Preis festlegen, Notizen hinzufügen',
              'Buchungen können direkt aus dem Episoden-Kontext gelöscht werden',
              'Altes Buchungssystem (Platzierungen) bleibt vollständig erhalten',
            ],
          },
          {
            heading: 'Neue Berechtigungen',
            list: [
              'canManageSponsorContracts: Sponsoring-Verträge verwalten',
              'canManageAdBookingsV2: Neue Buchungen (v2) vollständig verwalten',
              'canViewSponsorContracts: Verträge und Buchungen ansehen',
            ],
          },
          {
            heading: 'Wiki aktualisiert',
            list: [
              'Neuer Artikel „Sponsoring-System v2.12.0“ mit vollständiger Dokumentation',
              'Berechtigungstabelle im Admin-Bereich um Sponsoring-Verträge erweitert',
            ],
          },
        ],
      },
      {
        id: 'v2-11-7',
        title: 'v2.11.7 — Freigabe-Center Fixes, Wiki-Updates & Versionsverwaltung',
        icon: <Package size={18} />,
        tags: ['freigabe', 'wiki', 'version', 'bugfixes', 'permissions'],
        summary: 'Behebung der Freigabe-Center Sichtbarkeit für Moderatoren, korrekte Versionsnummer in Einstellungen, Wiki mit neuen Funktionen erweitert.',
        content: [
          {
            heading: 'Freigabe-Center für Moderatoren',
            text: 'Das Freigabe-Center ist jetzt für alle Benutzer mit der Berechtigung "Episoden freigeben / abnehmen" sichtbar. Moderatoren können Episoden und Interview-Fragen direkt genehmigen oder ablehnen.',
          },
          {
            heading: 'Versionsnummer in Einstellungen',
            text: 'Die App-Version wird jetzt korrekt in den Einstellungen unter "App-Update" angezeigt.',
          },
          {
            heading: 'Wiki erweitert',
            list: [
              'Neue Artikel für Freigabe-Center, Sponsoring-Management und Buchungskalender',
              'Alle neuen Funktionen aus v2.11.6 dokumentiert',
            ],
          },
        ],
      },
      {
        id: 'v2-11-6',
        title: 'v2.11.6 — Platzierungseditor, Preispersistierung & Kalender-Fixes',
        icon: <Package size={18} />,
        tags: ['sponsoring', 'platzierungen', 'preise', 'buchungskalender', 'bugfixes'],
        summary: 'Kritische Bugfixes: Platzierungen editierbar, Preise korrekt gespeichert, Buchungskalender zeigt Vorplanungen im Grid.',
        content: [
          {
            heading: 'Platzierungseditor',
            list: [
              'Platzierungen sind jetzt vollständig editierbar',
              'Alle Felder werden korrekt gespeichert: Titel, Kategorie, Position, Preis, Laufzeit',
            ],
          },
          {
            heading: 'Buchungskalender',
            text: 'Vorplanungen mit Datum werden jetzt im Kalender-Grid angezeigt.',
          },
          {
            heading: 'Position statt UUID',
            text: 'Die Platzierungsübersicht zeigt jetzt aussagekräftige Namen statt UUIDs.',
          },
        ],
      },
      {
        id: 'v2-10-0',
        title: 'v2.11.0 — Sponsoring-Konzept: Buchungskalender, TKP-Kalkulator & Folgensponsor-Automatisierung',
        icon: <Package size={18} />,
        tags: ['sponsoring', 'buchungskalender', 'tkp', 'folgensponsor', 'abrechnung'],
        summary: 'Vollständige Umsetzung des Sponsoring-Konzepts: Buchungskalender mit Monatsansicht und Konfliktanzeige, TKP-Kalkulator im Billing-Tab, Folgensponsor-Automatisierung im Episoden-Editor, Auslastungs-Tab im Einnahmen-Dashboard und Kategorie-Konflikt-Erkennung.',
        content: [
          {
            heading: 'Buchungskalender',
            text: 'Neuer Bereich im Sponsoring-Menü: Monatsansicht aller Werbe-Slots mit farblicher Sponsor-Zuordnung. Konflikte (gleiche Kategorie, überlappende Zeiträume) werden farblich hervorgehoben. Klick auf einen Tag zeigt alle Buchungen.',
          },
          {
            heading: 'Folgensponsor-Automatisierung',
            text: 'Im Werbung-Tab des Episoden-Editors erscheint automatisch ein Hinweis-Banner, wenn ein Werbe-Slot eine aktive Laufzeit hat, die die aktuelle Episode abdeckt. Direkte Zuweisung per Klick.',
          },
          {
            heading: 'Kategorie-Konflikt-Erkennung',
            text: 'Sind zwei Sponsoren aus derselben Werbe-Kategorie in einer Episode gebucht, erscheint eine gelbe Warnmeldung mit den betroffenen Sponsoren.',
          },
          {
            heading: 'TKP-Kalkulator',
            text: 'Im Billing-Tab des Sponsor-Detail-Bereichs: Eingabe der Hörer-Anzahl berechnet automatisch den TKP-Preis und den Gesamtbetrag basierend auf dem CPM-Preis der Platzierungen.',
          },
          {
            heading: 'Auslastungs-Tab im Einnahmen-Dashboard',
            text: 'Neuer Tab „Auslastung" zeigt alle Werbe-Slots mit Buchungsgrad als Fortschrittsbalken. Neue KPI-Cards: Slot-Auslastung in %, Ø TKP und Anzahl aktiver Slots.',
          },
        ],
      },
      {
        id: 'v2-10-0-old',
        title: 'v2.10.0 — Sponsoring-Korrektionen, Backup-Import & Metadaten',
        summary: 'Flexibles Preismodell im Sponsoring (3 Preistypen), Laufzeit- und Kategorie-Übernahme repariert, Buchungsbestätigung für Sponsoren, Backup-Import mit Vorschau und Metadaten in der Media Library.',
        icon: <Package size={18} />,
        tags: ['sponsoring', 'preismodell', 'backup', 'import', 'metadaten', 'media-library', 'audio-editor', 'daw', 'freigabe'],
        content: [
          {
            heading: 'Sponsoring',
            list: [
              'Flexibles Preismodell: Basispreis, Folgenpreis und Preis pro 1.000 Hörer (CPM) pro Werbe-Kategorie',
              'Laufzeit und Werbe-Kategorie werden beim Anlegen einer Platzierung korrekt übernommen',
              'Kontakt- und Vertragsdaten werden nach dem Speichern korrekt angezeigt',
              'Buchungsbestätigung als PDF exportierbar (inkl. Zeitraum-Buchungen ohne feste Folge)',
              'Export auch für Platzierungen ohne Episodenzuordnung',
            ],
          },
          {
            heading: 'Backup-Import',
            list: [
              'Vollständiger Backup-Import in der Administration (System-Tab)',
              'Vorschau-Analyse vor dem Import: zeigt neue, vorhandene und überschreibbare Einträge',
              'Zwei Modi: Zusammenführen (neue Einträge hinzufügen) oder Überschreiben',
              'Automatisches Pre-Import-Backup vor jedem Restore',
            ],
          },
          {
            heading: 'Media Library & Audio-Editor',
            list: [
              'Metadaten-Verwaltung: Basis, Audio-Info, Rechte & Lizenz, eigene Felder',
              'Audio-Editor als eigener Tab (schwarze Seite behoben)',
              'DAW-Export: EDL, FCPXML, Reaper, Audacity Labels, CSV',
              'Neue Berechtigungen: canEditMetadata, canUseAudioEditor, canExportMarkers, canManageAds, canBookAds, canViewAds',
            ],
          },
          {
            heading: 'Episoden-Freigabe',
            list: [
              'Freigabe-Widget in der Sidebar des Episoden-Editors',
              'Workflow: Freigabe anfordern → freigeben oder zur Überarbeitung zurückgeben',
              'Rollenbasiert: canRequestApproval (Redakteur/Moderator), canApproveEpisodes (Admin/Moderator)',
              'Freigabe-Workflow kann in den Einstellungen deaktiviert werden',
            ],
          },
        ],
      },
      {
        id: 'v2-9-11',
        title: 'v2.9.11 — Vollständiger Audit & Stabilitäts-Update',
        summary: 'Vollständiger Code-Audit aller Features: Audio-Editor Datenbank-Fix, Werbung löschen repariert, Berechtigungen der Produktion-Rolle erweitert, Online-Nutzer Widget im Dashboard.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'audio-editor', 'berechtigungen', 'dashboard'],
        content: [
          {
            heading: 'Bugfixes',
            list: [
              'Audio-Editor: Fehlende markers-Spalte in der Datenbank-Migration ergänzt – Schnittmarken und Kommentare werden jetzt korrekt gespeichert',
              'Werbung löschen: DELETE-Route gibt nun korrektes Antwortformat zurück – Löschen-Button im Episoden-Editor funktioniert',
              'Online-Nutzer: last_seen-Spalte für Sessions wird automatisch beim Start angelegt',
            ],
          },
          {
            heading: 'Berechtigungen',
            list: [
              'Rolle Produktion: canCreateEpisodes, canEditSponsors, canDeleteMedia, canViewSponsorReports, canExportPricelist hinzugefügt',
              'Alle Rollen wurden auf Vollständigkeit geprüft und angepasst',
            ],
          },
          {
            heading: 'Features',
            list: [
              'Online-Nutzer Widget im Dashboard (statt Sidebar-Footer)',
              'Werbung im Script-Editor frei platzierbar und mit Buchungen verknüpfbar',
              'Werbebuchungen im Episoden-Editor löschbar',
            ],
          },
        ],
      },
      {
        id: 'v2-9-10',
        title: 'v2.9.10 — Audio-Editor, Werbung & Online-Nutzer',
        summary: 'Audio-Editor mit WaveSurfer.js vollständig implementiert, Werbung im Script frei platzierbar, Online-Nutzer Widget ins Dashboard verschoben.',
        icon: <Package size={18} />,
        tags: ['feature', 'audio-editor', 'werbung', 'dashboard'],
        content: [
          {
            heading: 'Audio-Editor (WaveSurfer.js)',
            list: [
              'Wellenform-Visualisierung mit WaveSurfer.js',
              'Transport-Controls: Play, Pause, Stop, Skip',
              'Schnittmarken setzen (5 Typen: Schnitt, Kapitel, Start, Ende, Anmerkung)',
              'Zeitbezogene Kommentare für Freigabe-Workflow',
              'Marker-Liste mit Zeitstempel und Farb-Kodierung',
              'Öffnen per Schere-Button beim Hover über Audio-Asset',
            ],
          },
          {
            heading: 'Werbung im Episoden-Editor',
            list: [
              'Ad-Blöcke im Script-Editor (Pro) frei positionierbar',
              'Verknüpfung mit vorhandenen Buchungen per Dropdown',
              'Löschen-Button für Buchungen im Werbung-Tab',
            ],
          },
          {
            heading: 'Online-Nutzer',
            list: [
              'Widget aus Sidebar-Footer entfernt und als Dashboard-Widget integriert',
              'Zeigt alle aktiven Nutzer mit Avatar, Name, Rolle und Online-Punkt',
              'Heartbeat alle 60 Sekunden, Timeout nach 5 Minuten',
            ],
          },
        ],
      },
      {
        id: 'v2-9-9',
        title: 'v2.9.9 — MySQL Migration Fix & Robustheit',
        summary: 'MySQL-Migration vollständig repariert: TEXT-Spalten ohne DEFAULT, VARCHAR für Primary Keys. Migrations-UI für externe Provider verbessert.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'mysql', 'migration', 'admin'],
        content: [
          {
            heading: 'MySQL Migration Fixes',
            list: [
              'TEXT/LONGTEXT-Spalten ohne DEFAULT-Werte (MySQL-Kompatibilität)',
              'Primary Keys als VARCHAR(255) statt LONGTEXT',
              'SQLite-spezifische DEFAULT-Werte werden gefiltert',
              'Alle 26 Tabellen werden fehlerfrei übertragen',
            ],
          },
          {
            heading: 'Migrations-UI',
            list: [
              'Unterstützung für externe DB-Provider (nicht nur lokal)',
              'Detaillierte Fehlerdiagnose: ENETUNREACH, Access denied, Unknown database',
              'Hinweise für IONOS und andere Shared-Hosting-Anbieter',
            ],
          },
        ],
      },
      {
        id: 'v2-9-8',
        title: 'v2.9.8 — Media Library Pro & Audio Editor',
        summary: 'Umfangreiches Update der Media Library mit Ordnerstrukturen und integriertem Audio-Editor für Kommentare und Schnittmarken.',
        icon: <Package size={18} />,
        tags: ['feature', 'media-library', 'audio-editor', 'folders'],
        content: [
          {
            heading: 'Media Library Features',
            list: [
              'Ordnerstrukturen zur besseren Organisation von Assets',
              'Audio-Dauer Erfassung via ffprobe optimiert und gefixt',
              'Neuer Audio-Editor zum Setzen von Schnittmarken und zeitbezogenen Kommentaren',
              'Kommentar-Funktion für die finale Freigabe von Audio-Dateien',
            ],
          },
          {
            heading: 'Technische Verbesserungen',
            list: [
              'Datenbank-Schema um Ordner-Unterstützung erweitert',
              'ffprobe Logging zur Fehlerdiagnose hinzugefügt',
            ],
          },
        ],
      },
      {
        id: 'v2-9-7',
        title: 'v2.9.7 — MySQL Migration Robustheit',
        summary: 'Fehler in der Datenbank-Migration behoben und Anleitung für SQLite zu MySQL Wechsel hinzugefügt.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'admin', 'mysql', 'migration'],
        content: [
          {
            heading: 'Bugfixes',
            list: [
              'Fehler "Cannot read properties of undefined (reading success)" beim Testen der MySQL-Verbindung behoben',
              'Bessere Fehlerbehandlung bei Netzwerkproblemen während der Migration',
            ],
          },
          {
            heading: 'Dokumentation',
            list: [
              'Detaillierte Schritt-für-Schritt Anleitung für den Wechsel von SQLite zu MySQL / MariaDB erstellt',
            ],
          },
        ],
      },
      {
        id: 'v2-9-6',
        title: 'v2.9.6 — Status-Änderung Fix',
        summary: 'Fehler behoben, bei dem der Episoden-Status im Editor nicht angepasst werden konnte.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'episoden-editor', 'status'],
        content: [
          {
            heading: 'Episoden-Status',
            list: [
              'Status-Dropdown im Metadaten-Tab des Episoden-Editors hinzugefügt',
              'Alle Status-Optionen (Idee, Entwurf, Aufnahme, Produktion, Geplant, Veröffentlicht, Archiviert) sind jetzt direkt im Editor wählbar',
              'Änderungen werden beim Speichern korrekt in die Datenbank übernommen',
            ],
          },
        ],
      },
      {
        id: 'v2-9-5',
        title: 'v2.9.5 — Bugfixes & Werbeplanung',
        summary: 'Bearbeitungsformulare erscheinen wieder als Overlay-Modal. Werbekategorien-PDF im Querformat. Zeitposition für Werbebuchungen mit Timeline-Visualisierung. Impressum-Logo aktualisiert.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'modal', 'pdf', 'werbung', 'timeline', 'impressum'],
        content: [
          {
            heading: 'Bugfixes',
            list: [
              'Bearbeitungsformulare (Overlays/Modals) erscheinen wieder korrekt als zentriertes Modal mit Hintergrund-Overlay – CSS-Klassen (modal-overlay, modal, modal-header, modal-body) waren durch den CSS-Variablen-Umbau verloren gegangen',
              'Werbekategorien-PDF wird jetzt im Querformat (Landscape) exportiert – alle Spalten (Kategorie, Position, Dauer, Basispreis, Preis/Folge, Exklusiv) sind sichtbar',
            ],
          },
          {
            heading: 'Werbeplanung im Episoden-Editor',
            list: [
              'Neues Feld "Zeitposition in der Folge" im Buchungs-Modal (Format: MM:SS oder Sekunden)',
              'Visuelle Timeline-Visualisierung im Werbebuchungs-Tab zeigt alle Buchungen mit Zeitmarker auf der Folgen-Länge',
              'Pre-Roll (orange), Mid-Roll (lila), Post-Roll (blau) farblich unterschieden',
              'Zeitposition wird in der Buchungsliste als Zeitstempel angezeigt',
            ],
          },
          {
            heading: 'Impressum',
            list: [
              'Logo von Maximilian Hartwich – Medien der Sinne wird jetzt direkt von medien-der-sinne.de geladen',
              'Logo ist als klickbarer Link zur Website gestaltet',
              'Fallback auf lokale Datei wenn externe URL nicht erreichbar',
            ],
          },
        ],
      },
      {
        id: 'v2-9-4',
        title: 'v2.9.4 — Interview-Fragen im PDF-Export',
        summary: 'Redaktionshub-Blöcke (Interview-Fragen) werden jetzt vollständig im Episoden-PDF-Export gerendert. Jede Frage erscheint mit Nummer, Text, Kategorie und Antwortzeit. Alle Block-Typen haben jetzt korrektes Rendering.',
        icon: <Package size={18} />,
        tags: ['update', 'pdf', 'interview', 'redaktionshub', 'bugfix'],
        content: [
          {
            heading: 'Interview-Fragen im PDF-Export',
            list: [
              'Redaktionshub-Blöcke vom Typ "Interview-Fragen" werden jetzt vollständig im PDF gerendert',
              'Jede Frage erscheint mit Fragen-Nummer (F1, F2, ...), Fragetext, Kategorie und Antwortzeit',
              'Moderationshinweise werden ebenfalls ausgegeben (sofern nicht als intern markiert)',
              'Neuer Block-Typ "Moderation" mit eigenem Rendering ergänzt',
              'Alle Block-Typen zeigen jetzt "(kein Inhalt)" wenn kein Text vorhanden ist (außer Jingle/Werbung)',
            ],
          },
          {
            heading: 'Technische Details',
            text: 'Der interview_questions-Block speichert Fragen als strukturiertes questions-Array (nicht als HTML-Content). Das PDF-Rendering wurde um einen eigenen Rendering-Pfad für diesen Block-Typ erweitert, der das Array direkt auswertet.',
          },
        ],
      },
      {
        id: 'v2-9-3',
        title: 'v2.9.3 — PDF-Layouts erweitert, Berechtigungen vervollständigt & SQLite→MySQL-Migration',
        summary: 'Umfangreiche Erweiterung des PDF-Layout-Systems: Wasserzeichen, Zeilenabstand, Trennlinien-Stil, Header-Höhe, neue Sektionen (Show-Notes, Alt. Episodenlänge, Preisliste). Berechtigungen vollständig abgeglichen. Neues Datenbank-Migrations-Tool (SQLite → MySQL) in der Administration.',
        icon: <Package size={18} />,
        tags: ['update', 'pdf', 'layout', 'berechtigungen', 'datenbank', 'mysql', 'wasserzeichen'],
        content: [
          {
            heading: 'PDF-Layout-Einstellungen erweitert',
            list: [
              'Wasserzeichen: Text (z.B. ENTWURF, VERTRAULICH), Farbe, Deckkraft, Position (Mitte/diagonal, Oben, Unten), Schriftgröße',
              'Zeilenabstand: Kompakt (1.2), Normal (1.5), Weit (2.0) – wirkt auf alle Textblöcke',
              'Trennlinien-Stil: Durchgezogen, Gestrichelt, Gepunktet, Doppellinie, Keine',
              'Header-Höhe: Einstellbar von 40–150 pt (Standard: 70 pt)',
              'Abstände: Header-Abstand unten, Footer-Abstand oben, Abstand zwischen Sektionen',
            ],
          },
          {
            heading: 'Neue PDF-Sektionen',
            list: [
              'Episoden-PDF: Show-Notes (neu v2.9.0) und Alternative Episodenlänge (Sonderfolge)',
              'Episoden-PDF: Sponsoren-Platzierungen werden jetzt tatsächlich gerendert (war bisher nur ein Flag)',
              'Rechnung-PDF: showInvoiceDetails und showInvoiceSummary werden jetzt ausgewertet',
              'Preisliste-PDF: showPricelistDescriptions und showPricelistExclusive steuerbar',
              'Kalender-PDF: Notizen je Eintrag (showCalendarNotes)',
            ],
          },
          {
            heading: 'Berechtigungen vollständig abgeglichen',
            list: [
              'Neue Berechtigungen in der AdminPage: canApproveEpisodes, canRequestApproval, canApproveInterviewQuestions',
              'canManagePdfLayouts: eigene Berechtigung für PDF-Layout-Verwaltung (bisher: canManageSettings)',
              'PDF-Layout-Router nutzt jetzt canManagePdfLayouts statt canManageSettings',
              'Alle Berechtigungen sind jetzt in der Rollen-Verwaltung sichtbar und editierbar',
            ],
          },
          {
            heading: 'Datenbank-Migration (SQLite → MySQL)',
            list: [
              'Neuer Tab „Datenbank“ in der Administration',
              'Verbindungstest: MySQL-Verbindung prüfen bevor die Migration startet',
              'Vollständige Datenmigration: alle Tabellen, Benutzer, Episoden, Ideen, Sponsoren, Einstellungen',
              'Fortschrittsanzeige während der Migration',
              'Empfohlen wenn das Podcast-Projekt wächst und SQLite an seine Grenzen stößt',
            ],
          },
        ],
      },
      {
        id: 'v2-9-2',
        title: 'v2.9.2 — Admin-Module-Toggle, Werbekategorien-PDF & SFTP-Speicher',
        summary: 'Administratoren können jetzt einzelne App-Module (Redaktion, Sponsoring, Chat, etc.) aktivieren und deaktivieren. Werbekategorien können als PDF exportiert werden. Der Speicher-Bereich wurde um SFTP/SSH-Unterstützung erweitert.',
        icon: <Package size={18} />,
        tags: ['update', 'admin', 'module', 'pdf', 'speicher', 'sftp'],
        content: [
          {
            heading: 'Admin: Module aktivieren / deaktivieren',
            list: [
              'Neuer Tab „Module“ in der Administration',
              'Jedes Modul (Redaktions-Hub, Sponsoring, Media Library, Statistiken, Chat, Staffeln, Wiki, Branding, Podigee) kann einzeln per Toggle deaktiviert werden',
              'Deaktivierte Module werden aus der Navigation ausgeblendet – Daten bleiben erhalten',
              'Änderungen werden sofort gespeichert und nach Seiten-Reload aktiv',
            ],
          },
          {
            heading: 'Werbekategorien-PDF-Export',
            list: [
              'Neuer PDF-Export-Button im Werbekategorien-Tab der Sponsoring-Seite',
              'Tabelle mit Kategorie, Position, Dauer, Basispreis, Preis/Folge und Exklusiv-Status',
              'Kategorie-Farbe wird als farbiger Punkt vor dem Namen dargestellt',
              'Dokumententitel im PDF ist anpassbar (Eingabefeld neben den Export-Buttons)',
            ],
          },
          {
            heading: 'SFTP/SSH-Speicher-Backend',
            list: [
              'Neuer Speicher-Typ „SFTP / SSH“ in den Branding & Backup-Einstellungen',
              'Kompatibel mit Hetzner Storage Box, eigenen Linux-Servern, NAS-Systemen (Synology, QNAP), Raspberry Pi, Uberspace',
              'Felder: Hostname, Port, Benutzername, Passwort, Remote-Pfad, Public-URL',
              'Hinweis: Für Google Drive oder OneDrive kann Rclone als SFTP-Gateway eingerichtet werden',
              'WebDAV-Hinweis korrigiert: OneDrive (Consumer) und Google Drive unterstützen kein WebDAV',
            ],
          },
        ],
      },
      {
        id: 'v2-9-1',
        title: 'v2.9.1 — Audio-Länge in Media Library & PDF-Dokumententitel',
        summary: 'Audio-Dateien zeigen jetzt ihre Länge in der Media Library an. ffprobe ermittelt die Dauer automatisch beim Upload. An allen PDF-Export-Stellen kann jetzt ein eigener Dokumententitel vergeben werden.',
        icon: <Package size={18} />,
        tags: ['update', 'media-library', 'audio', 'pdf', 'dokumententitel'],
        content: [
          {
            heading: 'Audio-Länge in der Media Library',
            list: [
              'Audio-Dateien zeigen ihre Dauer (z.B. 1:23:45) in der Kachel-Ansicht an',
              'Die Dauer wird beim Upload automatisch via ffprobe ermittelt',
              'Bestehende Audio-Assets ohne Dauer werden beim Server-Start automatisch nachträglich verarbeitet',
              'ffprobe (Teil von ffmpeg) muss auf dem Server installiert sein',
            ],
          },
          {
            heading: 'Anpassbarer PDF-Dokumententitel',
            list: [
              'Episoden-Export: Neues Feld „Dokumententitel“ neben dem Dateinamen-Feld',
              'Sponsoring-Abrechnung: Neues Feld „Dokumententitel im PDF“ im Abrechnung-Tab',
              'Ideenmappe: Neues Feld „Dokumententitel“ neben dem Dateinamen-Feld',
              'Bleibt das Feld leer, wird der Standard-Titel verwendet (z.B. „Sponsoring-Abrechnung“)',
              'Der Titel erscheint im PDF-Header oben links unter dem Podcast-Namen',
            ],
          },
        ],
      },
      {
        id: 'v2-9-0',
        title: 'v2.9.0 — Interview-Fragen-Block, Show-Notes & Alternative Episodenlänge',
        summary: 'Neuer Interview-Fragen-Block im Script-Editor mit strukturierter Zeitberechnung. Show-Notes-Tab für öffentliche Folgen-Inhalte. Alternative Episodenlänge für Sonderfolgen. Neue Berechtigungen canEditShowNotes und canManageInterviewBlocks.',
        icon: <Package size={18} />,
        tags: ['update', 'episoden-editor', 'interview', 'show-notes', 'zeiterfassung', 'berechtigungen'],
        content: [
          {
            heading: 'Interview-Fragen-Block (interview_questions)',
            text: 'Neuer Block-Typ im Script-Editor speziell für Fragen aus dem Redaktionshub. Fragen werden strukturiert angezeigt – nicht mehr als einfacher Text.',
            list: [
              'Jede Frage einzeln mit Nummer, Text und Kategorie',
              'Individuelle Antwortzeit pro Frage einstellbar (Standard: 90 Sekunden)',
              'Interne Moderations-Notizen pro Frage',
              'Automatische Dauerberechnung: Sprechzeit der Frage + Antwortzeit',
              'Berechtigung: canManageInterviewBlocks'
            ]
          },
          {
            heading: 'Show-Notes-Tab',
            text: 'Neuer Tab „Show-Notes" im Episoden-Editor für öffentliche Inhalte einer Folge (Links, Zeitmarken, Quellen). Getrennt von der kurzen Beschreibung im Metadaten-Tab.',
            list: [
              'Eigener Rich-Text-Editor für Show-Notes',
              'Hinweis-Box erklärt den Unterschied zur Episoden-Beschreibung',
              'Berechtigung: canEditShowNotes'
            ]
          },
          {
            heading: 'Alternative Episodenlänge',
            text: 'In den Technischen Daten kann eine zweite Ziel-Episodenlänge (in Minuten) für Sonderfolgen (FAQ, Kurzfolgen) hinterlegt werden.',
            list: [
              'Neues Feld „Alternative Ziel-Länge" in Technischen Daten',
              'Sidebar zeigt orangefarbenen Sonderfolge-Hinweis wenn gesetzt',
              'Für FAQ-Folgen, Kurzfolgen und Sonderformate'
            ]
          },
          {
            heading: 'Neue Berechtigungen',
            list: [
              'canEditShowNotes: Berechtigung zum Bearbeiten von Show-Notes (Standard: alle Rollen außer Viewer)',
              'canManageInterviewBlocks: Berechtigung zur Verwaltung von Interview-Fragen-Blöcken (Standard: alle Rollen außer Viewer)'
            ]
          },
          {
            heading: 'CSS/Design-Fix',
            text: 'Alle Farben nutzen jetzt CSS-Variablen mit Fallback-Werten. Theme-Änderungen wirken sich sofort auf alle Elemente aus. Tailwind @apply-Direktiven mit Opacity-Modifikatoren wurden durch natives CSS ersetzt.'
          }
        ]
      },
      {
        id: 'v2-8-2',
        title: 'v2.8.2 — Redaktionshub-Integration & Script-fertig-Fix',
        summary: 'Redaktionshub-Tab im Episoden-Editor: Ideen suchen, vollständig übernehmen, Interview-Partner einplanen. Bugfix für Script-fertig-Button (SQL-Fehler).',
        icon: <Package size={18} />,
        tags: ['update', 'episoden-editor', 'redaktionshub', 'interview', 'bugfix'],
        content: [
          {
            heading: 'Fix: Script-fertig-Button',
            text: 'Der interne Serverfehler beim Klick auf „Script fertig" ist behoben. Ursache war ein SQL-Parameter-Zählfehler (column index out of range) in der UPDATE-Query.'
          },
          {
            heading: 'Neuer Tab: Redaktionshub im Episoden-Editor',
            text: 'Im Episoden-Editor gibt es jetzt den Tab „Redaktionshub" mit zwei Bereichen:',
            list: [
              'Ideen-Suche: Alle Ideen aus dem Redaktionshub sind direkt im Editor durchsuchbar – nach Freitext und Status filterbar',
              'Vollständige Übernahme: Titel, Beschreibung, Tags, Gäste, Notizen, Checkliste und Interview-Blöcke direkt ins Script übernehmen',
              'Interview-Partner: Alle Partner aus dem Redaktionshub anzeigen und als Script-Block einplanen',
              'Neuen Interview-Partner direkt im Episoden-Editor erstellen – wird im Redaktionshub gespeichert',
              'Freigegebene Interview-Fragen werden automatisch in den Block-Inhalt übernommen'
            ]
          }
        ]
      },
      {
        id: 'v2-8-0',
        title: 'v2.8.0 — Script-Status, Episodenplanung & Dashboard',
        summary: 'Script-fertig-Status im Episoden-Editor, neue Planungsübersicht mit Kalender/Liste/Export, anpassbares Dashboard pro Nutzer und Chat-Datum-Fix.',
        icon: <Package size={18} />,
        tags: ['update', 'episoden-editor', 'dashboard', 'planung', 'bugfix'],
        content: [
          {
            heading: 'Script-fertig-Status',
            text: 'Im Episoden-Editor gibt es jetzt einen „Script fertig“-Button in der Kopfzeile. Nach dem Klick erscheint ein grünes Badge im Editor und in der Episodenübersicht – der Produktionsstand ist damit auf einen Blick erkennbar.'
          },
          {
            heading: 'Episodenplanung-Übersicht',
            text: 'Über den neuen „Planung“-Button in der Episodenübersicht öffnet sich eine Planungsseite mit Listenansicht (sortierbare Tabelle) und Kalenderansicht (Monatskalender). Beide Ansichten sind filterbar und können als PDF oder CSV exportiert werden.'
          },
          {
            heading: 'Anpassbares Dashboard',
            text: 'Über das Zahnrad-Symbol im Dashboard kann jeder Nutzer sein Layout individuell konfigurieren: Blöcke ein-/ausblenden und neu anordnen. Das Layout wird pro Nutzer gespeichert.'
          },
          {
            heading: 'Fix: Chat-Datum/Zeit',
            text: 'Nachrichten im Team-Chat wurden mit falscher Uhrzeit angezeigt (2 Stunden Abweichung bei UTC+2). Der UTC-Offset-Bug ist behoben.'
          }
        ]
      },
      {
        id: 'v2-7-9',
        title: 'v2.7.9 — Einnahmen-Dashboard, Design-Fix & In-App-Update',
        summary: 'Neues Einnahmen-Dashboard für alle Sponsoring-Einnahmen, In-App-Update-Dialog mit ZIP-Upload und Fix für das persönliche Design.',
        icon: <Package size={18} />,
        tags: ['update', 'sponsoring', 'einnahmen', 'design', 'update-funktion'],
        content: [
          {
            heading: 'Einnahmen-Dashboard',
            text: 'Über den neuen „Einnahmen“-Button in der Sponsoring-Übersicht öffnet sich das Einnahmen-Dashboard mit vier Ansichten: Pro Sponsor, Alle Platzierungen, Monatlich (Balkendiagramm) und Kategorien. Filter nach Zeitraum und Status sowie CSV-Export sind integriert.'
          },
          {
            heading: 'In-App-Update-Dialog',
            text: 'Unter Einstellungen → App-Update (nur Administratoren) kann PodCore direkt über die Benutzeroberfläche aktualisiert werden. Eine ZIP-Datei wird hochgeladen, auf Vollständigkeit geprüft und nach Bestätigung angewendet. Datenbank und Uploads bleiben erhalten.'
          },
          {
            heading: 'Fix: Persönliches Design',
            text: 'Der Bug, bei dem Akzentfarbe, Sidebar-Farbe und Schriftgröße nach dem Speichern nicht übernommen wurden, ist behoben.'
          }
        ]
      },
      {
        id: 'v2-7-8',
        title: 'v2.7.8 — Benutzer-Übergabe beim Löschen',
        summary: 'Beim Löschen von Benutzern mit verknüpften Inhalten erscheint jetzt ein Übergabe-Dialog. Alle Inhalte können auf einen anderen Benutzer übertragen werden.',
        icon: <Package size={18} />,
        tags: ['update', 'benutzerverwaltung', 'admin'],
        content: [
          {
            heading: 'Benutzer-Übergabe beim Löschen',
            text: 'Das Löschen von Benutzern mit verknüpften Inhalten funktioniert jetzt vollständig. Statt einer Fehlermeldung öffnet sich ein Übergabe-Dialog.',
            list: [
              'Anzeige der verknüpften Inhalte: Episoden, Ideen, Sponsoren, Assets und Notizen',
              'Übergabe-Ziel wählen: Aktiver Admin oder beliebiger anderer Benutzer',
              'Benutzer ohne Inhalte können direkt gelöscht werden',
              'Vollständige Übergabe aller Datenbankfelder inkl. Recherche-Quellen und Staffeln'
            ]
          }
        ]
      },
  {
        id: 'v2-7-7',
        title: 'v2.7.7 — Platzierungs-Laufzeit & Abrechnungstool',
        summary: 'Laufzeit-Felder für Werbeplatzierungen (Startdatum, Enddatum, Kampagnenname), vollständiges Abrechnungstool mit editierbarer Leistungsübersicht, Filterung nach Rechnungs-Status, Einleitungs- und Schlusstext sowie CSV/PDF-Export.',
        icon: <FileText size={18} />,
        tags: ['update', 'sponsoring', 'abrechnung', 'platzierungen'],
        content: [
          {
            heading: 'Laufzeit der Platzierung',
            text: 'Im Modal "Neue Werbeplatzierung" / "Platzierung bearbeiten" gibt es jetzt einen eigenen Bereich für die Laufzeit der Platzierung. Dieser ist unabhängig von der Vertragslaufzeit des Sponsors und beschreibt den Zeitraum einer konkreten Schaltung.',
            list: [
              'Kampagnenname / Bezeichnung: z.B. "Frühjahrskampagne 2025" oder "Q2-Schaltung"',
              'Laufzeit von / bis: Datumsfelder für Start und Ende der Platzierung',
              'Automatische Laufzeit-Berechnung: Die Dauer in Tagen, Wochen oder Monaten wird direkt angezeigt',
              'Anzeige in der Platzierungs-Liste: Laufzeit und Kampagnenname werden als blaue Badges dargestellt'
            ]
          },
          {
            heading: 'Erweitertes Abrechnungstool',
            text: 'Der Tab "Abrechnung" wurde vollständig überarbeitet. Statt einer einfachen Rechnungsansicht gibt es jetzt ein vollständiges Leistungsübersicht-Tool, das als Grundlage für die Rechnungserstellung in der internen Software dient.',
            list: [
              'Einleitungstext: Frei editierbarer Text für die Leistungsübersicht',
              'Schlusstext / Zahlungshinweis: Frei editierbarer Abschlusstext',
              'Filter nach Rechnungs-Status: Alle, Offen, Versendet oder Bezahlt',
              'Rechnungs-Status direkt änderbar: Dropdown in der Platzierungs-Liste ohne Modal',
              'Summen-Anzeige: Gesamtbetrag und davon bezahlt für den aktuellen Filter',
              'CSV-Export: Alle Felder inkl. Laufzeit, Kampagnenname und Performance-Notizen',
              'PDF-Export: Leistungsübersicht mit Layout-Auswahl und eigenem Dateinamen'
            ]
          },
          {
            heading: 'Performance-Notizen',
            text: 'Jede Platzierung kann jetzt Performance-Notizen erhalten, die in der Leistungsübersicht erscheinen. Ideal für Reichweiten-Angaben, Hörer-Feedback oder besondere Leistungen der Schaltung.'
          }
        ]
      },
      {
        id: 'v2-7-6',
        title: 'v2.7.6 — Eigener PDF-Dateiname, Highlights-Block & Episodenplanung',
        summary: 'Eigener Dokumentenname für alle PDF-Exporte, neuer Highlights-Block im Episoden-Editor, Preis im Platzierungs-Modal editierbar, Episodenplanung in der Sponsor-Übersicht und Bugfixes beim Sponsor-Speichern.',
        icon: <FileText size={18} />,
        tags: ['update', 'pdf', 'episoden-editor', 'sponsoring', 'bugfix'],
        content: [
          {
            heading: 'Eigener PDF-Dokumentenname',
            text: 'An allen PDF-Export-Stellen kann jetzt vor dem Download ein eigener Dateiname vergeben werden. Das Textfeld erscheint neben dem Layout-Picker und zeigt den Standard-Dateinamen als Platzhalter. Die .pdf-Endung wird automatisch ergänzt.',
            list: [
              'Episoden-Script-Export: Textfeld im Header neben dem Layout-Picker',
              'Sponsor-Abrechnung: Textfeld im Tab „Abrechnung“',
              'Ideenmappe-Export: Textfeld im Header neben dem Layout-Picker',
              'Redaktionskalender-Export: Textfeld in der Toolbar'
            ]
          },
          {
            heading: 'Highlights-Block im Episoden-Editor',
            text: 'Ein neuer Block-Typ „Highlights“ steht im Episoden-Script-Editor zur Verfügung. Er erscheint in Gelb/Amber und wird im PDF-Export entsprechend farblich hervorgehoben. Ideal für Zusammenfassungen, Key-Takeaways oder besondere Momente der Episode.'
          },
          {
            heading: 'Preis im Platzierungs-Modal editierbar',
            text: 'Im Modal „Neue Werbeplatzierung“ / „Platzierung bearbeiten“ ist das Preisfeld jetzt direkt bearbeitbar. Bisher wurde der Preis nur aus der Kategorie übernommen und konnte nicht manuell angepasst werden. Jetzt kann der Preis frei eingetragen oder der Kategorievorschlag überschrieben werden.'
          },
          {
            heading: 'Episodenplanung in der Sponsor-Übersicht',
            text: 'Im Tab „Übersicht“ eines Sponsors werden jetzt alle eingeplanten Episoden angezeigt. Jede Buchung zeigt Episodentitel, Position, Slot-/Kategoriename, Dauer und Bestätigungsstatus.'
          },
          {
            heading: 'Bugfixes',
            list: [
              'Sponsor-Speichern: adDelivery und color werden jetzt korrekt gespeichert',
              'PDF-Export: Bessere Fehlerbehandlung mit aussagekräftiger Fehlermeldung',
              'handleSave: Kein doppeltes Budget-Feld mehr'
            ]
          }
        ]
      },
      {
        id: 'v2-7-5',
        title: 'v2.7.5 — Sonderbuchung, PDF-Layouts, Querformat & Sponsoring-Fixes',
        summary: 'Sonderbuchungen im Episoden-Editor, Hoch-/Querformat in PDF-Layouts, Inhalts-Konfiguration pro Export-Typ, System-Layout-Deaktivierung, Budget-Feld entfernt und Werbebuchungen für Entwurfs-Episoden ohne Datum.',
        icon: <Megaphone size={18} />,
        tags: ['update', 'werbung', 'episoden-editor', 'sponsoring', 'pdf-layouts', 'media-library', 'bugfix'],
        content: [
          {
            heading: 'Sonderbuchung im Episoden-Editor',
            text: 'Im Werbebuchungs-Dialog gibt es jetzt zwei Modi: "Gebuchter Werbeplatz" (wie bisher) und "Sonderbuchung". Mit einer Sonderbuchung kann direkt ein Sponsor und eine Werbekategorie ausgewählt werden, ohne dass vorher ein Werbeplatz angelegt wurde – ideal für spontane Kooperationen.',
            list: [
              'Sponsor direkt aus allen aktiven Sponsoren auswählen',
              'Werbekategorie optional zuweisen',
              'Interne Notiz für die Sonderbuchung hinterlegen',
              'Exklusivitäts-Check wird auch bei Sonderbuchungen durchgeführt'
            ]
          },
          {
            heading: 'Korrigierte Verfügbarkeitslogik',
            text: 'Die Abfrage für verfügbare Werbeplätze wurde grundlegend überarbeitet. Die Vertragslaufzeit des Sponsors wird jetzt korrekt berücksichtigt: Ein Werbeplatz ist verfügbar, wenn das Episodendatum innerhalb der Vertragslaufzeit liegt. Außerdem werden jetzt alle Slots außer "abgelehnt", "archiviert" und "storniert" als buchbar angezeigt – nicht mehr nur "bestätigt" und "aktiv". Bei leeren Slots wird ein hilfreicher Hinweis mit Tipps angezeigt.'
          },
          {
            heading: 'Media Library: Kommentare werden angezeigt',
            text: 'Kommentare in der Media Library wurden nicht angezeigt, weil das Backend den Kommentartext im Feld "text" speicherte, das Frontend aber "content" erwartete. Beide Felder werden jetzt unterstützt. Auch der Benutzername wurde nicht korrekt übertragen – dies ist ebenfalls behoben.'
          },
          {
            heading: 'PDF-Layouts: Hoch- und Querformat',
            text: 'Im PDF-Layout-Manager kann jetzt für jedes Layout das Seitenformat gewählt werden: Hochformat (Portrait) oder Querformat (Landscape). Die Auswahl erfolgt über zwei visuelle Schaltflächen mit Seiten-Icon.'
          },
          {
            heading: 'PDF-Layouts: Inhalts-Konfiguration pro Export-Typ',
            text: 'Die Sektionen-Einstellungen im PDF-Layout-Manager sind jetzt nach Export-Typ gruppiert. Bei einem Episoden-Layout werden nur die relevanten Episoden-Sektionen angezeigt, bei einem Rechnungs-Layout nur die Rechnungs-Sektionen usw. Bei Export-Typ "Alle" werden alle Gruppen angezeigt.',
            list: [
              'Episoden: Meta, Beschreibung, Blöcke, Produktionsinfos, Technik, Notizen, Sponsoren',
              'Ideen: Beschreibung, Notizen, Recherche, Fragen, Checkliste',
              'Kalender: Legende',
              'Rechnung: Details, Zusammenfassung'
            ]
          },
          {
            heading: 'PDF-Layouts: System-Layouts deaktivieren',
            text: 'System-Layouts (Standard und Minimal) können jetzt deaktiviert werden. Ein deaktiviertes System-Layout wird nicht mehr als Fallback verwendet. Die Fallback-Reihenfolge ist: (1) Eigenes Standard-Layout für den Export-Typ, (2) beliebiges eigenes Layout für den Typ, (3) eigenes "Alle"-Layout, (4) System-Layout (wenn aktiviert), (5) absoluter Fallback.'
          },
          {
            heading: 'Sponsoring: Budget-Feld entfernt',
            text: 'Das Budget-Feld im Sponsoring wurde entfernt, da die Abrechnung nach Platzierungen in Folgen erfolgt. Die Gesamteinnahmen werden jetzt automatisch aus den angelegten Platzierungen berechnet und angezeigt.'
          },
          {
            heading: 'Werbebuchungen bei Entwurfs-Episoden',
            text: 'Werbeplatzierungen werden jetzt auch für Episoden im Entwurfs-Status angezeigt, die noch kein Veröffentlichungsdatum haben. Der Datum-Filter wird übersprungen, wenn die Episode kein Datum besitzt.'
          }
        ]
      },
      {
        id: 'v2-7-4',
        title: 'v2.7.4 — Werbemarker im Script, Benutzer-Löschschutz & Sponsoring-Fixes',
        summary: 'Werbeplatzierungen (Pre-/Mid-/Post-Roll) werden jetzt direkt im Episoden-Script als visuelle Marker angezeigt. Benutzer können nicht mehr gelöscht werden, wenn noch Daten verknüpft sind. Sponsoring-Preise und Zeiträume werden korrekt gespeichert.',
        icon: <Megaphone size={18} />,
        tags: ['update', 'werbung', 'episoden-editor', 'sponsoring', 'benutzer', 'bugfix'],
        content: [
          {
            heading: 'Werbemarker im Episoden-Script',
            text: 'Werbebuchungen werden jetzt direkt im Script-Ablauf des Episoden-Editors als farbige Trennlinien angezeigt. Pre-Roll erscheint vor dem ersten Block, Mid-Roll nach der Block-Liste und Post-Roll am Ende. Beim Buchen einer Werbung kann die Position (Pre-Roll, Mid-Roll, Post-Roll) direkt im Buchungs-Dialog gewählt werden.'
          },
          {
            heading: 'Benutzer-Löschschutz',
            text: 'Benutzer können nicht mehr gelöscht werden, wenn noch Daten mit ihnen verknüpft sind. Das System prüft Episoden, Ideen, Sponsoren, Media-Assets und Notizen. Im Fehlerfall wird eine detaillierte Meldung mit der Anzahl der verknüpften Datensätze angezeigt.',
            list: [
              'Prüfung auf verknüpfte Episoden, Ideen, Sponsoren, Assets und Notizen',
              'Detaillierte Fehlermeldung mit Anzahl der betroffenen Datensätze',
              'Empfehlung: Inhalte zuerst einem anderen Benutzer zuweisen'
            ]
          },
          {
            heading: 'Sponsoring-Fixes',
            text: 'Mehrere Fehler im Sponsoring-Bereich wurden behoben: Preise werden jetzt korrekt aus der Werbekategorie übernommen, Vertragszeiträume und Kontaktdaten werden zuverlässig gespeichert, und Datenbankmigrationen für fehlende Spalten wurden hinzugefügt.'
          }
        ]
      },
      {
        id: 'v2-7-3',
        title: 'v2.7.3 — Kundennummern, Sponsoring-Preise aus Kategorien & Monats-Export',
        summary: 'Kundennummern für Sponsoren, automatische Preisübernahme aus Werbekategorien, Monats-Export aller Sponsoren als CSV und bereinigtes Platzierungs-Formular.',
        icon: <Package size={18} />,
        tags: ['update', 'sponsoring', 'kundennummer', 'preise', 'export'],
        content: [
          {
            heading: 'Kundennummern',
            text: 'Sponsoren können jetzt mit einer individuellen Kundennummer versehen werden (z.B. KD-10001). Diese wird in allen Exporten und der Übersicht angezeigt.'
          },
          {
            heading: 'Preise aus Werbekategorien',
            text: 'Der Preis einer Platzierung wird automatisch aus der gewählten Werbekategorie übernommen. Ein manuelles Preis-Eingabefeld ist nicht mehr nötig.'
          },
          {
            heading: 'Monats-Export',
            text: 'Auf der Sponsoring-Hauptseite können alle Sponsoren als CSV-Datei exportiert werden — ideal für die monatliche Buchhaltung.'
          }
        ]
      },
      {
        id: 'v2-7-2',
        title: 'v2.7.2 — Abrechnungsmodul, Preislisten-Export & Rechnungsnummern-Schema',
        summary: 'Separates Abrechnungsmodul im Sponsoring, automatische Rechnungsnummern-Vergabe mit konfigurierbarem Schema, Preislisten-Export, Sponsor-Hinweisfeld und neue Berechtigungen für alle Rollen.',
        icon: <Package size={18} />,
        tags: ['update', 'sponsoring', 'abrechnung', 'rechnungsnummer', 'preisliste', 'rollen', 'berechtigungen'],
        content: [
          {
            heading: 'Abrechnungsmodul',
            list: [
              'Neuer Tab „Abrechnung“ in der Sponsor-Detailseite mit vollständigem Rechnungs-Workflow',
              'Rechnungen können direkt aus Platzierungen erstellt, bearbeitet und als PDF exportiert werden',
              'Status-Verwaltung: Offen, Versendet, Bezahlt, Überfällig',
              'Preise werden automatisch aus der Werbeplatzierungs-Kategorie übernommen wenn eine Kategorie ausgewählt wird',
            ],
          },
          {
            heading: 'Automatische Rechnungsnummern',
            list: [
              'Beim Erstellen einer Platzierung wird automatisch eine Rechnungsnummer vergeben',
              'Schema konfigurierbar in den Einstellungen unter „Rechnungsnummern-Schema“',
              'Präfix frei wählbar (z.B. RE, INV, RG)',
              'Trennzeichen: Bindestrich, Schrägstrich, Punkt oder Unterstrich',
              'Jahr und Monat optional einschließen',
              'Stellenanzahl der laufenden Nummer konfigurierbar (2–5 Stellen)',
              'Live-Vorschau des Schemas direkt in den Einstellungen',
              'Zähler wird automatisch hochgezählt und in den Einstellungen gespeichert',
            ],
          },
          {
            heading: 'Preislisten-Export',
            list: [
              'Preisliste als PDF und CSV exportierbar über den Kategorien-Tab im Sponsoring',
              'Enthält alle aktiven Werbekategorien mit Preisen, Beschreibungen und Konditionen',
              'Berechtigung „Preisliste exportieren“ separat steuerbar',
            ],
          },
          {
            heading: 'Sponsor-Hinweisfeld',
            list: [
              'Im Kontakt-Tab der Sponsor-Detailseite kann ein internes Hinweisfeld hinterlegt werden',
              'Ideal für persönliche Notizen, Besonderheiten oder Erinnerungen zum Sponsor',
            ],
          },
          {
            heading: 'Neue Berechtigungen (v2.7.x)',
            table: {
              headers: ['Berechtigung', 'Beschreibung', 'Standard-Rollen'],
              rows: [
                ['canManageSponsors', 'Vollständige Sponsor-Verwaltung', 'Admin'],
                ['canViewInvoices', 'Rechnungen ansehen', 'Admin, Redakteur, Moderator, Produktion'],
                ['canCreateInvoices', 'Rechnungen erstellen', 'Admin'],
                ['canEditInvoices', 'Rechnungen bearbeiten', 'Admin'],
                ['canExportPricelist', 'Preisliste exportieren', 'Admin, Redakteur, Moderator'],
                ['canManagePdfLayouts', 'PDF-Layouts verwalten', 'Admin'],
                ['canManageBlocks', 'Skript-Blöcke verwalten', 'Admin, Redakteur, Moderator, Produktion'],
                ['canUseMediaLibraryInEditor', 'Media Library im Editor nutzen', 'Admin, Redakteur, Moderator, Produktion'],
              ],
            },
          },
        ],
      },
      {
        id: 'v2-7-1',
        title: 'v2.7.1 — Block-Collapse, Regieanweisungen & PDF-Layout-Vorschau',
        summary: 'Blöcke im Episoden-Editor können zugeklappt werden. Regieanweisungen in [eckigen Klammern] werden aus der Sprechzeit-Berechnung ausgeschlossen. PDF-Layout-Manager erhält eine Live-Vorschau.',
        icon: <Package size={18} />,
        tags: ['update', 'episoden-editor', 'regieanweisungen', 'pdf-layouts', 'vorschau'],
        content: [
          {
            heading: 'Episoden-Editor: Blöcke zuklappen',
            list: [
              'Jeder Block hat einen Collapse-Toggle (Pfeil-Button) im Header',
              'Zugeklappte Blöcke zeigen Titel, Typ und Dauer an',
              'Schaltflächen „Alle aufklappen“ und „Alle zuklappen“ über der Block-Liste',
            ],
          },
          {
            heading: 'Regieanweisungen in [eckigen Klammern]',
            list: [
              'Text in [eckigen Klammern] wird als Regieanweisung behandelt',
              'Regieanweisungen fließen NICHT in die automatische Sprechzeit-Berechnung ein',
              'Beispiele: [Pause 3 Sekunden], [Einspieler starten], [lachen], [Musik einblenden]',
              'Im Block-Header werden Sprecher-Wörter (W) und Regieanweisungen (R) getrennt angezeigt',
              'Alle Regieanweisungen werden als farbige Chips am unteren Rand des Blocks aufgelistet',
            ],
          },
          {
            heading: 'PDF-Layout-Manager: Live-Vorschau',
            list: [
              'Vorschau-Button in der Kopfzeile jedes Layouts',
              'Eingebetteter PDF-Viewer direkt in der Seite mit 2-seitigem Musterdokument',
              'Aktualisieren-Button generiert Vorschau neu — auch mit ungespeicherten Änderungen',
              'Vollbild-Button öffnet das PDF in einem neuen Tab',
              'Hinweis bei ungespeicherten Änderungen',
            ],
          },
        ],
      },
      {
        id: 'v2-7-0',
        title: 'v2.7.0 — Custom PDF-Layouts, Media Library Dauer & Sponsoring-Automatik',
        summary: 'Eigene PDF-Layouts für alle Export-Optionen, automatische Dauer-Erkennung in der Media Library, zeitgesteuerte Werbebuchungen ohne Folgenverknüpfung und Exklusivitäts-Check.',
        icon: <Package size={18} />,
        tags: ['update', 'pdf-layouts', 'media-library', 'sponsoring', 'automatik'],
        content: [
          {
            heading: 'Custom PDF-Layouts',
            list: [
              'Neuer Bereich „PDF-Layouts“ in der Navigation',
              'Eigene Layouts für alle vier Export-Typen: Episode, Idee, Kalender, Rechnung',
              'Konfigurierbar: Farben, Typografie, Header-Stil, Footer, Sektionen',
              'Layout-Auswahl an jedem PDF-Export-Button',
              'Standard-Layout wird automatisch verwendet wenn kein Layout gewählt',
            ],
          },
          {
            heading: 'Media Library: Automatische Dauer-Erkennung',
            list: [
              'Beim Upload wird die Dauer von Audio- und Video-Dateien automatisch erkannt (via ffprobe)',
              'Dauer wird in der Media Library als mm:ss angezeigt',
              'Dauer wird beim Einfügen in den Episoden-Editor übernommen',
            ],
          },
          {
            heading: 'Sponsoring-Automatik',
            list: [
              'Werbebuchungen können ohne verknüpfte Folge angelegt werden (nur Zeitraum)',
              'Beim Erstellen oder Aktualisieren einer Episode wird automatisch geprüft ob eine Buchung für den Zeitraum vorliegt',
              'Exklusivitäts-Check: Nur eine Buchung mit is_exclusive=true pro Episode möglich',
              'Automatisch zugewiesene Buchungen erscheinen im Sponsoren-Tab der Episode',
            ],
          },
          {
            heading: 'Episoden-Editor Pro',
            list: [
              'Automatische Zeitberechnung aus Wortanzahl (150 Wörter/Minute)',
              'Media Library Integration: Intros, Outros und Jingles direkt auswählbar',
              'Platzhalter-Blöcke: Wenn keine Datei verknüpft ist, wird der Block als Platzhalter mit Dauer angezeigt',
              'PDF-Export: Technische Marker ([INTRO] etc.) und HTML-Formatierungen entfernt',
            ],
          },
        ],
      },
      {
        id: 'v2-6-0',
        title: 'v2.6.0 — Erweitertes Sponsoring-System & Werbung im Episoden-Editor',
        summary: 'Preislisten für Werbekategorien, Präsentations-Kategorien (z.B. „Der Pfotenabdruck der Woche präsentiert von...“), automatische Werbe-Integration im Episoden-Editor mit Bestätigungs-Workflow.',
        icon: <Package size={18} />,
        tags: ['update', 'sponsoring', 'werbung', 'episoden-editor', 'preisliste', 'kategorien'],
        content: [
          {
            heading: 'Neue Features',
            list: [
              'Werbekategorien: Vollständige Verwaltung mit Name, Farbe, Standard-Position, Standard-Dauer und Präsentations-Template',
              'Preislisten: Basispreis, Preis pro Episode und Preis pro 1.000 Abrufe pro Kategorie definierbar',
              'Präsentations-Text: z.B. „Der Pfotenabdruck der Woche wird Ihnen präsentiert von Sponsor XY“',
              'Episode-Ad-Buchungen: Neue Tabelle episode_ad_bookings verknüpft Werbeplatzierungen direkt mit Episoden',
              'Werbung-Tab im Episoden-Editor: Zeigt alle gebuchten Werbungen mit Position, Script und Präsentationstext',
              'Bestätigungs-Workflow: Werbungen können als bestätigt / nicht bestätigt markiert werden',
              'Werbe-Übersicht: Zusammenfassung nach Position (Pre-Roll, Mid-Roll, Post-Roll, Host-Read) mit Gesamtdauer',
              'Verfügbare Slots: Beim Hinzufügen einer Werbung werden alle aktiven Werbeplatzierungen zur Auswahl angeboten',
              'Script-Auto-Fill: Script und Präsentationstext werden automatisch aus der Werbeplatzierung übernommen',
            ],
          },
        ],
      },
      {
        id: 'v2-5-0',
        title: 'v2.5.0 — Globales Podcast-Profil, Technische Standards & Episoden-Dashboard',
        summary: 'Podcast-Profil wird global vom Admin definiert und überall in der App angezeigt. Technische Daten einmalig als Standard festlegen. Neues Episoden-Dashboard mit Kalender, Statistiken und Listenansicht.',
        icon: <Package size={18} />,
        tags: ['update', 'podcast-profil', 'technische-daten', 'episoden-dashboard', 'kalender', 'statistiken'],
        content: [
          {
            heading: 'Neue Features',
            list: [
              'Globales Podcast-Profil: Admin definiert einmal, alle Nutzer sehen dieselben Daten überall in der App',
              'Technische Standard-Daten: Einmalig in den Einstellungen festlegen (Sample Rate, Bitrate, Format, DAW etc.) — werden als Vorlage für neue Episoden verwendet',
              'AppContext: PodcastProfile und TechnicalDefaults global verfügbar via usePodcastProfile()-Hook',
              'Episoden-Dashboard: Neue Seite /episodes-dashboard mit Kalender-Ansicht, Listenansicht und Statistiken',
              'Kalender-View: Monat/Jahr-Navigation, Episoden farblich nach Status markiert, Klick auf Tag zeigt Details',
              'Statistiken-View: Status-Verteilung als Balkendiagramm, Episoden pro Monat, Podcast-Profil-Übersicht',
              'Listenansicht: Filterbare Tabelle aller Episoden mit Status, Datum und Direktlink',
              'PDF-Export: Monatsübersicht als PDF für Besprechungen und Planung',
              'Einstellungen: Podcast-Profil-Speicherung aktualisiert AppContext global sofort',
            ],
          },
        ],
      },
      {
        id: 'v2-4-1',
        title: 'v2.4.1 — Versionsanzeige-Fix & chatApi-Integration',
        summary: 'Kritischer Fix: Versionsnummer wurde in der Sidebar falsch als v2.1.2 angezeigt. Ursache: dist/public-Verzeichnis wurde nicht korrekt aktualisiert. chatApi-Modul in api.ts ergänzt.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'version', 'chat'],
        content: [
          {
            heading: 'Bug-Fixes',
            list: [
              'Versionsanzeige: Sidebar zeigte v2.1.2 statt v2.4.0 — dist/public wird jetzt korrekt aktualisiert',
              'chatApi: Fehlende chatApi-Exportfunktion in api.ts ergänzt (getChannels, getMessages, sendMessage, deleteMessage, getUnreadCount)',
              'Episode-Workflow: ideaId wird jetzt korrekt aus der Datenbank zurückgegeben (parseEpisode-Funktion erweitert)',
            ],
          },
        ],
      },
      {
        id: 'v2-4-0',
        title: 'v2.4.0 — Kalender, Team-Chat & Redaktionshub-Workflow',
        summary: 'Redaktionskalender mit PDF-Export, internes Team-Chat-Kommunikationstool, Episode-Editor mit Redaktionshub-Import und vollständige Workflow-Integration.',
        icon: <Package size={18} />,
        tags: ['update', 'kalender', 'chat', 'kommunikation', 'workflow', 'episode', 'pdf'],
        content: [
          {
            heading: 'Neue Features',
            list: [
              'Redaktionskalender: Neue Seite /calendar mit Monat/Jahr-Übersicht aller Episoden und Redaktionsplan-Einträge',
              'Kalender PDF-Export: Monatsübersicht als professionelles PDF für Besprechungen und Planung',
              'Kalender Jahresansicht: Alle 12 Monate auf einen Blick, Klick wechselt in Monatsansicht',
              'Team-Chat: Neues internes Kommunikationstool unter /chat mit 4 Kanälen (Allgemein, Redaktion, Technik, Ankündigungen)',
              'Chat-Polling: Nachrichten werden automatisch alle 5 Sekunden aktualisiert',
              'Chat-Unread-Badge: Ungelesene Nachrichten werden als Badge in der Navigation angezeigt',
              'Episode-Editor: Neuer "Hub importieren"-Button lädt alle Daten aus der verknüpften Ideenmappe',
              'Hub-Import: Notizen, Recherche-Quellen, Interview-Fragen und Checkliste werden in Episode-Notizen übernommen',
            ],
          },
          {
            heading: 'Bug-Fixes',
            list: [
              'Assets-Kommentare: Feldname-Mismatch zwischen Frontend (content) und Backend (text) behoben',
              'Interview-Fragen: Werden beim Episode-Erstellen aus Ideenmappe jetzt korrekt übernommen',
              'Ideenmappe PDF-Export: Exportiert alle Tabs (Recherche, Interview, Notizen, Checkliste) korrekt',
            ],
          },
          {
            tip: 'Der Redaktionskalender ist über die Seitenleiste erreichbar. Der Team-Chat unterstützt alle Benutzerrollen — Admins können Nachrichten anderer Nutzer löschen.',
          },
        ],
      },
      {
        id: 'v2-1-3',
        title: 'v2.1.3 — Bugfix: Episode erstellen aus Ideen-Arbeitsmappe',
        summary: 'Kritischer Bug behoben: "Episode erstellen" im Tab der Ideen-Arbeitsmappe führte zu einem internen Serverfehler (500). Ursache war ein falscher Spaltenname im SQL-INSERT.',
        icon: <Package size={18} />,
        tags: ['update', 'bugfix', 'ideen', 'episode', 'sql'],
        content: [
          {
            heading: 'Bug-Fix',
            list: [
              'Episode erstellen aus Ideen-Arbeitsmappe: Interner Serverfehler (500) behoben',
              'Ursache: SQL-INSERT verwendete Spaltenname show_notes, die episodes-Tabelle hat jedoch notes',
              'Fix: INSERT INTO episodes (..., show_notes, ...) → (..., notes, ...) korrigiert',
              'Notizen und Recherche-Quellen der Idee werden jetzt korrekt in die neue Episode übernommen',
            ],
          },
          {
            tip: 'Beim Erstellen einer Episode aus einer Idee werden Notizen und Recherche-Quellen automatisch in das Notizen-Feld der neuen Episode übertragen.',
          },
        ],
      },
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
        id: 'v2-9-12',
        title: 'v2.9.12 — Bugfix: Rollen, Audio-Editor, DB-Migration',
        summary: 'Rollen-Berechtigungen werden jetzt beim Server-Start automatisch aktualisiert. Audio-Editor-Button dauerhaft sichtbar.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'v2.9.12'],
        content: [
          {
            heading: 'Behobene Fehler',
            list: [
              'Rollen-Berechtigungen (Produktion, Redakteur, Moderator) werden jetzt beim Server-Start automatisch auf den neuesten Stand gebracht – auch bei bestehenden Installationen.',
              'Audio-Editor-Button (Schere) ist jetzt dauerhaft sichtbar (nicht mehr nur bei Hover) und orange eingefärbt.',
              'DB-Fehler presentation_text in episode_ad_bookings behoben.',
            ],
          },
        ],
      },
      {
        id: 'v2-9-13',
        title: 'v2.9.13 — Bugfix: Werbebuchung & Browser-Cache',
        summary: 'Standard-Buchungsmodus auf Sonderbuchung gesetzt. Browser-Cache-Problem durch neuen Build behoben.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'v2.9.13'],
        content: [
          {
            heading: 'Behobene Fehler',
            list: [
              'Buchungs-Modal öffnet jetzt standardmäßig die Sonderbuchung (kein vorhandener Ad-Slot erforderlich).',
              'Browser-Cache-Problem behoben: Neuer Build erzwingt Laden des aktuellen JavaScript-Bundles.',
              'Werbung löschen im Episoden-Editor funktioniert nun zuverlässig.',
            ],
          },
        ],
      },
      {
        id: 'v2-9-14',
        title: 'v2.9.14 — Kritischer Fix: Berechtigungssystem, Werbung & Audio-Editor',
        summary: 'Root-Cause-Fix für das Berechtigungssystem: Auth-Middleware lädt jetzt automatisch Rollen-Berechtigungen aus der roles-Tabelle. Reset-Button für System-Rollen im Admin-Panel.',
        icon: <Package size={18} />,
        tags: ['bugfix', 'v2.9.14'],
        content: [
          {
            heading: 'Kritische Fehler behoben',
            list: [
              'Berechtigungssystem (Root Cause Fix): Die Auth-Middleware las bisher nur die permissions-Spalte der users-Tabelle. Diese war bei bestehenden Nutzern leer {}. Jetzt wird automatisch auf die roles-Tabelle zurückgegriffen, wenn keine individuellen Berechtigungen gesetzt sind.',
              'Alle Rollen (Redakteur, Moderator, Produktion) haben jetzt korrekte Berechtigungen ohne manuelle DB-Eingriffe.',
              'Werbung löschen: Funktioniert korrekt, sobald Berechtigungen (canEditSponsors) korrekt gesetzt sind.',
              'Audio-Editor: Sichtbar und funktional für alle Nutzer mit canViewMedia-Berechtigung.',
            ],
          },
          {
            heading: 'Neue Funktion: Standard-Berechtigungen zurücksetzen',
            text: 'Im Admin-Panel unter Rollen gibt es jetzt den Button „Standard-Berechtigungen“. Damit können alle System-Rollen (Admin, Redakteur, Moderator, Produktion, Leser) auf die definierten Standardwerte zurückgesetzt werden.',
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
          {section.text && <p className="bg-transparent">{section.text}</p>}
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
