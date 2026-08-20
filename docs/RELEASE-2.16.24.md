# PodCore v2.16.24 – Stabile Tutorialführung für komplexe Menüs

Version **2.16.24** standardisiert die Klickaufzeichnung für komplexe Tab- und Untermenüs. Das Muster aus der Dashboard-Anpassung wird damit auf die zentralen mehrstufigen Bereiche der Anwendung übertragen.

## Einheitliche Aufzeichnungsrouten

Die Tabs in **Einstellungen**, **Administration**, **Podcast-Einstellungen/Branding** und **Redaktions-Hub** besitzen jetzt neben ihrer stabilen Tutorialkennung eine vollständige Aufzeichnungsroute. Ein aufgezeichneter Klick wird nach der Bestätigung des Schritts direkt auf den passenden Unterbereich übertragen.

| Bereich | Beispiel für gespeicherte Route |
|---|---|
| Einstellungen | `/settings?tab=theme` |
| Administration | `/admin?tab=trash` |
| Branding & Backup | `/branding?tab=backup` |
| Redaktions-Hub | `/editorial?tab=interviews` |

Die vorhandenen Zielkennungen bleiben unverändert, beispielsweise `settings-tab-theme`, `admin-tab-trash`, `branding-tab-backup` und `editorial-tab-interviews`. Damit bleiben bereits angelegte Tutorials kompatibel, während neue Aufzeichnungen den richtigen Tab für den nächsten Schritt automatisch öffnen.

## Prüfung

Der Client-TypeScript- und Produktions-Build waren erfolgreich. Die Routenübergabe und die Wiedergabezuordnung für Einstellungen, Administration, Branding sowie Redaktions-Hub wurden statisch gegen ihre Tutorialkennungen geprüft.
