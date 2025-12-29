# Frontend - HKA Wahlsystem (Wähler-Frontend)

## Konfiguration

### Environment-Variablen

Die Anwendung kann über Environment-Variablen konfiguriert werden. Erstellen Sie eine `.env` Datei im Root-Verzeichnis:

```bash
cp .env.example .env
```

**Verfügbare Variablen:**

- `VITE_API_BASE_URL`: Backend API URL (Standard: `/api`)

- `VITE_ENABLE_KEYCLOAK_AUTH`: Keycloak-Login aktivieren (`true`/`false`)

**Keycloak-Authentifizierung:**

Um den "Anmelden mit Keycloak"-Button auf der Login-Seite anzuzeigen:

```env
VITE_ENABLE_KEYCLOAK_AUTH=true
```

Wenn die Variable nicht gesetzt oder `false` ist, wird nur die normale Anmeldung angezeigt.
