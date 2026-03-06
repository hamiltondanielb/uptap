#!/bin/zsh
set -euo pipefail

./scripts/ensure-next-cache.sh

/Users/danielhamilton/.nvm/versions/node/v22.5.1/bin/node ./node_modules/next/dist/bin/next dev
