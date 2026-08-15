# PodCore – The7-/WPBakery-CSS

Die Datei `podcore-the7-theme.css` ergänzt die PodCore-Startseite für **The7** und **WPBakery**. Sie verhindert insbesondere, dass globale The7-Textfarben, Containerbreiten oder Link-Regeln das gekapselte PodCore-Layout verändern.

## Einbau

Öffne im WordPress-Backend **The7 → Theme-Optionen → Benutzerdefiniertes CSS** und füge den vollständigen Inhalt von `podcore-the7-theme.css` ans Ende ein. Speichere anschließend die Einstellungen, leere gegebenenfalls den The7-Cache und lade die PodCore-Seite mit `Strg + F5` neu.

Die Startseite selbst wird weiterhin über das WPBakery-Element **Raw HTML** eingebunden. Verwende dafür die Datei `podcore-startseite.html` aus dem WordPress-Startseitenpaket.

## SVG-Logo

Die Vektordatei `podcore-logo.svg` kann als Favicon, Theme-Logo oder Medienobjekt verwendet werden. WordPress erlaubt SVG-Uploads nur mit einer passenden Sicherheitsfreigabe; alternativ kann die Datei durch den Theme-Dateimanager oder ein SVG-fähiges Medien-Plugin eingebunden werden.
