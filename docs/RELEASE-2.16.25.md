# PodCore v2.16.25 – Screenshotbearbeitung, Tutorial-PDFs und Sprache

Version **2.16.25** verbessert die Produktion ausführlicher Tutorials und ergänzt zentrale Sprachwerkzeuge für deutsch- und englischsprachige Teams.

## Screenshots im Tutorial-Editor

Vorhandene Screenshots werden im Editor wieder ohne unbeabsichtigte Abdunklung dargestellt. Die neue Aktion **„Bearbeiten“** öffnet einen gespeicherten Screenshot erneut im Markierungseditor. Bereits gesetzte Punkte, Kreise und Zeichen bleiben erhalten und können ergänzt, verschoben oder entfernt werden. Nach dem Speichern wird der bestehende Schritt aktualisiert; eine erneute Aufnahme ist nicht erforderlich.

## Anpassbare Tutorial-PDFs

Tutorial-PDFs sind nun ein eigener Dokumenttyp in **PDF-Layouts**. Die Vorlage **„Tutorial-Anleitung“** kann unter anderem Farben, Typografie, Kopf- und Fußbereiche sowie die Sichtbarkeit von Schrittzahl, Screenshots, Markierungen und Menüpfaden steuern. Die Tutorialverwaltung bietet die Layoutauswahl direkt beim Export sowie einen frei wählbaren PDF-Dateinamen.

## Deutsch und Englisch

Die Anmeldung, die Hauptnavigation, Einstellungen und die zentralen Verwaltungsbereiche verfügen über eine Sprachumschaltung für **Deutsch** und **Englisch**. Die persönliche Auswahl wird im Nutzerprofil gespeichert und kann zusätzlich direkt in der Seitenleiste geändert werden. PodCore setzt die Dokumentensprache für Browser und Textfelder, sodass die jeweils installierte Browser-Rechtschreibprüfung genutzt wird.

## Rechtschreibung und Fachbegriffe

Unter **Administration → Sprache** können berechtigte Administratoren die Rechtschreibhilfe aktivieren sowie eigene Fachbegriffe getrennt für Deutsch und Englisch verwalten. Die Begriffe werden organisationsweit gespeichert. Die Textfelder erhalten automatisch die korrekte Sprachkennzeichnung und nutzen die lokale Rechtschreibprüfung des Browsers, ohne Texte an einen externen Dienst zu übertragen.

## Prüfung

Client- und Server-TypeScript-Build sowie der Produktionsbuild waren erfolgreich. Die Prüfung umfasst die neue Sprachpräferenz, geschützte Sprachwerkzeug-Endpunkte, Sprachumschaltung vor und nach der Anmeldung, Screenshot-Nachbearbeitung und die Anbindung des Tutorial-PDF-Layouts.
