import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";

import { initializeAppData } from "@/lib/db/bootstrap";
import { db } from "@/lib/db/client";
import {
  collectionFilterNeedsDeck,
  normalizeCollectionSnapshotFilters,
  type CollectionSnapshotFilters
} from "@/lib/collection/filters";
import { cardPrintsCache, collectionItems, deckEntries, decks } from "@/lib/db/schema";

export type CollectionListItem = {
  bucketId: string;
  printId: string;
  oracleId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  finish: string;
  condition: string;
  quantityTotal: number;
  quantityAvailable: number;
  location: string | null;
  imageUrl: string | null;
  colors: string[];
  deckNames: string[];
};

function parseArray(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

export async function getCollectionSnapshot(filters: CollectionSnapshotFilters = {}) {
  await initializeAppData();
  const normalized = normalizeCollectionSnapshotFilters(filters);

  const rows = await db
    .select({
      bucketId: collectionItems.id,
      printId: cardPrintsCache.id,
      oracleId: cardPrintsCache.oracleId,
      name: cardPrintsCache.name,
      setCode: cardPrintsCache.setCode,
      setName: cardPrintsCache.setName,
      collectorNumber: cardPrintsCache.collectorNumber,
      finish: collectionItems.finish,
      condition: collectionItems.condition,
      quantityTotal: collectionItems.quantityTotal,
      quantityAvailable: collectionItems.quantityAvailable,
      location: collectionItems.location,
      imageUrl: cardPrintsCache.imageSmall,
      colors: cardPrintsCache.colorIdentity
    })
    .from(collectionItems)
    .innerJoin(cardPrintsCache, eq(collectionItems.printId, cardPrintsCache.id));

  const deckUsageRows = await db
    .select({
      deckId: deckEntries.deckId,
      printId: deckEntries.printId,
      deckName: decks.name
    })
    .from(deckEntries)
    .innerJoin(decks, eq(deckEntries.deckId, decks.id));
  const printIdsInAnyDeck = new Set(deckUsageRows.map((row) => row.printId));
  const selectedDeckPrintIds = new Set(
    deckUsageRows.filter((row) => row.deckId === normalized.deckId).map((row) => row.printId)
  );
  const deckNamesByPrintId = deckUsageRows.reduce<Map<string, Set<string>>>((acc, row) => {
    const names = acc.get(row.printId) ?? new Set<string>();
    names.add(row.deckName);
    acc.set(row.printId, names);
    return acc;
  }, new Map());
  const canApplySelectedDeckFilter = collectionFilterNeedsDeck(normalized.deckFilterMode) && Boolean(normalized.deckId);

  const filtered = rows.filter((row) => {
    const matchesDeckFilter = (() => {
      switch (normalized.deckFilterMode) {
        case "in_deck":
          return canApplySelectedDeckFilter ? selectedDeckPrintIds.has(row.printId) : true;
        case "not_in_deck":
          return canApplySelectedDeckFilter ? !selectedDeckPrintIds.has(row.printId) : true;
        case "not_in_any_deck":
          return !printIdsInAnyDeck.has(row.printId);
        default:
          return true;
      }
    })();

    if (!matchesDeckFilter) {
      return false;
    }

    if (!normalized.query) {
      return true;
    }

    const needle = normalized.query.toLowerCase();
    return `${row.name} ${row.setCode} ${row.setName} ${row.collectorNumber}`.toLowerCase().includes(needle);
  });

  const items: CollectionListItem[] = filtered.map((row) => ({
    ...row,
    colors: parseArray(row.colors),
    deckNames: [...(deckNamesByPrintId.get(row.printId) ?? new Set<string>())].sort((left, right) => left.localeCompare(right))
  })).sort((left, right) => left.name.localeCompare(right.name));

  return {
    items,
    summary: {
      ownedPrints: items.length,
      uniqueCards: new Set(items.map((item) => item.oracleId)).size,
      totalCopies: items.reduce((sum, item) => sum + item.quantityTotal, 0),
      availableCopies: items.reduce((sum, item) => sum + item.quantityAvailable, 0)
    }
  };
}

export const collectionFinishes = ["nonfoil", "foil", "etched"] as const;
export const collectionConditions = [
  "mint",
  "near_mint",
  "lightly_played",
  "moderately_played",
  "heavily_played",
  "damaged"
] as const;

export async function updateCollectionBucket(input: {
  bucketId: string;
  quantityTotal: number;
  quantityAvailable: number;
  finish: string;
  condition: string;
  location: string;
}) {
  await initializeAppData();

  const [bucket] = await db.select().from(collectionItems).where(eq(collectionItems.id, input.bucketId));
  if (!bucket) {
    throw new Error("Collection bucket not found.");
  }

  const quantityTotal = Math.max(0, Math.floor(input.quantityTotal));
  const quantityAvailable = Math.max(0, Math.min(Math.floor(input.quantityAvailable), quantityTotal));
  const finish = collectionFinishes.includes(input.finish as (typeof collectionFinishes)[number])
    ? input.finish
    : bucket.finish;
  const condition = collectionConditions.includes(input.condition as (typeof collectionConditions)[number])
    ? input.condition
    : bucket.condition;
  const location = input.location.trim() || null;

  if (quantityTotal === 0) {
    await db.delete(collectionItems).where(eq(collectionItems.id, input.bucketId));
    const remainingBuckets = await db
      .select({ id: collectionItems.id })
      .from(collectionItems)
      .where(eq(collectionItems.printId, bucket.printId));
    return {
      printId: bucket.printId,
      deleted: true,
      printStillOwned: remainingBuckets.length > 0
    };
  }

  await db
    .update(collectionItems)
    .set({
      quantityTotal,
      quantityAvailable,
      finish,
      condition,
      location,
      updatedAt: new Date().toISOString()
    })
    .where(eq(collectionItems.id, input.bucketId));

  return {
    printId: bucket.printId,
    deleted: false,
    printStillOwned: true
  };
}

export async function addCollectionBucketFromPrint(input: {
  printId: string;
  quantity: number;
  finish: string;
  condition: string;
  location: string;
}) {
  await initializeAppData();

  const quantity = Math.max(1, Math.floor(input.quantity));
  const finish = collectionFinishes.includes(input.finish as (typeof collectionFinishes)[number])
    ? input.finish
    : "nonfoil";
  const condition = collectionConditions.includes(input.condition as (typeof collectionConditions)[number])
    ? input.condition
    : "near_mint";
  const location = input.location.trim() || null;

  const [print] = await db.select().from(cardPrintsCache).where(eq(cardPrintsCache.id, input.printId));
  if (!print) {
    throw new Error("Print is not cached locally.");
  }

  const existingCandidates = await db
    .select()
    .from(collectionItems)
    .where(eq(collectionItems.printId, input.printId));
  const existing = existingCandidates.find(
    (item) => item.finish === finish && item.condition === condition && (item.location ?? null) === location
  );

  if (existing) {
    await db
      .update(collectionItems)
      .set({
        quantityTotal: existing.quantityTotal + quantity,
        quantityAvailable: existing.quantityAvailable + quantity,
        updatedAt: new Date().toISOString()
      })
      .where(eq(collectionItems.id, existing.id));
  } else {
    await db.insert(collectionItems).values({
      id: randomUUID(),
      printId: input.printId,
      quantityTotal: quantity,
      quantityAvailable: quantity,
      finish,
      condition,
      location
    });
  }

  return {
    printId: input.printId
  };
}

export async function deleteCollectionPrint(printId: string) {
  await initializeAppData();

  const buckets = await db
    .select({
      id: collectionItems.id
    })
    .from(collectionItems)
    .where(eq(collectionItems.printId, printId));

  if (buckets.length === 0) {
    throw new Error("Collection print not found.");
  }

  await db.delete(collectionItems).where(eq(collectionItems.printId, printId));

  return {
    printId,
    deletedBuckets: buckets.length
  };
}

export async function deleteCollectionBuckets(bucketIds: string[]) {
  await initializeAppData();

  const uniqueBucketIds = [...new Set(bucketIds.map((bucketId) => bucketId.trim()).filter(Boolean))];
  if (uniqueBucketIds.length === 0) {
    throw new Error("No collection rows selected.");
  }

  const buckets = await db
    .select({
      id: collectionItems.id,
      printId: collectionItems.printId
    })
    .from(collectionItems)
    .where(inArray(collectionItems.id, uniqueBucketIds));

  if (buckets.length === 0) {
    throw new Error("Selected collection rows were not found.");
  }

  await db.delete(collectionItems).where(inArray(collectionItems.id, buckets.map((bucket) => bucket.id)));

  return {
    deletedBuckets: buckets.length,
    printIds: [...new Set(buckets.map((bucket) => bucket.printId))]
  };
}

export async function getCollectionPrintDetail(printId: string) {
  await initializeAppData();

  const [print] = await db
    .select({
      printId: cardPrintsCache.id,
      name: cardPrintsCache.name,
      setCode: cardPrintsCache.setCode,
      setName: cardPrintsCache.setName,
      collectorNumber: cardPrintsCache.collectorNumber,
      typeLine: cardPrintsCache.typeLine,
      oracleText: cardPrintsCache.oracleText,
      imageUrl: cardPrintsCache.imageNormal,
      manaCost: cardPrintsCache.manaCost,
    })
    .from(cardPrintsCache)
    .where(eq(cardPrintsCache.id, printId));

  if (!print) {
    return null;
  }

  const ownedBuckets = await db
    .select({
      id: collectionItems.id,
      finish: collectionItems.finish,
      condition: collectionItems.condition,
      quantityTotal: collectionItems.quantityTotal,
      quantityAvailable: collectionItems.quantityAvailable,
      location: collectionItems.location,
      notes: collectionItems.notes
    })
    .from(collectionItems)
    .where(eq(collectionItems.printId, printId));

  if (ownedBuckets.length === 0) {
    return null;
  }

  const usedInDecks = await db
    .select({
      deckId: decks.id,
      deckName: decks.name,
      quantity: deckEntries.quantity,
      section: deckEntries.section
    })
    .from(deckEntries)
    .innerJoin(decks, eq(deckEntries.deckId, decks.id))
    .where(eq(deckEntries.printId, printId));

  return {
    print,
    ownedBuckets: ownedBuckets.sort((left, right) => {
      if (left.location !== right.location) {
        return (left.location ?? "").localeCompare(right.location ?? "");
      }

      return left.finish.localeCompare(right.finish);
    }),
    summary: {
      totalCopies: ownedBuckets.reduce((sum, bucket) => sum + bucket.quantityTotal, 0),
      availableCopies: ownedBuckets.reduce((sum, bucket) => sum + bucket.quantityAvailable, 0),
      bucketCount: ownedBuckets.length
    },
    usedInDecks
  };
}
