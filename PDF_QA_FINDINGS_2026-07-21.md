# Visuelle PDF-Prüfung – 21. Juli 2026

## Allgemeiner Fragen-Pool

Die PDF enthält Kategorien und Fragen auf mehreren Seiten. In der gelieferten Ausgabe sind die ersten Seiten lesbar, aber die Seitenaufteilung ist fehlerhaft: Nach der letzten sichtbaren Frage der Kategorie „9. Nachwuchs & Jugend“ wird eine zusätzliche nahezu leere Seite erzeugt. Auf dieser Seite ist nur ein blauer Nummerierungsmarker sichtbar; die zugehörige Frage fehlt. Das bestätigt einen Pagination-Fehler: Eine Frage wird beim Seitenwechsel getrennt oder der Text wird nicht erneut auf der Folgeseite ausgegeben.

Die Exportlogik muss jede Frage als untrennbaren Block behandeln, vor dem Zeichnen die benötigte Höhe bestimmen und bei unzureichendem Platz vorab eine neue Seite beginnen. Zudem muss der Export die tatsächliche Fragenanzahl gegen die exportierten Fragen abgleichen.

## Strategische Staffelplanung

Das Logo überlappt im Kopfbereich deutlich mit der Überschrift „Strategische Staffelplanung – Staffel 1“. Der Branding-Text befindet sich zudem im Bereich des Logos und ist dadurch schwer lesbar. Die Kopfzeile benötigt eine klare Dreiteilung mit reservierter Logospalte, eigener Titelspalte und ausreichend großem vertikalen Abstand zur Trennlinie.

Der PDF-Renderer soll die Logomaße begrenzen, den Titel rechts neben dem reservierten Logo-Bereich beginnen lassen und bei Platzmangel den Titel mehrzeilig umbrechen, anstatt Logo und Überschrift in derselben Fläche zu zeichnen.

## Nachkorrektur – Fragen-Pool-PDF

Der aktualisierte Export mit dem Standardlayout wurde lokal erzeugt und visuell geprüft. Die getestete Frage einschließlich interner Notiz erscheint vollständig innerhalb des Inhaltsbereichs; Kopf- und Fußzeile bleiben getrennt. Die Seitenumbruchlogik wurde so geändert, dass die vollständige Blockhöhe vor dem Umbruch berücksichtigt wird, statt sie auf die verbleibende Seitenhöhe zu begrenzen.


## Nachkorrektur – Staffelplan-PDF

Der Exportdialog bietet weiterhin das spezialisierte Layout „Staffelplanung Modern“ an. Die Kopfzeile nutzt nun getrennte Spalten für Logo, Podcastname und Dokumenttitel sowie eine dynamisch platzierte Trennlinie. Der aktualisierte PDF-Export wurde erzeugt und wird im nächsten Prüfschritt visuell abgenommen.


Die aktualisierte Staffelplan-PDF wurde visuell freigegeben: Logo, Podcastname und Überschrift liegen in getrennten Bereichen; die Trennlinie beginnt erst unter dem höheren der beiden Kopfzeilenelemente. Es besteht keine Überschneidung mehr, und der Inhalt beginnt mit ausreichendem Abstand darunter.

## Nachtest – Persönliche Interview-Fragen-PDF

Der direkte Ende-zu-Ende-Test des persönlichen Partner-PDF-Exports lieferte eine gültige PDF-Datei, deren sichtbarer Seiteninhalt jedoch auf Kopf- und Fußbereich beschränkt war. Anschreiben und Fragen wurden nicht dargestellt. Der Renderer wird vor dem Release korrigiert und anschließend erneut visuell geprüft.
