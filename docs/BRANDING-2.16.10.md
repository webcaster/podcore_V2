# PodCore v2.16.10 – Vektor-Branding

PodCore verwendet ab v2.16.10 das eigene SVG-Signet `client/public/podcore-logo.svg`. Es ersetzt das bisherige Kopfhörer-Fallback im Login, in der Desktop-Sidebar und in der mobilen Navigation. Der Browser verwendet dasselbe Signet automatisch als Favicon.

## Marken-Subline

> **Dein Podcast. Dein Workflow.**

Die Subline wird unmittelbar unter dem PodCore-Namen in der Navigation angezeigt und bildet die verbindliche Kurzbeschreibung für App und Website.

## WordPress und The7

Das getrennte Branding-Paket enthält das SVG-Signet und die Datei `podcore-the7-theme.css`. Diese CSS wird unter **The7 → Theme-Optionen → Benutzerdefiniertes CSS** eingefügt. Sie ist auf `.pcwp` begrenzt und schützt die eingebettete PodCore-Startseite gegen globale The7-Textfarben, Containerbreiten und Link-Regeln.

Für die WordPress-Mediathek kann das SVG je nach Sicherheitskonfiguration über ein SVG-fähiges Medien-Plugin oder direkt über das Theme eingebunden werden. Wird ein SVG-Upload durch WordPress blockiert, darf die Datei nicht in ein unsicheres Fremdformat umgewandelt werden; stattdessen sollte die SVG-Unterstützung gezielt und kontrolliert freigegeben werden.
