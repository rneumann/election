# Online-Wahlsystem HKA

## Inhaltsverzeichnis

1. [Überblick](#1-überblick)
2. [Wahlarten an der HKA](#2-️-wahlarten-an-der-hka)
3. [Systemarchitektur](#3-systemarchitektur)
   - [Backend](#backend)
   - [Frontend](#frontend-wählende)
   - [Admin-Frontend](#admin-frontend)
   - [Authentifizierung](#authentifizierung)
   - [Containerisierung](#containerisierung)
4. [Funktionale Kernmodule](#4-funktionale-kernmodule)
5. [Sicherheit & Compliance](#5-sicherheit--compliance)
6. [Voraussetzungen](#6-voraussetzungen)
7. [Konfiguration (.env & Secrets)](#7-konfiguration-env--secrets)
   - [Umgebungskonfigurationen](#71-zentrale-backend-konfiguration)
   - [backend](#711-backend)
   - [Backend für Compose](#712-backendcompose)
   - [Postgres](#713-postgres)
   - [LDAP](#714-ldap)
   - [WAF](#715-waf)
   - [Secrets](#72-secrets)
8. [Lokale Entwicklung](#8-lokale-entwicklung)
   - [Vorbereitung](#81-vorbereitung)
   - [Start der Anwendung](#82-start-der-anwendung)
   - [Alternativstart](#821-start-der-anwendungen-alternativ)
9. [Produktivbetrieb (Docker)](#9-produktivbetrieb-docker)
   - [Build & Start](#91-build--start)
   - [Stoppen](#92-stoppen)
   - [Wartung & Troubleshooting](#93-wartung--troubleshooting)
10. [Zugriff nach dem Start](#10-zugriff-nach-dem-start)
11. [Tests (Playwright)](#11-tests-playwright)

---

## 1. Überblick

Das Projekt **Online-Wahlsystem für die Hochschule Karlsruhe (HKA)** dient der Entwicklung einer sicheren, BSI-konformen Plattform zur Durchführung hochschulinterner Wahlen (nicht-politische E-Wahlen).

Die Plattform wird **modular**, **dockerisiert** und **open-source** bereitgestellt, sodass sie auch an anderen Hochschulen eingesetzt werden kann.

---

## 2. Wahlarten an der HKA

Laut Wahlsystematik der Hochschule umfasst das System folgende Wahlarten:

...

Diese Wahlarten unterscheiden sich in:

- Wählergruppen (Studierende, Mitarbeitende)
- Wahlmodus (Direktwahl, Listenwahl)
- Auszählungslogik (nach Satzung und Wahlordnung)

---

## 3. Systemarchitektur

### Backend

- Node.js
- PostgreSQL
- REST-API inkl. Swagger-UI  
  [README](./backend/README.md)

### Frontend (Wählende)

- React
- Responsive Web-App  
  [README](./frontend/README.md)

### Admin-Frontend

- Separate Verwaltungsoberfläche für Wahlleitungen  
  [README](./admin-frontend/README.md)

### Authentifizierung

- Keycloak (OAuth2 / OpenID Connect)  
  [README](./backend/.extras/compose/keycloak/README.md)
- LDAP / Active Directory  
  [README](./backend/.extras/compose/ldap/README.md)

### Containerisierung

- Docker
- Docker Compose

---

## 4. Funktionale Kernmodule

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

## 5. Sicherheit & Compliance

- **BSI-CC-PP-0121:** Schutzprofil für nicht-politische E-Wahlen
- **DSGVO-Konformität:** Zweckgebundene Verarbeitung personenbezogener Daten
- **Nachvollziehbarkeit:** Protokollierung sicherheitsrelevanter Ereignisse
- **Barrierefreiheit:** Nutzung durch alle Wählergruppen

---

## 6. Voraussetzungen

- Node.js ≥ 20
- Docker & Docker Compose (empfohlen, auch für Dev)
- Git

---

## 7. Konfiguration (.env & Secrets)

**Wichtig:** Die Konfiguration über `.env`-Dateien ist **sowohl für die lokale Entwicklung als auch für den Produktivbetrieb erforderlich**. Ohne gültige Konfigurationsdateien lassen sich Backend und Frontends nicht starten.

### 7.1 Zentrale Backend-Konfiguration

#### 7.1.1 Backend

Pfad:

```text
backend/.env
```

**Beispiel:**

```env
NODE_ENV=development
PORT=3000

# LDAP / AD
AD_URL=ldap://localhost:389
AD_BASE_DN=DC=example,DC=com
AD_DOMAIN=example.com
AD_USER_BIND_DN=ADS\\${username}

#SAML
CALLBACK_URL_SAML=http://localhost:3000/auth/saml/callback
ENTRY_POINT_SAML=http://localhost:8081/simplesaml/saml2/idp/SSOService.php
ISSUER_SAML=example

# Keycloak
KC_BASE_URL=http://localhost:8080
KC_REALM=DevRealm
CLIENT_ID=react-app
CLIENT_SECRET=secret
REDIRECT_URI=http://localhost:3000/api/auth/callback/kc

# Datenbank
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=wahl_dev

SESSION_SECRET=
BALLOT_SECRET=
```

#### 7.1.2 Backend(Compose)

Pfad:

```text
backend/.extras/backend/.env
```

**Beispiel:**

```env
NODE_ENV=development
PORT=3000

AD_URL=ldap://localhost:389
AD_BASE_DN='ou=students,dc=ads,dc=hs-karlsruhe,dc=de'
AD_DOMAIN=ads.hs-karlsruhe.de

ADMIN_PASSWORD_LDAP="p"
ADMIN_DN=CN='admin,...'

KC_BASE_URL=http://keycloak:8080
KC_REALM=TestRealm
CLIENT_ID=react-app
REDIRECT_URI=http://backend:3000/api/auth/callback/kc
CLIENT_SECRET=secret

DB_HOST=localhost
DB_PORT=5432
DB_USER=election
DB_PASSWORD=p
DB_NAME=election_db
```

#### 7.1.3 Postgres

Pfad:

```text
backend/.extras/postgres/.env
```

**Beispiel:**

```env
#.env
POSTGRES_USER=election
POSTGRES_DB=election_db

# Zeitzone & Locale
TZ=Europe/Berlin
PGTZ=Europe/Berlin

# Authentifizierung (unsicher, nur Dev!)
POSTGRES_HOST_AUTH_METHOD=trust

#pgadmin.env
PGADMIN_DEFAULT_EMAIL=election@acme.com
PGADMIN_DEFAULT_PASSWORD=p
PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False
PGADMIN_CONFIG_SERVER_MODE=False
TZ=Europe/Berlin
```

#### 7.1.4 LDAP

Pfad:

```text
backend/.extras/ldap/.env
backend/.extras/ldap/.env.ui
```

**Beispiel:**

```bash
LDAP_ORGANISATION="ADS Name der Einrichtung"   # Name der Organisation
LDAP_DOMAIN="ads.beispiel-name.de"  # Domain, wird als Base-DN genutzt
LDAP_ADMIN_PASSWORD="p"   # Passwort für LDAP-Admin
LDAP_TLS=false   # true für TLS, false für Klartext
```

```bash
PHPLDAPADMIN_LDAP_HOSTS="ldap"
PHPLDAPADMIN_HTTPS=false
PHPLDAPADMIN_LOGIN_DN=" "
PHPLDAPADMIN_LDAP_ADMIN_PASSWORD="p"
PHPLDAPADMIN_HTTPS_PORT=6443
```

#### 7.1.5 Waf

Pfad:

```text
backend/.extras/waf
```

**Beispiel:**

```bash
mkdir certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout dev.key -out dev.crt -subj "/CN=wahlenwahl-local"
```

> Für den Produktivbetrieb wird dieselbe Struktur verwendet, jedoch mit `NODE_ENV=production` und angepassten Hostnamen (z. B. Docker-Services).

---

### 7.2 Secrets

Für **lokale Entwicklung** können Secrets als `.env`-Werte gesetzt werden.  
Für **Docker / Produktion** werden sie als Docker Secrets eingebunden.

```bash
mkdir secrets
cd secrets

touch admin_pw.txt
touch committee_pw.txt
touch session_secret.txt
touch ballot_secret.txt
```

| Secret-Datei       | Zweck                            |
| ------------------ | -------------------------------- |
| session_secret.txt | Signierung von Sessions          |
| ballot_secret.txt  | Verschlüsselung von Stimmzetteln |
| admin_pw.txt       | LDAP / Admin Initialpasswort     |

Diese Dateien enthalten sensible Werte (Passwörter, kryptographische Schlüssel) und dürfen **nicht versioniert** werden.

---

## 8. Lokale Entwicklung

### 8.1 Vorbereitung

1. `.env`-Dateien gemäß Abschnitt 7 anlegen
2. Optional: Infrastruktur über Docker starten (empfohlen)

```bash
cd backend/.extras/compose
docker compose --profile dev up
```

Je nachdem was neben dem Backend verwendet werden soll.

### 8.2 Start der Anwendung

```bash
cd election/backend
docker build -t backend_image .

docker build -t frontend_image .

docker build -t admin_frontend_image .
```

---

### 8.2.1 Start der Anwendungen (alternativ)

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
cd admin-frontend && npm install && npm run dev
```

Alle Services greifen dabei auf die zuvor definierten `.env`-Variablen zu.

---

## 9. Produktivbetrieb (Docker)

### 9.1 Build & Start

```bash
cd backend/.extras/compose
docker compose --profile prod up
```

### 9.2 Stoppen

```bash
docker compose down
```

### 9.3 Wartung & Troubleshooting

```bash
docker compose logs -f
docker compose logs -f backend
```

---

## 10. Zugriff nach dem Start (Lokal für Entwicklungszwecke)

| Service        | URL                   | Beschreibung          |
| -------------- | --------------------- | --------------------- |
| Frontend       | http://localhost:5173 | Wählenden-UI          |
| Admin-Frontend | http://localhost:5174 | Verwaltungsoberfläche |
| Backend        | http://localhost:3000 | API & Swagger UI      |

Nach dem Aufruf gelangen Sie zur Login-Seite des jeweiligen Systems.

> Für die Links auf euren produktionsfähigen Auslieferungen, bitte sehen Sie in Ihren Konfigurationen nach.

## 11. Tests (Playwright)

Nach Code-Änderungen wird die Ausführung der E2E-Tests empfohlen.

Weitere Informationen:  
[README](./frontend/e2e/README.md)
