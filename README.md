# 🗳️ Online-Wahlsystem HKA

## Überblick

Das Projekt **Online-Wahlsystem für die Hochschule Karlsruhe (HKA)** dient der Entwicklung einer sicheren, BSI-konformen Plattform zur Durchführung hochschulinterner Wahlen (nicht-politische E-Wahlen).

Die Plattform wird **modular**, **dockerized** und **open-source** bereitgestellt, sodass sie auch an anderen Hochschulen eingesetzt werden kann.

---

## 🏛️ Wahlarten an der HKA

Laut Wahlsystematik der Hochschule umfasst das System folgende Wahlarten:

...

Diese Wahlarten unterscheiden sich in:

- Wählergruppen (Studierende, Mitarbeitende)
- Wahlmodus (Direktwahl, Listenwahl)
- Auszählungslogik (nach Satzung und Wahlordnung)

---

## Systemarchitektur

### Komponenten

#### Backend

- Node.js
- PostgreSQL
- REST-API inkl. Swagger-UI

(Für mehr wichtige Informationen und Details)
[README](./backend/README.md)

#### Frontend (Wählende)

- React
- Responsive Web-App

(Für mehr wichtige Informationen und Details)
[README](./frontend/README.md)

#### Admin-Frontend

- Separate Verwaltungsoberfläche für Wahlleitungen

(Für mehr wichtige Informationen und Details)
[README](./admin-frontend/README.md)

#### Authentifizierung

- Keycloak (OAuth2 / OpenID Connect)
  [README](./backend/.extras/compose/keycloak/README.md)
- LDAP / Active Directory
  [README](./backend/.extras/compose/ldap/README.md)

#### Containerisierung

- Docker & Docker Compose

### Umgebungen

- Entwicklung
- Produktivbetrieb (empfohlen)

---

## Funktionale Kernmodule

| Modul                | Beschreibung                                          |
| -------------------- | ----------------------------------------------------- |
| Benutzermanagement   | Authentifizierung, Rollen- und Rechteverwaltung       |
| Wahlverwaltung       | Erstellung, Konfiguration und Terminierung von Wahlen |
| Kandidatenmanagement | Einzel- und Listenverwaltung                          |
| Stimmabgabe          | Verschlüsselte, verifizierbare Online-Stimmabgabe     |
| Auswertung           | Automatisierte, nachvollziehbare Auszählung           |
| Audit & Logging      | Revisionssichere Protokollierung                      |
| Testmodus            | Simulierter Wahlbetrieb                               |

---

## Sicherheit & Compliance

- **BSI-CC-PP-0121:** Schutzprofil für nicht-politische E-Wahlen
- **DSGVO-Konformität:** Verarbeitung personenbezogener Daten nur zweckgebunden
- **Nachvollziehbarkeit:** Protokollierung aller sicherheitsrelevanten Ereignisse
- **Barrierefreiheit:** Nutzung durch alle Wählergruppen

---

## Installation der Anwendung

In den Verzeichnien `./backend` `./frontend` `./admin-frontend` ist jeweils der Befehl

```bash
 npm install
```

auszuführen, um die benötigten Bibliotheken zu installieren, die im Rahmen der Wahlplattform benötigt werden.

## Installation & Start des Systems

Um die Anwendung via **Docker** zu starten sind folgende Schritte notwendig:

**1. Docker Image bauen:**

```bash
  cd election/backend # Root Vezeichnis des Backends
  docker build -t backend_image . # Bauen des Image basierend auf dem Dockerfile
```

```bash
  cd election/frontend # Root Vezeichnis des Frontend
  docker build -t frontend_image . # Bauen des Image basierend auf dem Dockerfile
```

```bash
  cd election/admin_frontend # Root Vezeichnis des Admin-Frontends
  docker build -t admin_frontend_image . # Bauen des Image basierend auf dem Dockerfile
```

**2. Konfiguration (Environments):**

Diese sollten im [COMPOSE](./backend/.extras/compose) Ordner angelegt werden, nachdem eine .env Datei mit `touch .env` erzeugt wurde.

`Beispiel .env:`

```bash

  - NODE_ENV=development        # Entwicklungsmodus oder production
  - PORT=3000                   # Port, auf dem der Backend-Server läuft

  - AD_URL=ldap://ldap:389       # URL zu deinem LDAP/AD Server (Hostname + Port)
  - AD_BASE_DN=DC=example,DC=com # Basis-DN für LDAP-Abfragen
  - AD_DOMAIN=example.com        # Domain deines LDAP/AD Servers
  - AD_USER_BIND_DN=ADS\${username} # DN-Vorlage für Benutzerbindung (z.B.ADS\username)


  - ADMIN_PASSWORD_LDAP=secret   # Passwort für Admin-Benutzer im LDAP
  - ADMIN_DN=CN='admin,...'        # Distinguished Name (DN) des Admin-Benutzers

  - KC_BASE_URL=http://keycloak:8080  # Basis-URL deines Keycloak-Servers
  - KC_REALM=TestRealm                 # Realm, in dem die App registriert ist
  - CLIENT_ID=react-app                 # Client-ID deiner Anwendung in Keycloak
  - REDIRECT_URI=http://backend:3000/api/auth/callback/kc  # Callback-URL für OAuth2
  - CLIENT_SECRET=secret                # Geheimnis für die Client-Authentifizierung

  - DB_HOST=postgres-dev   # Hostname des Postgres-Servers (Docker-Service-Name)
  - DB_PORT=5432           # Port, auf dem Postgres lauscht
  - DB_USER=election       # Benutzername für die DB-Verbindung
  - DB_PASSWORD=secret     # Passwort für den DB-Benutzer
  - DB_NAME=election_db    # Name der Datenbank
```

Anschließend ist es notwendig im selben Verzeichnis ein Ordner mit den Secrets zu erstellen mit dem Befehl `mkdir secrets`.

Nun ist diesen Schritten folge zu leisten:

```bash
  cd secrets

  touch admin_pw.txt # Erstellen einer .txt Datei mit selbst definierten PW für den Admin. Als File für Security in Docker

  touch committee.txt # Erstellen einer .txt Datei mit selbst definierten PW für das Comitee. Als File für Security in Docker

  touch session_secret.txt # Erstellen einer .txt Datei mit selbst definierten Secret Key für Sessions. Als File fuer Security in Docker

  touch ballot_secret.txt # Erstellen einer .txt Datei mit selbst definierten Secret Key fuer Ballot Hashes. Als File fuer Security in Docker
```

- Vorausgesetzt das alle einzelnen Requirements erfüllt sind, kann die Anwendung jetzt gestartet werden.

**3. System starten**

```bash
- cd /backend/.extras/compose
+ docker compose --profile prod up   #Löst den Start-Vorgang des Containers aus.
```

Stoppen des Systems:

```bash
- docker compose down #Löst das Stoppen des Containers aus.
```

### Nach Start des Systems

Je nachdem ob das "admin_frontend" oder das normale "frontend" gebraucht wird sind diese unterschiedlich zu erreichen.

**1. Frontend**

Hier ist die UI für den Wählenden, dem die Möglichkeit geboten wird an Wahlen teilzunehmen & Einblicke auf anstehende Wahlen zu erhalten.

**2.Admin-Frontend**

Das ist das Frontend zur Verwaltung von Wahlen und sollte ausschließlich nur von Ihrem Administratoren zu benutzen sein! (Außer zu Entwicklungszwecken natürlich).

**3.Swagger-UI**

Das Module Swagger stellt eine UI bereit um die Routen des Servers über diese UI aufzurufen und zu verwenden, diese Route ist standardgemäß festgelegt auf 3000.

| Service        | URL/Port              | Beschreibung          |
| -------------- | --------------------- | --------------------- |
| Frontend       | http://localhost:5173 | (je nach Port-Config) |
| Admin-Frontend | http://localhost:5174 | (UI - für den Admin)  |
| Backend        | http://localhost:3000 | API & Swagger UI      |

Je nach dem ob Sie jetzt das Frontend für den Wähler oder das Frontend für den Administrator gestartet haben, sollten Sie nach besuchen Ihres lokal gestarteten Servers auf der Login-Seite angekommen sein.
Nun geben Sie ihr festgelegtes Passwort für eines der beiden Systeme ein und können schon loslegen.

---

## Verwendung der Test-Umgebung "Playwright"

Nach eventueller Anpassung von Code ist die Ausführung dieser Tests zwar optional aber sehr wichtig.

Weitere Details und wichtige Informationen finden Sie in der [README](./frontend/e2e/README.md).
