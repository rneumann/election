# Deployment

This directory contains everything needed to build and run the election system in production.
The original development configuration lives in `backend/.extras/` and remains unchanged.

```
deploy/
├── build.sh              # Step 1 – build Docker images
├── compose/
│   ├── compose.yml       # Step 3 – docker compose entry point
│   ├── backend.env.template     # copy → backend.env, then fill in
│   ├── postgres.env.template    # copy → postgres.env, then fill in
│   ├── waf/conf.d/              # ModSecurity tuning (voter WAF)
│   ├── waf_admin/conf.d/        # ModSecurity tuning (admin WAF)
│   ├── certs/voter/             # TLS cert+key for voter frontend  (add manually)
│   ├── certs/admin/             # TLS cert+key for admin frontend  (add manually)
│   └── secrets/                 # Passwords, session secret, RSA keys (add manually)
└── README.md             # this file
```

---

## Step 1 – Build images

Run on the **build machine** (where the source code is checked out):

```bash
./deploy/build.sh
```

To build and push to a registry for deployment on a separate runtime server:

```bash
./deploy/build.sh --push registry.example.com/election
```

The three images produced are:
- `election-frontend:latest`
- `election-admin-frontend:latest`
- `election-backend:latest`

If deploying to a separate server, copy the images there (or pull from the registry):

```bash
# alternative without registry – export/import
docker save election-frontend election-admin-frontend election-backend \
  | gzip > election-images.tar.gz

# on the runtime server:
docker load < election-images.tar.gz
```

---

## Step 2 – Configure

Do this once on the **runtime server** inside `deploy/compose/`:

### 2a – Environment files

```bash
cd deploy/compose
cp backend.env.template  backend.env
cp postgres.env.template postgres.env
```

Edit both files and replace every `CHANGE_ME` / `YOUR_*` placeholder with real values.
Key settings in `backend.env`:

| Variable | Description |
|---|---|
| `AUTH_PROVIDER` | `ldap` (default), `keycloak`, or `saml` |
| `AD_URL` | LDAP server address |
| `DB_PASSWORD` | Must match `POSTGRES_PASSWORD` in `postgres.env` |
| `REDIS_PASSWORD` | Must match the value used by Redis |
| `CORS_ORIGIN` | Comma-separated list of allowed HTTPS origins |
| `SERVER_NAME` | Hostname shown in TLS / nginx config |

### 2b – Secrets

Follow the instructions in [`compose/secrets/README.md`](compose/secrets/README.md):

```bash
# session secret
openssl rand -base64 48 > compose/secrets/session_secret.txt

# admin / committee passwords
echo "your-admin-password"     > compose/secrets/admin_pw.txt
echo "your-committee-password" > compose/secrets/committee_pw.txt

# audit log RSA key pair
mkdir -p compose/secrets/keys
openssl genrsa -out compose/secrets/keys/private.pem 4096
openssl rsa -in compose/secrets/keys/private.pem -pubout \
            -out compose/secrets/keys/public.pem
```

### 2c – TLS certificates

Place certificate and key for each frontend:

```
compose/certs/voter/server.crt
compose/certs/voter/server.key
compose/certs/admin/server.crt
compose/certs/admin/server.key
```

For development / testing you can generate self-signed certs:

```bash
mkdir -p compose/certs/voter compose/certs/admin

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout compose/certs/voter/server.key \
  -out    compose/certs/voter/server.crt \
  -subj "/CN=localhost"

cp compose/certs/voter/server.crt compose/certs/admin/server.crt
cp compose/certs/voter/server.key compose/certs/admin/server.key
```

### 2d – Election presets (optional)

Copy your election preset configuration:

```bash
cp /path/to/election_presets.json compose/election_presets.json
```

If you skip this step, the backend falls back to its built-in defaults.

---

## Step 3 – Run

```bash
cd deploy/compose
docker compose up -d
```

| Service | URL |
|---|---|
| Voter frontend | `https://<host>:443` |
| Admin frontend | `https://<host>:8444` |

### Useful commands

```bash
# view logs
docker compose logs -f

# stop everything
docker compose down

# stop and remove volumes (destructive – deletes all data!)
docker compose down -v

# update images after a rebuild
docker compose pull   # if using a registry
docker compose up -d --force-recreate
```

---

## Ports

| Port | Service |
|---|---|
| 80 | Voter frontend (HTTP → redirected to 443 by WAF) |
| 443 | Voter frontend (HTTPS) |
| 8444 | Admin frontend (HTTPS) |

The backend, database, and Redis are on internal networks and not exposed to the host.
