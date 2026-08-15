# PodCore SEO in The7 und WPBakery einbauen

Diese Anleitung trennt bewusst drei Ebenen: **Seiteninhalt**, **Meta-Daten** und **strukturiertes Markup**. WPBakery ist für den sichtbaren Seiteninhalt zuständig. Meta-Daten und JSON-LD gehören dagegen in ein SEO- oder Header-Plugin, nicht in ein Raw-HTML-Element.

> Verwende jeweils nur **ein** SEO-Plugin. Für PodCore eignet sich beispielsweise Rank Math **oder** Yoast SEO. Zwei parallele SEO-Plugins können Titel, Canonicals und Schema-Daten doppelt ausgeben.

## 1. Meta-Daten der PodCore-Startseite

Öffne im WordPress-Backend die PodCore-Startseite und den SEO-Bereich deines gewählten Plugins. Trage diese Werte ein:

| Feld | Empfohlener Wert |
|---|---|
| SEO-Titel | `PodCore – Podcast Management Software für Redaktion & Produktion` |
| Meta-Beschreibung | `PodCore bündelt Ideen, Episoden, Skripte, Sponsoring und Freigaben in einer lokalen Podcast-Management-Software. Jetzt kostenlos herunterladen.` |
| Fokus-Keyword | `Podcast Management Software` |
| Ergänzende Begriffe im sichtbaren Text | `Podcast Produktion planen`, `Podcast Redaktionsplan`, `Podcast Skript erstellen`, `Podcast Workflow`, `lokale Podcast Software` |
| Social-Titel | `PodCore – Dein Podcast. Dein Workflow.` |
| Social-Beschreibung | `Plane, produziere und organisiere Podcasts an einem Ort – lokal, strukturiert und auf deinen Workflow zugeschnitten.` |
| Social-Bild | Das PodCore-Hero-Bild aus der WordPress-Mediathek, mindestens 1200 × 630 Pixel |

Der **Titel**, die **H1** und die Beschreibung sollen den tatsächlichen Seiteninhalt wiedergeben. Verwende keine Begriffe, Funktionen oder Preise, die auf der Seite noch nicht sichtbar beziehungsweise verfügbar sind.

## 2. Strukturierte Daten: sicherer Einbau außerhalb von WPBakery

Google empfiehlt JSON-LD als gut wartbare Form von strukturierten Daten. Die Daten müssen zum sichtbaren Inhalt der Seite passen und nach der Veröffentlichung geprüft werden.[1]

### Einbauweg

1. Installiere bei Bedarf ein Header-/Code-Snippet-Plugin, etwa **WPCode Lite**; alternativ nutze die Seiten-spezifische Schema-Funktion deines SEO-Plugins.
2. Erstelle ein **neues Snippet ausschließlich für die PodCore-Startseite**.
3. Setze den Ausgabetyp auf `Header` oder auf `Seiten-Header`.
4. Kopiere den folgenden Block vollständig hinein.
5. Ersetze `https://podcore.de/` nur dann, wenn die Startseite später eine andere finale URL hat.
6. Speichere und prüfe die publizierte Seite im [Google Rich Results Test](https://search.google.com/test/rich-results).

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://podcore.de/#organization",
      "name": "PodCore",
      "url": "https://podcore.de/",
      "logo": "https://podcore.de/wp-content/uploads/2026/08/podcore-logo-mark.png"
    },
    {
      "@type": "WebSite",
      "@id": "https://podcore.de/#website",
      "url": "https://podcore.de/",
      "name": "PodCore",
      "inLanguage": "de-DE",
      "publisher": { "@id": "https://podcore.de/#organization" }
    },
    {
      "@type": "SoftwareApplication",
      "name": "PodCore",
      "url": "https://podcore.de/",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Windows, macOS, Linux",
      "isAccessibleForFree": true,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "url": "https://github.com/webcaster/podcore_V2/releases/latest"
      },
      "featureList": "Podcast Redaktions-Hub, Episodenplanung, Skript-Editor, Sponsoring-Verwaltung, PDF-Layouts, lokale Backups, Tutorial-System"
    }
  ]
}
</script>
```

> **Keine Bewertungen erfinden:** Für Software-App-Rich-Results verlangt Google neben Preisangaben auch eine echte Bewertung oder Rezension. Ergänze daher `aggregateRating` oder `review` erst, wenn real erhobene und auf der Website sichtbar dargestellte Bewertungen vorliegen.[2]

## 3. Sichtbarer SEO-Text in WPBakery

Setze die vorhandenen Seitenelemente in dieser Reihenfolge ein: eine eindeutige H1 im Hero, danach H2-Abschnitte für Redaktions-Hub, Episodenproduktion, Workflow und lokale Nutzung. Die aktuelle PodCore-Startseite folgt bereits diesem Aufbau.

Unter dem Video empfiehlt sich ein kurzer FAQ-Abschnitt als Accordion-Element in WPBakery:

| Frage | Antwortentwurf |
|---|---|
| Was ist PodCore? | PodCore ist eine lokale Podcast-Management-Software für Redaktion, Planung, Produktion, Freigabe und Archiv. |
| Für wen ist PodCore geeignet? | Für unabhängige Podcaster, Produktionsstudios, Redaktionen und Teams, die ihren Podcast-Workflow bündeln möchten. |
| Funktioniert PodCore offline? | Importierte Tutorials und lokale Projektdaten bleiben auf dem eigenen System verfügbar. Cloud-Funktionen benötigen eine Verbindung nur für den jeweiligen Synchronisationsvorgang. |
| Was kostet PodCore? | PodCore ist bis zum angekündigten Stabilitäts- und Lizenz-Release kostenlos nutzbar. |

## 4. Indexierung und Messung

1. Verifiziere `https://podcore.de/` in der [Google Search Console](https://search.google.com/search-console/about).
2. Prüfe die von WordPress oder dem SEO-Plugin erzeugte Sitemap. Häufig ist dies `https://podcore.de/wp-sitemap.xml` oder `https://podcore.de/sitemap_index.xml`.
3. Reiche die **tatsächlich erreichbare** Sitemap unter **Indexierung → Sitemaps** ein.
4. Prüfe die PodCore-Startseite über **URL-Prüfung** und fordere nach einer relevanten Änderung eine erneute Indexierung an.
5. Beobachte monatlich Suchanfragen, Impressionen, Klicks und die wichtigsten Zielseiten im Leistungsbericht.

Eine Sitemap ist ein Hinweis für Suchmaschinen, keine Indexierungsgarantie. Sie soll bevorzugte, kanonische URLs enthalten.[3]

## 5. Späterer Lizenzshop

Sobald der Shop startet, erhalten die Lizenzseiten eigene, eindeutige URLs, sichtbare Preise, Leistungsumfang, Support- und Update-Regeln. Erst dann wird das `Offer` im Schema auf die tatsächliche Produkt-URL und den echten Preis geändert. Add-ons bekommen jeweils eine eigene Landingpage statt einer gemeinsamen, überladenen Katalogseite.

## Referenzen

[1] [Google Search Central: Einführung in strukturierte Daten](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

[2] [Google Search Central: SoftwareApplication strukturierte Daten](https://developers.google.com/search/docs/appearance/structured-data/software-app)

[3] [Google Search Central: Sitemaps erstellen und einreichen](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
