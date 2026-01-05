# 🎭 E2E Testing Automation - Playwright

## 📂 Project structure

The tests are located in the folder `e2e`.

- **`admin_functions/`**
  - `counting.spec.js`: Test scenarios for the vote counting process and validation of election results.
  - `imports.spec.js `: Test scenarios for uploading directories or elections.
- **`utils/`**
  - `authentication.js`: Helper functions for login, logout, and session management.
- **Konfiguration**
  - `.e2e-env`: Environment variables (e.g., base URLs, test credentials).

## 🚀 Getting Started

### Prerequisites

Ensure the following tools are installed:

- [Node.js](https://nodejs.org/)
- `npm` oder `yarn`

### Installation

1.  Clone this repository.
2.  Install dependencies:

```bash
npm install
```

3.  Install the required Playwright browser binaries:

```bash
npx playwright install
```

### Configuration

Create or update `e2e/.e2e-env`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=p
```

## 🏃 Running Tests

The following commands are available to execute the tests:

| Befehl                | Beschreibung                                                             |
| :-------------------- | :----------------------------------------------------------------------- |
| `npm run test:e2e`    | Runs all tests in headless mode (no UI). Ideal for CI/CD pipelines.      |
| `npm run test:e2e:ui` | Starts the interactive UI mode with time travel and detailed inspection. |

## 📊 Test Results & Reports

After each run (on failures), an HTML report is generated automatically. You can open it manually at any time:

```bash
npx playwright show-report
```

## 🛠 Development Guidelines

- **Authentication Helper**: Authentication Helper: Always use e2e/utils/authentication.js for login in new tests. Avoid duplicating login steps in spec files.
- **Selektoren**: Prefer user-visible locators such as getByRole or getByText to keep tests stable and maintainable.

---
