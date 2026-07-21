# PodCore v2.14.10 – Funktionsprüfung

**Prüfdatum:** 21. Juli 2026
**Geprüfter Stand:** Lokale Release-Arbeitskopie von PodCore v2.14.10
**Prüfumgebung:** Isolierter Produktionsserver mit frischem temporärem Datenordner und authentifizierter Administrationssitzung
**Freigabestatus:** **Freigegeben** – Produktions-Build und vollständige isolierte E2E-Prüfung am 21. Juli 2026 erfolgreich abgeschlossen.

## Prüfziel

Dieses Protokoll definiert die Freigabenachweise für die plattformunabhängige PDF-Erzeugung, die korrekte Darstellung deutscher Sonderzeichen, die zusätzlichen PDF-Layoutoptionen und die überarbeitete Fragenbibliothek. Die automatisierten Prüfungen verwenden ausschließlich einen temporären Datenordner unter `/tmp`; produktive Projekt- oder Nutzerdaten werden nicht verwendet.

| Bereich | Prüfschritt | Soll-Ergebnis | Status |
|---|---|---|---|
| Produktions-Build | `pnpm run build` ausgeführt | Client-TypeScript, Vite-Bundle, Server-TypeScript und Synchronisierung der öffentlichen Dateien endeten fehlerfrei. | **Bestanden** |
| Laufzeitversion | Isolierten Server gestartet und `/api/health` geprüft | Die Health-Antwort meldete **2.14.10**. | **Bestanden** |
| PDF-Schriftregistrierung | Live-Vorschau mit **DejaVu Sans** erzeugt | PDF-Antwort wurde ohne `ENOENT` oder ungültigen Schriftnamen erzeugt. | **Bestanden** |
| Historischer Schriftname | Zentrale PDF-Prüfung mit `Times-Roman-Bold` ausgeführt | Der historische Name wurde sicher auf eine gültige Schrift abgebildet; der PDF-Export blieb lauffähig. | **Bestanden** |
| Sonderzeichen | Fragenbibliotheks-PDF mit **„Überprüfung: Gespräch, Grüße, Straße, ÄÖÜ“** erzeugt | Der extrahierte PDF-Text enthielt alle korrekten Zeichen und keine doppelt kodierte Zeichenfolge. | **Bestanden** |
| Exportabdeckung | Alle Erzeugungsstellen im Server-Code auditiert | Jeder erfasste PDF-Erzeugungspfad ruft vor dem Rendern die zentrale Schriftvorbereitung auf. | **Bestanden (Codeaudit)** |
| PDF-Layoutoptionen | DejaVu-Familie in der Live-Vorschau ausgeführt; Client-Build geprüft | Neue Typografieoptionen sind im ausgelieferten Build enthalten und erzeugen eine gültige Vorschau-PDF. | **Bestanden** |
| Bezeichnung | Aktive Client- und Serverquellen auditiert; Build geprüft | **„Fragenbibliothek“** ist die sichtbare Bezeichnung in RedaktionsHub und Layoutverwaltung. | **Bestanden (Quell- und Buildprüfung)** |
| Natürliche Sortierung | Themen **„2. Thema“** und **„10. Thema“** im E2E-Test angelegt | **„2. Thema“** wurde vor **„10. Thema“** geliefert. | **Bestanden** |
| Manuelle Reihenfolge | Zwei Fragen im selben Thema neu sortiert und Liste erneut geladen | Die serverseitig gespeicherte Reihenfolge blieb erhalten. | **Bestanden** |
| Themenumbenennung | Thema über die API der Fragenbibliothek umbenannt | Der neue Themenname wurde dauerhaft zurückgegeben. | **Bestanden** |
| Release-Metadaten | Paketversionen, Browser-Titel und Health-Antwort geprüft | Die aktiven Release-Metadaten referenzieren **2.14.10**. | **Bestanden** |

## Reproduzierbarer Ablauf

Führen Sie die Prüfung in einer Arbeitskopie mit frischem Datenordner durch. Der zuvor verwendete Datenordner darf nicht wiederverwendet werden, damit keine Daten aus einer produktiven Installation in den Test einfließen.

```bash
cd /home/ubuntu/podcore_V2
pnpm run build
PODCORE_DATA_DIR=/tmp/podcore-v21410-e2e-data node server/dist/index.js --port 3101
```

Starten Sie in einem zweiten Terminal den E2E-Test. Der Test muss mindestens Anmeldung, Testdatenanlage, Fragenbibliothek-Reihenfolge, PDF-Antwort mit `application/pdf`, PDF-Inhalt und die Versionsantwort des Health-Endpunkts verifizieren.

```bash
node /tmp/podcore_v21410_e2e.mjs
```

Nach erfolgreichem Test entfernen Sie den temporären Datenordner und stoppen den isolierten Server.

```bash
rm -rf /tmp/podcore-v21410-e2e-data
```

## Detailnachweise

### PDF-Schriften und Fallback-Verhalten

Die zentrale Schriftvorbereitung wird unmittelbar nach jeder `PDFDocument`-Erzeugung ausgeführt. Sie registriert die gebündelten DejaVu-Schriften, führt historische oder ungültige Namen auf gültige PDFKit-Bezeichnungen zurück und schützt die Ausgabe mit einem Fallback. Der Nachweis muss belegen, dass kein PDF-Export auf installierte Schriften des Host-Betriebssystems angewiesen ist.

### Sonderzeichen und Textkodierung

Die Testdaten enthalten mindestens die Zeichen **ä, ö, ü, Ä, Ö, Ü und ß** sowie einen absichtlich historisch doppelt kodierten Text wie **„GesprÄch“**. Das Ergebnis muss die bereinigte Schreibweise **„Gespräch“** enthalten. Die Prüfung darf sich nicht nur auf eine HTTP-200-Antwort beschränken, sondern muss den erzeugten PDF-Text oder dessen extrahierten Inhalt kontrollieren.

### Fragenbibliothek

Die Ende-zu-Ende-Prüfung legt mindestens zwei Fragen im selben Thema und zwei Themen mit Zahlenpräfixen an. Sie verschiebt eine Frage über die zuständige Reihenfolgen-API, lädt die Liste erneut und bestätigt die Persistenz. Zusätzlich prüft sie, dass die natürliche deutsche Sortierung das Thema **„2. Thema“** vor **„10. Thema“** einordnet. Die sichtbare UI-Bezeichnung und die Standardbezeichnung des PDF-Exports müssen **„Fragenbibliothek“** verwenden.

## Ergebnis und Freigabe

Der Produktions-Build `pnpm run build` wurde erfolgreich abgeschlossen. Anschließend wurde ein isolierter Server mit `PORT=3101`, `NODE_ENV=test` und einem frischen temporären Datenordner gestartet. Die automatisierte Prüfung `/tmp/podcore_v21410_e2e.mjs` bestätigte die Health-Version, den Browser-Titel, die Administrationsanmeldung, die DejaVu-Live-Vorschau, das historische Schrift-Fallback, den Fragenbibliotheks-PDF-Export mit Unicode, die natürliche Themensortierung, die persistente manuelle Reihenfolge und die Themenumbenennung.

Die erzeugten Prüf-PDFs lagen während der Ausführung separat unter `/tmp/podcore-v21410-e2e-artifacts/`. Der extrahierte Inhalt der Fragenbibliotheks-PDF bestätigte insbesondere die korrekte Ausgabe von **„Überprüfung: Gespräch, Grüße, Straße, ÄÖÜ“**. Der Stand **PodCore v2.14.10 ist zur Veröffentlichung freigegeben**.

## Prüfdaten und Bereinigung

Der Testdatenordner enthält ausschließlich ein Testkonto, eine Testidee, eine Testepisode und Testfragen. Er ist nicht Teil des Git-Repositorys oder des Release-ZIP-Pakets. Nach der Freigabeprüfung wird der temporäre Datenordner vollständig gelöscht.
