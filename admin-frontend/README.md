# Admin Frontend – HKA Wahlsystem

## Beschreibung

Das **Admin-Frontend** für das Online-Wahlsystem der Hochschule Karlsruhe (HKA). Das Frontend ist **strikt vom Wähler-Frontend getrennt** und stellt ausschließlich Verwaltungs-, Import- und Auswertungsfunktionen bereit.

Die Anwendung ist als **Single Page Application (SPA)** umgesetzt und kommuniziert über eine definierte API mit dem Backend.

---

## Features

- Authentifizierung für Admin und Wahlausschuss (LDAP / Keycloak / Simulate)
- Zentrale Admin-Oberfläche mit strukturierter Seitenleiste (`NavSection` / `NavButton`)
- Simulationsmodus-Schalter (*Wahlen testen*) mit Banner-Hinweis bei aktiviertem Modus
- Import von wahlrelevanten Daten (CSV / Excel)
  - Wählerlisten
  - Kandidatenlisten
  - Wahleinstellungen
- Validierung der Importdateien
- Wahlübersicht mit Warnmarkierung bei fehlenden Kandidaten oder Wählern
- Auszählung von Wahlergebnissen
- Stimmzettel-Integritätsprüfung pro Wahl
- Export der Ergebnisse in ODS oder XLSX
  - Amtlicher Ergebnisbericht
  - Stimmzettel-Matrix (Pivot-Tabelle: Zeilen = Stimmzettel, Spalten = Kandidaten)
- Automatische Bereinigung abgelaufener Testwahl-Daten beim Öffnen der Wahlübersicht
- Globales Fehler- und Alert-System
- Barrierefreiheits-Unterstützung
- Vollständig austauschbares Erscheinungsbild über `CONFIG_PROFILE`

---

## Architekturüberblick

- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **HTTP-Kommunikation:** Axios
- **Build Tool:** Vite

Die Anwendung ist **komponenten- und feature-orientiert** strukturiert. Wiederverwendbare Logik (z. B. Validatoren, Services, UI-Komponenten) ist klar von Seiten- und Feature-Komponenten getrennt.

---

## Projektstruktur

```
admin-frontend/
├── src/
│   ├── components/
│   │   ├── counting/
│   │   │   └── CountingSection.jsx     # Auszählungs-Logik und UI
│   │   ├── ResponsiveButton.jsx        # Wiederverwendbare Button-Komponente
│   │   ├── ValidationErrors.jsx        # Anzeige von Validierungsfehlern
│   │   ├── GlobalAlert.jsx             # Globale Benachrichtigungen
│   │   └── Spinner.jsx                 # Ladeindikator
│   │
│   ├── context/
│   │   ├── AuthContext.jsx             # Authentifizierungs- und User-State
│   │   ├── AlertContext.jsx            # Zentrales Alert-Handling
│   │   └── AccessibilityContext.jsx    # Barrierefreiheit
│   │
│   ├── hooks/
│   │   └── useTheme.js                 # Theme-Handling
│   │
│   ├── pages/
│   │   ├── AdminDashboard.jsx          # Zentrale Admin-Seite
│   │   └── Login.jsx                   # Login-Seite
│   │
│   ├── services/
│   │   ├── api.js                      # Axios-Instanz & Interceptor
│   │   └── authService.js              # Authentifizierungs-API
│   │
│   ├── utils/
│   │   ├── validators/                 # CSV-/Excel-Validierung
│   │   ├── parsers/                    # Datei-Parser
│   │   └── exception-handler/          # Fehlerbehandlung
│   │
│   ├── conf/
│   │   └── logger/
│   │       └── logger.js               # Logging-Konfiguration
│   │
│   ├── App.jsx                         # Routing & globale Layouts
│   ├── main.jsx                        # Application Entry Point
│   └── index.css                       # Globale Styles
│
├── theme.config.js                     # Theme-Konfiguration
├── tailwind.config.js                  # Tailwind CSS Setup
├── vite.config.js                      # Vite-Konfiguration
├── package.json                        # Abhängigkeiten & Skripte
└── README.md                           # Projektdokumentation
```

---

## Installation

### Voraussetzungen

- Node.js (>= 18 empfohlen)
- npm oder yarn

### Setup

```bash
npm install
```

### Entwicklungsmodus

Hierfür muss aber der Backend-Server gestartet sein siehe Dokumentation [README](../backend/README.md)

```bash
npm run dev
```

Die Anwendung ist anschließend standardmäßig unter `http://localhost:5174` erreichbar.

---

## Build

```bash
npm run build
```

Das Build-Artefakt wird im `dist/`-Verzeichnis erzeugt.

---

## Organisations- und Theme-Konfiguration

Das visuelle Erscheinungsbild wird über `CONFIG_PROFILE` gesteuert. Die zugehörige JSON-Datei liegt unter `config/theme.{profile}.json` und wird **zur Build-Zeit** eingelesen (Vite `define` + Tailwind CSS).

| Sektion            | Beschreibung                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| **`institution`**  | Name und Kürzel der Einrichtung                                            |
| **`colors`**       | Corporate-Identity-Farben (`primary`, `secondary`, `dark`, `lightGray`, …) |
| **`text`**         | Sichtbare App-Texte (Titel, Login-Untertitel)                              |
| **`placeholders`** | Platzhalter für Eingabefelder                                              |
| **`roles`**        | Anzeigenamen für Rollen                                                    |

Docker-Image mit abweichendem Profil bauen:

```bash
docker build --build-arg CONFIG_PROFILE=myorg -t admin_frontend_image .
```

Für weitere Details zum Organisations-Konfigurationssystem siehe [Haupt-README](../README.md#9-organisations--und-style-konfiguration).

---

## Docker & Deployment

Das Admin-Frontend wird als **statische Anwendung über Nginx** ausgeliefert.

Docker-Image bauen:

```bash
docker build -t admin_frontend_image .
```

Der Container enthält den Vite-Build und eine vorkonfigurierte Nginx-Instanz.

Für den containerisierten Start des Admin-Frontends siehe [README](/backend/.extras/compose/admin_frontend/README.md)

---

## Sicherheit & Zugriff

- Alle Admin-Funktionen sind **authentifizierungspflichtig**
- Zugriff erfolgt ausschließlich über das zugehörige Backend
- Sensible Logik (z. B. Auszählung) wird serverseitig abgesichert
