# PodCore Version 2.15.2 - Bugfixes & Improvements

**Release Date:** August 5, 2026  
**Status:** Stable Release

---

## 🔧 Behobene Fehler

### 1. **Update-Flow mit Elevation-Token** ✅

**Problem:** Update konnte nicht angewendet werden, da Elevation-Token erforderlich war, aber nicht automatisch angefordert wurde.

**Lösung:**
- ✅ `updateApi.requestElevation()` - Neuer Endpoint zum automatischen Anfordern des Tokens
- ✅ `updateApi.applyUpdate()` - Aktualisiert, um Token zu akzeptieren
- ✅ `api.post()` - Erweitert, um Custom-Header zu unterstützen
- ✅ `handleApplyUpdate()` - Fordert Token automatisch an, bevor Update angewendet wird

**Update-Flow:**
1. Admin klickt "Update anwenden"
2. System fordert automatisch Elevation-Token an
3. Token wird generiert (5 Min gültig)
4. Update wird mit Token angewendet
5. Token wird nach Verwendung gelöscht (One-Time-Token)

### 2. **Zusammenfassung-Link (Interview-Partner)** ✅

**Problem:** Button "Zusammenfassung" zeigte Fehler "Route nicht gefunden"

**Lösung:**
- ✅ `handleOpenSummary()` - Umgeleitet auf PDF-Export statt nicht existierenden HTML-Endpoint
- ✅ Benutzer können jetzt PDF mit Interview-Fragen öffnen
- ✅ PDF kann direkt gedruckt oder als Datei gespeichert werden

### 3. **Persönliches PDF in PDF-Layout-Manager** ✅

**Problem:** "Persönliches PDF" (Interview-Partner) war nicht im PDF-Layout-Manager verfügbar

**Lösung:**
- ✅ Neuer Export-Typ: `interview_partner` - "Persönliches PDF (Interview-Partner)"
- ✅ Neue Sektion in SECTION_GROUPS mit 5 Konfigurationsoptionen:
  - `showPartnerGreeting` - Personalisierte Begrüßung
  - `showPartnerQuestions` - Interview-Fragen
  - `showPartnerEpisodeInfo` - Episoden-Informationen
  - `showPartnerTechnicalNotes` - Technische Anweisungen
  - `showPartnerSignature` - Unterschriftsfeld
- ✅ Admin kann jetzt Layout für Interview-Partner-PDFs anpassen

---

## 📋 Technische Änderungen

### Backend
- Keine Änderungen (Elevation-Token System funktioniert korrekt)

### Frontend

**client/src/lib/api.ts:**
```typescript
// Neuer Endpoint
requestElevation: () => api.post<any>('/admin/update/request-elevation', {}),

// Aktualisiert
applyUpdate: async (updateId: string, elevationToken?: string) => {
  const headers = elevationToken ? { 'x-elevation-token': elevationToken } : {};
  return api.post<any>('/admin/update/apply', { updateId }, { headers });
},

// Erweitert
post: <T>(path: string, body?: unknown, options?: RequestInit) => 
  request<T>('POST', path, body, options),
```

**client/src/pages/EditorialHubPage.tsx:**
```typescript
// Behoben: Zusammenfassung-Link
const handleOpenSummary = () => {
  if (!selectedPartner) return;
  const url = `/api/editorial/interviews/partners/${selectedPartner.id}/export-pdf?documentName=Interview-${selectedPartner.name?.replace(/\s+/g, '-')}`;
  window.open(url, '_blank');
};
```

**client/src/pages/SettingsPage.tsx:**
```typescript
// Aktualisiert: Update-Flow mit Elevation-Token
const handleApplyUpdate = async () => {
  // Schritt 1: Elevation-Token anfordern
  const elevationData = await updateApi.requestElevation();
  const elevationToken = elevationData.elevationToken;
  
  // Schritt 2: Update mit Token anwenden
  const result = await updateApi.applyUpdate(uploadResult.updateId, elevationToken);
  // ...
};
```

**client/src/pages/PdfLayoutManagerPage.tsx:**
```typescript
// Neue Export-Typ
{ value: 'interview_partner', label: 'Persönliches PDF (Interview-Partner)' }

// Neue Sektion
interview_partner: {
  label: 'Persönliches PDF (Interview-Partner)',
  keys: ['showPartnerGreeting', 'showPartnerQuestions', 'showPartnerEpisodeInfo', 'showPartnerTechnicalNotes', 'showPartnerSignature'],
}

// Neue Labels
showPartnerGreeting: 'Personalisierte Begrüßung (Interview-Partner)',
showPartnerQuestions: 'Interview-Fragen (Interview-Partner)',
showPartnerEpisodeInfo: 'Episoden-Informationen (Interview-Partner)',
showPartnerTechnicalNotes: 'Technische Anweisungen (Interview-Partner)',
showPartnerSignature: 'Unterschriftsfeld (Interview-Partner)',
```

---

## 🚀 Verbesserungen

### Update-Prozess
- ✅ Automatische Elevation-Token Anforderung
- ✅ Benutzerfreundlichere Fehlermeldungen
- ✅ Fortschrittsanzeige mit Token-Status
- ✅ Sichere One-Time-Token Verwendung

### Interview-Partner Features
- ✅ Zusammenfassung-Link funktioniert korrekt
- ✅ PDF-Export mit benutzerdefinierten Namen
- ✅ Anpassbare PDF-Layout für Interview-Partner
- ✅ Nahtlose Integration mit PDF-Layout-Manager

---

## 📊 Version-Übersicht

| Komponente | Version |
|------------|---------|
| PodCore | 2.15.2 |
| package.json | 2.15.2 |
| server/package.json | 2.15.2 |
| client/package.json | 2.15.2 |

---

## 🔄 Migration & Kompatibilität

### Upgrade-Pfad
- ✅ Kompatibel mit v2.15.1 Datenbanken
- ✅ Keine Datenmigration erforderlich
- ✅ Keine Breaking Changes

---

## 🆘 Häufige Fragen

**F: Warum wird beim Update ein Token angefordert?**  
A: Das ist eine Sicherheitsmaßnahme, um versehentliche Updates zu verhindern. Der Token wird automatisch angefordert.

**F: Wie lange ist der Elevation-Token gültig?**  
A: 5 Minuten. Nach dieser Zeit muss ein neuer Token angefordert werden.

**F: Kann ich die Zusammenfassung jetzt öffnen?**  
A: Ja, der Button öffnet jetzt ein PDF mit den Interview-Fragen.

**F: Kann ich das Interview-Partner-PDF-Layout anpassen?**  
A: Ja, gehen Sie zu Einstellungen → PDF-Layouts und wählen Sie "Persönliches PDF (Interview-Partner)".

---

## 📝 Checkliste nach Update

- [ ] Backup vor Update erstellt
- [ ] v2.15.2 installiert
- [ ] Anwendung gestartet
- [ ] Update-Funktion getestet
- [ ] Zusammenfassung-Button funktioniert
- [ ] PDF-Layout-Manager zeigt Interview-Partner Option
- [ ] Interview-Partner-Layout angepasst

---

## 🔗 Links

- **GitHub:** https://github.com/webcaster/podcore_V2
- **Wiki:** https://github.com/webcaster/podcore_V2/wiki
- **Issues:** https://github.com/webcaster/podcore_V2/issues

---

## 📞 Support

Bei Fragen oder Problemen:
- GitHub Issues öffnen
- Wiki durchsuchen
- Support kontaktieren

---

**PodCore v2.15.2 ist produktionsreif! 🎉**

Version: 2.15.2  
Datum: 5. August 2026  
Status: ✅ Stable Release
