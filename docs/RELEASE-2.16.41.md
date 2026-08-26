# PodCore v2.16.41 – Audio-Abnahme in der Media Library und vollständiger Rechteabgleich

Version **2.16.41** verlagert die praktische Audio-Abnahme in die Media Library. Die Qualitätskontrolle gehört damit direkt zur Audiodatei statt nur zu einer allgemeinen Episode. Gleichzeitig wurde der zentrale Rollen- und Berechtigungskatalog gegen alle tatsächlich verwendeten Client- und Serverrechte geprüft und um fehlende Rechte ergänzt.

## Audio-Abnahme im Bereich „Qualitätskontrolle“

In der Media Library steht neben **Bibliothek** und **Audio-Editor** ein eigener Bereich **„Qualitätskontrolle“** zur Verfügung. Nach Auswahl einer Audiodatei wird sie bei Bedarf mit einer Episode als Master-Audio verknüpft. Die Abnahme dokumentiert:

| Prüfbereich | Gespeicherte Information |
|---|---|
| Datei und Zuordnung | Audiodatei, optionale Episode, finale Versionskennung und zuständige Person |
| Schnitt und Klang | Schnitt, Regieanweisungen, Störgeräusche, Übergänge, Lautheit und Klangbild |
| Redaktionelle Vollständigkeit | Kapitel, Marker und Zeitangaben |
| Rechte | Intro, Outro und Musikrechte |
| Abschluss | Bestätigung der finalen Datei, Notiz und Zeitstempel der vollständigen Abnahme |

Die Abnahme wird als technische Qualitätsmetadaten direkt am Audioasset gespeichert. Sie bleibt damit auch bei einer späteren Verknüpfung mit weiteren Arbeitsabläufen verfügbar. Ein Export erzeugt ein JSON-Paket mit Asset, Episodenbezug und vollständigem Prüfergebnis.

## Berechtigungen

Die Audio-Abnahme wird nicht nur in der Oberfläche ausgeblendet, sondern serverseitig über das neue Recht `canReviewAudioQuality` geschützt. Das verhindert eine Umgehung durch direkte API-Anfragen. Die Standardrollen sind wie folgt festgelegt:

| Rolle | Audio-Abnahme | Begründung |
|---|---:|---|
| Administrator | Ja | Vollständige System- und Qualitätsverantwortung. |
| Moderator | Ja | Kann Freigaben und Qualitätskontrollen für Episoden verantworten. |
| Produktion | Ja | Bearbeitet Audiodateien und liefert die finale Produktion. |
| Redakteur | Nein, nur nach expliziter Zuweisung | Kann Assets bearbeiten, recherchieren und Episoden vorbereiten; die finale Tonabnahme bleibt getrennt. |

Der Rollenabgleich fand zusätzlich drei bereits im Code verwendete, jedoch noch nicht zentral geführte Rechte: `canViewStats`, `canEditMedia` und `canManageSystem`. Sie sind nun im Standardrechtekatalog, in der Adminoberfläche und im automatischen Backfill für bestehende Rollen enthalten. Bestehende Rollen erhalten neue Standardrechte, ohne individuell bewusst gesetzte Abweichungen zu überschreiben.

## Bedienung

1. Öffne **Media Library → Qualitätskontrolle**.
2. Wähle die Audiodatei aus der Liste aus oder nutze das Prüfsymbol an einem Asset.
3. Wähle bei Bedarf die zugehörige Episode und ergänze Version sowie verantwortliche Person.
4. Bestätige die sechs Qualitätsprüfungen, ergänze die Abnahmenotiz und speichere.
5. Exportiere bei Bedarf das Audio-Abnahmeprotokoll als JSON.

## Prüfung

Ein isolierter Rauchtest überprüft den Asset-Speicherweg, die Master-Audio-Verknüpfung mit einer Episode, den Client- und Server-Schutz des neuen Rechtes sowie die Standardrollen. Ein zusätzlicher Berechtigungstest gleicht 74 zentrale Rechte mit allen im Client und Server verwendeten Rechten ab. Der Test meldete zunächst drei fehlende Katalogeinträge; diese wurden ergänzt. Danach waren keine fehlenden Rechte mehr vorhanden. Der vollständige Client-, Server- und Produktions-Build einschließlich Synchronisierung war erfolgreich.
