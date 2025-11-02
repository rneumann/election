# 🐘 PostgreSQL + pgAdmin Setup

Dieses Setup stellt eine lokale PostgreSQL-Datenbank inklusive pgAdmin-Interface über **Docker Compose** bereit.  
Es unterstützt zwei Profile: **dev** (Entwicklung) und **prod** (Produktion).

---

## ⚙️ Voraussetzungen

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Starten der Container

### 1. **Terminal öffnen**

### 2. In das Projektverzeichnis wechseln:

```bash
cd /deinOrdner/.extras/compose/postgres
```

### 3. Container starten

#### Für Entwicklung:

```bash
docker compose --profile dev up -d
```

#### Für Produktion:

```bash
docker compose up
```

4. pgAdmin öffnen
   → http://localhost:8080

## 🔑 Login-Daten

Die Anmeldedaten für pgAdmin findest du in der Datei:

.pgadmin.env

Dort stehen z. B.:

PGADMIN_DEFAULT_EMAIL=election@acme.com
PGADMIN_DEFAULT_PASSWORD=p

## 🗄️ Server in pgAdmin registrieren

### _In pgAdmin Rechtsklick auf „Servers“ → Register → Server..._

### Im Reiter General:

```
Name: beliebig (z. B. ElectionDB)
```

### Im Reiter Connection:

```
Host name/address: election

Port: 5432

Maintenance database: election_db

Username: election

Password: ist aus der .env zu entnehmen

Save klicken → Verbindung ist aktiv
```

## 🧹 Container stoppen & aufräumen

Zum Stoppen der Container:

```bash
docker compose down
```

Wenn du zusätzlich Volumes löschen willst (z. B. für einen kompletten Reset):

```bash
docker compose down -v
```

📁 Hinweise

Die Datenbankdaten bleiben in den definierten Docker-Volumes erhalten, solange du sie nicht mit -v entfernst.

Das Profil (--profile dev oder --profile prod) steuert, welche Dienste gestartet werden.

## .env Beispiel

### Für PostgreSQL:

```bash
POSTGRES_USER=election
POSTGRES_PASSWORD=p
POSTGRES_DB=election_db

# Zeitzone & Locale
TZ=Europe/Berlin
PGTZ=Europe/Berlin

# Authentifizierung (unsicher, nur Dev!)
POSTGRES_HOST_AUTH_METHOD=trust
```

### Für PgAdmin:

```bash
PGADMIN_DEFAULT_EMAIL=election@acme.com
PGADMIN_DEFAULT_PASSWORD=p
# Um zu vermeiden das PgAdmin nach einem Masterpwd fragt, nervt nur.
PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False
PGADMIN_CONFIG_SERVER_MODE=False
TZ=Europe/Berlin
```
