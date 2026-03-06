#!/bin/zsh
set -euo pipefail

if [[ ! -f .next/server/webpack-runtime.js ]]; then
  exit 0
fi

if [[ ! -d .next/server/vendor-chunks ]]; then
  rm -rf .next
  exit 0
fi

required_chunks=(
  "@swc.js"
  "next.js"
  "clsx.js"
  "class-variance-authority.js"
  "tailwind-merge.js"
  "drizzle-orm.js"
)

for chunk in "${required_chunks[@]}"; do
  if [[ ! -f ".next/server/vendor-chunks/${chunk}" ]]; then
    rm -rf .next
    exit 0
  fi
done
