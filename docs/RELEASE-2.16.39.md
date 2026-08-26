# PodCore v2.16.39 – Stabiler Tutorialstart, optionale Podcastprofile und Logverwaltung

Version **2.16.39** behebt den beim Tutorialstart sichtbaren Vollseitenabbruch und ergänzt zwei Verwaltungsfunktionen: Mehrfach-Podcast wird bewusst optional steuerbar, und Administratoren können Protokolldaten exportieren oder nach eindeutiger Bestätigung bereinigen.

## Tutorialstart ohne Vollseitenabbruch

Der Vollseitenabbruch hatte eine konkrete technische Ursache: Beim Start eines Tutorials führte die Tutorialkomponente wegen einer bedingten Hook-Ausführung mehr Hooks aus als beim vorherigen Rendern ohne aktive Führung. React beendet die Darstellung in diesem Fall mit einem Laufzeitfehler. Die Positionierungsfunktion der verschiebbaren Karte ist jetzt eine normale Funktion und wird nicht mehr nach einem bedingten Rückgabepfad als Hook registriert.

Zusätzlich umschließt eine lokale Fehlergrenze die Tutorialüberlagerung. Sollte eine individuelle Anleitung dennoch einmal nicht gerendert werden können, bleibt die App bedienbar. Die Fallback-Karte erklärt die Situation und bietet **Schließen** sowie **Im Wiki öffnen** an.

## Mehrfach-Podcast aktivieren und Profil wechseln

Mehrfach-Podcast ist standardmäßig optional. Ein Administrator öffnet **Einstellungen → Podcast** und aktiviert dort den Bereich **Mehrfach-Podcast**. Der Button **Profile wechseln** öffnet danach die Verwaltung der Podcastprofile. Dort wird beim gewünschten zweiten Profil **Aktiv setzen** gewählt. PodCore speichert die Auswahl, lädt den Arbeitsbereich neu und verwendet anschließend dessen getrennten Bereich für Episoden, Medien, Sponsoring und Rechte.

Wird Mehrfach-Podcast später deaktiviert, bleiben die bereits getrennten Daten erhalten; das zuletzt aktive Profil bleibt der verwendete Datenbereich. Das Deaktivieren löscht und verschiebt keine Datensätze.

## Log-Daten exportieren und bereinigen

Unter **Admin → Logs** erscheinen für Administratoren die Aktionen **Exportieren** und **Logs löschen**. Der Export lädt die gespeicherten Fehlerprotokolle als JSON-Datei mit Zeitstempel und Filtermetadaten herunter. Vor der Bereinigung erläutert PodCore ausdrücklich, dass nur System- und Fehlerprotokolle betroffen sind. Erst nach der Texteingabe **„LOGS LÖSCHEN“** führt der Server die Bereinigung aus. Der Server akzeptiert Export und Löschen ausschließlich für die Administratorrolle; die Bereinigung arbeitet nur auf `error_logs` und lässt Anwendungsdaten, Medien und Backups unverändert.

## Prüfung

Ein isolierter Rauchtest überprüft die korrigierte Hook-Reihenfolge, die lokale Tutorial-Fehlergrenze, den optionalen Mehrfach-Podcast-Schalter, den direkten Profilwechsel, den Log-Export und die zwingende Bestätigung vor einer Bereinigung. Client- und Server-TypeScript-Build wurden erfolgreich ausgeführt. Der Produktionsserver war bereits auf Port 3010 aktiv; deshalb wurde kein bestehender Prozess für einen parallelen Laufzeittest beendet.
