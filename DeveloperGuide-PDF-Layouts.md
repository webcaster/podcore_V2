# Entwickler-Leitfaden: Benutzerdefinierte PDF-Layouts in PodCore

Dieser Leitfaden beschreibt, wie das PDF-Export-System in PodCore angepasst und erweitert werden kann. Der PDF-Export basiert auf `pdfkit` im Backend.

## 1. Architektur-Überblick

Der PDF-Export erfolgt serverseitig in der Datei `/server/routers/episodes.ts` über den Endpunkt `GET /api/episodes/:id/export-pdf`. 

### Hauptkomponenten:
- **Branding-Integration**: Automatische Einbindung von Logos aus dem Datenverzeichnis.
- **Block-Rendering**: Dynamische Formatierung von Skript-Blöcken basierend auf ihrem Typ.
- **Metadaten-Visualisierung**: Zusammenfassung von Hosts, Gästen und Terminen.

## 2. Anpassung des Layouts

### Branding & Farben
Die Farben für die verschiedenen Block-Typen sind im Router definiert:
```typescript
const blockColors: Record<string, string> = {
  intro: '#0891b2', 
  segment: '#2563eb', 
  // ...
};
```
Um das Farbschema zu ändern, passen Sie einfach die Hex-Werte in diesem Objekt an.

### Entfernen von technischen Markern
PodCore verwendet reguläre Ausdrücke, um technische Platzhalter (wie `[INTRO]`) vor dem Export zu entfernen:
```typescript
cleanContent = cleanContent.replace(/\[(INTRO|OUTRO|AD|JINGLE|SEGMENT|INTERVIEW|CUSTOM)\]/gi, '').trim();
```

## 3. Fortgeschrittene Anpassungen

### Neue Sektionen hinzufügen
Um eine neue Sektion (z.B. Social Media Posts) hinzuzufügen:
1. Erweitern Sie das Datenbank-Schema in `database.ts`.
2. Fügen Sie die Sektion in `episodes.ts` mit `doc.fontSize()`, `doc.font()` und `doc.text()` hinzu.

### Schriftarten
Standardmäßig wird Helvetica verwendet. Um benutzerdefinierte Schriftarten zu nutzen, müssen diese als `.ttf` Dateien im Projekt hinterlegt und via `doc.registerFont()` registriert werden.

## 4. Best Practices
- **Vermeidung von HTML**: Da `pdfkit` kein HTML rendert, sollten HTML-Tags vor dem Schreiben mit `replace(/<[^>]*>?/gm, '')` entfernt werden.
- **Seitenumbrüche**: Nutzen Sie `doc.addPage()`, wenn eine Sektion zu lang wird, oder verlassen Sie sich auf das automatische Paging von `pdfkit`.
- **Bilder**: Prüfen Sie immer mit `fs.existsSync()`, ob Bilddateien vorhanden sind, bevor Sie `doc.image()` aufrufen.
