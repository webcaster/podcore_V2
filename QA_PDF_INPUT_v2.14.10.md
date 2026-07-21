# Befundreferenz: Staffelplan-PDF vor v2.14.10

## Quelle

Die Prüfung bezieht sich auf die vom Nutzer bereitgestellte Datei `Strategische-Staffelplanung-Staffel-1(3).pdf` vom 21. Juli 2026. Die Datei enthielt zwei Seiten und verwendete die nicht eingebetteten PDFKit-Standardschriften `Helvetica` und `Helvetica-Bold` mit WinAnsi-Zeichencodierung.

## Beobachteter Fehler

In allen Staffelplan-Positionen wurde der Wert für das Episodenformat als `GesprÄCh` ausgegeben. Die Textextraktion bestätigte exakt dieselbe Zeichenfolge. Der Fehler liegt damit nicht nur in der Darstellung eines PDF-Viewers vor.

## Technische Ursache

Die Staffelplan-Route formte bislang jeden Wortanfang per Unicode-Regulärem-Ausdruck in Großbuchstaben um. Bei `Gespräch` wurde deshalb auch das `c` nach dem Umlaut als Wortanfang erkannt und zu `C`, wodurch `GesprÄCh` entstand. Zusätzlich setzte die Route für die Schriftfamilie `Times-Roman` fälschlich den Namen `Times-Roman-Bold` zusammen. PDFKit erwartet dafür jedoch `Times-Bold`; der direkte Aufruf verursachte den gemeldeten `ENOENT`-Fehler.

## Prüfkriterien für v2.14.10

Die korrigierte PDF muss die Zeichenfolge `Format: Gespräch` korrekt ausgeben und extrahieren. Sie muss außerdem mindestens die Standardfamilien Helvetica, Times Roman und Courier sowie die zusätzlich eingebetteten Unicode-Familien DejaVu Sans, DejaVu Serif und DejaVu Sans Mono verlässlich verarbeiten. Fehlende oder ungültige Schriftkonfigurationen dürfen keinen Serverabbruch verursachen und müssen auf Helvetica zurückfallen.
