# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start development server (also starts PostgreSQL if not running)
pnpm build            # Production build
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint
pnpm test             # Run tests (Node.js native test runner with tsx)
pnpm db:generate      # Generate Drizzle migration files from schema changes
pnpm db:migrate       # Apply pending migrations to PostgreSQL
pnpm db:seed          # Seed demo data (idempotent)
```

All scripts are thin wrappers in `./scripts/*.sh` that pin the NVM Node binary.

To run a single test file: `node --import tsx/esm --test tests/<file>.test.ts`

### Database workflow

Schema changes: edit `src/lib/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`.

One-time SQLite → PostgreSQL data migration:
```bash
node --import tsx/esm scripts/migrate-sqlite-to-postgres.ts
```

## Architecture

**Untap** is a local-first MTG collection and deck builder. Cards are tracked as exact print+finish inventory items, with deck usage and collection shortfall visibility.

**Stack**: Next.js 14 (App Router) · TypeScript · PostgreSQL via postgres.js + Drizzle ORM · Tailwind CSS + shadcn/ui · Scryfall API

PostgreSQL runs in Docker (bare `docker run`, no Compose). `scripts/dev.sh` auto-starts the container on `pnpm dev` — creating it on first run, restarting if stopped, skipping if already running. Connect interactively with `scripts/devdb-psql`. Connection string via `DATABASE_URL` in `.env.local`. Migrations live in `./drizzle/`. The app seeds demo data lazily on first request via `src/lib/db/bootstrap.ts`.

### Data Model (`src/lib/db/schema.ts`)

- `cardPrintsCache` — Scryfall card metadata (one row per print, auto-fetched and cached)
- `collectionItems` — Owned copies with finish/condition/location; quantity tracked as total vs available
- `decks` + `deckEntries` — Decks with per-card quantities and sections (mainboard/sideboard/etc.)
- `tags` + `deckTags` — Deck categorization
- `collectionImportJobs` + `collectionImportRows` — State machine for bulk imports

IDs are UUIDs (`crypto.randomUUID()`). Timestamps are ISO 8601 text. Color arrays (`colors`, `color_identity`) are JSON-stringified text columns. `cmc`, `priceUsd`, `priceUsdFoil` use Drizzle `numeric` (returned as strings — parse with `parseFloat` where needed).

### Business Logic (`src/lib/`)

- **`collection/service.ts`** — `getCollectionSnapshot()`: paginated, filtered collection view joining items with Scryfall metadata, calculating availability and market values
- **`collection/import.ts`** — Multi-source importer (CSV, plaintext) with Scryfall-backed disambiguation and job-level status tracking
- **`decks/service.ts`** — Deck summaries with shortfall metrics; deck detail with mana curve, color analysis, and per-card collection availability
- **`scryfall/client.ts`** — Typed HTTP client; caches prints locally, batches price updates (75 cards/request)
- **`export.ts`** — CSV and deck list export in Moxfield-compatible format

### UI (`src/components/` and `src/app/`)

Pages are async React Server Components by default; `"use client"` only where state is needed. Mutations go through Next.js Server Actions. Bulk operations use API routes (`/api/decks/[deckId]/bulk-add`, `/bulk-preview`). Export endpoints are route handlers returning file downloads.

Key pages: `/` overview · `/collection` with search/filter · `/collection/import` bulk import · `/decks` list · `/decks/[deckId]` detail with analytics · `/search` Scryfall card search.

`src/components/ui/` contains shadcn/ui primitives; custom components (ManaSymbol, ManaCost, CardImagePreview, PendingButton) live alongside them.

### Conventions

- Path alias: `@/*` → `src/*`
- Scryfall images proxied via `next.config.mjs` (required for `<Image>` to work)
- Dark mode via `next-themes` with Tailwind `class` strategy
