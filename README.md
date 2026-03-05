# untap

Local-first MTG collection and deck builder built with Next.js, TypeScript, Drizzle, SQLite, and shadcn/ui.

## Current state

This repo is bootstrapped for offline work in the current environment:

- The app code is local to `untap`.
- `node_modules` entries are symlinked to already-installed packages from other local projects because package downloads are currently blocked.
- GitHub repo creation is still blocked until `gh auth login -h github.com` succeeds.

## Commands

```bash
./scripts/dev.sh
./scripts/typecheck.sh
./scripts/db-seed.sh
```

These wrappers pin the working NVM Node binary because the current Homebrew `node` install on this machine is broken.

## When network/package installs are available

Replace the temporary symlinked dependency setup with a real install:

```bash
pnpm install
```

Then the project can operate as a normal standalone repo.

