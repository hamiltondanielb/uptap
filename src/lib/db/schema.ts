import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cardPrintsCache = sqliteTable(
  "card_prints_cache",
  {
    id: text("id").primaryKey(),
    oracleId: text("oracle_id").notNull(),
    name: text("name").notNull(),
    setCode: text("set_code").notNull(),
    setName: text("set_name").notNull(),
    collectorNumber: text("collector_number").notNull(),
    rarity: text("rarity").notNull(),
    lang: text("lang").notNull().default("en"),
    releasedAt: text("released_at"),
    imageSmall: text("image_small"),
    imageNormal: text("image_normal"),
    manaCost: text("mana_cost"),
    typeLine: text("type_line"),
    oracleText: text("oracle_text"),
    colors: text("colors"),
    colorIdentity: text("color_identity"),
    cmc: real("cmc"),
    layout: text("layout").notNull().default("normal"),
    scryfallUpdatedAt: text("scryfall_updated_at"),
    cachedAt: text("cached_at").notNull().default("CURRENT_TIMESTAMP")
  },
  (table) => ({
    oracleIdx: index("card_prints_cache_oracle_idx").on(table.oracleId),
    nameIdx: index("card_prints_cache_name_idx").on(table.name)
  })
);

export const collectionItems = sqliteTable(
  "collection_items",
  {
    id: text("id").primaryKey(),
    printId: text("print_id")
      .notNull()
      .references(() => cardPrintsCache.id, { onDelete: "cascade" }),
    quantityTotal: integer("quantity_total").notNull().default(0),
    quantityAvailable: integer("quantity_available").notNull().default(0),
    finish: text("finish").notNull().default("nonfoil"),
    condition: text("condition").notNull().default("near_mint"),
    language: text("language"),
    isSigned: integer("is_signed", { mode: "boolean" }).notNull().default(false),
    isAltered: integer("is_altered", { mode: "boolean" }).notNull().default(false),
    isProxy: integer("is_proxy", { mode: "boolean" }).notNull().default(false),
    purchasePriceCents: integer("purchase_price_cents"),
    acquiredAt: text("acquired_at"),
    location: text("location"),
    notes: text("notes"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
  },
  (table) => ({
    printIdx: index("collection_items_print_idx").on(table.printId)
  })
);

export const decks = sqliteTable(
  "decks",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    format: text("format").notNull(),
    description: text("description"),
    commanderPrintId: text("commander_print_id").references(() => cardPrintsCache.id),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
    updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
  },
  (table) => ({
    updatedIdx: index("decks_updated_idx").on(table.updatedAt)
  })
);

export const deckEntries = sqliteTable(
  "deck_entries",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    printId: text("print_id")
      .notNull()
      .references(() => cardPrintsCache.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    section: text("section").notNull().default("mainboard"),
    isMaybeboard: integer("is_maybeboard", { mode: "boolean" }).notNull().default(false),
    notes: text("notes")
  },
  (table) => ({
    deckIdx: index("deck_entries_deck_idx").on(table.deckId),
    printIdx: index("deck_entries_print_idx").on(table.printId)
  })
);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color")
});

export const deckTags = sqliteTable(
  "deck_tags",
  {
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.deckId, table.tagId] })
  })
);

export const collectionImportJobs = sqliteTable("collection_import_jobs", {
  id: text("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  status: text("status").notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  matchedRows: integer("matched_rows").notNull().default(0),
  ambiguousRows: integer("ambiguous_rows").notNull().default(0),
  failedRows: integer("failed_rows").notNull().default(0),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  completedAt: text("completed_at")
});

export const collectionImportRows = sqliteTable(
  "collection_import_rows",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => collectionImportJobs.id, { onDelete: "cascade" }),
    original: text("original").notNull(),
    quantity: integer("quantity").notNull().default(1),
    name: text("name").notNull(),
    setCode: text("set_code"),
    collectorNumber: text("collector_number"),
    finish: text("finish"),
    status: text("status").notNull(),
    resolvedPrintId: text("resolved_print_id"),
    errorMessage: text("error_message")
  },
  (table) => ({
    jobIdx: index("collection_import_rows_job_idx").on(table.jobId)
  })
);

