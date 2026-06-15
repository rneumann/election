# Wahlsystem HKA – Frontend

## Überblick

Das **Frontend des Online-Wahlsystems der Hochschule Karlsruhe (HKA)**.
Es stellt die Benutzeroberfläche für Wähler:innen und Administrator:innen bereit und kommuniziert über HTTP-APIs mit dem Backend.

Das Frontend ist als moderne Single-Page-Application umgesetzt und legt besonderen Wert auf Wartbarkeit, Testbarkeit und saubere UI-Strukturen.

---

## Technologie-Stack

- **Framework:** React (mit JSX)
- **Build-Tool:** Vite
- **Styling:** Tailwind CSS
- **State / UI:** komponentenbasiert
- **Unit- & Component-Tests:** Vitest
- **End-to-End-Tests:** Playwright
- **Code-Qualität:** ESLint, Prettier
- **Containerisierung:** Docker
- **Deployment:** Nginx (statische Auslieferung)

---

## Projektstruktur (Auszug)

```
frontend/
├── src/
│   ├── components/        # Wiederverwendbare UI-Komponenten
│   ├── pages/             # Seiten (z. B. HomePage, VotingPage)
│   ├── utils/             # Hilfsfunktionen (z. B. Authentifizierung)
│   ├── App.jsx            # Root-Komponente
│   └── index.css          # Globale Styles (Tailwind)
│
├── tests/
│   ├── user_functions/    # Fachliche Testszenarien
│   └── pages/             # Page-basierte Tests
│
├── public/                # Statische Assets
├── index.html             # Einstiegspunkt
├── Dockerfile             # Container-Build
├── nginx.conf             # Nginx-Konfiguration
└── package.json           # Abhängigkeiten & Skripte
```

---

## Voraussetzungen

- **Node.js** (empfohlen: aktuelle LTS-Version)
- **npm** (oder kompatibler Package-Manager)
- Optional: **Docker** für containerisierten Betrieb

---

## Installation

```bash
npm install
```

---

## Entwicklung

Lokalen Entwicklungsserver starten:

```bash
npm run dev
```

Die Anwendung ist anschließend unter der von Vite ausgegebenen URL erreichbar.

---

## Build

Produktionsbuild erzeugen:

```bash
npm run build
```

---

## Tests

### Unit- & Component-Tests

```bash
npm run test
```

Mit UI:

```bash
npm run test:ui
```

### End-to-End-Tests (Playwright)

```bash
npm run test:e2e
```

Mit grafischer Oberfläche:

```bash
npm run test:e2e:ui
```

---

## Code-Qualität

### Linting

```bash
npm run eslint
```

### Formatierung

```bash
npm run format
```

---

## Umgebungsvariablen

Backend-URLs und weitere Konfigurationen werden über die Vite-Environment-Mechanismen (`import.meta.env`) gesteuert.

| Variable                    | Beschreibung                                          | Beispiel              |
| --------------------------- | ----------------------------------------------------- | --------------------- |
| `VITE_API_BASE_URL`         | Basis-URL der Backend-API                             | `/api`                |
| `VITE_USERNAME_PATTERN`     | Regex-Muster für erlaubte Benutzernamen beim Login    | `^[a-z0-9]+$`         |
| `VITE_LOG_LEVEL`            | Log-Level der Frontend-Konsole                        | `debug`               |
| `VITE_ENABLE_KEYCLOAK_AUTH` | Keycloak-Login aktivieren                             | `false`               |

---

## Organisations- und Theme-Konfiguration

Das visuelle Erscheinungsbild wird über `CONFIG_PROFILE` gesteuert. Die zugehörige JSON-Datei liegt unter `config/theme.{profile}.json` und wird **zur Build-Zeit** eingelesen.

| Sektion            | Beschreibung                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| **`institution`**  | Name und Kürzel der Einrichtung                                            |
| **`colors`**       | Corporate-Identity-Farben (`primary`, `secondary`, `dark`, `lightGray`, …) |
| **`text`**         | Sichtbare App-Texte (Titel, Login-Untertitel)                              |
| **`placeholders`** | Platzhalter für Eingabefelder                                              |
| **`roles`**        | Anzeigenamen für Rollen                                                    |

Docker-Image mit abweichendem Profil bauen:

```bash
docker build --build-arg CONFIG_PROFILE=myorg -t frontend_image .
```

Für weitere Details zum Organisations-Konfigurationssystem siehe [Haupt-README](../README.md#9-organisations--und-style-konfiguration).

---

## Docker & Deployment

Das Frontend wird als **statische Anwendung über Nginx** ausgeliefert.

Docker-Image bauen:

```bash
docker build -t frontend_image .
```

Der Container enthält den Vite-Build und eine vorkonfigurierte Nginx-Instanz.

Für den containerisierten Start des Frontends siehe [README](/backend/.extras/compose/frontend/README.md)

---
