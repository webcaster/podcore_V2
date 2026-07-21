# PodCore v2.14.8 – Funktionsprüfung

**Prüfdatum:** 21. Juli 2026
**Geprüfter Stand:** Lokale Release-Arbeitskopie von PodCore v2.14.8
**Prüfumgebung:** Lokaler Produktionsserver mit authentifizierter Administrationssitzung

## Prüfziel

Dieses Protokoll dokumentiert die Nachweise für die PDF-Korrekturen, die Interview- und Ideenmappen-Erweiterungen sowie die neue ZIP-Archivmappe. Temporäre Prüfdaten wurden nach den Tests wieder entfernt oder in ihren Ausgangszustand zurückversetzt.

| Bereich | Prüfschritt | Ergebnis |
|---|---|---|
| Fragen-Pool-PDF | Mehrseitigen Export mit langen Fragenblöcken geprüft | Erfolgreich; Frage, Kategorie und Hintergrundinformation bleiben als vollständiger Block zusammen. |
| Staffelplan-PDF | Kopfbereich des modernen Staffelplan-Layouts visuell geprüft | Erfolgreich; Logo und Dokumenttitel sind getrennt angeordnet und überlappen nicht. |
| Ideenmappen-Papierkorb | Ideenmappe in den Papierkorb verschoben und danach wiederhergestellt | Erfolgreich; die Idee war im Papierkorb auffindbar und anschließend wieder regulär verfügbar. |
| Ideenmappen-Partnerfilter | Partnerliste der Ideenmappe im direkten Ideen-Kontext geprüft | Erfolgreich; nur der zugeordneten Idee zugehörige Interview-Partner wird zurückgegeben. |
| Persönliche Interview-PDF | Partnerbezogenes PDF erzeugt und den extrahierten Dokumenttext geprüft | Erfolgreich; Anschreiben und zugehörige Fragen sind im selben Dokument enthalten. |
| Themen-Umbenennung | Temporäre Pool-Frage erstellt, Thema umbenannt, neue Kategorie abgefragt und Testfrage gelöscht | Erfolgreich; die Frage erschien unter dem neuen Thema. Nach der Bereinigung enthielten weder altes noch neues Testthema noch Einträge. |
| ZIP-Archivmappe | Episode über den regulären Archivierungsweg archiviert, ZIP heruntergeladen und Manifest geprüft | Erfolgreich; die ZIP enthielt die erwartete Archivstruktur einschließlich `Daten/manifest.json` und wies ein Archivdatum aus. Die Testepisode wurde anschließend wiederhergestellt. |

## Detailnachweise

### Fragen-Pool-PDF

Die Berechnung des Seitenwechsels wurde mit Fragen getestet, deren Text, Kategorie und Hintergrundinformation zusammen mehr Platz benötigen als der verbleibende Seitenbereich. Der Export verschiebt den gesamten Fragenblock vor dem Zeichnen auf die nächste Seite. Dadurch tritt kein abgeschnittener Beginn einer Frage am unteren Seitenrand mehr auf.

### Staffelplan-PDF

Der Kopfbereich des Layouts **„Staffelplanung Modern“** wurde nach der Trennung der Logo- und Titelspalte erneut geprüft. Der Dokumenttitel bleibt lesbar; der Logo-Bereich kollidiert nicht mit der Überschrift.

### Papierkorb und Wiederherstellung der Ideenmappe

Eine lokale Test-Ideenmappe wurde über den regulären Löschweg in den Papierkorb verschoben. Die Papierkorb-API lieferte die Idee als gelöschten Eintrag. Nach dem Wiederherstellen war sie wieder im aktiven Ideenbestand verfügbar. Dieser Test bestätigt den vorgesehenen Soft-Delete-Ablauf einschließlich Rückkehr in die Arbeitsansicht.

### Folgebezogene Interview-Partner

Für eine Ideenmappe mit einem gezielt verknüpften Interview-Partner wurde die Partnerabfrage im Ideen-Kontext durchgeführt. Die Rückgabe enthielt genau diesen Partner und keine Partner aus anderen redaktionellen Zusammenhängen. Die Client-Seite ruft diese Abfrage mit der aktuellen Ideenmappen-ID auf, sodass die Partnerauswahl im Fragenformular folgenbezogen bleibt.

### Persönliche Interview-PDF

Das partnerbezogene PDF wurde mit Anschreiben und Fragen erzeugt. Die Textprüfung des erzeugten Dokuments bestätigte das Vorhandensein des Anschreibens sowie der zugeordneten Interview-Fragen. Damit ist die angepasste gemeinsame Kopf- und Fußzeilen-Render-Signatur für diesen Exportpfad funktionsfähig.

### Themen-Umbenennung im allgemeinen Fragen-Pool

Eine temporäre Fragen-Pool-Position wurde unter dem Thema `QA-Thema-v2148` angelegt. Über den Umbenennungsweg wurde das Thema in `QA-Thema-v2148-umbenannt` überführt. Die anschließende gefilterte Abfrage lieferte die Testfrage unter dem neuen Thema. Nach dem Löschen der Testfrage bestätigte eine erneute Abfrage für beide Testthemen jeweils **0 Treffer**.

### Archivmappe für archivierte Episoden

Die Testepisode wurde mit dem regulären Statistik-Archivierungsweg archiviert. Anschließend wurde die ZIP-Archivmappe erfolgreich abgerufen. Das Manifest weist den Formatnamen **„PodCore Archivmappe“**, die Release-Version **2.14.8**, eine Generierungszeit und das gesetzte Archivdatum aus. Die in der Testdatenbank erwartete Struktur umfasste mindestens `ARCHIVMAPPE.md`, `Daten/manifest.json`, `Daten/episode.json`, `Daten/ideenmappe.json`, `Daten/interviews.json`, `Daten/sponsoring.json`, `Daten/medien.json` und `Daten/episode-workflow.json`. Nach erfolgreicher Kontrolle wurde die Testepisode wieder aus dem Archiv hergestellt.

## Prüfdaten und Bereinigung

Die temporäre Fragen-Pool-Prüfung wurde vollständig gelöscht. Die Archivierungsprüfung hat die lokale Testepisode nach dem Download wiederhergestellt. Daten, die ausschließlich in der lokalen Prüf-Datenbank liegen, werden nicht in das Git-Repository oder das Release-ZIP aufgenommen.

## Finaler Build-Nachweis

Nach Abschluss der Versions- und Dokumentationspflege wurde der vollständige Produktions-Build mit `pnpm run build` erfolgreich ausgeführt. Der Client-TypeScript-Check, das Vite-Bundle, der Server-TypeScript-Check und die Synchronisierung der öffentlichen Client-Dateien nach `server/dist/public` wurden ohne Fehler abgeschlossen. Damit ist der getestete Stand für die Release-Veröffentlichung freigegeben.
