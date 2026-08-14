# PodCore v2.16.2 – Release- und Installationshinweise

PodCore v2.16.2 bündelt die Tutorial-Cloud zwischen WordPress und App, die rollenbasierte Tutorial-Anzeige, die verbesserte Tutorial-Führung mit Screenshots und Annotationen, den Audio-Editor mit Waveform/Loop/Tempo/Schnittplan sowie die PDF-Layout-Anbindung für den Partnerfragen-Export.

## App installieren

Entpacke `PodCore-v2.16.2-app.zip` in ein neues Anwendungsverzeichnis. Für den Betrieb werden Node.js 18 oder neuer und pnpm benötigt. Anschließend können die Abhängigkeiten mit `pnpm run install:all` installiert und der gebaute Server mit `pnpm start` gestartet werden. Die Anwendung ist standardmäßig unter `http://localhost:3001` erreichbar. Eine produktive Ubuntu-Installation mit systemd, Backup und Reverse Proxy beschreibt [INSTALL-UBUNTU.md](INSTALL-UBUNTU.md).

Das App-ZIP enthält Quellcode, synchronisierte Frontend-Assets und den gebauten Server. Persistente Daten gehören nicht in das ZIP; das PodCore-Datenverzeichnis muss vor einem Update separat gesichert werden. Der integrierte Updater prüft Root- und Server-Version sowie die gebaute Server-/Frontend-Struktur, bevor eine Übernahme erfolgt.

## Tutorial-Cloud verbinden

Installiere und aktiviere `podcore-tutorials-wp-plugin-v2.16.2.zip` auf podcore.de. Veröffentliche mindestens einen `PodCore Tutorial`-Beitrag und speichere die Permalink-Einstellungen. Die öffentliche Katalog-URL lautet:

```text
https://podcore.de/wp-json/app-tutorials/v1/tutorials?per_page=50
```

Öffne in PodCore den exklusiven Entwickler-Modus durch sieben Klicks auf die Versionsnummer. Unter **Tutorial-Verwaltung → Tutorial-Cloud von podcore.de** trägst du als Basis-URL `https://podcore.de/wp-json/app-tutorials/v1` ein, aktivierst die Cloud, speicherst die Einstellungen, prüfst den Katalog und startest anschließend die Synchronisation. Neue und bereits synchronisierte Cloud-Tutorials werden übernommen; lokale Tutorials werden nicht entfernt. Rollen werden aus dem WordPress-Tutorial übernommen, `*` steht für alle Rollen.

Wenn der Endpunkt HTTP 404 liefert, ist auf der Website noch die alte Plugin-Datei aktiv, das Plugin nicht aktiviert oder die Rewrite-Konfiguration nicht aktualisiert. In diesem Fall Plugin aktualisieren/aktivieren, **Einstellungen → Permalinks → Änderungen speichern** ausführen und The7-, WPBakery-, Cache- sowie CDN-Cache leeren. Der externe Stand wurde im Release-QA am 14.08.2026 mit 404 vor der Plugin-Aktualisierung festgestellt; die lokale API-Integration wurde separat erfolgreich gebaut und geschützt getestet.

## Funktionsprüfung nach der Installation

| Bereich | Prüfschritt | Erwartetes Ergebnis |
|---|---|---|
| Login und Start | anmelden und Dashboard öffnen | App startet ohne Auto-Start eines Tutorials; verfügbare Tutorials werden nur als Hinweis angeboten |
| Tutorial-Wiki | Tutorial-Hinweis oder Wiki öffnen | Rollenfilter, Schritte, Screenshots, Annotationen und erneutes Starten funktionieren |
| Entwickler-Cloud | Katalog prüfen und synchronisieren | WordPress-Einträge erscheinen nach erfolgreicher API-Verbindung in der lokalen Verwaltung |
| Audio-Editor | Asset öffnen, Waveform laden, Tempo/Loop testen, Marker speichern | Wiedergabe, Marker, Kommentare und Schnittplan-Export sind verfügbar |
| Partnerfragen-PDF | persönliches Layout auswählen und PDF exportieren | `interview_partner` erscheint im Layout-Picker und der Export wird erzeugt |
| Backup/Update | Backup außerhalb des App-Verzeichnisses sichern | Daten bleiben bei Update und Rollback geschützt |

## Bekannte externe Voraussetzung

Die WordPress-Cloud kann erst live synchronisiert werden, wenn das aktualisierte Plugin auf podcore.de aktiviert ist. Bis dahin ist der 404-Befund kein Fehler in der lokalen PodCore-Route, sondern ein Hinweis auf den noch nicht aktualisierten externen WordPress-Stand.

## Referenzen

[1]: https://github.com/webcaster/podcore_V2 "PodCore GitHub Repository"
[2]: https://podcore.de/wp-json/app-tutorials/v1/tutorials "PodCore Tutorial-Cloud REST-Katalog"
