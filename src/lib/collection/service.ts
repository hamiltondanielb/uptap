import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";

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
  deckUsage: Array<{ deckId: string; deckName: string }>;
  itemValue: number | null;
};

function marketValue(priceUsd: number | null, priceUsdFoil: number | null, finish: string, qty: number): number | null {
  const unit = finish === "foil" ? (priceUsdFoil ?? priceUsd) : priceUsd;
  return unit != null ? Math.round(unit * qty * 100) / 100 : null;
}

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
      colors: cardPrintsCache.colorIdentity,
      priceUsd: cardPrintsCache.priceUsd,
      priceUsdFoil: cardPrintsCache.priceUsdFoil
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
  const decksByPrintId = deckUsageRows.reduce<Map<string, Array<{ deckId: string; deckName: string }>>>((acc, row) => {
    const existing = acc.get(row.printId) ?? [];
    if (!existing.some((d) => d.deckId === row.deckId)) {
      existing.push({ deckId: row.deckId, deckName: row.deckName });
    }
    acc.set(row.printId, existing);
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
    deckNames: [...(deckNamesByPrintId.get(row.printId) ?? new Set<string>())].sort((left, right) => left.localeCompare(right)),
    deckUsage: (decksByPrintId.get(row.printId) ?? []).sort((a, b) => a.deckName.localeCompare(b.deckName)),
    itemValue: marketValue(row.priceUsd, row.priceUsdFoil, row.finish, row.quantityTotal)
  })).sort((left, right) => left.name.localeCompare(right.name));

  const valuedItems = items.filter((item) => item.itemValue != null);
  const totalMarketValue = valuedItems.length > 0
    ? Math.round(valuedItems.reduce((sum, item) => sum + item.itemValue!, 0) * 100) / 100
    : null;

  return {
    items,
    summary: {
      ownedPrints: items.length,
      uniqueCards: new Set(items.map((item) => item.oracleId)).size,
      totalCopies: items.reduce((sum, item) => sum + item.quantityTotal, 0),
      availableCopies: items.reduce((sum, item) => sum + item.quantityAvailable, 0),
      totalMarketValue
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

export async function getCollectionBucket(bucketId: string) {
  await initializeAppData();
  const [bucket] = await db.select().from(collectionItems).where(eq(collectionItems.id, bucketId));
  return bucket ?? null;
}

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

export async function getCachedPrintingsByOracle(oracleId: string, excludePrintId: string) {
  await initializeAppData();
  return db
    .select({
      printId: cardPrintsCache.id,
      setCode: cardPrintsCache.setCode,
      setName: cardPrintsCache.setName,
      collectorNumber: cardPrintsCache.collectorNumber,
      imageSmall: cardPrintsCache.imageSmall,
    })
    .from(cardPrintsCache)
    .where(and(eq(cardPrintsCache.oracleId, oracleId), ne(cardPrintsCache.id, excludePrintId)));
}

export async function reassignCollectionPrint(currentPrintId: string, newPrintId: string) {
  await initializeAppData();

  const [newPrint] = await db.select({ id: cardPrintsCache.id }).from(cardPrintsCache).where(eq(cardPrintsCache.id, newPrintId));
  if (!newPrint) {
    throw new Error("Target print is not cached locally.");
  }

  const buckets = await db
    .select({ id: collectionItems.id })
    .from(collectionItems)
    .where(eq(collectionItems.printId, currentPrintId));

  if (buckets.length === 0) {
    throw new Error("No collection items found for the current print.");
  }

  await db
    .update(collectionItems)
    .set({ printId: newPrintId, updatedAt: new Date().toISOString() })
    .where(eq(collectionItems.printId, currentPrintId));

  return { newPrintId, movedBuckets: buckets.length };
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
      oracleId: cardPrintsCache.oracleId,
      imageUrl: cardPrintsCache.imageNormal,
      manaCost: cardPrintsCache.manaCost,
      priceUsd: cardPrintsCache.priceUsd,
      priceUsdFoil: cardPrintsCache.priceUsdFoil,
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

  const usedInDecksRaw = await db
    .select({
      entryId: deckEntries.id,
      deckId: decks.id,
      deckName: decks.name,
      quantity: deckEntries.quantity,
      section: deckEntries.section,
      useCollection: deckEntries.useCollection
    })
    .from(deckEntries)
    .innerJoin(decks, eq(deckEntries.deckId, decks.id))
    .where(eq(deckEntries.printId, printId));

  // Compute oracle-level ownership total (all printings of this card)
  const oracleOwnedRows = await db
    .select({ quantityTotal: collectionItems.quantityTotal })
    .from(collectionItems)
    .innerJoin(cardPrintsCache, eq(collectionItems.printId, cardPrintsCache.id))
    .where(eq(cardPrintsCache.oracleId, print.oracleId));
  const totalOwnedForOracle = oracleOwnedRows.reduce((sum, row) => sum + row.quantityTotal, 0);

  // Compute oracle-level claims from all useCollection=true deck entries
  const oracleAllocationsRaw = await db
    .select({
      deckId: deckEntries.deckId,
      quantity: deckEntries.quantity,
    })
    .from(deckEntries)
    .innerJoin(cardPrintsCache, eq(deckEntries.printId, cardPrintsCache.id))
    .where(and(eq(cardPrintsCache.oracleId, print.oracleId), eq(deckEntries.useCollection, true)));

  // Sum claims per deck (useCollection=true only)
  const allocationByDeck = oracleAllocationsRaw.reduce<Record<string, number>>((acc, row) => {
    acc[row.deckId] = (acc[row.deckId] ?? 0) + row.quantity;
    return acc;
  }, {});
  const totalUseCollectionClaims = Object.values(allocationByDeck).reduce((sum, q) => sum + q, 0);

  const usedInDecks = usedInDecksRaw.map((entry) => {
    // Available = owned minus what OTHER useCollection=true decks claim
    const thisDeckClaim = entry.useCollection ? (allocationByDeck[entry.deckId] ?? 0) : 0;
    const otherDecksClaim = totalUseCollectionClaims - thisDeckClaim;
    const available = Math.max(0, totalOwnedForOracle - otherDecksClaim);
    const shortfall = Math.max(0, entry.quantity - available);

    let status: "covered" | "short" | "in-use" | "want-more" | "unallocated";
    if (!entry.useCollection) {
      status = shortfall > 0 ? "want-more" : "unallocated";
    } else if (shortfall === 0) {
      status = "covered";
    } else if (totalOwnedForOracle >= entry.quantity) {
      status = "in-use";
    } else {
      status = "short";
    }

    return { ...entry, shortfall, status };
  });

  const enrichedBuckets = ownedBuckets
    .map((bucket) => ({
      ...bucket,
      bucketValue: marketValue(print.priceUsd, print.priceUsdFoil, bucket.finish, bucket.quantityTotal)
    }))
    .sort((left, right) => {
      if (left.location !== right.location) {
        return (left.location ?? "").localeCompare(right.location ?? "");
      }
      return left.finish.localeCompare(right.finish);
    });

  const bucketValues = enrichedBuckets.map((b) => b.bucketValue).filter((v): v is number => v != null);
  const totalValue = bucketValues.length > 0
    ? Math.round(bucketValues.reduce((sum, v) => sum + v, 0) * 100) / 100
    : null;

  const otherOwnedBuckets = await db
    .select({
      printId: cardPrintsCache.id,
      setCode: cardPrintsCache.setCode,
      setName: cardPrintsCache.setName,
      collectorNumber: cardPrintsCache.collectorNumber,
      imageSmall: cardPrintsCache.imageSmall,
      quantityTotal: collectionItems.quantityTotal,
      quantityAvailable: collectionItems.quantityAvailable,
    })
    .from(collectionItems)
    .innerJoin(cardPrintsCache, eq(collectionItems.printId, cardPrintsCache.id))
    .where(and(eq(cardPrintsCache.oracleId, print.oracleId), ne(cardPrintsCache.id, printId)));

  const otherPrintingsMap = new Map<string, {
    printId: string; setCode: string; setName: string;
    collectorNumber: string; imageSmall: string | null;
    totalQuantity: number; totalAvailable: number;
  }>();
  for (const row of otherOwnedBuckets) {
    const existing = otherPrintingsMap.get(row.printId);
    if (existing) {
      existing.totalQuantity += row.quantityTotal;
      existing.totalAvailable += row.quantityAvailable;
    } else {
      otherPrintingsMap.set(row.printId, {
        printId: row.printId,
        setCode: row.setCode,
        setName: row.setName,
        collectorNumber: row.collectorNumber,
        imageSmall: row.imageSmall,
        totalQuantity: row.quantityTotal,
        totalAvailable: row.quantityAvailable,
      });
    }
  }
  const otherPrintings = [...otherPrintingsMap.values()]
    .sort((a, b) => a.setCode.localeCompare(b.setCode));

  return {
    print,
    ownedBuckets: enrichedBuckets,
    summary: {
      totalCopies: ownedBuckets.reduce((sum, bucket) => sum + bucket.quantityTotal, 0),
      availableCopies: ownedBuckets.reduce((sum, bucket) => sum + bucket.quantityAvailable, 0),
      bucketCount: ownedBuckets.length,
      totalValue
    },
    usedInDecks,
    otherPrintings
  };
}
