# PodCore Tutorial Hub — WordPress Plugin

Dieses Plugin ermöglicht es Endnutzern auf deiner Website, offizielle PodCore-Tutorials anzusehen, herunterzuladen und direkt in ihre PodCore-Anwendung zu importieren.

## Funktionen
- **Custom Post Type**: Verwalte Tutorials direkt im WordPress-Admin-Dashboard (`PodCore Tutorials`).
- **JSON-Export**: Endnutzer können jedes Tutorial per Klick als `.json`-Datei herunterladen.
- **Frontend-Shortcode**: Zeigt einen modernen, responsiven Tutorial-Katalog auf jeder beliebigen WordPress-Seite an.
- **Import-Kompatibilität**: Die heruntergeladene JSON-Datei entspricht exakt dem von PodCore benötigten Format und kann über die Tutorial-Verwaltung importiert werden.

## Installation
1. Lade den Ordner `podcore-tutorials` in dein WordPress-Plugin-Verzeichnis (`/wp-content/plugins/`) hoch.
2. Aktiviere das Plugin im WordPress-Admin unter **Plugins**.
3. Platziere den Shortcode `[podcore_tutorial_hub]` auf einer beliebigen Seite, um den Katalog anzuzeigen.

---

# PodCore Entwickler-Modus
In PodCore selbst ist die Tutorial-Verwaltung (Erstellen, Bearbeiten, Importieren, Exportieren) nun durch den **Entwickler-Modus** geschützt. 
- Nur Administratoren können den Entwickler-Modus in ihren **Einstellungen** aktivieren.
- Normale Benutzer und Admins ohne aktiven Entwickler-Modus sehen die Verwaltungsoberfläche nicht und können keine Tutorials verändern.
