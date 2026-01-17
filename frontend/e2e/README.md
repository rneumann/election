# 🎭 E2E Testautomatisierung - Playwright

## Projekt Struktur

Die Tests befinden sich im Verzeichnis e2e und sind funktional gegliedert:

- **`admin_functions/`**
  - Tests für administrative Abläufe, z. B. Stimmenauszählung und Import von Wahlen
- **`user_functions/`**
  - Tests für Nutzerfunktionen wie Kandidatenanzeige und Wahlteilnahmeparticipation
- **`utils/`**
  - Hilfsfunktionen, insbesondere für Authentifizierung (Login/Logout)
- **Konfiguration**
  - `.e2e-env` zur Definition von Test-Zugangsdaten und Basisparametern

## 🚀 Getting Started

### Voraussetzungen

- [Node.js](https://nodejs.org/)
- `npm` oder `yarn`

### Installation & Einrichtung

1.  Installieren Sie die Abhängigkeiten:

```bash
npm install
```

2.  Installieren Sie den Playwright-Browser:

```bash
npx playwright install
```

3. Konfigurationsdatei e2e/.e2e-env anlegen oder anpassen, z. B. mit Test-Benutzern und Admin-Zugangsdaten.

```bash
USER_USERNAME=u001
USER_PASSWORD=p
# space for more Users.
ADMIN_USERNAME=admin
ADMIN_PASSWORD=p
```

## Testausführung

- npm run test:e2e -
  Führt alle Tests im Headless-Modus aus (geeignet für CI/CD).

- npm run test:e2e:ui - Startet den interaktiven UI-Modus zur Analyse und Fehlersuche.

## Testergebnisse

Nach fehlgeschlagenen Testläufen wird automatisch ein HTML-Report erzeugt, der jederzeit mit folgendem Befehl geöffnet werden kann:

```bash
npx playwright show-report
```

## Entwicklungsrichtlinien

Für Login und Authentifizierung ist ausschließlich der Helper e2e/utils/authentication.js zu verwenden.

Selektoren sollten bevorzugt über benutzernahe Methoden wie getByRole oder getByText definiert werden, um stabile und wartbare Tests zu gewährleisten.

---
