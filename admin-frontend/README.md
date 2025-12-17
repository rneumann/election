# Admin Frontend - HKA Wahlsystem

Separates Admin-Frontend für d Online-Wahlsystem.

## Übersicht

Dieses Projekt ist ein eigenständiges Frontend speziell für Admin-Funktionen. Es enthält modularisierte Komponenten für:

- **Auszählung von Wahlergebnissen** (CountingSection)
- **Datei-Uploads** für Wähler, Kandidaten und Wahleinstellungen
- **Excel-Export** von Wahlergebnissen

## Projektstruktur

```
admin-frontend/
├── src/
│   ├── components/
│   │   ├── counting/
│   │   │   └── CountingSection.jsx     # Extrahierte Auszählungs-Komponente
│   │   ├── ResponsiveButton.jsx        # Shared: Button-Komponente
│   │   ├── ValidationErrors.jsx        # Shared: Validierungsanzeige
│   │   ├── GlobalAlert.jsx             # Shared: Globale Benachrichtigungen
│   │   └── Spinner.jsx                 # Shared: Lade-Spinner
│   │
│   ├── context/
│   │   ├── AuthContext.jsx             # Shared: Authentifizierung
│   │   ├── AlertContext.jsx            # Shared: Alert-System
│   │   └── AccessibilityContext.jsx    # Shared: Barrierefreiheit
│   │
│   ├── hooks/
│   │   └── useTheme.js                 # Shared: Theme-Hook
│   │
│   ├── pages/
│   │   ├── AdminDashboard.jsx          # Haupt-Admin-Seite
│   │   └── Login.jsx                   # Login-Seite
│   │
│   ├── services/
│   │   ├── api.js                      # Shared: Axios-Konfiguration
│   │   └── authService.js              # Shared: Auth-Service
│   │
│   ├── utils/
│   │   ├── validators/                 # Shared: CSV/Excel-Validierung
│   │   ├── parsers/                    # Shared: Datei-Parser
│   │   └── exception-handler/          # Shared: Fehlerbehandlung
│   │
│   ├── conf/
│   │   └── logger/
│   │       └── logger.js               # Shared: Logging-Konfiguration
│   │
│   ├── App.jsx                         # Haupt-App mit Routing
│   ├── main.jsx                        # Entry Point
│   └── index.css                       # Globale Styles
│
├── theme.config.js                     # Theme-Konfiguration
├── tailwind.config.js                  # Tailwind-Konfiguration
├── vite.config.js                      # Vite-Konfiguration
├── package.json                        # Abhängigkeiten
└── README.md                           # Diese Datei
```
