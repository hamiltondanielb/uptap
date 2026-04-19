#!/bin/zsh
set -euo pipefail

# Find docker binary (handle Docker Desktop on macOS where PATH may not include it)
DOCKER=$(command -v docker 2>/dev/null || echo "/Applications/Docker.app/Contents/Resources/bin/docker")

if [[ ! -x "$DOCKER" ]]; then
  echo "Docker not found. Please install Docker Desktop."
  exit 1
fi

# Start the dev database container if not already running
CONTAINER="untap-dev"
STATUS=$("$DOCKER" inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "missing")

if [[ "$STATUS" == "running" ]]; then
  echo "Database already running."
elif [[ "$STATUS" == "exited" || "$STATUS" == "created" || "$STATUS" == "paused" ]]; then
  echo "Starting existing database container..."
  "$DOCKER" start "$CONTAINER"
else
  echo "Creating database container..."
  # Use a temp Docker config to avoid credential-helper PATH issues when pulling public images
  DOCKER_CONFIG=$(mktemp -d) "$DOCKER" run --name "$CONTAINER" \
    -e POSTGRES_USER=untap \
    -e POSTGRES_PASSWORD=untap \
    -e POSTGRES_DB=untap \
    -p 5432:5432 \
    -v untap-dev-data:/var/lib/postgresql/data \
    -d postgres:16
fi

./scripts/ensure-next-cache.sh

/Users/danielhamilton/.nvm/versions/node/v22.5.1/bin/node ./node_modules/next/dist/bin/next dev
