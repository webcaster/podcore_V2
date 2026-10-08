# PodCore v2.16.49 – persönliches Hell-/Dunkeldesign

## Überblick

PodCore unterstützt jetzt eine individuelle Farbschema-Auswahl pro Benutzerkonto. Jede Person kann unabhängig von anderen Teammitgliedern zwischen hellem und dunklem Design wechseln. Die Auswahl wird im eigenen Profil gespeichert und beim nächsten Login automatisch angewendet.

## Bedienung

1. **Einstellungen** in der linken Navigation öffnen.
2. Den Bereich **Mein Design** auswählen.
3. Unter **Farbschema** zwischen **Dunkles Design** und **Helles Design** wählen.
4. Optional Akzentfarbe, Sidebar-Farbe und Schriftgröße anpassen.
5. **Design speichern** auswählen.

Die Profil- und Designbereiche der Einstellungen sind jetzt für alle angemeldeten Benutzer erreichbar. Podcast-, Speicher-, Update- und Systembereiche bleiben weiterhin auf Benutzer mit den erforderlichen Administrationsrechten beschränkt.

## Technische Änderungen

- Persönliche Theme-Daten bleiben in der Benutzerzeile und werden nicht im Browser als dauerhafte Datenquelle gespeichert.
- Die Hell-/Dunkel-Vorschau wird nicht mehr unmittelbar durch den zuvor gespeicherten Modus überschrieben.
- Die Theme-Schaltflächen besitzen einen zugänglichen `aria-pressed`-Status.
- Native Eingabefelder erzwingen nicht mehr grundsätzlich das dunkle Browser-Farbschema.
- Die vorhandene serverseitige Normalisierung von Theme-Werten und die Berechtigungsprüfung bleiben aktiv.
- Die globale Podcast- und Branding-Konfiguration wird durch die persönliche Farbschema-Auswahl nicht verändert.

## UX-Prüfung und bewusst zurückgestellte Vorschläge

Im Rahmen dieses Updates wurden Navigation, Einstellungen, Rollenfilterung und Sidebar geprüft. Die folgenden Verbesserungen sind sinnvoll, verändern aber den Bedienablauf stärker und werden deshalb erst nach Freigabe umgesetzt:

- Einstellungen in **Persönlich** und **Administration** gruppieren, damit globale Systemoptionen schneller auffindbar sind.
- Einen kompakten Hell-/Dunkel-Schnellschalter in der Benutzerleiste ergänzen.
- Die lange linke Navigation in klar benannte Gruppen wie **Produktion**, **Redaktion**, **Sponsoring** und **Verwaltung** gliedern.
- Häufige Aktionen im Episoden- und Media-Bereich als kontextbezogene Aktionsleiste bündeln.
- Leere Zustände und nächste Schritte in den Modulen Episoden, Media Library und Sponsoring vereinheitlichen.
- Die mobile Navigation mit einer sichtbaren Bereichsüberschrift und einem klaren Zurückweg ergänzen.

## Qualitätssicherung

- `git diff --check` erfolgreich.
- Versionsprüfung, Client-Build, Server-Build und Synchronisierung nach `server/public` erfolgreich.
- Versionsstand: **2.16.49**.

## Upgrade-Hinweis

Das Update benötigt keine destruktive Datenbankmigration. Vorhandene Benutzerkonten ohne gespeicherte Theme-Auswahl verwenden weiterhin das dunkle Standarddesign. Die Anwendung sollte wie gewohnt aktualisiert werden; der persistente Datenordner darf nicht gelöscht werden.
