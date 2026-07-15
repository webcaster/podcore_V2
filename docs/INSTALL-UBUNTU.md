# PodCore v2.14.2 unter Ubuntu installieren und betreiben

**Autor:** Manus AI  
**Zielgruppe:** interne IT-Abteilung, Systemadministration und technischer Betrieb  
**Gültig für:** PodCore v2.14.2  
**Betriebssystem:** Ubuntu Server 22.04 LTS oder 24.04 LTS  
**Anwendungsport:** TCP 3001  
**Datenverzeichnis:** `/var/lib/podcore`  
**Anwendungsverzeichnis:** `/opt/podcore`

Diese Anleitung beschreibt eine produktionsnahe Einzelserver-Installation von **PodCore v2.14.2**. Die Anwendung wird unter einem dedizierten, nicht interaktiv anmeldbaren Systemkonto ausgeführt, durch `systemd` überwacht und wahlweise über Caddy mit HTTPS veröffentlicht. Die SQLite-Datenbank und alle persistenten Anwendungsdaten liegen getrennt vom Programmcode unter `/var/lib/podcore`.

> **Wichtiger Sicherheitshinweis:** Bei einem leeren Datenverzeichnis erzeugt PodCore den Initialbenutzer `admin` mit dem Kennwort `admin123`. Dieses Kennwort muss unmittelbar nach dem ersten erfolgreichen Login geändert werden. Der Initialbenutzer wird nur angelegt, wenn die Benutzertabelle leer ist.[9]

## 1. Zielarchitektur

| Komponente | Festlegung | Zweck |
| --- | --- | --- |
| Ubuntu | 22.04 LTS oder 24.04 LTS | Unterstützte Serverbasis für diese Anleitung |
| Node.js | Version 22 LTS | Serverseitige JavaScript-Laufzeit |
| pnpm | Hauptversion 10 | Reproduzierbare Installation anhand der Lockdateien |
| PodCore-Code | `/opt/podcore` | Programmcode, Build-Artefakte und Abhängigkeiten |
| PodCore-Daten | `/var/lib/podcore` | SQLite-Datenbank, Medien, Backups, Branding und Protokolle |
| Dienstkonto | `podcore:podcore` | Rechtearme Ausführung ohne interaktive Anmeldung |
| Interner Dienst | `127.0.0.1:3001` | Lokales Backend hinter dem Reverse Proxy |
| Reverse Proxy | Caddy, optional aber empfohlen | HTTPS, Zertifikatsverwaltung und externer Zugriff |
| Dienstverwaltung | `systemd` | Automatischer Start, Neustart und zentrale Protokollierung |

PodCore verwendet standardmäßig Port `3001`, akzeptiert alternativ `PORT` und bindet ohne Vorgabe an `0.0.0.0`. Das persistente Datenverzeichnis wird über **`PODCORE_DATA_DIR`** festgelegt; ohne diese Variable verwendet die Anwendung `~/.podcore`.[8] [9] Für den Produktivbetrieb wird der Pfad daher ausdrücklich gesetzt.

## 2. Voraussetzungen und Planungswerte

Vor der Installation müssen DNS, Netzwerkfreigaben, Sicherungsziel und Betriebsverantwortung festgelegt sein. Für eine Veröffentlichung mit automatisch verwaltetem HTTPS muss der verwendete DNS-Name auf den Server zeigen und der Reverse Proxy über TCP 80 und 443 erreichbar sein. Caddy kann bei einem gültigen Hostnamen automatisch ein öffentlich vertrauenswürdiges Zertifikat beziehen; hierfür müssen DNS und Erreichbarkeit korrekt eingerichtet sein.[5]

| Parameter | Beispiel | Vor Installation festlegen |
| --- | --- | --- |
| DNS-Name | `podcore.example.org` | Ja, falls HTTPS verwendet wird |
| Server-IP | `192.0.2.25` | Ja |
| Direktzugriff ohne Proxy | `http://SERVER-IP:3001` | Nur für geschützte interne Netze |
| HTTPS-Zugriff | `https://podcore.example.org` | Empfohlene Produktivvariante |
| Backup-Ziel | `/srv/backup/podcore` | Ja, auf getrenntem Datenträger oder Sicherungssystem |
| Wartungsfenster | organisationsabhängig | Für Updates und Offline-Dateisicherungen |

Als Mindestgröße für eine kleine Redaktion sind zwei CPU-Kerne, 4 GB RAM und 20 GB freier Speicher ein praktikabler Ausgangspunkt. Der tatsächlich notwendige Speicher richtet sich hauptsächlich nach Anzahl und Größe der abgelegten Medien. Das Datenverzeichnis muss deshalb in Monitoring und Kapazitätsplanung aufgenommen werden.

## 3. Betriebssystem vorbereiten

Melden Sie sich mit einem administrativen Konto an und aktualisieren Sie zunächst die Paketlisten sowie die installierten Systempakete:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl gnupg unzip git build-essential python3 ufw
```

Ein nach dem Systemupdate eventuell erforderlicher Neustart sollte vor der PodCore-Installation erfolgen:

```bash
if [ -f /var/run/reboot-required ]; then
  cat /var/run/reboot-required
fi
```

### 3.1 Dediziertes Dienstkonto und Verzeichnisse anlegen

Das Konto besitzt eine eigene Gruppe und ein Home-Verzeichnis für Laufzeitbelange, aber keine interaktive Login-Shell:

```bash
sudo adduser --system \
  --group \
  --home /var/lib/podcore \
  --shell /usr/sbin/nologin \
  podcore

sudo install -d -o podcore -g podcore -m 0750 /var/lib/podcore
sudo install -d -o podcore -g podcore -m 0750 /opt/podcore
sudo install -d -o root -g root -m 0750 /srv/backup/podcore
```

Wenn ein anderes Backup-Ziel verwendet wird, ist `/srv/backup/podcore` in allen späteren Befehlen entsprechend zu ersetzen. Das Backup-Ziel sollte nicht auf demselben Datenträger wie `/var/lib/podcore` liegen.

## 4. Node.js 22 LTS und pnpm installieren

> „Production applications should only use Active LTS or Maintenance LTS releases.“ — Node.js-Projekt[1]

Die Node.js-Projektseite führt Node.js 22 „Jod“ als LTS.[1] Die folgende Installation verwendet die NodeSource-Paketquelle für Debian-/Ubuntu-Systeme.[2]

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null

sudo apt update
sudo apt install -y nodejs
node --version
npm --version
```

Die Ausgabe von `node --version` muss mit `v22.` beginnen. Installieren Sie anschließend die zum Release passende pnpm-Hauptversion:

```bash
sudo npm install --global pnpm@10
pnpm --version
```

Der PodCore-Installer prüft Node.js ab Version 18, installiert Root-, Client- und Server-Abhängigkeiten mit eingefrorenen Lockdateien und erstellt danach den Produktions-Build.[7] Für den beschriebenen Produktivbetrieb wird dennoch Node.js 22 LTS festgelegt.

## 5. Release herunterladen und Integrität prüfen

Für eine kontrollierte Installation ist das veröffentlichte Release-ZIP zu verwenden. Führen Sie Download und Prüfsummenvergleich in einem temporären Verzeichnis aus:

```bash
cd /tmp
rm -rf PodCore-2.14.2 PodCore-2.14.2.zip

curl -fL \
  -o PodCore-2.14.2.zip \
  https://github.com/webcaster/podcore_V2/releases/download/v2.14.2/PodCore-2.14.2.zip

echo "239ce0cadb81608118a1d474a1a523cd8428c1f00dc9b02e7b924315c8f2ba54  PodCore-2.14.2.zip" \
  | sha256sum --check --strict
```

Die Prüfung muss `PodCore-2.14.2.zip: OK` ausgeben. Bei einer Abweichung darf die Datei nicht installiert werden. Laden Sie sie erneut aus der freigegebenen Quelle und prüfen Sie die Ursache.

Entpacken Sie das Archiv und übernehmen Sie den Inhalt in das Anwendungsverzeichnis:

```bash
unzip -q PodCore-2.14.2.zip
sudo cp -a PodCore-2.14.2/. /opt/podcore/
sudo chown -R podcore:podcore /opt/podcore
sudo chmod +x /opt/podcore/install.sh /opt/podcore/start-unix.sh
```

Alternativ kann eine freigegebene Git-Revision ausgecheckt werden. Für einen auditierbaren Produktivstand ist dabei zwingend das Release-Tag zu verwenden, nicht ein beweglicher Entwicklungsbranch:

```bash
sudo -u podcore git clone \
  --branch v2.14.2 \
  --depth 1 \
  https://github.com/webcaster/podcore_V2.git \
  /opt/podcore
```

Verwenden Sie entweder das ZIP-Verfahren oder den Git-Checkout, nicht beide Verfahren für dieselbe Erstinstallation.

## 6. Abhängigkeiten installieren und Produktions-Build erstellen

Führen Sie den mitgelieferten Installer als Dienstkonto aus:

```bash
sudo -u podcore -H bash -c 'cd /opt/podcore && ./install.sh'
```

Der Abschluss muss ohne Fehler erfolgen. Prüfen Sie danach mindestens die beiden zentralen Build-Artefakte:

```bash
sudo test -f /opt/podcore/server/dist/index.js
sudo test -f /opt/podcore/server/dist/public/index.html
```

Der produktive Startbefehl des Root-Pakets ist `node server/dist/index.js`.[6] Das Entwicklungsskript `start-unix.sh` ist für die hier beschriebene dauerhafte Produktivinstallation nicht erforderlich; der Server wird über `systemd` gestartet.

## 7. Laufzeitkonfiguration erstellen

Erstellen Sie eine nur für `root` und die Gruppe `podcore` lesbare Umgebungsdatei:

```bash
sudo install -o root -g podcore -m 0640 /dev/null /etc/podcore.env

sudo tee /etc/podcore.env >/dev/null <<'EOF'
NODE_ENV=production
HOST=127.0.0.1
PORT=3001
PODCORE_DATA_DIR=/var/lib/podcore
EOF
```

| Variable | Empfohlener Wert | Bedeutung |
| --- | --- | --- |
| `NODE_ENV` | `production` | Aktiviert den Produktivmodus |
| `HOST` | `127.0.0.1` | Nur lokal erreichbar; empfohlen hinter Caddy |
| `PORT` | `3001` | Interner HTTP-Port der Anwendung |
| `PODCORE_DATA_DIR` | `/var/lib/podcore` | Persistenter Pfad für Datenbank und Anwendungsdateien |

Soll PodCore **ohne Reverse Proxy** direkt im geschützten LAN erreichbar sein, ändern Sie `HOST` auf `0.0.0.0`. In diesem Fall ist Port 3001 ausschließlich für die vorgesehenen Quellnetze freizugeben. Eine unverschlüsselte Veröffentlichung über öffentliche oder nicht vertrauenswürdige Netze ist nicht zulässig.

## 8. systemd-Dienst einrichten

Erstellen Sie `/etc/systemd/system/podcore.service`:

```bash
sudo tee /etc/systemd/system/podcore.service >/dev/null <<'EOF'
[Unit]
Description=PodCore Podcast Management System
Documentation=https://github.com/webcaster/podcore_V2
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=podcore
Group=podcore
WorkingDirectory=/opt/podcore
EnvironmentFile=/etc/podcore.env
ExecStart=/usr/bin/node /opt/podcore/server/dist/index.js
Restart=always
RestartSec=5
TimeoutStopSec=30
UMask=0027
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/opt/podcore /var/lib/podcore

[Install]
WantedBy=multi-user.target
EOF
```

`Restart=always` stellt sicher, dass der Dienst nach einem regulären oder updatebedingten Prozessende wieder gestartet wird. Die Schreibfreigabe für `/opt/podcore` ist für das integrierte ZIP-Update erforderlich. Wird das In-App-Update organisatorisch ausgeschlossen und ausschließlich durch die IT ausgerollt, kann das Anwendungsverzeichnis stattdessen root-eigen und im Dienst schreibgeschützt betrieben werden.

Laden Sie die Unit-Dateien neu, aktivieren Sie den Autostart und starten Sie PodCore:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now podcore
sudo systemctl status podcore --no-pager
```

Prüfen Sie den lokalen Health-Endpunkt:

```bash
curl -fsS http://127.0.0.1:3001/api/health | python3 -m json.tool
```

Eine erfolgreiche Antwort enthält unter anderem `"status": "ok"`, die Version `2.14.2`, den Port und das konfigurierte Datenverzeichnis.[8]

## 9. Netzwerk und UFW-Firewall

Ubuntu dokumentiert UFW als Verwaltungsoberfläche für Firewall-Regeln und die Kontrolle des Netzwerkverkehrs.[3] Stellen Sie vor dem Aktivieren der Firewall sicher, dass der administrative SSH-Zugriff erlaubt ist, damit die Verbindung nicht ausgesperrt wird.

### 9.1 Empfohlene Variante mit Caddy

Bei Betrieb hinter Caddy bleibt PodCore auf `127.0.0.1:3001`. Extern werden nur SSH sowie HTTP/HTTPS freigegeben:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp comment 'Caddy HTTP and ACME'
sudo ufw allow 443/tcp comment 'Caddy HTTPS'
sudo ufw enable
sudo ufw status verbose
```

Port 3001 darf in dieser Variante **nicht** extern freigegeben werden.

### 9.2 Direkter Zugriff im internen LAN

Falls kein Reverse Proxy eingesetzt wird, setzen Sie zunächst `HOST=0.0.0.0` in `/etc/podcore.env` und starten den Dienst neu. Beschränken Sie die Freigabe anschließend auf das konkrete Verwaltungs- oder Redaktionsnetz, beispielsweise `192.168.10.0/24`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 192.168.10.0/24 to any port 3001 proto tcp comment 'PodCore LAN'
sudo ufw enable
sudo systemctl restart podcore
sudo ufw status verbose
```

Ersetzen Sie das Beispielnetz durch das tatsächlich autorisierte Quellnetz. Eine globale Regel wie `ufw allow 3001/tcp` sollte nur nach dokumentierter Risikoabwägung verwendet werden.

## 10. Caddy als Reverse Proxy mit HTTPS einrichten

Dieser Abschnitt ist optional, für den Produktivbetrieb aber empfohlen. Das offizielle Caddy-Paket für Debian/Ubuntu installiert Caddy als `systemd`-Dienst.[4]

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Ersetzen Sie `podcore.example.org` durch den vorgesehenen DNS-Namen und schreiben Sie die Konfiguration nach `/etc/caddy/Caddyfile`:

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
podcore.example.org {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3001
}
EOF

sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy leitet damit Anfragen an den lokalen PodCore-Dienst weiter. Bei einem gültigen extern erreichbaren DNS-Namen verwaltet Caddy HTTPS standardmäßig automatisch.[5] Prüfen Sie nach der Zertifikatsausstellung:

```bash
curl -fsS https://podcore.example.org/api/health | python3 -m json.tool
```

In rein internen Netzen ohne öffentliche DNS-/ACME-Erreichbarkeit muss die Organisation eine eigene PKI, einen intern vertrauenswürdigen Proxy oder eine manuell verwaltete Zertifikatslösung vorgeben.

## 11. Erststart, Erstlogin und Abnahme

Rufen Sie je nach Betriebsart `https://podcore.example.org` oder `http://SERVER-IP:3001` auf. Verwenden Sie bei einer **neuen, leeren Datenbank** einmalig folgende Zugangsdaten:

| Feld | Initialwert |
| --- | --- |
| Benutzername | `admin` |
| Kennwort | `admin123` |

Ändern Sie das Kennwort unmittelbar nach dem ersten Login in ein organisationskonformes, einzigartiges Administratorkennwort. Legen Sie anschließend personenbezogene Konten an und verwenden Sie das Initialkonto nicht für die tägliche Redaktionsarbeit. Wenn ein bestehendes Datenverzeichnis übernommen wurde, gelten die darin gespeicherten Benutzerkonten; das Initialkennwort wird nicht erneut gesetzt.

Für die technische Abnahme sind mindestens folgende Punkte zu dokumentieren:

| Prüfung | Soll-Ergebnis |
| --- | --- |
| `systemctl is-active podcore` | `active` |
| Health-Endpunkt | HTTP 200 und `status: ok` |
| Versionsanzeige | `2.14.2` |
| Datenpfad | `/var/lib/podcore` |
| HTTPS-Prüfung | Gültiges Zertifikat und keine Browserwarnung |
| Anmeldung | Erfolgreich nach Kennwortwechsel |
| Schreibtest | Testdatensatz kann angelegt und erneut geladen werden |
| Neustarttest | Daten bleiben nach `systemctl restart podcore` erhalten |
| Backup-Test | Export oder Dateisicherung kann erstellt und gelesen werden |

## 12. Backup und Wiederherstellung

Die integrierte Backup-Funktion exportiert redaktionelle Datensätze als JSON, unterstützt eine Importvorschau sowie die Modi **Zusammenführen** und **Überschreiben**. Vor einem vollständigen Import legt die Anwendung zusätzlich eine Vorsicherung unter `PODCORE_DATA_DIR/backups` an.[10] Dieser Export ist für Anwendungsdaten hilfreich, ersetzt aber **keine vollständige Systemsicherung**, weil hochgeladene Mediendateien, sämtliche Systemtabellen und die gesamte Laufzeitumgebung nicht vollständig Bestandteil des JSON-Exports sind.

### 12.1 Integrierter JSON-Export

Erstellen Sie vor Änderungen im Administrationsbereich einen vollständigen JSON-Export und speichern Sie die heruntergeladene Datei außerhalb des PodCore-Servers. Verwenden Sie bei einem Import zuerst die Vorschau. Der Modus **Zusammenführen** überspringt bereits vorhandene IDs; **Überschreiben** aktualisiert vorhandene Datensätze und ist nur nach geprüfter Sicherung zu verwenden.[10]

### 12.2 Vollständige Dateisystem-Sicherung

Für eine konsistente Gesamtsicherung stoppen Sie PodCore kurzzeitig und archivieren das gesamte Datenverzeichnis:

```bash
BACKUP_FILE="/srv/backup/podcore/podcore-data-$(date +%Y%m%d-%H%M%S).tar.gz"

sudo systemctl stop podcore
sudo tar --acls --xattrs -C /var/lib -czf "$BACKUP_FILE" podcore
sudo systemctl start podcore

sudo sha256sum "$BACKUP_FILE" | sudo tee "${BACKUP_FILE}.sha256"
sudo systemctl is-active podcore
```

Das Archiv enthält insbesondere `podcore.db`, Medien- und Branding-Dateien sowie anwendungsinterne Backups und Protokolle. Übertragen Sie Archiv und Prüfsumme anschließend in das zentrale Sicherungssystem. Bewahren Sie mindestens eine Sicherung außerhalb des Servers auf und testen Sie die Wiederherstellung regelmäßig in einer isolierten Umgebung.

### 12.3 Vollständige Wiederherstellung

Die Wiederherstellung ersetzt das aktive Datenverzeichnis. Führen Sie sie nur innerhalb eines Wartungsfensters aus:

```bash
RESTORE_FILE="/srv/backup/podcore/podcore-data-YYYYMMDD-HHMMSS.tar.gz"
RESTORE_SUM="${RESTORE_FILE}.sha256"

sudo sha256sum --check "$RESTORE_SUM"
sudo systemctl stop podcore
sudo mv /var/lib/podcore "/var/lib/podcore.before-restore-$(date +%Y%m%d-%H%M%S)"
sudo tar --acls --xattrs -C /var/lib -xzf "$RESTORE_FILE"
sudo chown -R podcore:podcore /var/lib/podcore
sudo chmod 0750 /var/lib/podcore
sudo systemctl start podcore

curl -fsS http://127.0.0.1:3001/api/health | python3 -m json.tool
```

Prüfen Sie danach Benutzeranmeldung, ausgewählte Datensätze und Mediendateien. Entfernen Sie das umbenannte Vorher-Verzeichnis erst nach dokumentierter fachlicher Abnahme.

## 13. Update auf PodCore v2.14.2 und spätere Releases

Vor jedem Update sind ein fachliches Wartungsfenster, ein aktueller JSON-Export und eine vollständige Dateisystem-Sicherung erforderlich. Prüfen Sie Release-Notes und Prüfsumme, bevor ein Paket auf den Produktivserver übertragen wird.

### 13.1 In-App-Update über ZIP-Upload

Ein Konto mit der Berechtigung zur Systemeinstellungsverwaltung kann im Administrationsbereich ein PodCore-ZIP hochladen. Die Anwendung prüft unter anderem Serverdateien, Paketstruktur und Node.js-Kompatibilität. Quellcode-ZIPs werden in das Anwendungsverzeichnis übernommen und anschließend gebaut; der Update-Status wird unter `/var/lib/podcore/update.log` protokolliert.[11]

Der empfohlene Ablauf lautet:

1. Wartungsfenster ankündigen und Benutzeraktivität beenden.
2. Integrierten JSON-Export sowie vollständige Offline-Dateisicherung erstellen.
3. Das unveränderte Release-ZIP mit verifizierter SHA-256-Prüfsumme hochladen.
4. Die angezeigten Prüfungen vollständig kontrollieren und erst danach das Update anwenden.
5. Den Neustart abwarten und Health-Endpunkt, Version, Login sowie zentrale Funktionen prüfen.
6. `/var/lib/podcore/update.log` und `journalctl -u podcore` auf Fehler kontrollieren.

> **Betriebshinweis:** Das integrierte Quellcode-Update arbeitet im vorhandenen Anwendungsverzeichnis. Ein Build-Fehler kann auftreten, nachdem bereits Dateien geschrieben wurden. Die vorgelagerte Sicherung und ein getestetes Rollback-Verfahren sind deshalb verpflichtend.[11]

### 13.2 Kontrolliertes manuelles Update

Für besonders kontrollierte Umgebungen kann die IT den aktuellen Code vollständig beiseitelegen und das neue Release frisch aufbauen. Das persistente Datenverzeichnis bleibt davon unberührt:

```bash
sudo systemctl stop podcore
sudo mv /opt/podcore "/opt/podcore.rollback-$(date +%Y%m%d-%H%M%S)"
sudo install -d -o podcore -g podcore -m 0750 /opt/podcore

cd /tmp
unzip -q NEUES-PODCORE-RELEASE.zip
sudo cp -a NEUES-RELEASE-VERZEICHNIS/. /opt/podcore/
sudo chown -R podcore:podcore /opt/podcore
sudo chmod +x /opt/podcore/install.sh
sudo -u podcore -H bash -c 'cd /opt/podcore && ./install.sh'

sudo systemctl start podcore
curl -fsS http://127.0.0.1:3001/api/health | python3 -m json.tool
```

Ersetzen Sie Dateiname und Verzeichnisname durch das konkret freigegebene Release. Entfernen Sie die Rollback-Kopie erst nach technischer und fachlicher Abnahme.

## 14. Rollback

Ein Rollback sollte Anwendungscode und Datenstand als zusammengehörigen Wiederherstellungspunkt behandeln. Datenbankschemata werden beim Start erweitert; ein älterer Code-Stand ist deshalb nicht in jedem Fall mit einer bereits migrierten Datenbank garantiert kompatibel. Stellen Sie im Fehlerfall bevorzugt sowohl den vorherigen Programmstand als auch die unmittelbar davor erzeugte Datensicherung wieder her.

| Situation | Empfohlenes Vorgehen |
| --- | --- |
| Update-Build schlägt vor dem Neustart fehl | Dienst stoppen, vorheriges `/opt/podcore` zurückspielen, Datenstand prüfen |
| Neuer Dienst startet nicht | Journal auswerten; bei nicht kurzfristig lösbarem Fehler Programmstand zurückrollen |
| Anwendung startet, Daten sind fehlerhaft | Zusätzlich die zum Updatezeitpunkt erstellte Datensicherung wiederherstellen |
| Nur Konfigurationsfehler | `/etc/podcore.env` korrigieren, `systemctl restart podcore`, Health-Check ausführen |

Beispiel für die Rückkehr zu einer zuvor umbenannten Anwendungskopie:

```bash
sudo systemctl stop podcore
sudo mv /opt/podcore "/opt/podcore.failed-$(date +%Y%m%d-%H%M%S)"
sudo mv /opt/podcore.rollback-YYYYMMDD-HHMMSS /opt/podcore
sudo chown -R podcore:podcore /opt/podcore
sudo systemctl start podcore
curl -fsS http://127.0.0.1:3001/api/health | python3 -m json.tool
```

Wenn auch der Datenstand zurückgesetzt werden muss, führen Sie danach das Verfahren aus Abschnitt **12.3 Vollständige Wiederherstellung** aus.

## 15. Betrieb und Fehlerdiagnose

Die wichtigsten Diagnosebefehle können ohne Veränderung des Datenbestands ausgeführt werden:

```bash
sudo systemctl status podcore --no-pager
sudo journalctl -u podcore -n 200 --no-pager
sudo journalctl -u podcore -f
curl -v http://127.0.0.1:3001/api/health
sudo ss -ltnp | grep ':3001'
sudo du -sh /var/lib/podcore /var/lib/podcore/* 2>/dev/null
sudo ufw status verbose
node --version
pnpm --version
```

| Symptom | Wahrscheinliche Ursache | Maßnahme |
| --- | --- | --- |
| `Connection refused` auf Port 3001 | Dienst beendet oder falscher Port | `systemctl status`, Journal und `/etc/podcore.env` prüfen |
| Health lokal erfolgreich, extern nicht erreichbar | Firewall, Proxy, DNS oder Bind-Adresse | UFW, Caddy, DNS und `HOST` prüfen |
| Caddy liefert 502 | PodCore ist lokal nicht erreichbar | Health-Check auf `127.0.0.1:3001`, danach PodCore-Journal prüfen |
| Dienst startet nach Update nicht | Build-Artefakt fehlt oder Abhängigkeit unvollständig | `server/dist/index.js`, Installer-Ausgabe und Journal prüfen |
| Schreib- oder Uploadfehler | Eigentümer oder Modus des Datenverzeichnisses falsch | `chown -R podcore:podcore /var/lib/podcore` und Speicherplatz prüfen |
| Login `admin/admin123` funktioniert nicht | Bestehende Datenbank oder Kennwort bereits geändert | Gespeicherte Konten verwenden; Initialkonto wird nur bei leerer Benutzertabelle erzeugt |
| Update kann Dateien nicht schreiben | `/opt/podcore` nicht für Dienstkonto beschreibbar | Update-Richtlinie prüfen; Rechte nur gezielt für den Updatezeitraum anpassen |
| Datenträger voll | Medien, Backups oder Protokolle gewachsen | Kapazität erweitern und Aufbewahrungsregeln anwenden; nicht unkontrolliert löschen |

Für Caddy stehen ergänzend folgende Befehle zur Verfügung:

```bash
sudo systemctl status caddy --no-pager
sudo journalctl -u caddy -n 200 --no-pager
sudo caddy validate --config /etc/caddy/Caddyfile
```

## 16. Sicherheits- und Betriebscheckliste

| Kontrolle | Mindestanforderung |
| --- | --- |
| Initialkennwort | Sofort geändert und nicht weiterverwendet |
| Administratorkonten | Personenbezogen, minimal notwendige Berechtigungen |
| Transportverschlüsselung | HTTPS für Zugriffe über nicht vollständig vertrauenswürdige Netze |
| Firewall | Nur SSH und erforderliche Proxy-Ports; Port 3001 nicht global offen |
| Dienstkonto | Keine Login-Shell, kein Root-Betrieb |
| Dateirechte | `/var/lib/podcore` nur für `podcore`; `/etc/podcore.env` Modus 0640 |
| Betriebssystem | Regelmäßig mit Ubuntu-Sicherheitsupdates versorgt |
| Node.js | Unterstützte LTS-Linie, Sicherheitsupdates zeitnah einspielen |
| Sicherungen | Automatisiert, extern gespeichert, Integrität geprüft, Restore getestet |
| Updates | Prüfsumme und Release-Notes geprüft, Wartungsfenster und Rollback vorhanden |
| Protokolle | `journalctl`, PodCore-Logs und Caddy-Logs in Monitoring einbezogen |
| Speicherplatz | Daten-, Backup- und Root-Dateisystem mit Schwellwerten überwacht |

## 17. Referenzen

1. [Node.js – Releases und LTS-Status][1]
2. [NodeSource – Node.js Binary Distributions][2]
3. [Ubuntu Server Documentation – Firewall und UFW][3]
4. [Caddy – offizielle Installation für Debian/Ubuntu][4]
5. [Caddy – Reverse Proxy Quick Start und automatisches HTTPS][5]
6. [PodCore v2.14.2 – Root-Paket und Startskript][6]
7. [PodCore v2.14.2 – Installationsskript][7]
8. [PodCore v2.14.2 – Server, Port und Health-Endpunkt][8]
9. [PodCore v2.14.2 – Datenpfad und Initialbenutzer][9]
10. [PodCore v2.14.2 – Backup, Importvorschau und Wiederherstellung][10]
11. [PodCore v2.14.2 – ZIP-Update im Administrationsbereich][11]

[1]: https://nodejs.org/en/about/previous-releases
[2]: https://github.com/nodesource/distributions
[3]: https://documentation.ubuntu.com/server/how-to/security/firewalls/
[4]: https://caddyserver.com/docs/install#debian-ubuntu-raspbian
[5]: https://caddyserver.com/docs/quick-starts/reverse-proxy
[6]: https://github.com/webcaster/podcore_V2/blob/v2.14.2/package.json
[7]: https://github.com/webcaster/podcore_V2/blob/v2.14.2/install.sh
[8]: https://github.com/webcaster/podcore_V2/blob/v2.14.2/server/index.ts
[9]: https://github.com/webcaster/podcore_V2/blob/v2.14.2/server/database.ts
[10]: https://github.com/webcaster/podcore_V2/blob/v2.14.2/server/routers/backup.ts
[11]: https://github.com/webcaster/podcore_V2/blob/v2.14.2/server/routers/admin.ts
