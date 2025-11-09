# 🐘 PostgreSQL + pgAdmin Setup

Dieses Setup stellt eine lokale **PostgreSQL-Datenbank** mit **pgAdmin-Webinterface** via **Docker Compose** bereit.  
Es unterstützt zwei Profile:

- **dev** → Entwicklungsumgebung
- **prod** → Produktivumgebung

---

## ⚙️ Voraussetzungen

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Container starten

### 1️⃣ Projektverzeichnis öffnen

```bash
cd /deinOrdner/.extras/compose/postgres
```

### 2️⃣ Container hochfahren

**Entwicklung:**

```bash
docker compose --profile dev up -d
```

**Produktion:**

```bash
docker compose up -d
```

### 3️⃣ pgAdmin im Browser öffnen

👉 [http://localhost:8080](http://localhost:8080)

---

## 🔑 Login

Die Zugangsdaten stehen in **.pgadmin.env**, z. B.:

```bash
PGADMIN_DEFAULT_EMAIL=election@acme.com
PGADMIN_DEFAULT_PASSWORD=p
```

---

## 🗄️ Server in pgAdmin registrieren

In pgAdmin:  
**Rechtsklick auf „Servers“ → Register → Server...**

**Reiter „General“**

```
Name: ElectionDB (frei wählbar)
```

**Reiter „Connection“**

```
Host name/address: election
Port: 5432
Maintenance database: election_db
Username: election
Password: (aus .env)
```

✅ **Save** → Verbindung aktiv.

---

## 🧹 Container stoppen & bereinigen

**Stoppen:**

```bash
docker compose --profile dev/prod down
```

**Kompletter Reset (inkl. Volumes):**

```bash
docker compose --profile dev/prod down -v
```

💡 **Hinweis:**  
Daten in den Volumes bleiben erhalten, solange du **nicht** `-v` angibst.  
Das gewählte **Profil** (`--profile dev` oder `--profile prod`) bestimmt, welche Dienste gestartet werden.

---

## 🧩 Beispiel .env

### PostgreSQL

```bash
POSTGRES_USER=election
POSTGRES_DB=election_db

# Zeitzone
TZ=Europe/Berlin
PGTZ=Europe/Berlin

# Authentifizierung (nur für lokale Entwicklung!)
POSTGRES_HOST_AUTH_METHOD=trust
```

### pgAdmin

```bash
PGADMIN_DEFAULT_EMAIL=election@acme.com
PGADMIN_DEFAULT_PASSWORD=p

# Master-Passwort-Dialog deaktivieren
PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False
PGADMIN_CONFIG_SERVER_MODE=False

TZ=Europe/Berlin
```

---

## 🧠 Kurzüberblick

| Umgebung | Befehl                                | Ports       | Ziel               |
| -------- | ------------------------------------- | ----------- | ------------------ |
| Dev      | `docker compose --profile dev up -d`  | 5432 / 8080 | Lokales Test-Setup |
| Prod     | `docker compose --profile prod up -d` | 5432 / 8080 | Produktivsystem    |
| Stop     | `docker compose --profile prod down`  | –           | Container stoppen  |
| Reset    | `docker compose --profile . down -v`  | –           | Alles löschen      |
