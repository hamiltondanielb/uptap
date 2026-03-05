#!/bin/zsh
set -euo pipefail

/Users/danielhamilton/.nvm/versions/node/v22.5.1/bin/node --import tsx/esm --test tests/**/*.test.ts
