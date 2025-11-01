# 🗳️ Online-Wahlsystem HKA Backend

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
AD_BASE_DN={...}
AD_DOMAIN={...}


ADMIN_PASSWORD={...}
COMMITTEE_PASSWORD={...}
```

## Installation

```bash
git clone <REPOSITORY_URL>
cd <PROJECT_FOLDER>
npm install
```

Erstelle eine `.env` Datei im Projektstamm und füge die notwendigen Umgebungsvariablen hinzu (siehe [Vorraussetzungen](#voraussetzungen))

## Deployment / Server starten

```bash
npm start -> um den Server zu starten.
npm run prettier -> um den code zu formatieren.
npm run eslint -> um auf codesmell zu prüfen.
```

Der Server startet mit dem in `.env` konfigurierten `PORT`. Standard-Health-Check:

```bash
GET http://localhost:<PORT>/health
```

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
