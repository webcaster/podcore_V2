# PodCore v2.16.55 – ruhigeres UI und klarere Orientierung

## Was sich ändert

PodCore zeigt auf Unterseiten oberhalb des Inhalts eine dezente Kontextleiste. Sie nennt zuerst die Arbeitsgruppe und danach die aktive Seite. Dashboard und Hauptnavigation bleiben dadurch vertraut, während tiefe Arbeitsbereiche besser einzuordnen sind.

Die Dashboard-Schnellaktionen sind kompakter und verständlicher. Statt vier gleichartigen großen Kacheln zeigt PodCore kurze Arbeitsschritte mit einer Folgehandlung: „Neue Episode – Entwurf anlegen“, „Neue Idee – Thema festhalten“, „Asset hochladen – Audio oder Bild“ und „Neuer Sponsor – Kontakt anlegen“. Die Anzeige richtet sich weiterhin nach den Berechtigungen. Die persönliche Dashboard-Konfiguration überschreibt diese Änderung nicht: Reihenfolge, ausgeblendete Widgets, Dichte und Begrüßung bleiben erhalten.

Karten, Seitenköpfe und Gruppentitel sind ruhiger gestaltet. Rahmen und Abstände bilden weiterhin klare Gruppen, während Schatten und Hoverbewegungen reduziert wurden. Der sichtbare Tastaturfokus und die Unterstützung für reduzierte Bewegung bleiben bestehen. Hell- und Dunkeldesign sowie die individuellen Sidebarfarben werden weiterverwendet.

## Bedienung

Die Seitenleiste bleibt in Arbeitsplatz, Planung & Archiv, Sponsoring, Auswertungen sowie Einrichtung & Hilfe gegliedert. Mit Strg+K beziehungsweise ⌘+K kann die Menüsuche fokussiert werden. Sie durchsucht zugängliche Seiten auch in geschlossenen Gruppen. Die Kontextleiste ist eine Orientierungshilfe und kein zusätzlicher Navigationsschritt.

Im Dashboard können die Arbeitsschritte direkt geöffnet werden. Die Dashboard-Anpassung öffnet sich weiterhin über das Einstellungs-Symbol. Nach einer Änderung müssen Reihenfolge, Sichtbarkeit, Dichte oder Begrüßung mit „Layout speichern“ bestätigt werden.

## Update

Vor dem Update ein vollständiges ZIP-Backup außerhalb des Programmordners sichern. PodCore stoppen, den bisherigen Programmordner als Rückfallkopie behalten und das App-Paket in einen neuen Ordner entpacken. Das bisherige `PODCORE_DATA_DIR` beziehungsweise `.podcore`-Datenverzeichnis, eigene Umgebungsvariablen und Startkonfiguration übernehmen. Die Datenbank nicht durch Demo-Daten ersetzen.

Nach der Installation den Server mit der bisherigen Konfiguration starten und prüfen, dass Version 2.16.55 angezeigt wird. Bei unveränderten Browserassets einmal hart neu laden. Nicht mehrere Serverinstanzen gleichzeitig auf dasselbe SQLite-Datenverzeichnis zugreifen lassen.

Das Endnutzerpaket enthält nur PodCore-App-Dateien. WordPress-Plugins, Websitevorlagen, Videos und Testdaten sind nicht enthalten.

## Prüfungen

Client und Server wurden mit `pnpm run build:check` gebaut. Der Versionscheck und `git diff --check` waren erfolgreich. Die vorhandenen Schutztests für Berechtigungen, Audio-Abnahme und Tutorial-/Mehrfach-Podcast-/Log-Schutz bleiben Bestandteil der Releaseprüfung. Die neuen UI-Wege werden zusätzlich im Browser geprüft: Kontextleiste auf Unterseiten, Dashboard-Schnellaktionen, gruppierte Navigation, Menüsuche, Hell-/Dunkeldesign, Sprachwechsel und mobile Navigation.

UX-Grundsätze und Quellen sind in [`docs/UX-ROADMAP-2.16.55.md`](UX-ROADMAP-2.16.55.md) dokumentiert.
