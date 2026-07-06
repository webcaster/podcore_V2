# PodCore v2.11.5 → v2.11.6 – Bugfix Roadmap

## Fehler-Übersicht

| # | Fehler | Ursache | Lösung | Priorität |
|---|---|---|---|---|
| 1 | Platzierungsübersicht nicht editierbar | Modal-Logik fehlt | Edit-Modal implementieren | 🔴 KRITISCH |
| 2 | Preise/Kategorien nicht übernommen | Felder nicht im Request | Request-Body erweitern | 🔴 KRITISCH |
| 3 | Position zeigt UUID statt Name | Falsches Feld angezeigt | Slot-Namen verwenden | 🔴 KRITISCH |
| 4 | Buchungskalender: Vorplanungen nicht im Grid | Filter-Logik falsch | Slot-Rendering fixen | 🟠 HOCH |
| 5 | Freigabe-Center: Fehler beim Laden | API-Endpunkt falsch | Endpunkt-Mapping fixen | 🟠 HOCH |
| 6 | Wiki-Seiten teilweise schwarz | CSS/Theme-Fehler | Theme-Konsistenz prüfen | 🟡 MITTEL |

---

## Fehler 1: Platzierungsübersicht nicht editierbar

### Problem
Der Benutzer kann Buchungen in der Platzierungsübersicht nicht bearbeiten. Das Edit-Modal wird nicht geöffnet.

### Ursache
In `SponsorDetailPage.tsx` fehlt die `openEditPlacement`-Funktion oder der Button ist nicht korrekt verbunden.

### Lösung

**Datei**: `client/src/pages/SponsorDetailPage.tsx`

```typescript
// VORHER: Button ohne Funktion
<Button onClick={() => {}} size="sm" variant="outline">
  Bearbeiten
</Button>

// NACHHER: Button mit openEditPlacement
<Button 
  onClick={() => openEditPlacement(placement)} 
  size="sm" 
  variant="outline"
>
  Bearbeiten
</Button>
```

**Checklist**:
- [ ] `openEditPlacement` Funktion existiert
- [ ] Button ist mit der Funktion verbunden
- [ ] Modal wird beim Klick geöffnet
- [ ] Alle Felder sind im Modal sichtbar

---

## Fehler 2: Preise/Kategorien nicht übernommen

### Problem
Wenn eine Buchung erstellt oder bearbeitet wird, werden Preise und Kategorien nicht gespeichert.

### Ursache
Der Request-Body in `handleSavePlacement` enthält nicht alle Felder:
- `price` fehlt
- `category_id` fehlt
- `ad_title` fehlt

### Lösung

**Datei**: `client/src/pages/SponsorDetailPage.tsx`

```typescript
// VORHER: Unvollständiger Request
const res = await sponsorsApi.updatePlacement(placement.id, {
  episode_id: editingPlacement.episode_id,
  invoice_status: editingPlacement.invoice_status,
});

// NACHHER: Vollständiger Request
const res = await sponsorsApi.updatePlacement(placement.id, {
  episode_id: editingPlacement.episode_id,
  price: editingPlacement.price,
  category_id: editingPlacement.category_id,
  ad_title: editingPlacement.ad_title,
  position: editingPlacement.position,
  invoice_status: editingPlacement.invoice_status,
  price_adjustment: editingPlacement.price_adjustment,
  listener_fee: editingPlacement.listener_fee,
});
```

**Backend-Endpunkt**: `server/routers/sponsors.ts`

```typescript
// PUT /placements/:placementId
router.put('/placements/:placementId', (req, res) => {
  const { 
    episode_id, 
    price, 
    category_id,
    ad_title,
    position,
    invoice_status,
    price_adjustment,
    listener_fee 
  } = req.body;

  db.prepare(`
    UPDATE ad_placements 
    SET 
      episode_id = ?,
      price = ?,
      ad_category_id = ?,
      ad_title = ?,
      position = ?,
      invoice_status = ?,
      price_adjustment = ?,
      listener_fee = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    episode_id,
    price,
    category_id,
    ad_title,
    position,
    invoice_status,
    price_adjustment,
    listener_fee,
    req.params.placementId
  );

  res.json({ success: true });
});
```

**Checklist**:
- [ ] Alle Felder im Request enthalten
- [ ] Backend speichert alle Felder
- [ ] Datenbank-Spalten existieren
- [ ] Werte werden korrekt angezeigt

---

## Fehler 3: Position zeigt UUID statt Name

### Problem
In der Platzierungsübersicht wird statt des Platzierungsnamens eine UUID angezeigt.

### Ursache
Das Feld `position` wird falsch interpretiert. Es sollte der `slot_name` oder `ad_title` angezeigt werden.

### Lösung

**Datei**: `client/src/pages/SponsorDetailPage.tsx`

```typescript
// VORHER: UUID angezeigt
<TableCell>
  {placement.position || placement.episode_id}
</TableCell>

// NACHHER: Slot-Name angezeigt
<TableCell>
  {placement.ad_title || placement.slot_name || 'Ohne Position'}
</TableCell>
```

**Backend-Endpunkt**: `server/routers/sponsors.ts` (Billing-Endpunkt)

```typescript
// GET /billing/:sponsorId
const placements = db.prepare(`
  SELECT 
    ap.*,
    s.slot_name,
    s.position as slot_position,
    e.title as episode_title,
    ac.name as category_name
  FROM ad_placements ap
  LEFT JOIN ad_slots s ON ap.slot_id = s.id
  LEFT JOIN episodes e ON ap.episode_id = e.id
  LEFT JOIN ad_categories ac ON ap.ad_category_id = ac.id
  WHERE ap.sponsor_id = ?
`).all(sponsorId);
```

**Checklist**:
- [ ] `ad_title` wird angezeigt (nicht UUID)
- [ ] Fallback auf `slot_name` wenn `ad_title` leer
- [ ] Fallback auf "Ohne Position" wenn beide leer
- [ ] Backend liefert alle notwendigen Felder

---

## Fehler 4: Buchungskalender zeigt Vorplanungen nicht im Grid

### Problem
Slots ohne Buchung (Vorplanungen) werden im Buchungskalender-Grid nicht angezeigt, nur in der "Einträge ohne Datum" Liste.

### Ursache
Der Backend-Filter für `plannedSlots` hat kein `placement_start`/`placement_end` Datum, daher werden sie nicht im Grid angezeigt.

### Lösung

**Datei**: `server/routers/sponsors.ts` (Buchungskalender-Endpunkt)

```typescript
// GET /booking-calendar/:sponsorId
const plannedSlots = db.prepare(`
  SELECT 
    s.id,
    s.slot_name,
    s.position,
    s.placement_start,
    s.placement_end,
    s.base_price as price,
    sp.name as sponsor_name,
    ac.name as category_name,
    'planned' as type
  FROM ad_slots s
  LEFT JOIN sponsors sp ON s.sponsor_id = sp.id
  LEFT JOIN ad_categories ac ON s.category_id = ac.id
  WHERE s.sponsor_id = ?
    AND NOT EXISTS (
      SELECT 1 FROM ad_placements ap WHERE ap.slot_id = s.id
    )
  ORDER BY s.placement_start ASC
`).all(sponsorId);

// Filtere nach Datum-Bereich
const filteredPlanned = plannedSlots.filter(slot => {
  if (!slot.placement_start) return false; // Nur mit Datum
  const start = new Date(slot.placement_start);
  return start >= from && start <= to;
});
```

**Frontend**: `client/src/pages/SponsorBookingCalendarPage.tsx`

```typescript
// Vorplanungen mit Datum im Grid anzeigen
const plannedWithDate = data.plannedSlots?.filter(s => s.placement_start) || [];
const plannedWithoutDate = data.plannedSlots?.filter(s => !s.placement_start) || [];

// Render im Kalender-Grid
{plannedWithDate.map(slot => (
  <div 
    key={slot.id}
    className="bg-amber-100 border-2 border-dashed border-amber-400 p-2 rounded"
    style={{ gridColumn: `${startCol} / span ${duration}` }}
  >
    <div className="text-xs font-semibold text-amber-900">
      ◷ {slot.slot_name}
    </div>
  </div>
))}
```

**Checklist**:
- [ ] Backend filtert Slots mit `placement_start` Datum
- [ ] Frontend zeigt diese im Kalender-Grid an
- [ ] Slots ohne Datum bleiben in "Einträge ohne Datum"
- [ ] Farbe ist amber/orange (unterschiedlich von Bookings)

---

## Fehler 5: Freigabe-Center Fehler beim Laden

### Problem
Das Freigabe-Center zeigt "Fehler beim Laden der Freigaben" an.

### Ursache
Der API-Endpunkt `/approvals/pending` existiert nicht oder gibt einen Fehler zurück.

### Lösung

**Backend**: `server/routers/approvals.ts`

```typescript
// GET /approvals/pending
router.get('/pending', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT 
        id, title, episode_number, season_number, 
        status, created_at
      FROM episodes
      WHERE status = 'pending_approval'
      ORDER BY created_at DESC
    `).all();

    const questions = db.prepare(`
      SELECT 
        iq.id, iq.question_text, iq.guest_name, 
        iq.status, iq.created_at,
        e.title as episode_title
      FROM interview_questions iq
      LEFT JOIN episodes e ON iq.episode_id = e.id
      WHERE iq.status = 'pending_approval'
      ORDER BY iq.created_at DESC
    `).all();

    res.json({ episodes, questions });
  } catch (err) {
    console.error('Error loading approvals:', err);
    res.status(500).json({ error: err.message });
  }
});
```

**Frontend**: `client/src/pages/ApprovalsPage.tsx`

```typescript
const loadData = async () => {
  setLoading(true);
  try {
    const res = await approvalsApi.getPending();
    setData(res);
  } catch (err) {
    console.error('Failed to load approvals:', err);
    showError('Fehler beim Laden der Freigaben');
  } finally {
    setLoading(false);
  }
};
```

**API**: `client/src/lib/api.ts`

```typescript
export const approvalsApi = {
  getPending: () => api.get<any>('/approvals/pending'),
  approveEpisode: (id: string) => api.post(`/approvals/episodes/${id}/approve`, {}),
  rejectEpisode: (id: string, reason?: string) => 
    api.post(`/approvals/episodes/${id}/reject`, { reason }),
  approveQuestion: (id: string) => api.post(`/approvals/questions/${id}/approve`, {}),
  rejectQuestion: (id: string, reason?: string) => 
    api.post(`/approvals/questions/${id}/reject`, { reason }),
};
```

**Checklist**:
- [ ] Backend-Endpunkt `/approvals/pending` existiert
- [ ] Endpunkt gibt `{ episodes, questions }` zurück
- [ ] API-Funktion `approvalsApi.getPending()` existiert
- [ ] Fehlerbehandlung funktioniert

---

## Fehler 6: Wiki-Seiten teilweise schwarz

### Problem
Einige Wiki-Seiten werden mit schwarzem Hintergrund angezeigt, Text ist unsichtbar.

### Ursache
Theme-Konsistenz-Problem in `WikiPage.tsx` oder `AppContext.tsx`.

### Lösung

**Datei**: `client/src/contexts/AppContext.tsx`

```typescript
// Stelle sicher, dass applyUserTheme korrekt funktioniert
const applyUserTheme = (theme: 'light' | 'dark') => {
  const html = document.documentElement;
  
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  
  localStorage.setItem('theme', theme);
};
```

**Datei**: `client/src/pages/WikiPage.tsx`

```typescript
// Stelle sicher, dass ArticleContent die richtigen CSS-Klassen hat
const ArticleContent = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <Streamdown>{content}</Streamdown>
    </div>
  );
};
```

**Checklist**:
- [ ] Theme wird korrekt angewendet
- [ ] `dark:prose-invert` ist in ArticleContent vorhanden
- [ ] Text-Farbe passt zum Hintergrund
- [ ] Keine hardcodierten Farben in WikiPage

---

## Implementierungs-Reihenfolge

### Phase 1: Kritische Fixes (Fehler 1-3)
1. **Fehler 3**: Position zeigt UUID → Slot-Namen anzeigen
2. **Fehler 2**: Preise/Kategorien nicht übernommen → Request-Body erweitern
3. **Fehler 1**: Platzierungsübersicht nicht editierbar → Edit-Modal fixen

### Phase 2: Kalender & Freigabe (Fehler 4-5)
4. **Fehler 5**: Freigabe-Center Fehler → API-Endpunkt fixen
5. **Fehler 4**: Buchungskalender Vorplanungen → Filter-Logik fixen

### Phase 3: Kosmetik (Fehler 6)
6. **Fehler 6**: Wiki-Seiten schwarz → Theme-Konsistenz

---

## Testing-Checkliste

Nach der Implementierung testen:

- [ ] **Sponsor-Detailseite**
  - [ ] Buchungen sind editierbar
  - [ ] Position zeigt Slot-Namen (nicht UUID)
  - [ ] Preise werden gespeichert
  - [ ] Kategorien werden gespeichert

- [ ] **Buchungskalender**
  - [ ] Vorplanungen mit Datum im Grid
  - [ ] Vorplanungen ohne Datum in Liste
  - [ ] CSV-Export funktioniert

- [ ] **Freigabe-Center**
  - [ ] Episoden werden geladen
  - [ ] Interview-Fragen werden geladen
  - [ ] Genehmigen/Ablehnen funktioniert

- [ ] **Wiki**
  - [ ] Text ist lesbar
  - [ ] Keine schwarzen Seiten

---

## Deployment

Nach der Implementierung:

1. **Build**: `npm run build`
2. **Test**: `npm start`
3. **Git**: `git add -A && git commit -m "v2.11.6: Bugfixes"`
4. **Push**: `git push origin main`
5. **ZIP**: `zip -r podcore_v2.11.6.zip .`

---

## Zusammenfassung

Dieses Bugfix-Skript behebt die 6 kritischsten Fehler in v2.11.5:
- ✅ Platzierungsübersicht editierbar
- ✅ Preise/Kategorien übernommen
- ✅ Position zeigt Namen
- ✅ Buchungskalender zeigt Vorplanungen
- ✅ Freigabe-Center funktioniert
- ✅ Wiki-Seiten lesbar

**Zielversion**: v2.11.6 (Hotfix)
**Zeitschätzung**: 4-6 Stunden
