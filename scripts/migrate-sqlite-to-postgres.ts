/**
 * One-time migration script: copies all data from the local SQLite database
 * into the PostgreSQL database. Run after `pnpm db:migrate` has created the schema.
 *
 * Usage:
 *   node --import tsx/esm scripts/migrate-sqlite-to-postgres.ts
 *
 * Requires the SQLite file at ./data/untap.db and DATABASE_URL env var set.
 */

import Database from "better-sqlite3";
import path from "node:path";

import { db } from "../src/lib/db/client";
import {
  cardPrintsCache,
  collectionImportJobs,
  collectionImportRows,
  collectionItems,
  deckEntries,
  deckTags,
  decks,
  tags
} from "../src/lib/db/schema";

const sqliteFile = process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "untap.db");

function boolCol(value: number | null | undefined): boolean {
  return value === 1;
}

async function main() {
  console.log(`Opening SQLite: ${sqliteFile}`);
  const sqlite = new Database(sqliteFile, { readonly: true });

  // --- card_prints_cache ---
  const prints = sqlite.prepare("SELECT * FROM card_prints_cache").all() as Record<string, unknown>[];
  console.log(`Migrating ${prints.length} card_prints_cache rows…`);
  if (prints.length > 0) {
    for (let i = 0; i < prints.length; i += 100) {
      const batch = prints.slice(i, i + 100).map((r) => ({
        id: r.id as string,
        oracleId: r.oracle_id as string,
        name: r.name as string,
        setCode: r.set_code as string,
        setName: r.set_name as string,
        collectorNumber: r.collector_number as string,
        rarity: r.rarity as string,
        lang: (r.lang as string) ?? "en",
        releasedAt: r.released_at as string | null,
        imageSmall: r.image_small as string | null,
        imageNormal: r.image_normal as string | null,
        manaCost: r.mana_cost as string | null,
        typeLine: r.type_line as string | null,
        oracleText: r.oracle_text as string | null,
        colors: r.colors as string | null,
        colorIdentity: r.color_identity as string | null,
        cmc: r.cmc as number | null,
        priceUsd: r.price_usd as number | null,
        priceUsdFoil: r.price_usd_foil as number | null,
        layout: (r.layout as string) ?? "normal",
        scryfallUpdatedAt: r.scryfall_updated_at as string | null,
        cachedAt: (r.cached_at as string) ?? "CURRENT_TIMESTAMP"
      }));
      await db.insert(cardPrintsCache).values(batch).onConflictDoNothing();
    }
  }

  // --- collection_items ---
  const items = sqlite.prepare("SELECT * FROM collection_items").all() as Record<string, unknown>[];
  console.log(`Migrating ${items.length} collection_items rows…`);
  if (items.length > 0) {
    for (let i = 0; i < items.length; i += 100) {
      const batch = items.slice(i, i + 100).map((r) => ({
        id: r.id as string,
        printId: r.print_id as string,
        quantityTotal: (r.quantity_total as number) ?? 0,
        quantityAvailable: (r.quantity_available as number) ?? 0,
        finish: (r.finish as string) ?? "nonfoil",
        condition: (r.condition as string) ?? "near_mint",
        language: r.language as string | null,
        isSigned: boolCol(r.is_signed as number),
        isAltered: boolCol(r.is_altered as number),
        isProxy: boolCol(r.is_proxy as number),
        purchasePriceCents: r.purchase_price_cents as number | null,
        acquiredAt: r.acquired_at as string | null,
        location: r.location as string | null,
        notes: r.notes as string | null,
        updatedAt: (r.updated_at as string) ?? "CURRENT_TIMESTAMP"
      }));
      await db.insert(collectionItems).values(batch).onConflictDoNothing();
    }
  }

  // --- decks ---
  const deckRows = sqlite.prepare("SELECT * FROM decks").all() as Record<string, unknown>[];
  console.log(`Migrating ${deckRows.length} decks rows…`);
  if (deckRows.length > 0) {
    for (let i = 0; i < deckRows.length; i += 100) {
      const batch = deckRows.slice(i, i + 100).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        format: r.format as string,
        description: r.description as string | null,
        notes: r.notes as string | null,
        commanderPrintId: r.commander_print_id as string | null,
        isArchived: boolCol(r.is_archived as number),
        createdAt: (r.created_at as string) ?? "CURRENT_TIMESTAMP",
        updatedAt: (r.updated_at as string) ?? "CURRENT_TIMESTAMP"
      }));
      await db.insert(decks).values(batch).onConflictDoNothing();
    }
  }

  // --- deck_entries ---
  const entries = sqlite.prepare("SELECT * FROM deck_entries").all() as Record<string, unknown>[];
  console.log(`Migrating ${entries.length} deck_entries rows…`);
  if (entries.length > 0) {
    for (let i = 0; i < entries.length; i += 100) {
      const batch = entries.slice(i, i + 100).map((r) => ({
        id: r.id as string,
        deckId: r.deck_id as string,
        printId: r.print_id as string,
        quantity: (r.quantity as number) ?? 1,
        section: (r.section as string) ?? "mainboard",
        isMaybeboard: boolCol(r.is_maybeboard as number),
        useCollection: r.use_collection != null ? boolCol(r.use_collection as number) : true,
        notes: r.notes as string | null
      }));
      await db.insert(deckEntries).values(batch).onConflictDoNothing();
    }
  }

  // --- tags ---
  const tagRows = sqlite.prepare("SELECT * FROM tags").all() as Record<string, unknown>[];
  console.log(`Migrating ${tagRows.length} tags rows…`);
  if (tagRows.length > 0) {
    for (let i = 0; i < tagRows.length; i += 100) {
      const batch = tagRows.slice(i, i + 100).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        color: r.color as string | null
      }));
      await db.insert(tags).values(batch).onConflictDoNothing();
    }
  }

  // --- deck_tags ---
  const deckTagRows = sqlite.prepare("SELECT * FROM deck_tags").all() as Record<string, unknown>[];
  console.log(`Migrating ${deckTagRows.length} deck_tags rows…`);
  if (deckTagRows.length > 0) {
    for (let i = 0; i < deckTagRows.length; i += 100) {
      const batch = deckTagRows.slice(i, i + 100).map((r) => ({
        deckId: r.deck_id as string,
        tagId: r.tag_id as string
      }));
      await db.insert(deckTags).values(batch).onConflictDoNothing();
    }
  }

  // --- collection_import_jobs ---
  const jobRows = sqlite.prepare("SELECT * FROM collection_import_jobs").all() as Record<string, unknown>[];
  console.log(`Migrating ${jobRows.length} collection_import_jobs rows…`);
  if (jobRows.length > 0) {
    for (let i = 0; i < jobRows.length; i += 100) {
      const batch = jobRows.slice(i, i + 100).map((r) => ({
        id: r.id as string,
        sourceType: r.source_type as string,
        status: r.status as string,
        totalRows: (r.total_rows as number) ?? 0,
        matchedRows: (r.matched_rows as number) ?? 0,
        ambiguousRows: (r.ambiguous_rows as number) ?? 0,
        failedRows: (r.failed_rows as number) ?? 0,
        createdAt: (r.created_at as string) ?? "CURRENT_TIMESTAMP",
        completedAt: r.completed_at as string | null
      }));
      await db.insert(collectionImportJobs).values(batch).onConflictDoNothing();
    }
  }

  // --- collection_import_rows ---
  const importRows = sqlite.prepare("SELECT * FROM collection_import_rows").all() as Record<string, unknown>[];
  console.log(`Migrating ${importRows.length} collection_import_rows rows…`);
  if (importRows.length > 0) {
    for (let i = 0; i < importRows.length; i += 100) {
      const batch = importRows.slice(i, i + 100).map((r) => ({
        id: r.id as string,
        jobId: r.job_id as string,
        original: r.original as string,
        quantity: (r.quantity as number) ?? 1,
        name: r.name as string,
        setCode: r.set_code as string | null,
        collectorNumber: r.collector_number as string | null,
        finish: r.finish as string | null,
        status: r.status as string,
        resolvedPrintId: r.resolved_print_id as string | null,
        errorMessage: r.error_message as string | null
      }));
      await db.insert(collectionImportRows).values(batch).onConflictDoNothing();
    }
  }

  sqlite.close();
  console.log("Migration complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
