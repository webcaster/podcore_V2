# Offene Punkte für das nächste Stabilitäts-Update

- [ ] Lizenzsystem nach Abschluss der Stabilisierung bewusst aktivieren: 14 Tage Volltest, 14 Tage Offline-Grace-Period und anschließender Nur-Lese-Modus.
- [ ] Lizenzverwaltung erst im Stabilitäts-Release wieder sichtbar schalten und vor der Veröffentlichung mit DLM auf podcore.de testen.
- [ ] Lizenzstufen Basis, Studio und Lifetime vor Aktivierung final mit den WordPress-Produkten und Lizenzschlüsseln abgleichen.

## Branding und WordPress-Startseite

- [ ] SVG-Signet und App-Favicon mit der Subline „Dein Podcast. Dein Workflow.“ in PodCore v2.16.10 integrieren.
- [ ] Gekapselte The7-/WPBakery-CSS auf podcore.de einfügen und die Startseite auf Desktop sowie Mobilgeräten prüfen.

## Priorisierter Bugfix

- [ ] Screenshot-Markierungen im Tutorial-Editor wieder per Klick setzen, speichern und in der Vorschau sowie im PDF anzeigen.
- [ ] Tutorial-Erstellung mit geführten Schritten, robuster Screenshot-Annotation, rollenbezogener Vorschau und Ergebnis-Preview verbessern.
- [ ] Vektor-Branding, Subline und die The7-/WPBakery-CSS gemeinsam mit den Tutorial-Korrekturen als v2.16.10-Release prüfen und bereitstellen.
- [ ] WordPress-Entwürfe für Impressum und DSGVO-Datenschutz mit den tatsächlichen Unternehmens-, Hosting-, Zahlungs- und Kontaktangaben vor Veröffentlichung final prüfen.
- [ ] Lizenzshop und Add-on-Marktplatz nach dem Stabilitäts-Release als getrennte Shop- und API-Architektur planen.

## Stabilisierung v2.16.10

- [ ] Eigenes Update-Anwenden, Staging-Upload und Sicherheits-Token aus der sichtbaren App-Einstellung entfernen; nur einen Hinweis auf GitHub-Release und ZIP-Download anzeigen.
- [ ] „PDF CI-Farben“ aus den App-Einstellungen entfernen, weil Farbgebung vollständig in den PDF-Layouts gepflegt wird.
- [ ] Speichern und Anwenden aller „Mein Design“-Einstellungen mit einer vollständigen Reinitialisierung der Design-Tokens prüfen und korrigieren.
- [ ] Add-on-System als spätere, lizenzierte Modularchitektur dokumentieren; erst nach dem Stabilitäts- und Lizenz-Release aktivieren.

## WordPress-Einbettung

- [ ] WordPress-Startseite ohne eigenes Seitenlogo verwenden, wenn The7 den PodCore-Header mit Logo bereits ausgibt.
- [ ] WordPress-Startseite in The7/WPBakery ohne äußeren Containerrahmen und über die verfügbare Seitenbreite ausgeben.
- [ ] Full-Width-Startseite mit großzügigem, responsive sicherem Innenabstand für Text und einer weiter außen platzierten Signalspur verwenden.
- [ ] WordPress-Raw-HTML ohne CSS-Funktionssyntax verwenden, wenn WPBakery oder ein Cache-Optimierer „Unexpected Token“ meldet.
- [ ] Verifizierte podcore.de-Medien-URLs direkt in die WPBakery-kompatible Startseite einsetzen, damit keine Platzhalter ersetzt werden müssen.
- [ ] Nicht zuverlässig sichtbare Unicode-Icons in der WordPress-Startseite durch eingebettete SVG-Symbole ersetzen.
- [ ] PodCore-Promovideo direkt als HTML5-Player in der WordPress-Startseite abspielen statt in einem neuen Browser-Tab zu öffnen.

## Vermarktung und Sichtbarkeit

- [ ] SEO-Grundlage für podcore.de mit Keyword-Map, optimierten PodCore-Landingpages, Meta-Daten, Schema-Markup und Search-Console-Messung einführen.
- [ ] Meta-Daten über das gewählte WordPress-SEO-Plugin und Produkt-Schema als Codeblock außerhalb der WPBakery-Inhaltszeile einbinden.
