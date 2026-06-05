#!/usr/bin/env bash
# Baut alle drei App-Images für linux/amd64, generiert TLS-Zertifikate
# und exportiert alles für den Transfer auf eine Linux-VM.
# Verwendung: ./build-deploy.sh [--push-to user@host:/opt/election]
set -euo pipefail

PLATFORM=linux/amd64
OUTDIR=./deploy-images
CERT_DIR=./backend/.extras/compose/waf/certs

mkdir -p "$OUTDIR"

# -- Log-Verzeichnisse für WAF vorbereiten -------------------------------------
mkdir -p backend/.extras/compose/waf/tmp
mkdir -p backend/.extras/compose/waf_admin/tmp
chmod 777 backend/.extras/compose/waf/tmp
chmod 777 backend/.extras/compose/waf_admin/tmp

# -- TLS-Zertifikat generieren (falls noch keines vorhanden) ------------------
if [ -f "$CERT_DIR/dev.crt" ] && [ -f "$CERT_DIR/dev.key" ]; then
  echo "==> TLS-Zertifikat vorhanden, überspringe Generierung."
else
  echo "==> Generiere Self-signed TLS-Zertifikat..."
  SERVER_NAME="${SERVER_NAME:-localhost}"
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -days 3650 \
    -newkey rsa:4096 \
    -keyout "$CERT_DIR/dev.key" \
    -out "$CERT_DIR/dev.crt" \
    -subj "/C=DE/O=Election/CN=${SERVER_NAME}" \
    -addext "subjectAltName=DNS:${SERVER_NAME},DNS:localhost,IP:127.0.0.1" \
    2>/dev/null
  chmod 640 "$CERT_DIR/dev.key"
  echo "==> Zertifikat erstellt: $CERT_DIR/dev.crt"
fi

# -- Docker-Images bauen -------------------------------------------------------
echo "==> Buildx-Builder sicherstellen..."
docker buildx inspect multiarch &>/dev/null || docker buildx create --name multiarch --use
docker buildx use multiarch

echo "==> Backend bauen..."
docker buildx build --platform "$PLATFORM" --load -t backend:latest ./backend

echo "==> Frontend bauen..."
docker buildx build --platform "$PLATFORM" --load -t frontend:latest ./frontend

echo "==> Admin-Frontend bauen..."
docker buildx build --platform "$PLATFORM" --load -t admin-frontend:latest ./admin-frontend

echo "==> Images exportieren..."
docker save backend:latest       | gzip > "$OUTDIR/backend.tar.gz"
docker save frontend:latest      | gzip > "$OUTDIR/frontend.tar.gz"
docker save admin-frontend:latest | gzip > "$OUTDIR/admin-frontend.tar.gz"

echo "==> Fertig. Images liegen in $OUTDIR/"

docker image rm -f backend frontend admin-frontend 2>/dev/null || true

# -- Optionaler Upload zur VM ---------------------------------------------------
if [[ "${1:-}" == "--push-to" && -n "${2:-}" ]]; then
  TARGET="$2"
  echo "==> Übertrage Images, Zertifikate und compose.yml nach $TARGET ..."
  scp "$OUTDIR"/*.tar.gz compose.yml "$TARGET"
  # Zertifikate übertragen (liegen in backend/.extras/compose/waf/certs/)
  ssh "${TARGET%%:*}" "mkdir -p ${TARGET##*:}/backend/.extras/compose/waf/certs"
  scp "$CERT_DIR/dev.crt" "$CERT_DIR/dev.key" "${TARGET%%:*}:${TARGET##*:}/backend/.extras/compose/waf/certs/"
  echo "==> Auf der VM ausführen:"
  echo "    for f in *.tar.gz; do docker load < \$f; done"
  echo "    SERVER_NAME=deine-domain.de docker compose up -d"
fi
