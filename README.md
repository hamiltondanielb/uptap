# untap

Local-first MTG collection and deck builder built with Next.js, TypeScript, Drizzle, SQLite, and shadcn/ui.

## Current state

This repo is bootstrapped for offline work in the current environment:

- The app code is local to `untap`.
- `node_modules` entries are symlinked to already-installed packages from other local projects because package downloads are currently blocked.
- GitHub repo creation is still blocked until `gh auth login -h github.com` succeeds.

## Commands

```bash
pnpm start
pnpm dev
pnpm start:prod

./scripts/dev.sh
./scripts/typecheck.sh
./scripts/test.sh
./scripts/db-seed.sh
```

`pnpm start` and `pnpm dev` both run the Next.js dev server with hot reloading in this environment. Use `pnpm start:prod` only when you specifically want the production server after a build.

The shell wrappers pin the working NVM Node binary because the current Homebrew `node` install on this machine is broken.

## When network/package installs are available

Replace the temporary symlinked dependency setup with a real install:

```bash
pnpm install
```

Then the project can operate as a normal standalone repo.
