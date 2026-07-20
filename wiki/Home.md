# PodCore Wiki

Willkommen im PodCore Wiki! Dieses Wiki dient als zentrale Informationsquelle für alle Funktionen und Arbeitsabläufe innerhalb der PodCore-Anwendung. Egal, ob Sie ein neuer Benutzer sind, der die Grundlagen erlernen möchte, oder ein erfahrener Redakteur, der tiefergehende Informationen zu spezifischen Features sucht – hier finden Sie alle notwendigen Details.

PodCore ist eine umfassende Podcast-Management-Anwendung, die darauf ausgelegt ist, den gesamten Produktionsprozess von der Ideenfindung bis zur Veröffentlichung zu optimieren. Die aktuelle Version **2.14.3** ergänzt einen allgemeinen Fragen-Pool, verbessert Sponsor-Buchungsbestätigungen und führt ZIP-Updates erst nach Staging-Build, Sicherung und bestätigtem Neustart als erfolgreich. Die mit Version 2.14.0 eingeführten Workflow-, Zusammenarbeits- und Automatisierungsfunktionen bleiben vollständig erhalten.

## Inhaltsverzeichnis

1.  [Erste Schritte](#erste-schritte)
    *   [Installation und Einrichtung](#installation-und-einrichtung)
    *   [Benutzeroberfläche im Überblick](#benutzeroberfläche-im-überblick)
2.  [Episoden-Editor](#episoden-editor)
    *   [Inline-Editing und Auto-Save](#inline-editing-und-auto-save)
    *   [Medien- und Audioquellen](#medien-und-audioquellen)
    *   [Sponsoring-Schnellbuchung](#sponsoring-schnellbuchung)
    *   [Live-Vorschau](#live-vorschau)
    *   [RedaktionsHub-Integration](#redaktionshub-integration)
3.  [RedaktionsHub](#redaktionshub)
    *   [Ideenmanagement](#ideenmanagement)
    *   [Interviewfragen und Zeitstempel](#interviewfragen-und-zeitstempel)
    *   [Allgemeiner Fragen-Pool](#allgemeiner-fragen-pool)
    *   [Recherche und Notizen](#recherche-und-notizen)
4.  [Zusammenarbeit und Feedback](#zusammenarbeit-und-feedback)
    *   [Kommentarsystem](#kommentarsystem)
    *   [Versionsverlauf und Rollback](#versionsverlauf-und-rollback)
    *   [Echtzeit-Benachrichtigungen](#echtzeit-benachrichtigungen)
5.  [Automatisierungen](#automatisierungen)
    *   [Automatische Zeitstempel](#automatische-zeitstempel)
    *   [Sponsoring-Empfehlungen](#sponsoring-empfehlungen)
6.  [PDF-Exporte](#pdf-exporte)
    *   [Buchungsbestätigungen](#buchungsbestätigungen)
    *   [Angebote, Rechnungen, Preislisten](#angebote-rechnungen-preislisten)
7.  [Verwaltung](#verwaltung)
    *   [Benutzer und Rollen](#benutzer-und-rollen)
    *   [Sponsoren](#sponsoren)
    *   [Medienbibliothek](#medienbibliothek)
    *   [PDF-Layout-Manager](#pdf-layout-manager)
8.  [Häufig gestellte Fragen (FAQ)](#häufig-gestellte-fragen-faq)
9.  [Fehlerbehebung](#fehlerbehebung)
10. [Versionshistorie (CHANGELOG)](#versionshistorie-changelog)

---

## Erste Schritte

### Installation und Einrichtung

PodCore kann auf verschiedenen Systemen installiert werden. Eine detaillierte Anleitung finden Sie in der `README.md` im Hauptverzeichnis der Anwendung. Nach der Installation können Sie sich mit Ihren Zugangsdaten anmelden.

### Benutzeroberfläche im Überblick

Die PodCore-Oberfläche ist in mehrere Hauptbereiche unterteilt:

*   **Dashboard:** Ihr zentraler Startpunkt mit schnellem Überblick über aktuelle Episoden, Statistiken und wichtigen Benachrichtigungen.
*   **Episoden:** Hier verwalten Sie alle Ihre Podcast-Episoden, erstellen neue und bearbeiten bestehende.
*   **RedaktionsHub:** Der Bereich für die Ideenfindung, Recherche und Vorbereitung von Inhalten.
*   **Sponsoren:** Verwaltung Ihrer Werbepartner, Angebote und Buchungen.
*   **Medien:** Ihre zentrale Bibliothek für alle Audio- und Mediendateien.
*   **Einstellungen:** Konfiguration der Anwendung, Benutzerverwaltung und weitere administrative Aufgaben.

---

## Episoden-Editor

Der Episoden-Editor ist das Herzstück von PodCore. Hier erstellen, bearbeiten und verwalten Sie alle Inhalte Ihrer Podcast-Episoden. Version 2.14.0 bringt hier zahlreiche Neuerungen, die den Workflow erheblich verbessern.

### Inline-Editing und Auto-Save

Die Eingabe von Metadaten und anderen Informationen erfolgt nun direkt im Editor über **Inline-Editing**. Klicken Sie einfach auf ein Feld, um es zu bearbeiten. Ihre Änderungen werden automatisch nach 2 Sekunden Inaktivität gespeichert (**Auto-Save**). Sie können Änderungen jederzeit mit `Strg+Z` rückgängig machen oder wiederherstellen.

### Medien- und Audioquellen

Im Bereich "Medien & Audioquellen" können Sie alle relevanten Dateien für Ihre Episode verwalten. Dieser Bereich ist nun **zuklappbar**, um die Übersichtlichkeit zu verbessern. Sie können Mediendateien per **Drag-and-Drop** direkt in den Editor hochladen und mit Ihrer Episode verknüpfen.

### Sponsoring-Schnellbuchung

Über das **1-Klick-Buchungssystem** können Sie Werbeplätze für Ihre Episode schnell und einfach buchen. Das System schlägt Ihnen passende Sponsoren basierend auf den Tags und Kategorien Ihrer Episode vor.

### Live-Vorschau

Die **Live-Vorschau** ist nun in einem **separaten Tab** im Episoden-Editor verfügbar. Hier können Sie in Echtzeit sehen, wie Ihre Markdown-Beschreibungen gerendert werden und wie sich Änderungen am Episoden-Status auswirken.

### RedaktionsHub-Integration

Der Episoden-Editor ist nun nahtlos mit dem RedaktionsHub integriert. Änderungen an Ideen, Interviewfragen oder Recherchematerial im RedaktionsHub werden **in Echtzeit** im Episoden-Editor synchronisiert, was einen konsistenten Arbeitsablauf gewährleistet.

---

## RedaktionsHub

Der RedaktionsHub ist Ihr zentraler Ort für die Ideenfindung, Planung und Vorbereitung von Podcast-Episoden.

### Ideenmanagement

Verwalten Sie Ihre Podcast-Ideen, deren Status und zugehörige Informationen.

### Interviewfragen und Zeitstempel

Erstellen und organisieren Sie Interviewfragen. Mit der **automatischen Zeitstempel-Funktion** können Sie Interviewfragen mit Zeitstempeln versehen, indem das System eingebettete Audiomarker aus hochgeladenen MP3/WAV-Dateien ausliest oder Audiometadaten analysiert.

### Allgemeiner Fragen-Pool

Unter **RedaktionsHub → Interview → Allgemeiner Fragen-Pool** verwalten Sie wiederverwendbare Fragen unabhängig von einer bestimmten Idee, Episode oder Person. Fragen lassen sich thematisch gruppieren, suchen, filtern, bearbeiten, kopieren, auswählen und einem Interviewkontext zuweisen. Der PDF-Dialog exportiert den gesamten Pool, gefilterte Themen oder eine Auswahl mit individuellem Dokumenttitel und vorhandenem PDF-Layout.

### Recherche und Notizen

Sammeln Sie Recherchematerial, Links und Notizen zu Ihren Episoden-Ideen.

---

## Zusammenarbeit und Feedback

PodCore 2.14.0 verbessert die Zusammenarbeit im Team erheblich.

### Kommentarsystem

Das **feldbezogene Kommentarsystem** ermöglicht es Ihnen, Kommentare direkt zu spezifischen Feldern im Episoden-Editor hinzuzufügen. Sie können Diskussions-Threads starten, Teammitglieder mit `@Mentions` benachrichtigen und Kommentare als "Gelöst" markieren.

### Versionsverlauf und Rollback

Der **lückenlose Änderungsverlauf** bietet ein vollständiges Audit-Log, das aufzeichnet, wer wann welche Änderungen vorgenommen hat. Sie können einen visuellen Diff-Vergleich nutzen, um Änderungen nachzuvollziehen, und bei Bedarf ältere Stände mit der **Rollback-Funktion** wiederherstellen.

### Echtzeit-Benachrichtigungen

**Echtzeit-Benachrichtigungen** via WebSockets informieren Sie sofort über Statusänderungen, neue Kommentare oder andere wichtige Ereignisse in der Anwendung.

---

## Automatisierungen

PodCore 2.14.0 führt intelligente Automatisierungen ein, um manuelle Aufgaben zu reduzieren.

### Automatische Zeitstempel

Wie bereits erwähnt, werden Interviewfragen nun automatisch mit Zeitstempeln versehen, was die Postproduktion erheblich vereinfacht.

### Sponsoring-Empfehlungen

Ein **intelligentes Matchmaking-System** im Backend gleicht die Tags und Kategorien Ihrer Episode mit den Profilen und Zielgruppenkriterien verfügbarer Sponsoren ab und bietet Ihnen passende Vorschläge direkt im Sponsoring-Tab an.

---

## PDF-Exporte

PodCore bietet umfangreiche Exportmöglichkeiten für verschiedene Dokumente.

### Buchungsbestätigungen

Sie können **einzelne Buchungsbestätigungen** oder **alle Buchungen eines Sponsors** als PDF exportieren. Version 2.14.3 verwendet dabei das gewählte PDF-Layout und bricht auch sehr lange Einzel- und Sammeldokumente vollständig über mehrere A4-Seiten um.

### Angebote, Rechnungen, Preislisten

Zusätzlich können Sie weiterhin Angebote, Rechnungen und Preislisten als PDF exportieren.

---

## Verwaltung

### Benutzer und Rollen

Verwalten Sie Benutzerkonten und weisen Sie verschiedene Rollen und Berechtigungen zu.

### Sponsoren

Verwalten Sie Ihre Sponsoren, deren Kontaktdaten, Verträge und Buchungen.

### Medienbibliothek

Eine zentrale Bibliothek für alle Ihre Mediendateien, die Sie in Episoden verwenden können.

### PDF-Layout-Manager

Passen Sie die Layouts Ihrer PDF-Exporte an Ihre Corporate Identity an.

### App-Update

Öffnen Sie **Einstellungen → App-Update**, laden Sie das offizielle Release-ZIP hoch und prüfen Sie es vor der Anwendung. PodCore baut das Paket zunächst in einem Staging-Bereich, sichert den bisherigen Programmstand, übernimmt das vorbereitete Ergebnis rollbackfähig und meldet den Erfolg erst nach einem Neustart, bei dem der neue Prozess die Zielversion bestätigt. Eine vollständige externe Datensicherung vor dem Wartungsfenster bleibt erforderlich.

---

## Häufig gestellte Fragen (FAQ)

*   **Wie kann ich eine neue Episode erstellen?**
    *   Klicken Sie im Dashboard auf `Strg+N` oder navigieren Sie zum Episoden-Bereich und klicken Sie auf "Neue Episode erstellen".
*   **Meine Änderungen werden nicht gespeichert. Was kann ich tun?**
    *   Das Inline-Editing verfügt über eine Auto-Save-Funktion. Stellen Sie sicher, dass Sie eine aktive Internetverbindung haben. Bei Problemen prüfen Sie die Browser-Konsole auf Fehlermeldungen.
*   **Kann ich ältere Versionen einer Episode wiederherstellen?**
    *   Ja, nutzen Sie den "Versionsverlauf"-Bereich im Episoden-Editor, um frühere Stände einzusehen und bei Bedarf wiederherzustellen.

---

## Fehlerbehebung

Bei Problemen mit der Anwendung:

1.  **Browser-Konsole prüfen:** Öffnen Sie die Entwicklertools Ihres Browsers (meist `F12`) und prüfen Sie die Konsole auf Fehlermeldungen.
2.  **Server-Logs prüfen:** Überprüfen Sie die Log-Dateien des PodCore-Servers auf Fehlereinträge.
3.  **Kontaktieren Sie den Support:** Wenn Sie das Problem nicht selbst beheben können, kontaktieren Sie den Support und geben Sie detaillierte Informationen zum Problem sowie relevante Fehlermeldungen an.

---

## Versionshistorie (CHANGELOG)

Eine detaillierte Übersicht über alle Änderungen und neuen Funktionen in jeder Version finden Sie in der [CHANGELOG.md](../CHANGELOG.md) Datei im Hauptverzeichnis der Anwendung.
