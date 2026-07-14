import React, { useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FileEdit,
  FileText,
  Folder,
  HardDrive,
  Headphones,
  HelpCircle,
  LayoutDashboard,
  Library,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Mic2,
  Package,
  Palette,
  Search,
  Settings,
  Shield,
  Sliders,
  Upload,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';

interface WikiSection {
  heading?: string;
  text?: string;
  list?: string[];
  tip?: string;
}

interface WikiArticle {
  id: string;
  title: string;
  summary: string;
  content: WikiSection[];
  tags: string[];
  icon: React.ReactNode;
  adminOnly?: boolean;
  compact?: boolean;
}

interface WikiCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  articles: WikiArticle[];
}

const wikiData: WikiCategory[] = [
  {
    id: 'start',
    label: 'Start & Navigation',
    description: 'Anmeldung, Oberfläche und grundlegende Arbeitsweise.',
    icon: <LayoutDashboard size={16} />,
    color: 'text-accent-blue',
    articles: [
      {
        id: 'erste-schritte',
        title: 'Erste Schritte in PodCore',
        summary: 'So melden Sie sich an, orientieren sich in der Oberfläche und beginnen Ihre tägliche Arbeit.',
        icon: <Zap size={18} />,
        tags: ['start', 'anmeldung', 'navigation', 'dashboard'],
        content: [
          {
            heading: 'Anmelden und abmelden',
            text: 'Öffnen Sie PodCore im Browser und melden Sie sich mit Ihrem Benutzernamen und Passwort an. Über das Benutzerkonto in der Navigation können Sie Ihr Profil öffnen oder sich sicher abmelden.',
          },
          {
            heading: 'Hauptnavigation',
            text: 'Die Seitenleiste führt zu den für Ihre Rolle freigeschalteten Bereichen. Nicht sichtbare Menüpunkte sind entweder deaktiviert oder für Ihre Rolle nicht freigegeben.',
            list: [
              'Dashboard für Überblick, Kennzahlen und Schnellzugriffe',
              'Episoden, Episodenplanung und Staffeln für die Produktionsplanung',
              'RedaktionsHub für Ideen, Themenwerkstatt, Recherche und Textbausteine',
              'Media Library für Audio, Bilder, Dokumente und Produktionsmarken',
              'Sponsoring für Kontakte, Verträge, Buchungen, Abrechnung und Auswertungen',
              'Statistiken und Podigee für Reichweiten- und Downloaddaten',
              'Einstellungen, PDF-Layouts, Administration und dieses Wiki',
            ],
          },
          {
            heading: 'Meldungen und Speichern',
            text: 'Erfolgreiche Aktionen und Fehler werden als Meldung angezeigt. Warten Sie bei Datei- und PDF-Exporten auf die Abschlussmeldung. Bei Formularen sollten Pflichtfelder vollständig ausgefüllt sein, bevor Sie speichern.',
            tip: 'Wenn eine Funktion fehlt, prüfen Sie zuerst, ob das zugehörige Modul aktiv ist und Ihre Rolle die erforderliche Berechtigung besitzt.',
          },
        ],
      },
      {
        id: 'dashboard',
        title: 'Dashboard und Schnellzugriffe',
        summary: 'Das Dashboard bündelt aktuelle Aufgaben, Episodenstände und wichtige Kennzahlen.',
        icon: <Activity size={18} />,
        tags: ['dashboard', 'übersicht', 'schnellzugriff'],
        content: [
          {
            heading: 'Überblick nutzen',
            text: 'Das Dashboard ist der Startpunkt nach der Anmeldung. Es zeigt aktuelle Episoden, Produktionsstände und Schnellzugriffe auf häufig benötigte Arbeitsbereiche.',
          },
          {
            heading: 'Direkt weiterarbeiten',
            text: 'Öffnen Sie vorhandene Einträge direkt aus den Dashboard-Karten oder wechseln Sie über die Navigation in die vollständige Listenansicht. Neue Episoden können, sofern freigegeben, ebenfalls über einen Schnellzugriff angelegt werden.',
          },
        ],
      },
      {
        id: 'profil-design',
        title: 'Eigenes Profil und persönliches Design',
        summary: 'Persönliche Angaben, Passwort und Darstellungsfarben verwalten.',
        icon: <Palette size={18} />,
        tags: ['profil', 'passwort', 'design', 'theme'],
        content: [
          {
            heading: 'Profil und Passwort',
            text: 'Unter Einstellungen > Mein Profil ändern Sie Ihre persönlichen Daten. Das Passwort wird im separaten Bereich geändert und muss anschließend für die nächste Anmeldung verwendet werden.',
          },
          {
            heading: 'Persönliche Darstellung',
            text: 'Unter Mein Design können Sie Akzent- und Hintergrundfarben auswählen. Die Vorschau zeigt die Wirkung vor dem Speichern. Diese Einstellung betrifft Ihr eigenes Benutzerkonto.',
          },
        ],
      },
    ],
  },
  {
    id: 'episodes',
    label: 'Episoden & Planung',
    description: 'Episoden anlegen, strukturieren, produzieren und veröffentlichen.',
    icon: <Mic2 size={16} />,
    color: 'text-accent-purple',
    articles: [
      {
        id: 'episodenliste',
        title: 'Episodenliste und Status',
        summary: 'Episoden suchen, filtern, duplizieren, löschen und nach Produktionsstatus organisieren.',
        icon: <Mic2 size={18} />,
        tags: ['episoden', 'status', 'filter', 'duplizieren'],
        content: [
          {
            heading: 'Episode anlegen',
            text: 'Öffnen Sie Episoden und wählen Sie Neue Episode. Vergeben Sie Titel, Episodennummer, Beschreibung und einen Startstatus.',
          },
          {
            heading: 'Suchen und filtern',
            text: 'Nutzen Sie Suchfeld und Statusfilter, um auch umfangreiche Episodenlisten schnell einzugrenzen.',
            list: ['Idee', 'Entwurf', 'Aufnahme', 'Produktion', 'Geplant', 'Veröffentlicht', 'Archiviert'],
          },
          {
            heading: 'Duplizieren und löschen',
            text: 'Duplizieren übernimmt eine Episode als Arbeitsgrundlage für einen neuen Eintrag. Löschen entfernt den gewählten Datensatz nach Bestätigung und sollte nur erfolgen, wenn keine weitere Verwendung besteht.',
          },
        ],
      },
      {
        id: 'episoden-editor',
        title: 'Episoden-Editor und Script',
        summary: 'Scriptblöcke, Metadaten, Show Notes, Produktion, Technik, Werbung und Vorschau bearbeiten.',
        icon: <FileEdit size={18} />,
        tags: ['editor', 'script', 'show notes', 'metadaten', 'technik'],
        content: [
          {
            heading: 'Script',
            text: 'Strukturieren Sie die Episode mit verschiebbaren Blöcken. Verfügbare Typen umfassen Intro, Segment, Interview, Interview-Fragen, Highlights, Werbung, Jingle, Outro und benutzerdefinierte Blöcke.',
          },
          {
            heading: 'Text bearbeiten',
            text: 'Der Editor unterstützt Fett, Kursiv, Unterstrichen, Überschriften, Zitate, Code, Aufzählungen und Textausrichtung. Vorlagen können gespeichert und später in anderen Episoden geladen werden.',
          },
          {
            heading: 'Weitere Tabs',
            list: [
              'Show-Notes für veröffentlichungsfertige Begleittexte',
              'Metadaten für Titel, Untertitel, Beschreibung, Status und Veröffentlichung',
              'Produktion für organisatorische Produktionsangaben',
              'Technik für Audio-Spezifikationen, Hard- und Software, Nachbearbeitung, Musik und Lizenzen',
              'Werbung für Sponsoring und gebuchte Werbeplätze',
              'Vorschau für die zusammengeführte Lesefassung',
              'Redaktionshub für übernommene Ideen, Themenentwürfe, Textbausteine und Interview-Partner',
            ],
          },
          {
            heading: 'Abschlusskontrolle',
            text: 'Die Zusammenfassung und Checkliste zeigen fehlende Kerndaten wie Titel, Script, Show Notes, Beschreibung, Technikdaten und Veröffentlichungsdatum.',
          },
        ],
      },
      {
        id: 'episoden-planung',
        title: 'Episodenplanung und Staffeln',
        summary: 'Veröffentlichungen zeitlich planen, Kalender exportieren und Episoden Staffeln zuordnen.',
        icon: <Calendar size={18} />,
        tags: ['planung', 'kalender', 'staffeln', 'csv', 'pdf'],
        content: [
          {
            heading: 'Episodenplanung',
            text: 'Die Planungsansicht ordnet Episoden nach ihren Terminen und Produktionsständen. Kalenderdaten können als CSV oder PDF exportiert werden.',
          },
          {
            heading: 'Staffeln',
            text: 'Legen Sie Staffeln mit Nummer, Titel, Beschreibung, Zeitraum und Status an. Episoden können anschließend einer Staffel zugeordnet oder wieder entfernt werden.',
            list: ['Aktiv', 'Geplant', 'Abgeschlossen'],
          },
        ],
      },
      {
        id: 'freigabe-zusammenarbeit',
        title: 'Kommentare, Änderungen und Freigaben',
        summary: 'Episoden im Team kommentieren, Änderungen nachvollziehen und Freigaben steuern.',
        icon: <MessageSquare size={18} />,
        tags: ['kommentare', 'freigabe', 'änderungsverlauf', 'team'],
        content: [
          {
            heading: 'Feldbezogene Kommentare',
            text: 'Kommentare können Bereichen wie Titel, Beschreibung, Script, Sponsoring, Medien oder Allgemein zugeordnet werden. Dadurch bleibt Feedback direkt am betroffenen Arbeitsschritt.',
          },
          {
            heading: 'Änderungsverlauf',
            text: 'Der Verlauf dokumentiert Bearbeitungen an einer Episode. Berechtigte Benutzer können frühere Stände vergleichen und, wenn angeboten, wiederherstellen.',
          },
          {
            heading: 'Freigabestatus',
            text: 'Der Freigabeprozess unterscheidet Ausstehend, Freigabe angefragt, Freigegeben und Zur Überarbeitung. Verwenden Sie Kommentare, um Rückfragen oder Korrekturwünsche nachvollziehbar zu dokumentieren.',
          },
        ],
      },
    ],
  },
  {
    id: 'editorial',
    label: 'RedaktionsHub',
    description: 'Ideen entwickeln, recherchieren und in Episoden überführen.',
    icon: <Lightbulb size={16} />,
    color: 'text-accent-amber',
    articles: [
      {
        id: 'ideen-workflow',
        title: 'Ideen verwalten und ausarbeiten',
        summary: 'Vom Ideeneintrag bis zur verknüpften Episode mit Status, Priorität und vollständiger Ideenmappe.',
        icon: <Lightbulb size={18} />,
        tags: ['ideen', 'status', 'priorität', 'ideenmappe'],
        content: [
          {
            heading: 'Idee anlegen und pflegen',
            text: 'Erfassen Sie Titel, Beschreibung, Status und Priorität. In der Detailansicht finden Sie Übersicht, Themenwerkstatt, Recherche, Interview, Notizen, Checkliste und Episode erstellen.',
          },
          {
            heading: 'Fortschritt erkennen',
            text: 'Die Übersicht zeigt die Anzahl verknüpfter Quellen, Dateien, Interview-Partner, Fragen, Notizen und erledigter Aufgaben.',
          },
          {
            heading: 'Episode erstellen',
            text: 'Aus einer ausgearbeiteten Idee kann direkt eine Episode erzeugt werden. Die Verknüpfung bleibt erhalten, damit Inhalte später im Episoden-Redaktionshub übernommen werden können.',
          },
        ],
      },
      {
        id: 'themenwerkstatt',
        title: 'Themenwerkstatt',
        summary: 'Ein Thema redaktionell schärfen und als vollständigen Entwurf für Script und Veröffentlichung vorbereiten.',
        icon: <BookOpen size={18} />,
        tags: ['themenwerkstatt', 'leitfrage', 'teaser', 'show notes', 'cta'],
        content: [
          {
            heading: 'Redaktionelle Felder',
            text: 'Die Themenwerkstatt bündelt Perspektive, Leitfrage, Kernaussage, Zielgruppennutzen, Arbeitstitel, Teaser, Episodenbeschreibung, Show Notes, Call-to-Action und Haupttext.',
          },
          {
            heading: 'Weiterverwendung',
            text: 'Nach dem Verknüpfen mit einer Episode können Teaser, Beschreibung, Show Notes, Haupttext und Call-to-Action gezielt in passende Episodenfelder oder Scriptblöcke übernommen werden.',
          },
          {
            heading: 'PDF-Export',
            text: 'Der Ideenmappen-PDF-Export enthält alle befüllten Themenwerkstatt-Felder. Nicht befüllte Felder werden ausgelassen, damit das Dokument übersichtlich bleibt.',
          },
        ],
      },
      {
        id: 'recherche',
        title: 'Recherche, Dateien und freie Texte',
        summary: 'Quellen, Notizen, Dokumente und eigenständige Recherchetexte an einer Idee sammeln.',
        icon: <Search size={18} />,
        tags: ['recherche', 'quelle', 'freier text', 'upload', 'datei'],
        content: [
          {
            heading: 'Quellen und freie Texte',
            text: 'Fügen Sie Links mit URL oder eigenständige freie Texte ohne URL hinzu. Beide Varianten können Titel, Beschreibung beziehungsweise Zusammenfassung, Hauptinhalt, Tags und einen Bearbeitungsstatus erhalten.',
          },
          {
            heading: 'Status verwenden',
            list: ['Ungelesen', 'In Bearbeitung', 'Gelesen', 'Wichtig', 'Archiviert'],
          },
          {
            heading: 'Dateien',
            text: 'Laden Sie ergänzende Dokumente an einer Idee hoch. Vorhandene Dateien können heruntergeladen oder entfernt werden.',
          },
        ],
      },
      {
        id: 'interview-notizen-checkliste',
        title: 'Interview, Notizen und Checklisten',
        summary: 'Gesprächspartner, Fragen, redaktionelle Notizen und offene Aufgaben gemeinsam vorbereiten.',
        icon: <UserCheck size={18} />,
        tags: ['interview', 'fragen', 'notizen', 'checkliste'],
        content: [
          {
            heading: 'Interview vorbereiten',
            text: 'Hinterlegen Sie Interview-Partner und erstellen Sie dazu passende Fragen. Diese Inhalte können später in der verknüpften Episode genutzt werden.',
          },
          {
            heading: 'Notizen und Aufgaben',
            text: 'Notizen halten freie redaktionelle Informationen fest. Die Checkliste strukturiert Aufgaben und zeigt erledigte sowie offene Punkte.',
          },
        ],
      },
      {
        id: 'textbausteine-kalender-archiv',
        title: 'Textbausteine, Redaktionskalender und Archiv',
        summary: 'Wiederverwendbare Texte organisieren, Termine planen und abgeschlossene Inhalte archivieren.',
        icon: <Archive size={18} />,
        tags: ['textbausteine', 'kalender', 'archiv', 'vorlagen'],
        content: [
          {
            heading: 'Textbausteine',
            text: 'Textbausteine können global oder einer Idee zugeordnet sein. Typen wie Intro, Outro, Teaser, Beschreibung, Show Notes, CTA, Sponsoring, Übergang, Frage und freier Baustein erleichtern die spätere Übernahme in Episoden.',
          },
          {
            heading: 'Redaktionskalender',
            text: 'Planen Sie redaktionelle Termine und behalten Sie Ideen sowie Veröffentlichungen im zeitlichen Zusammenhang im Blick. Verfügbare Exportfunktionen nutzen das ausgewählte Kalender-PDF-Layout.',
          },
          {
            heading: 'Archiv',
            text: 'Archivierte Redaktionsinhalte bleiben auffindbar, ohne die aktive Arbeitsansicht zu überladen. Stellen Sie Einträge wieder her, wenn sie erneut bearbeitet werden sollen.',
          },
        ],
      },
    ],
  },
  {
    id: 'media',
    label: 'Media & Produktion',
    description: 'Medien organisieren, anhören, markieren und für Schnittprogramme exportieren.',
    icon: <Library size={16} />,
    color: 'text-accent-cyan',
    articles: [
      {
        id: 'media-library',
        title: 'Media Library',
        summary: 'Audio, Bilder und Dokumente hochladen, ordnen, suchen und mit Metadaten versehen.',
        icon: <Library size={18} />,
        tags: ['media', 'upload', 'ordner', 'audio', 'metadaten'],
        content: [
          {
            heading: 'Ordner und Dateien',
            text: 'Erstellen Sie Ordner, laden Sie Assets hoch und verwenden Sie Suche sowie Typfilter. Dateien können abgespielt, heruntergeladen, bearbeitet oder gelöscht werden.',
          },
          {
            heading: 'Medientypen',
            list: ['Intro', 'Outro', 'Jingle', 'Segment', 'Werbung', 'Interview', 'SFX', 'Musik', 'Sonstiges'],
          },
          {
            heading: 'Metadaten und Rechte',
            text: 'Ergänzen Sie unter anderem Künstler, Sprache, Lizenz, Quelle, Notizen, Audio-Informationen und eigene Felder. Pflegen Sie Rechteangaben vollständig, bevor Assets veröffentlicht werden.',
          },
          {
            heading: 'Episoden-Zuordnung',
            text: 'In der Episodendetailansicht können Medien aus der Bibliothek ausgewählt und dem Produktionskontext der Episode zugeordnet werden.',
          },
        ],
      },
      {
        id: 'audio-editor',
        title: 'Audio-Editor, Marker und Regionen',
        summary: 'Audio visuell prüfen, Schnittpunkte markieren und Daten für DAWs exportieren.',
        icon: <Headphones size={18} />,
        tags: ['audio editor', 'marker', 'regionen', 'daw', 'schnitt'],
        content: [
          {
            heading: 'Waveform bearbeiten',
            text: 'Öffnen Sie ein Audio-Asset im Editor. Waveform und Minimap unterstützen die Navigation. Marker kennzeichnen Schnittpunkte, Kapitel, Start, Ende oder Anmerkungen; Regionen markieren Zeitbereiche und können optional geloopt werden.',
          },
          {
            heading: 'Export für Schnittprogramme',
            text: 'Marker und Regionen können in geeigneten Austauschformaten exportiert werden.',
            list: ['EDL', 'Final Cut Pro XML', 'Reaper-Text', 'Audacity-Labels', 'Adobe Audition XML', 'CSV'],
          },
          {
            tip: 'Prüfen Sie nach dem Import in die Zielsoftware Framerate, Projektstart und Zeitbasis, bevor Sie mit dem Schnitt beginnen.',
          },
        ],
      },
    ],
  },
  {
    id: 'sponsoring',
    label: 'Sponsoring',
    description: 'Sponsoren, Preise, Verträge, Buchungen, Angebote und Abrechnung verwalten.',
    icon: <Megaphone size={16} />,
    color: 'text-accent-green',
    articles: [
      {
        id: 'sponsoren-stammdaten',
        title: 'Sponsoren und Stammdaten',
        summary: 'Kontakte, Adressen, Logo, Status, Lieferart und interne Informationen pflegen.',
        icon: <Users size={18} />,
        tags: ['sponsor', 'kontakt', 'adresse', 'logo', 'status'],
        content: [
          {
            heading: 'Sponsor anlegen',
            text: 'Erfassen Sie Basisinformationen, Kontaktdaten, Beschreibung und interne Notizen. Ein Sponsor-Logo kann optional hochgeladen werden.',
          },
          {
            heading: 'Status und Material',
            text: 'Der Sponsorstatus unterscheidet Aktiv, Inaktiv, Interessent und Pausiert. Für Werbemittel kann Selbst angeliefert, Von uns produziert oder Beides möglich gewählt werden.',
          },
          {
            heading: 'Registerkarten',
            list: ['Stammdaten', 'Verträge', 'Werbe-Slots', 'Buchungen', 'Abrechnung', 'Angebote'],
          },
        ],
      },
      {
        id: 'werbekategorien-preisliste',
        title: 'Werbekategorien und Preisliste',
        summary: 'Werbeformen mit Beschreibung, Preislogik und Präsentationstext definieren und vollständig exportieren.',
        icon: <FileText size={18} />,
        tags: ['werbekategorie', 'preisliste', 'preis', 'cpm', 'pdf', 'csv'],
        content: [
          {
            heading: 'Kategorie einrichten',
            text: 'Definieren Sie Name, Beschreibung, Präsentationstext, Währung, Farbe, Exklusivität und Aktivstatus. Pflegen Sie die angebotenen Preismodelle vollständig.',
            list: ['Festpreis', 'Preis pro Folge', 'Preis pro 1.000 Hörer beziehungsweise CPM'],
          },
          {
            heading: 'Werbepositionen',
            text: 'PodCore unterscheidet Pre-Roll, Mid-Roll, Post-Roll und Host-Read. Die Position wird bei Buchungen und Auswertungen verwendet.',
          },
          {
            heading: 'Preisliste exportieren',
            text: 'Exportieren Sie Werbekategorien als CSV oder als gestaltetes PDF. Der PDF-Export enthält alle gepflegten Angaben je Kategorie und verwendet das gewählte Preislisten-Layout.',
          },
        ],
      },
      {
        id: 'vertraege-slots-buchungen',
        title: 'Verträge, Werbe-Slots und Buchungen',
        summary: 'Laufzeiten, Leistungen, Folgenzuordnung, Preise, Rabatte und Rechnungsstatus zuverlässig erfassen.',
        icon: <Calendar size={18} />,
        tags: ['vertrag', 'slot', 'buchung', 'laufzeit', 'rabatt', 'rechnung'],
        content: [
          {
            heading: 'Verträge',
            text: 'Hinterlegen Sie Vertragsnummer, Titel, Laufzeit, Status und die vereinbarten Konditionen. Verträge können als Grundlage für Buchungen und Dossiers dienen.',
          },
          {
            heading: 'Werbe-Slots',
            text: 'Werbe-Slots bilden verfügbare Werbeformen und Zeiträume ab. Wählen Sie beim Anlegen oder Bearbeiten einer Buchung die passende Werbekategorie beziehungsweise den vorgesehenen Slot.',
          },
          {
            heading: 'Buchung erfassen',
            text: 'Pflichtangaben sind Werbe-Slot beziehungsweise Kategorie sowie Laufzeit von und bis. Ergänzen Sie Platzierungen pro Folge, betroffene Folgen, Preis, Preisanpassung, Hörerbeteiligung, Vertragsfolgen, Rabatt, Buchungsstatus, Rechnungsstatus und Notizen.',
            tip: 'Fügen Sie eine Folge mit dem Plus-Schalter zur Buchung hinzu. Änderungen am Rechnungsstatus erhalten alle übrigen Buchungsdaten.',
          },
          {
            heading: 'Bestätigungen und CSV',
            text: 'Einzelne Buchungen oder alle Buchungen eines Sponsors können als Buchungsbestätigung exportiert werden. Zusätzlich steht ein CSV-Export der Buchungsdaten zur Verfügung.',
          },
        ],
      },
      {
        id: 'angebote',
        title: 'Angebote und Annahme',
        summary: 'Mehrere Angebotsoptionen erstellen, als PDF ausgeben und in verbindliche Daten überführen.',
        icon: <FileEdit size={18} />,
        tags: ['angebot', 'optionen', 'pdf', 'annahme'],
        content: [
          {
            heading: 'Angebot erstellen',
            text: 'Vergeben Sie Titel, Angebotsnummer, Gültigkeit, Einleitungs- und Abschlusstext. Legen Sie eine oder mehrere individuell benannte Optionen mit Positionen und Rabatten an.',
          },
          {
            heading: 'PDF und Annahme',
            text: 'Exportieren Sie das Angebot mit dem passenden Sponsor-Angebotslayout. Bei Annahme kann die gewählte Option in die weitere Vertrags- und Buchungsbearbeitung übernommen werden.',
          },
          {
            heading: 'Archiv',
            text: 'Abgeschlossene oder nicht mehr aktive Angebote werden in der Sponsoring-Übersicht im Archiv geführt.',
          },
        ],
      },
      {
        id: 'abrechnung-dossier',
        title: 'Abrechnung, Leistungsübersicht und Sponsor-Dossier',
        summary: 'Leistungen prüfen, Einnahmen berechnen und ein frei zusammengestelltes Sponsor-Dossier exportieren.',
        icon: <BarChart3 size={18} />,
        tags: ['abrechnung', 'leistung', 'dossier', 'tkp', 'cpm', 'pdf'],
        content: [
          {
            heading: 'Abrechnung und Leistung',
            text: 'Die Abrechnungsansicht fasst Buchungswerte, Rabatte, Rechnungsstatus und Hörerwerte zusammen. Leistungsübersichten können als PDF und CSV exportiert werden; der TKP-Kalkulator unterstützt die Bewertung reichweitenabhängiger Modelle.',
          },
          {
            heading: 'Sponsor-Dossier',
            text: 'Wählen Sie beim Export einen Dokumenttitel, ein PDF-Layout und die gewünschten Bereiche. Verfügbar sind Stammdaten, Verträge, Buchungen, Abrechnung und interne Notizen.',
          },
          {
            heading: 'Buchungskalender und Einnahmen',
            text: 'Der Buchungskalender kombiniert Episodenbuchungen, Zeitraum-Slots, Werbeplätze, Vorplanungen, Verträge und aktuelle Buchungen. Die Einnahmenansicht zeigt Werte pro Sponsor, Platzierung, Monat, Kategorie und Auslastung.',
          },
        ],
      },
      {
        id: 'sponsoring-reports',
        title: 'Sponsoring-Berichte',
        summary: 'Platzierungen, Lieferarten, Sponsoren und Werbekategorien filtern und auswerten.',
        icon: <BarChart3 size={18} />,
        tags: ['bericht', 'auswertung', 'platzierung', 'export'],
        content: [
          {
            heading: 'Bericht filtern',
            text: 'Grenzen Sie Berichte nach Sponsor und Zeitraum ein. Die Auswertung umfasst Platzierungen nach Status und Position, Werbemittel-Lieferung sowie Zusammenfassungen je Sponsor und Werbekategorie.',
          },
          {
            heading: 'Export',
            text: 'Speichern Sie die gefilterte Auswertung im angebotenen Exportformat, um sie außerhalb von PodCore weiterzugeben oder zu archivieren.',
          },
        ],
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Statistiken & Podigee',
    description: 'Reichweitenwerte erfassen und verbundene Podigee-Daten auswerten.',
    icon: <BarChart3 size={16} />,
    color: 'text-accent-cyan',
    articles: [
      {
        id: 'statistiken',
        title: 'Manuelle Podcast-Statistiken',
        summary: 'Downloads, Plays und eindeutige Hörer erfassen und nach Episode auswerten.',
        icon: <BarChart3 size={18} />,
        tags: ['statistik', 'downloads', 'plays', 'hörer'],
        content: [
          {
            heading: 'Eintrag erfassen',
            text: 'Wählen Sie Episode und Datum und tragen Sie Downloads, Plays, eindeutige Hörer sowie optionale Notizen ein. Vorhandene Werte können bearbeitet oder gelöscht werden.',
          },
          {
            heading: 'Ansichten',
            text: 'Die Übersicht zeigt Gesamtsummen, Trends und Top-Episoden. Weitere Tabs listen einzelne Einträge und zusammengefasste Werte je Episode.',
          },
        ],
      },
      {
        id: 'podigee-analytics',
        title: 'Podigee verbinden und auswerten',
        summary: 'Podigee-Zugang konfigurieren und Downloads, Clients sowie Regionen direkt in PodCore analysieren.',
        icon: <Activity size={18} />,
        tags: ['podigee', 'analytics', 'clients', 'regionen'],
        content: [
          {
            heading: 'Verbindung herstellen',
            text: 'Administratoren hinterlegen die Podigee-Verbindung unter Podcast-Einstellungen. Nach erfolgreichem Verbindungstest und Auswahl des Podcasts werden die verfügbaren Analytics-Daten geladen.',
          },
          {
            heading: 'Auswertungen',
            text: 'Die Podigee-Seite gliedert sich in Übersicht, Episoden, Apps & Clients sowie Regionen. Sie zeigt Downloadtrends, Top-Episoden und Verteilungen nach Client beziehungsweise Land.',
          },
        ],
      },
    ],
  },
  {
    id: 'pdf',
    label: 'PDF & Exporte',
    description: 'Dokumente exportieren und ihr Erscheinungsbild zentral gestalten.',
    icon: <FileText size={16} />,
    color: 'text-accent-green',
    articles: [
      {
        id: 'pdf-layouts',
        title: 'PDF-Layouts verwalten',
        summary: 'Layouts je Dokumenttyp erstellen, klonen, gestalten, prüfen und als Standard festlegen.',
        icon: <Sliders size={18} />,
        tags: ['pdf', 'layout', 'ci', 'header', 'footer', 'wasserzeichen'],
        content: [
          {
            heading: 'Layout auswählen oder erstellen',
            text: 'Filtern Sie die Layoutliste nach Exporttyp. Erstellen Sie ein neues Layout auf Basis der Standardwerte oder klonen Sie ein vorhandenes Layout als Ausgangspunkt.',
          },
          {
            heading: 'Gestaltungsbereiche',
            list: [
              'Seitenformat A4 oder Letter sowie Hoch- oder Querformat',
              'Seitenränder, Abstände und Trennlinien',
              'Farben und Typografie',
              'Header mit Logo, Podcast-Name und Dokumenttitel',
              'Footer mit Seitenzahlen, Datum und Podcast-Name',
              'Sichtbare Inhaltssektionen je Exporttyp',
              'Optionales Wasserzeichen und erweiterte Abstände',
            ],
          },
          {
            heading: 'Vorschau und Standard',
            text: 'Prüfen Sie Änderungen in der PDF-Vorschau und speichern Sie erst danach. Ein Standardlayout wird automatisch vorausgewählt, kann beim jeweiligen Export aber durch ein anderes passendes Layout ersetzt werden.',
          },
        ],
      },
      {
        id: 'export-uebersicht',
        title: 'Übersicht der Exporte',
        summary: 'Welcher Bereich welche PDF-, CSV-, Backup- oder Produktionsformate bereitstellt.',
        icon: <Download size={18} />,
        tags: ['export', 'pdf', 'csv', 'backup', 'daw'],
        content: [
          {
            heading: 'Redaktion und Episoden',
            list: ['Episoden-Dokument', 'Episoden-Skript als Tabelle', 'Ideenmappe', 'Redaktionskalender', 'Episodenplanung als PDF oder CSV'],
          },
          {
            heading: 'Sponsoring',
            list: ['Preisliste als PDF oder CSV', 'Sponsor-Angebot', 'Sponsor-Dossier', 'Buchungsbestätigung', 'Buchungskalender', 'Sponsoring-Abrechnung', 'Leistungsübersicht', 'Buchungs- und Berichtsdaten als CSV'],
          },
          {
            heading: 'Produktion und Daten',
            list: ['Audio-Marker als EDL, FCPXML, Reaper, Audacity, Audition XML oder CSV', 'Episoden-, Redaktions- und Vollbackup als JSON', 'Systembackup und Update-ZIP für Administratoren'],
          },
          {
            tip: 'Wählen Sie vor PDF-Exporten das gewünschte Layout und vergeben Sie, wenn angeboten, einen eindeutigen Dateinamen beziehungsweise Dokumenttitel.',
          },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Einstellungen & Daten',
    description: 'Podcast-Profil, Speicher, Backups, App-Konfiguration und Updates.',
    icon: <Settings size={16} />,
    color: 'text-text-secondary',
    articles: [
      {
        id: 'podcast-branding',
        title: 'Podcast-Profil und Branding',
        summary: 'Podcast-Stammdaten, Logo, Cover und technische Standardwerte pflegen.',
        icon: <Palette size={18} />,
        tags: ['podcast', 'branding', 'logo', 'cover', 'technik'],
        adminOnly: true,
        content: [
          {
            heading: 'Podcast-Stammdaten',
            text: 'Pflegen Sie Podcast-Name, Kurzbeschreibung und weitere Stammdaten. Diese Angaben werden je nach Dokumentlayout in Navigation, Berichten und PDF-Exporten verwendet.',
          },
          {
            heading: 'Logo und Cover',
            text: 'Laden Sie Logo und Cover über die Dateiauswahl oder per Drag-and-drop hoch. Prüfen Sie die Vorschau und verwenden Sie geeignete, ausreichend große Bilddateien.',
          },
          {
            heading: 'Technische Standarddaten',
            text: 'Hinterlegen Sie wiederkehrende Audio-Spezifikationen, Hard- und Software, Nachbearbeitung sowie Musik- und Lizenzhinweise als Standard für neue Episoden.',
          },
        ],
      },
      {
        id: 'speicher-backup-import',
        title: 'Speicher, Backup und Datenimport',
        summary: 'Speicherbackend wählen, Daten exportieren, Backups erstellen und kontrolliert wieder einspielen.',
        icon: <HardDrive size={18} />,
        tags: ['speicher', 'backup', 'import', 'webdav', 'sftp', 's3'],
        adminOnly: true,
        content: [
          {
            heading: 'Speicherbackend',
            text: 'Je nach Installation kann die Medienablage lokal oder über WebDAV, SFTP beziehungsweise S3 erfolgen. Testen Sie neue Zugangsdaten vor dem Speichern und ändern Sie produktive Speicherziele nur mit vorhandenem Backup.',
          },
          {
            heading: 'Datenexport',
            text: 'Podcast-Einstellungen bieten JSON-Exporte für Episoden, Redaktion und ein vollständiges Backup. Gespeicherte Backups können verwaltet und heruntergeladen werden.',
          },
          {
            heading: 'Import',
            text: 'Prüfen Sie vor einem Import Dateityp, Quelle und Sicherungszeitpunkt. Ein Import kann vorhandene Daten verändern; erstellen Sie deshalb unmittelbar vorher ein neues Vollbackup.',
          },
        ],
      },
      {
        id: 'app-einstellungen',
        title: 'App-Einstellungen',
        summary: 'Allgemeine Vorgaben, Uploads, CI-Farben, Nummernkreise, Sicherheit und Freigabeworkflow konfigurieren.',
        icon: <Wrench size={18} />,
        tags: ['app', 'einstellungen', 'sicherheit', 'nummernkreis', 'workflow'],
        adminOnly: true,
        content: [
          {
            heading: 'Zentrale Vorgaben',
            text: 'Administratoren verwalten allgemeine Anwendungseinstellungen, Upload-Verzeichnis, PDF-CI-Farben, Rechnungs- und Angebotsnummern sowie Sicherheits- und Freigabeoptionen.',
          },
          {
            heading: 'Änderungen planen',
            text: 'Dokumentieren Sie produktionsrelevante Änderungen und testen Sie PDF-, Upload- und Freigabeabläufe anschließend mit einem Testdatensatz.',
          },
        ],
      },
      {
        id: 'update',
        title: 'PodCore aktualisieren',
        summary: 'Updates per ZIP oder GitHub-Prüfung sicher vorbereiten, anwenden und kontrollieren.',
        icon: <Download size={18} />,
        tags: ['update', 'zip', 'github', 'version', 'rollback'],
        adminOnly: true,
        content: [
          {
            heading: 'Vor dem Update',
            text: 'Erstellen und laden Sie ein aktuelles Vollbackup herunter. Prüfen Sie freien Speicherplatz, Versionshinweise und die zum Paket gehörende Prüfsumme.',
          },
          {
            heading: 'ZIP-Update',
            text: 'Öffnen Sie Einstellungen > App-Update, laden Sie das offizielle PodCore-ZIP hoch und starten Sie zunächst die Prüfung. Wenden Sie das Update erst an, wenn Paketstruktur und Version akzeptiert wurden.',
          },
          {
            heading: 'GitHub-Prüfung',
            text: 'Falls konfiguriert, kann PodCore nach einem verfügbaren GitHub-Release suchen und den offiziellen Download anzeigen.',
          },
          {
            heading: 'Nach dem Update',
            text: 'Kontrollieren Sie die angezeigte Version, Anmeldung, Dashboard, einen Datensatz pro Hauptbereich und mindestens einen PDF-Export. Bewahren Sie das Vorher-Backup auf, bis der Betrieb bestätigt ist.',
          },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    description: 'Benutzer, Rollen, Module, System und Datenbank verwalten.',
    icon: <Shield size={16} />,
    color: 'text-accent-red',
    articles: [
      {
        id: 'benutzer-rollen',
        title: 'Benutzer, Rollen und Rechte',
        summary: 'Konten verwalten und Zugriffe nach dem Prinzip der erforderlichen Berechtigungen steuern.',
        icon: <Users size={18} />,
        tags: ['admin', 'benutzer', 'rollen', 'rechte', 'passwort'],
        adminOnly: true,
        content: [
          {
            heading: 'Benutzerverwaltung',
            text: 'Administratoren können Benutzer anlegen, bearbeiten, deaktivieren, Passwörter zurücksetzen und Konten löschen. Bei einer Löschung können zugehörige Inhalte auf ein anderes Konto übertragen werden.',
          },
          {
            heading: 'Rollen und Rechte',
            text: 'Rollen bündeln Berechtigungen für Funktionsgruppen. Vergeben Sie nur die für die jeweilige Aufgabe notwendigen Rechte und testen Sie neue Rollen mit einem eigenen Testkonto.',
          },
        ],
      },
      {
        id: 'module-system-logs',
        title: 'Module, System, Datenbank und Logs',
        summary: 'Funktionsmodule aktivieren, Systemzustand prüfen, Backups verwalten und technische Ereignisse nachvollziehen.',
        icon: <Database size={18} />,
        tags: ['admin', 'module', 'system', 'datenbank', 'logs'],
        adminOnly: true,
        content: [
          {
            heading: 'Module',
            text: 'Feature-Schalter steuern, welche Hauptbereiche in PodCore verfügbar sind. Deaktivieren Sie produktiv genutzte Module nur nach Abstimmung, da ihre Navigation für Benutzer verschwindet.',
          },
          {
            heading: 'System und Backups',
            text: 'Die Systemansicht zeigt Statusinformationen und bietet administrative Backup-, Import- und Updatefunktionen. Das Änderungsprotokoll hilft bei der Kontrolle ausgeführter Wartungsschritte.',
          },
          {
            heading: 'Datenbank und Logs',
            text: 'Die Datenbankwerkzeuge unterstützen vorgesehene Migrationen und Verbindungstests. Logs helfen bei der Fehlersuche. Führen Sie Migrationen ausschließlich mit aktuellem Backup und geplantem Wartungsfenster aus.',
          },
        ],
      },
    ],
  },
  {
    id: 'versions',
    label: 'Versionshistorie',
    description: 'Kompakter Überblick über die jüngsten Änderungen.',
    icon: <Package size={16} />,
    color: 'text-text-secondary',
    articles: [
      {
        id: 'v2-14-2',
        title: 'v2.14.2 · Bugfix-Update',
        summary: 'Recherche, Textbausteine, Sponsor-Buchungen und PDF-Exporte stabilisiert; Wiki zum Endnutzer-Handbuch ausgebaut.',
        icon: <CheckCircle size={16} />,
        tags: ['aktuell', 'v2.14.2'],
        compact: true,
        content: [
          {
            text: 'Freie Recherchetexte ohne URL, vollständige Themenwerkstatt in der Ideenmappe, kontrastfeste Textbausteine, zuverlässige Sponsor-Buchungsspeicherung, korrigiertes Sponsor-Dossier, vollständige Preislisten-PDFs sowie ein umfassendes In-App-Handbuch.',
          },
        ],
      },
      {
        id: 'v2-14-1',
        title: 'v2.14.1 · Wartungsupdate',
        summary: 'RedaktionsHub-Übernahme und Sponsoring-Dokumente verbessert.',
        icon: <Package size={16} />,
        tags: ['v2.14.1'],
        compact: true,
        content: [
          { text: 'Themenentwürfe und Textbausteine lassen sich in Episoden übernehmen; Sponsor-Adressen, Logos und individuelle Optionsnamen wurden ergänzt beziehungsweise korrigiert.' },
        ],
      },
      {
        id: 'v2-14-0',
        title: 'v2.14.0 · Workflow-Update',
        summary: 'Editor, Zusammenarbeit und Produktionsabläufe erweitert.',
        icon: <Package size={16} />,
        tags: ['v2.14.0'],
        compact: true,
        content: [
          { text: 'Inline-Bearbeitung, Vorschau, Kommentare, Änderungsverlauf, Audio-Zeitstempel und weitere Workflow-Funktionen wurden zusammengeführt.' },
        ],
      },
      {
        id: 'v2-12-13',
        title: 'v2.12.13 · Stabilität & Sponsoring',
        summary: 'Sponsoring-System und PDF-Layout-Übergabe stabilisiert.',
        icon: <Package size={16} />,
        tags: ['v2.12.13'],
        compact: true,
        content: [
          { text: 'PDF-Layout-Übergabe, Angebotsnummern-Einstellungen und zusätzliche Rollenberechtigungen wurden ergänzt.' },
        ],
      },
    ],
  },
];

function articleMatches(article: WikiArticle, query: string) {
  const searchable = [
    article.title,
    article.summary,
    ...article.tags,
    ...article.content.flatMap(section => [section.heading || '', section.text || '', section.tip || '', ...(section.list || [])]),
  ].join(' ').toLocaleLowerCase('de');
  return searchable.includes(query.toLocaleLowerCase('de'));
}

export default function WikiPage() {
  const [activeTab, setActiveTab] = useState('start');
  const [search, setSearch] = useState('');
  const [openArticles, setOpenArticles] = useState<Set<string>>(new Set(['erste-schritte']));

  const normalizedSearch = search.trim();
  const activeCategory = wikiData.find(category => category.id === activeTab) || wikiData[0];
  const visibleCategories = useMemo(() => {
    if (!normalizedSearch) return [activeCategory];
    return wikiData
      .map(category => ({
        ...category,
        articles: category.articles.filter(article => articleMatches(article, normalizedSearch)),
      }))
      .filter(category => category.articles.length > 0);
  }, [activeCategory, normalizedSearch]);

  const resultCount = visibleCategories.reduce((sum, category) => sum + category.articles.length, 0);

  const toggleArticle = (articleId: string) => {
    setOpenArticles(current => {
      const next = new Set(current);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  };

  const selectCategory = (categoryId: string) => {
    setActiveTab(categoryId);
    setSearch('');
    const category = wikiData.find(item => item.id === categoryId);
    if (category?.articles[0]) setOpenArticles(new Set([category.articles[0].id]));
  };

  return (
    <div className="page-container p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <BookOpen className="text-accent-purple" />
              PodCore Handbuch
            </h1>
            <p className="text-text-secondary mt-1">
              Endnutzer-Anleitungen und Nachschlagewerk für alle Bereiche von PodCore 2.14.2
            </p>
          </div>
          <div className="relative w-full lg:w-[28rem]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="input w-full pl-10"
              placeholder="Funktion, Begriff oder Arbeitsschritt suchen …"
              aria-label="Handbuch durchsuchen"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span className="px-2.5 py-1 rounded-full bg-surface-raised border border-surface-border">{wikiData.length} Bereiche</span>
          <span className="px-2.5 py-1 rounded-full bg-surface-raised border border-surface-border">
            {wikiData.reduce((sum, category) => sum + category.articles.length, 0)} Artikel
          </span>
          <span className="flex items-center gap-1"><Shield size={13} /> Mit „Admin“ gekennzeichnete Funktionen sind berechtigungsabhängig.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] gap-6">
        <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
          {wikiData.map(category => (
            <button
              key={category.id}
              onClick={() => selectCategory(category.id)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                !normalizedSearch && activeTab === category.id
                  ? 'bg-accent-purple/10 border-accent-purple/40 shadow-sm'
                  : 'bg-surface-raised border-surface-border hover:border-text-muted/50 hover:bg-surface-overlay'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={category.color}>{category.icon}</span>
                <span className="font-medium text-text-primary flex-1">{category.label}</span>
                <span className="text-[11px] text-text-muted">{category.articles.length}</span>
              </div>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{category.description}</p>
            </button>
          ))}
        </aside>

        <main className="min-w-0">
          {normalizedSearch && (
            <div className="card p-4 mb-5 border-accent-purple/30 bg-accent-purple/5 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-text-primary">{resultCount} Treffer für „{normalizedSearch}“</p>
                <p className="text-xs text-text-muted mt-0.5">Die Suche berücksichtigt Titel, Beschreibung, Inhalte und Schlagwörter.</p>
              </div>
              <button onClick={() => setSearch('')} className="btn-secondary text-sm">Suche löschen</button>
            </div>
          )}

          {!normalizedSearch && (
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <span className={activeCategory.color}>{activeCategory.icon}</span>
                <h2 className="text-xl font-bold text-text-primary">{activeCategory.label}</h2>
              </div>
              <p className="text-text-secondary mt-1">{activeCategory.description}</p>
            </div>
          )}

          {visibleCategories.length === 0 && (
            <div className="card p-10 text-center">
              <HelpCircle size={32} className="text-text-muted mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-text-primary">Kein passender Eintrag gefunden</h2>
              <p className="text-text-secondary mt-1">Versuchen Sie einen kürzeren Begriff oder suchen Sie nach dem Namen eines Bereichs.</p>
            </div>
          )}

          <div className="space-y-7">
            {visibleCategories.map(category => (
              <section key={category.id} className="space-y-3">
                {normalizedSearch && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className={category.color}>{category.icon}</span>
                    <h2 className="text-lg font-semibold text-text-primary">{category.label}</h2>
                    <span className="text-xs text-text-muted">({category.articles.length})</span>
                  </div>
                )}

                {category.articles.map(article => {
                  const isOpen = Boolean(normalizedSearch) || openArticles.has(article.id);
                  return (
                    <article
                      key={article.id}
                      className={`card border-surface-border overflow-hidden ${article.compact ? 'shadow-none' : ''}`}
                    >
                      <button
                        onClick={() => toggleArticle(article.id)}
                        className={`w-full text-left flex items-start gap-3 hover:bg-surface-overlay transition-colors ${article.compact ? 'p-3.5' : 'p-5'}`}
                        aria-expanded={isOpen}
                      >
                        <span className={`mt-0.5 rounded-lg bg-surface-overlay text-accent-purple ${article.compact ? 'p-1.5' : 'p-2'}`}>
                          {article.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`font-bold text-text-primary ${article.compact ? 'text-base' : 'text-lg'}`}>{article.title}</span>
                            {article.adminOnly && (
                              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">Admin</span>
                            )}
                          </span>
                          <span className={`block text-text-secondary mt-1 ${article.compact ? 'text-xs' : 'text-sm'}`}>{article.summary}</span>
                        </span>
                        {isOpen ? <ChevronDown size={18} className="text-text-muted mt-1" /> : <ChevronRight size={18} className="text-text-muted mt-1" />}
                      </button>

                      {isOpen && (
                        <div className={`border-t border-surface-border ${article.compact ? 'px-4 py-3' : 'px-5 py-5'}`}>
                          <div className={article.compact ? 'space-y-2' : 'space-y-5'}>
                            {article.content.map((section, index) => (
                              <div key={`${article.id}-${index}`} className="space-y-2">
                                {section.heading && <h3 className="font-semibold text-text-primary">{section.heading}</h3>}
                                {section.text && <p className="text-sm leading-6 text-text-secondary">{section.text}</p>}
                                {section.list && (
                                  <ul className="space-y-1.5 text-sm text-text-secondary">
                                    {section.list.map((item, itemIndex) => (
                                      <li key={`${article.id}-${index}-${itemIndex}`} className="flex items-start gap-2">
                                        <CheckCircle size={14} className="text-accent-green mt-1 flex-shrink-0" />
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {section.tip && (
                                  <div className="rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3 flex items-start gap-2 text-sm text-text-secondary">
                                    <HelpCircle size={16} className="text-accent-blue mt-0.5 flex-shrink-0" />
                                    <span><strong className="text-text-primary">Hinweis:</strong> {section.tip}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {!article.compact && (
                            <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-surface-border">
                              {article.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 bg-surface-overlay text-text-muted rounded-full uppercase tracking-wider border border-surface-border">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
