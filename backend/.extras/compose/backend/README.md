# Backend Dockerized starten

## Starten

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
  - NODE_ENV=production         # Entwicklungsmodus oder production
  - PORT=3000                   # Port, auf dem der Backend-Server läuft
  - AUTH_PROVIDER=ldap          # LDAP oder Keycloak

  - AD_URL=ldap://ldap:389       # URL zu deinem LDAP/AD Server (Hostname + Port)
  - AD_BASE_DN=DC=example,DC=com # Basis-DN für LDAP-Abfragen
  - AD_DOMAIN=example.com        # Domain deines LDAP/AD Servers

  - ADMIN_PASSWORD_LDAP=secret   # Passwort für Admin-Benutzer im LDAP
  - ADMIN_DN=CN='admin,...'        # Distinguished Name (DN) des Admin-Benutzers

  - DB_HOST=postgres-dev   # Hostname des Postgres-Servers (Docker-Service-Name)
  - DB_PORT=5432           # Port, auf dem Postgres lauscht
  - DB_USER=election       # Benutzername für die DB-Verbindung
  - DB_PASSWORD=secret     # Passwort für den DB-Benutzer
  - DB_NAME=election_db    # Name der Datenbank

  - REDIS_PASSWORD=secret  # Passwort des Redis-Servers
  - REDIS_HOST=redis        # Hostname des Redis-Servers
  - REDIS_PORT=6379         # Port, auf dem Redis lauscht

  - PRIVATE_KEY_PATH=/run/secrets/keys/private.pem # Pfad zum Private Key für die Audits



  mkdir secrets # Erstellung eines Ordners Secrets

  cd secrets # Navigieren

  touch admin_pw.txt # Erstellen einer .txt Datei mit selbst definierten PW für den Admin. Als File für Security in Docker
  touch committee.txt # Erstellen einer .txt Datei mit selbst definierten PW für das Comitee. Als File für Security in Docker
  touch session_secret.txt # Erstellen einer .txt Datei mit selbst definierten Secret Key für Sessions. Als File fuer Security in Docker
  touch ballot_secret.txt # Erstellen einer .txt Datei mit selbst definierten Secret Key fuer Ballot Hashes. Als File fuer Security in Docker


  docker compose up # Start des Docker-Containers basierend auf dem Backend-Image
```

Der Server startet mit dem in `.env` konfigurierten `PORT`. Standard-Health-Check:
