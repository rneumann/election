# Keycloak Test-Setup

## Gliederung

- [Voraussetzungen](#voraussetzungen)

- [Environments](#environments)

- [Start & Stop](#start--stop)

- [Keycloak-Test-Setup einrichten](#keycloak-test-setup-einrichten)

---

## Voraussetzungen

- Docker ≥ 20.10
- Docker Compose ≥ 1.29

---

## Environments

```env
KEYCLOAK_ADMIN=admin                 # Admin username
KEYCLOAK_ADMIN_PASSWORD=super-secret # Admin password
KC_DB_USERNAME=keycloak              # Keycloak DB username
KC_DB_PASSWORD=super-secret          # Keycloak DB password

KC_LOG=console                       # Log to console
KC_LOG_CONSOLE_COLOR=true            # Colorize console output
```

---

## Start & Stop

```bash
docker compose up # Start Keycloak Test-Setup
docker compose down # Stop Keycloak Test-Setup
```

- Keycloak ist jetzt erreichbar über `http://localhost:8080`

---

## Keycloak-Test-Setup einrichten

- Login beim **1. Login** mit `temp-admin` und passwort `super-secret` aus der .env-Datei.
- Auf den Reiter users navigieren und einen neuen nutzer anlegen mit folgenden Daten:
  - **Userdaten eingeben**
    - username: admin
    - email: <example@acme.com>
    - email verified: true

  - **Rolle zuweisen**: Auf den Reiter roles navigieren und die Rolle `admin` zuweisen.
  - **Passwort**: Auf den Reiter credentials navigieren und einen neuen Passwort anlegen `super-secret` und `temporary: false`.
  - **SAFE**

- Wieder auf den Reiter users und den temp-admin loeschen.
- Seite Refreshen und nun mit dem neuen admin user anmelden.
- **Test Realm einrichten**: Oben Links auf den Reiter Realms navigieren und einen neuen Realm anlegen. Über das import Feld kann man jetzt die test-data.json importieren.

- Jetzt ist der Testrealm eingerichtet mit den Test-Usern aus der JSON.
