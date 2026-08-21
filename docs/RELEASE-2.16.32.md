# Release 2.16.32 – WooCommerce-Lizenzpreise

PodCore 2.16.32 enthält das korrigierte WordPress-Lizenzplugin in Version 1.0.3. Das Plugin verändert die nativen WooCommerce-Preisfelder nicht. Lizenzprodukte können ihren Preis wie gewohnt unter **Produktdaten → Allgemein → Preis** erhalten.

Zusätzlich erscheint im Preisbereich das Feld **PodCore-Lizenzpreis**. Dieses Feld ist ein Fallback für Produkttypen oder Installationen, bei denen das native WooCommerce- oder Subscription-Preisfeld nicht angezeigt wird. Es wird nur dann in die WooCommerce-Preis-Metadaten übernommen, wenn kein nativer Preis vorhanden ist.

Für Monats- und Jahresabos sollte das Produkt als WooCommerce-Subscriptions-Produkt mit der gewünschten Abrechnungsperiode angelegt werden. Danach wird im Produkteditor der PodCore-Tarif gewählt und der Preis im nativen Preisfeld eingetragen. Für individuelle Konditionen steht das Sonderabo zur Verfügung.

Das Plugin-ZIP muss unter **Plugins → Installieren → Plugin hochladen** installiert werden. Im korrigierten Paket liegt `podcore-licensing/` direkt auf der ZIP-Wurzelebene; bitte das Paket `PodCore-Licensing-Plugin-v1.0.3.zip` verwenden.
