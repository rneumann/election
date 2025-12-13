# 🗳️ Online-Wahlsystem HKA Backend

## Gliederung

- [Überblick](#überblick)
- [Features](#features)
- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Deployment & Konfiguration](#deployment--server-starten)
- [Excel Import Konfiguration](#excel-import-konfiguration)
- [API-Dokumentation](#api-endpunkte)

## Überblick

Dieses Projekt stellt das Backend für das Online-Wahlsystem der HKA bereit. Es basiert auf **Node.js** und **Express.js** und bietet Authentifizierung, Routen für Benutzerinteraktionen sowie Logging und zentralisierte Fehlerbehandlung.

### Features

- REST-API für Authentifizierung und weitere Endpunkte
- Sicherheit über **Helmet**-Middleware
- Zentralisierte Fehlerbehandlung (Error-Handler-Middleware)
- Health-Check Route
- Logging über konfigurierbaren Logger
- Unterstützung für JSON- und URL-encoded Body-Parsing

## Voraussetzungen

- Node.js >= 18.x
- npm >= 9.x
- `.env` Datei im Projektstamm mit mindestens:

```env
PORT=3000
NODE_ENV=development

AD_URL={...}
AD_BASE_DN={...}    # LDAP Base DN -> Volle DN angeben, nötig für Authentifizierung bind (BASE_DN, Passwort), der eingegebene username wird als UID interpretiert.
AD_DOMAIN={...}     # LDAP Domain


ADMIN_PASSWORD={...}
COMMITTEE_PASSWORD={...}

SECRET={...} # Secret Key für die cookie-session, man kann ihn generieren mit -> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

BALLOT_SECRET={...} # Secret Key für die Ballot Hashes, man kann ihn generieren mit -> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

```

## Installation

```bash
git clone <REPOSITORY_URL>
cd <PROJECT_FOLDER>
npm install
```

Erstelle eine `.env` Datei im Projektstamm und füge die notwendigen Umgebungsvariablen hinzu (siehe [Vorraussetzungen](#voraussetzungen))

## Deployment / Server starten

### Lokal

```bash
npm start -> um den Server zu starten.
npm run prettier -> um den code zu formatieren.
npm run eslint -> um auf codesmell zu prüfen.
```

### Dockerized

#### Vorraussetzungen

- running **Docker-Desktop**

#### Starten

um die Anwendung via **Docker** zu starten sind folgende Schritte notwendig:

**1. Docker Image bauen:**

```bash
  cd election/backend # Root Vezeichnis des Backends
  docker build -t backend_image . # Bauen des Image basierend auf dem Dockerfile
```

**2. Environments anlegen:**

```bash
  cd election/backend/.extras/compose/backend # zum compose.yml file navigieren

  touch .env
  - NODE_ENV=development        # Entwicklungsmodus oder production
  - PORT=3000                   # Port, auf dem der Backend-Server läuft

  - AD_URL=ldap://ldap:389       # URL zu deinem LDAP/AD Server (Hostname + Port)
  - AD_BASE_DN=DC=example,DC=com # Basis-DN für LDAP-Abfragen
  - AD_DOMAIN=example.com        # Domain deines LDAP/AD Servers

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


  mkdir secrets # Erstellung eines Ordners Secrets

  cd secrets # Navigieren

  touch admin_pw.txt # Erstellen einer .txt Datei mit selbst definierten PW für den Admin. Als File für Security in Docker
  touch committee.txt # Erstellen einer .txt Datei mit selbst definierten PW für das Comitee. Als File für Security in Docker
  touch session_secret.txt # Erstellen einer .txt Datei mit selbst definierten Secret Key für Sessions. Als File fuer Security in Docker
  touch ballot_secret.txt # Erstellen einer .txt Datei mit selbst definierten Secret Key fuer Ballot Hashes. Als File fuer Security in Docker


  docker compose up # Start des Docker-Containers basierend auf dem Backend-Image
```

Der Server startet mit dem in `.env` konfigurierten `PORT`. Standard-Health-Check:

```bash
GET http://localhost:<PORT>/health
```

## Excel Import Konfiguration

Die Excel-Datei für den Import von Wahlkonfigurationen verwendet **deutsche Text-Werte** in Dropdown-Feldern für bessere Benutzerfreundlichkeit.

### Wahltyp (Spalte H)

| Text-Wert          | DB-Wert                       | Beschreibung   | Verwendung                   |
| ------------------ | ----------------------------- | -------------- | ---------------------------- |
| **Mehrheitswahl**  | `majority_vote`               | Mehrheitswahl  | Höchste Stimmenzahl gewinnt  |
| **Verhältniswahl** | `proportional_representation` | Verhältniswahl | Proportionale Sitzverteilung |
| **Urabstimmung**   | `referendum`                  | Urabstimmung   | Ja/Nein-Abstimmung           |

### Zählverfahren (Spalte I)

| Text-Wert              | DB-Wert                  | Beschreibung                          | Typische Verwendung                  |
| ---------------------- | ------------------------ | ------------------------------------- | ------------------------------------ |
| **Sainte-Laguë**       | `sainte_lague`           | Sainte-Laguë (Divisorverfahren)       | Verhältniswahl Studierendenparlament |
| **Hare-Niemeyer**      | `hare_niemeyer`          | Hare-Niemeyer (Quotenverfahren)       | Verhältniswahl Senat, Fakultätsrat   |
| **Einfache Mehrheit**  | `highest_votes_simple`   | Relative Mehrheit (höchste Stimmen)   | Mehrheitswahl ohne Schwellenwert     |
| **Absolute Mehrheit**  | `highest_votes_absolute` | Absolute Mehrheit (>50% erforderlich) | Mehrheitswahl mit Schwellenwert      |
| **Ja/Nein/Enthaltung** | `yes_no_referendum`      | Ja/Nein-Auszählung                    | Urabstimmungen                       |

## Projektstruktur (Beispiel)

```bash
├─ server.js
├─ src/
│  ├─ app.js
│  ├─ conf/
│  │  ├─ logger/
│  │  │  ├─ logger.js
│  │  │  └─ error-handler.middleware.js
│  ├─ auth/
│  │  ├─ auth.js
│  │  └─ auth.route.js
│  └─ routes/
│     └─ index.routes.js
```

## API Endpunkte

### Health Check

```bash
GET /health
```

Antwort:

```json
{ "status": "ok" }
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "username": "user",
  "password": "pass"
}
```

Erfolgreiche Antwort:

```json
{
  "username": "user",
  "role": "admin"
}
```

Mögliche Fehlercodes:

- `400` – Fehlende Felder
- `401` – Ungültiger Benutzername oder Passwort
- `405` – Falsche HTTP-Methode
- `415` – Falscher Content-Type
- `500` – Interner Serverfehler

### Logging

- Alle Routen und Fehler werden über den konfigurierten Logger protokolliert.
- Die Error-Handler-Middleware loggt unhandled Errors und liefert eine einheitliche Fehlerantwort.

### Sicherheit

- Helmet setzt sichere HTTP-Header.
- Body-Parser prüft JSON- und URL-encoded Requests.
- Content-Type- und Method-Checks sollten serverseitig validiert werden.

### Entwicklungstipps

- Nutze die `eslint`- und `prettier`-Scripts vor Commits.
- Lege zusätzliche Umgebungsvariablen für DB, Secrets oder Monitoring in `.env` ab.
- Fehler mit `next(error)` an die zentrale Error-Middleware weiterleiten.
