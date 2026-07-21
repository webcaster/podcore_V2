# PodCore v2.14.10 – Update-, Bedien- und Prüfanleitung

**Release:** 21. Juli 2026
**Ausgangsversion:** PodCore 2.14.3 oder neuer
**Zielversion:** PodCore 2.14.10

## Zweck des Releases

PodCore v2.14.10 macht PDF-Exporte unabhängig von lokal installierten Betriebssystemschriften. Dafür enthält das Release die Schriftfamilien **DejaVu Sans**, **DejaVu Serif** und **DejaVu Sans Mono** direkt im Anwendungspaket. Die PDF-Ausgabe verwendet diese Schriften sicher und korrigiert zusätzlich typische doppelt kodierte UTF-8-Texte. Deutsche Sonderzeichen wie **ä, ö, ü, Ä, Ö, Ü und ß** bleiben dadurch in allen unterstützten Exporten lesbar.

Der bisherige **„Allgemeine Fragen-Pool“** heißt jetzt **„Fragenbibliothek“**. Die Bibliothek sortiert Themen natürlich nach deutscher Zahlensortierung, bietet direkt erreichbare Themenumbenennung und erlaubt im manuellen Sortiermodus eine dauerhaft gespeicherte Reihenfolge der Fragen innerhalb eines Themas.

| Bereich | Ergebnis in v2.14.10 |
|---|---|
| PDF-Schriften | Alle PDF-Exporte registrieren die mitgelieferten DejaVu-Schriften vor der Textausgabe. |
| Plattformen | Für PDF-Exporte sind keine separat installierten Systemschriften auf macOS, Windows oder Linux erforderlich. |
| Sonderzeichen | Deutsche Sonderzeichen werden in den PDF-Texten korrekt ausgegeben; typische falsch kodierte Eingaben werden bereinigt. |
| Fehlertoleranz | Ungültige historische Schriftnamen wie `Times-Roman-Bold` werden sicher auf gültige PDF-Schriften abgebildet. |
| Layoutverwaltung | DejaVu-Schriften, linksbündiger Text oder Blocksatz sowie drei Überschriftenstile sind auswählbar. |
| Fragenbibliothek | Die sichtbare Bezeichnung ist vereinheitlicht; Themen und Fragen werden natürlich deutsch sortiert. |
| Manuelle Reihenfolge | Fragen können innerhalb eines Themas per Auf-/Ab-Aktion verschoben und dauerhaft gespeichert werden. |
| Themenpflege | Themen lassen sich unmittelbar in der Fragenbibliothek umbenennen. |

## Vor dem Update

Erstellen Sie vor jeder Aktualisierung ein vollständiges Backup über **Einstellungen → Branding & Backup → Backup & Export**. Bewahren Sie die Sicherung außerhalb des PodCore-Servers auf. Prüfen Sie anschließend die Versionsanzeige im Seitenkopf und notieren Sie die aktuell laufende Version.

Der integrierte Update-Ablauf prüft Struktur, Zielversion und Buildfähigkeit des ZIP-Pakets in einem getrennten Staging-Bereich. Vor der Übernahme sichert PodCore den bisherigen Programmstand. Der Vorgang gilt erst als abgeschlossen, wenn die Anwendung nach dem Neustart die Zielversion meldet.

> Das Release enthält die benötigten DejaVu-Schriftdateien selbst. Es ist weder erforderlich noch sinnvoll, vorab Systemschriften auf dem Server oder den Arbeitsplatzrechnern zu installieren.

## Update über die Anwendung

1. Öffnen Sie **Einstellungen → App-Update**.
2. Wählen Sie die Release-Datei **`PodCore-v2.14.10.zip`** aus.
3. Starten Sie zunächst die Paketprüfung und anschließend die Übernahme.
4. Warten Sie, bis PodCore den Neustart und die Zielversion **2.14.10** bestätigt.
5. Aktualisieren Sie den Browser vollständig und kontrollieren Sie Browser-Titel sowie Versionsanzeige.

## Manuelle Aktualisierung

Wenn der integrierte Update-Weg nicht verwendet werden kann, aktualisieren Sie die Anwendung im Installationsverzeichnis. Die folgenden Befehle installieren die projektbezogenen Abhängigkeiten anhand der Lockdateien und erzeugen den Produktions-Build.

```bash
git pull
pnpm install --frozen-lockfile
pnpm --dir client install --frozen-lockfile
pnpm --dir server install --frozen-lockfile
pnpm run build
pnpm start
```

Für v2.14.10 sind keine manuellen SQL-Schritte erforderlich. Die PDF-Schriften liegen im Release-Paket unter `server/assets/fonts/` und werden zur Laufzeit von den PDF-Exporten geladen.

## Bedienung: PDF-Layouts mit Unicode-Schriften

Öffnen Sie **Einstellungen → PDF-Layouts** und bearbeiten Sie das gewünschte Layout. Unter **Typografie** stehen neben den PDF-Standardschriften die mitgelieferten DejaVu-Familien zur Auswahl. Für deutschsprachige oder mehrsprachige Inhalte empfiehlt sich **DejaVu Sans** als klare Standardschrift; **DejaVu Serif** eignet sich für klassische Dokumente, während **DejaVu Sans Mono** für tabellarische oder technische Inhalte verwendet werden kann.

| Einstellung | Wirkung |
|---|---|
| Schriftfamilie | Wählt Helvetica, Times Roman, Courier oder eine mitgelieferte DejaVu-Familie aus. |
| Textausrichtung | Legt linksbündigen Fließtext oder Blocksatz fest. |
| Überschriftenstil | Verwendet Akzentlinie, farbige Fläche oder eine minimale Überschrift ohne Linie. |
| Vorschau | Erzeugt eine Test-PDF mit dem aktuellen Layout, ohne Produktionsdaten zu verändern. |

Erzeugen Sie nach einer Änderung zunächst eine Vorschau. Testen Sie anschließend einen realen Export, beispielsweise ein Episoden-Skript oder die Fragenbibliothek, mit einem Titel wie **„Überprüfung: Grüße aus Köln – Straße“**. Die Zeichen **ä, ö, ü, Ä, Ö, Ü und ß** müssen im Ergebnis lesbar erscheinen.

> Bei älteren eigenen Layouts können historische Schriftnamen vorhanden sein. PodCore führt sie sicher auf gültige Schriften zurück. Speichern Sie das Layout danach erneut, wenn Sie die neue gewünschte Schriftfamilie ausdrücklich festlegen möchten.

## Bedienung: Fragenbibliothek organisieren

Öffnen Sie **RedaktionsHub → Interviews → Fragenbibliothek**. Die Bibliothek bündelt wiederverwendbare Interview-Fragen und gruppiert sie nach Themen. Die neue natürliche Sortierung behandelt Zahlen im Themenname fachlich sinnvoll: **„2. Thema“** steht vor **„10. Thema“**.

| Arbeitsschritt | Vorgehen | Erwartetes Ergebnis |
|---|---|---|
| Sortiermodus wählen | Wählen Sie Manuell, Alphabetisch, Neueste oder Älteste. | Die Liste folgt dem gewählten Anzeigeprinzip. |
| Frage manuell verschieben | Wählen Sie im Modus **Manuell** die Auf- oder Ab-Aktion an einer Frage. | Die Reihenfolge innerhalb des Themas ändert sich und bleibt nach dem Neuladen erhalten. |
| Thema umbenennen | Öffnen Sie die Themenaktion direkt in der Bibliothek und speichern Sie den neuen Namen. | Alle zugehörigen Fragen erscheinen unter dem neuen Thema. |
| Neue Frage anlegen | Erstellen Sie eine Frage in einem bestehenden oder neuen Thema. | Die Frage wird am Ende ihres Themenblocks eingeordnet. |
| Thema einer Frage ändern | Bearbeiten Sie die Frage und wählen Sie ein anderes Thema. | Die Frage wird am Ende des Zielthemas eingeordnet. |
| PDF exportieren | Exportieren Sie die gefilterte Auswahl als PDF. | Der Standardtitel lautet **Fragenbibliothek** und nutzt das ausgewählte PDF-Layout. |

Die Sortierung für die Anzeige **Alphabetisch**, **Neueste** und **Älteste** verändert nicht die gespeicherte manuelle Reihenfolge. Wechseln Sie zurück auf **Manuell**, wenn Sie eine Redaktionreihenfolge bewusst bearbeiten möchten.

## Prüfliste nach dem Update

| Prüfung | Soll-Ergebnis |
|---|---|
| Versionsanzeige | Der Seitenkopf und der Browser-Titel zeigen **v2.14.10**. |
| PDF-Layout-Vorschau | Eine Vorschau mit DejaVu Sans wird ohne Schriftfehler erzeugt. |
| Episoden-PDF | Der Export eines Episoden-Skripts liefert eine PDF-Datei und zeigt deutsche Sonderzeichen lesbar. |
| Fragenbibliotheks-PDF | Der Export liefert eine PDF-Datei mit dem Standardtitel **Fragenbibliothek**. |
| Sonderzeichen | Ein Testtext mit **„Überprüfung: Grüße, Straße, ÄÖÜ“** ist im PDF korrekt lesbar. |
| Bestehendes Layout | Ein Layout mit einer alten oder ungültigen Schriftbezeichnung bricht den Export nicht ab. |
| Fragenbibliothek | Die Navigation und der PDF-Layout-Manager verwenden die neue Bezeichnung. |
| Natürliche Sortierung | **„2. Thema“** erscheint vor **„10. Thema“**. |
| Manuelle Reihenfolge | Eine verschobene Frage bleibt nach Aktualisieren oder Neuladen an der gewählten Position. |
| Themenumbenennung | Ein Thema kann ohne Wechsel in einen anderen Arbeitsbereich direkt umbenannt werden. |

## Rückfall bei Problemen

Brechen Sie eine laufende Aktualisierung nicht ab. Kann die Anwendung nach einem manuellen Update nicht gestartet werden, stellen Sie zuerst den vorherigen Programmstand und das vor dem Update erstellte Vollbackup wieder her. Prüfen Sie danach die Serverprotokolle sowie die Paketversionen von Root, Client und Server.

Bei einem einzelnen fehlerhaften PDF-Layout wählen Sie testweise im Layout-Manager **DejaVu Sans** und erzeugen Sie eine Vorschau. Besteht der Fehler fort, exportieren Sie das betroffene Layout oder dokumentieren Sie dessen Namen, Exporttyp und verwendete Schriftart für die weitere Analyse.

## Abgrenzung

Dieses Wartungsrelease verändert keine Rollen, Berechtigungen oder Datenbankstruktur. Die mitgelieferten Schriftdateien ersetzen keine individuell hochgeladenen Logos oder Bilddateien. Sie dienen ausschließlich der zuverlässigen Textdarstellung in PodCore-PDFs.
