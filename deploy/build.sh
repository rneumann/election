#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# build.sh  –  Step 1: Build all Docker images
#
# Usage:
#   ./deploy/build.sh [--push REGISTRY]
#
# Branding (colors, texts, logo, favicon) is read from deploy/branding/.
# Without --push the images are built locally only.
# With    --push the images are tagged and pushed to the given registry,
#         e.g.:  ./deploy/build.sh --push registry.example.com/election
# ---------------------------------------------------------------------------
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANDING_DIR="$REPO_ROOT/deploy/branding"
PUSH_REGISTRY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH_REGISTRY="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Branding: inject theme.json and optional assets into source trees
# ---------------------------------------------------------------------------
inject_branding() {
  local target_dir="$1"    # e.g. frontend/ or admin-frontend/
  local profile="client"

  echo "  → injecting branding into $target_dir"

  # theme.json
  if [[ -f "$BRANDING_DIR/theme.json" ]]; then
    cp "$BRANDING_DIR/theme.json" "$REPO_ROOT/$target_dir/config/theme.${profile}.json"
  else
    echo "  ⚠ deploy/branding/theme.json not found – using built-in hka theme"
    profile="hka"
  fi

  # logo
  if [[ -f "$BRANDING_DIR/logo.svg" ]]; then
    cp "$BRANDING_DIR/logo.svg" "$REPO_ROOT/$target_dir/public/logo.svg"
  fi

  # favicon
  if [[ -f "$BRANDING_DIR/favicon.ico" ]]; then
    cp "$BRANDING_DIR/favicon.ico" "$REPO_ROOT/$target_dir/public/favicon.ico"
  fi

  echo "$profile"
}

cleanup_branding() {
  local target_dir="$1"
  rm -f "$REPO_ROOT/$target_dir/config/theme.client.json"
}

tag_and_push() {
  local local_name="$1"
  local image_name="$2"
  if [[ -n "$PUSH_REGISTRY" ]]; then
    docker tag "$local_name" "$PUSH_REGISTRY/$image_name:latest"
    docker push "$PUSH_REGISTRY/$image_name:latest"
    echo "  ↑ pushed $PUSH_REGISTRY/$image_name:latest"
  fi
}

echo "=== Building election images from $REPO_ROOT ==="

# ── frontend ────────────────────────────────────────────────────────────────
echo "--- frontend ---"
profile=$(inject_branding "frontend")
docker build \
  --build-arg CONFIG_PROFILE="$profile" \
  -t election-frontend:latest \
  "$REPO_ROOT/frontend"
cleanup_branding "frontend"
tag_and_push election-frontend:latest election-frontend

# ── admin-frontend ──────────────────────────────────────────────────────────
echo "--- admin-frontend ---"
profile=$(inject_branding "admin-frontend")
docker build \
  --build-arg CONFIG_PROFILE="$profile" \
  -t election-admin-frontend:latest \
  "$REPO_ROOT/admin-frontend"
cleanup_branding "admin-frontend"
tag_and_push election-admin-frontend:latest election-admin-frontend

# ── backend ─────────────────────────────────────────────────────────────────
echo "--- backend ---"
docker build \
  -t election-backend:latest \
  "$REPO_ROOT/backend"
tag_and_push election-backend:latest election-backend

echo ""
echo "=== Build complete ==="
docker images | grep election
