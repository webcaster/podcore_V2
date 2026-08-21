# PodCore v2.16.31 – Markenkennzeichnung im Lizenznachweis

Version **2.16.31** ergänzt den aus PodCore heruntergeladenen Lizenznachweis um einen einheitlichen, einseitigen Marken-Kopfbereich. Die Änderung betrifft ausschließlich die Darstellung des PDF-Dokuments und lässt Lizenzaktivierung, Offline-Dokumente sowie die Ed25519-Signaturprüfung unverändert.

## Marken-Kopfbereich

Der Lizenznachweis enthält nun ein grafisches PodCore-Signet in Violett und Gold, die Wortmarke **PodCore** mit der Subline **„Dein Podcast. Dein Workflow.“** sowie die Kennzeichnung **„medien der sinne“** und **„Eine Idee von Maximilian Hartwich“**. Eine goldene Trennlinie verbindet den Kopfbereich mit den Lizenzinformationen. In der Fußzeile wird die Zuordnung zu PodCore, Medien der Sinne und `podcore.de` wiederholt.

## Lizenznachweis herunterladen

Nach einer erfolgreichen Lizenzaktivierung kann ein berechtigter Administrator den Nachweis in **Einstellungen → Lizenzierung → Lizenz-PDF** herunterladen. Das Dokument enthält den Lizenzschlüssel, das Produkt, den Tarif, den Status, die Installation, Ausstellungs- und Ablaufdaten sowie den Prüfmodus. Der Nachweis dient der lesbaren Dokumentation; für die technische Echtheitsprüfung bleibt das zugehörige signierte Offline-Lizenzdokument maßgeblich.

## Prüfung

Der vollständige Client- und Server-Build wurde nach der Versionsanhebung erfolgreich ausgeführt. Ein isolierter Rauchtest mit einer Lifetime-Testlizenz erzeugt eine A4-PDF auf genau einer Seite. Dabei wurden die PodCore- und Medien-der-Sinne-Kennzeichnung, alle Lizenzfelder und der unveränderte Hinweis zur Ed25519-Prüfung kontrolliert.
