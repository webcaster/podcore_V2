# Demo-Content: „Der Podcast“

Dieses Demo-Set füllt PodCore mit einem realistischen Arbeitsstand für den fiktiven Podcast **„Der Podcast“**. Es eignet sich für Präsentationen, Funktionsprüfungen und die Einarbeitung in den Redaktions-Hub.

## Enthaltene Inhalte

| Bereich | Demo-Inhalt |
|---|---|
| **Branding** | Podcastname „Der Podcast“ und die Beschreibung „Gespräche über Ideen, Menschen und die Geschichten dazwischen.“ |
| **Staffelplanung** | Eine aktive erste Staffel mit sechs geplanten Folgen. |
| **Episoden** | Drei Episoden: eine veröffentlichte Auftaktfolge, eine aufnahmegeplante Interviewfolge und ein Episodenentwurf. |
| **Redaktions-Hub** | Drei Ideen, eine Checkliste, eine Redaktionsnotiz, Recherchematerial und zwei Plantermine. |
| **Interview** | Die fiktive Gesprächspartnerin Lea Winter mit vier freigegebenen Fragen. |
| **Sponsoring** | Ein fiktiver Partner, Mid-Roll-Kategorie, Werbeslot und bestätigte Buchung für Episode 2. |
| **Auswertung** | Vier manuell angelegte Statistikwerte zur Auftaktfolge. |
| **Tutorial** | Ein kurzes, global sichtbares Demo-Tutorial zum Workflow von der Idee bis zur Episode. |

## Sicher importieren

> Der Import legt **keine Nutzer** an, verändert keine Passwörter und löscht keine bestehenden Inhalte. Er aktualisiert ausschließlich Demo-Einträge mit dem Präfix `demo-der-podcast-`.

1. Beende PodCore vollständig, damit keine Datenbanksperre besteht.
2. Öffne ein Terminal im PodCore-Installationsordner.
3. Führe den Import aus:

```bash
node seed-der-podcast-demo.mjs
```

4. Starte PodCore anschließend wieder.

Bei einer Installation mit abweichendem Datenordner übergibst du ihn explizit:

```bash
PODCORE_DATA_DIR=/pfad/zu/deinem/datenordner node seed-der-podcast-demo.mjs
```

Unter Windows PowerShell lautet der Aufruf:

```powershell
$env:PODCORE_DATA_DIR = 'C:\Pfad\zum\Datenordner'
node seed-der-podcast-demo.mjs
```

## Demo-Content entfernen

Die Demo-Einträge lassen sich einzeln in PodCore löschen. Für eine vollständige Bereinigung können in einer SQLite-Datenbank alle Einträge mit IDs, die mit `demo-der-podcast-` beginnen, entfernt werden. Erstelle vorher immer eine Sicherung über die PodCore-Backup-Funktion.
