import { randomUUID } from "node:crypto";

import { asc, desc, eq, inArray } from "drizzle-orm";

import { initializeAppData } from "@/lib/db/bootstrap";
import { db } from "@/lib/db/client";
import { cardPrintsCache, collectionItems, deckEntries, deckTags, decks, tags } from "@/lib/db/schema";

export const deckFormats = ["Commander", "Modern", "Legacy", "Pioneer", "Standard", "Cube"] as const;
export const deckSections = ["commanders", "mainboard", "sideboard", "maybeboard", "tokens", "considering"] as const;
const analyticsSections = new Set(["commanders", "mainboard", "sideboard"]);
const manaCurveBuckets = [
  { label: "0", min: 0, max: 0 },
  { label: "1", min: 1, max: 1 },
  { label: "2", min: 2, max: 2 },
  { label: "3", min: 3, max: 3 },
  { label: "4", min: 4, max: 4 },
  { label: "5", min: 5, max: 5 },
  { label: "6", min: 6, max: 6 },
  { label: "7+", min: 7, max: Number.POSITIVE_INFINITY }
] as const;
const manaColors = ["W", "U", "B", "R", "G"] as const;

type AvailabilityMap = Record<string, { total: number; available: number }>;

type ParsedDeckPasteRow = {
  lineNumber: number;
  original: string;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  section?: string;
};

export type DeckBulkPastePreview = {
  matchedRows: Array<{
    lineNumber: number;
    original: string;
    quantity: number;
    selectedPrintId: string;
    name: string;
    setCode?: string;
    collectorNumber?: string;
    candidatePrints: Array<{
      id: string;
      name: string;
      setCode: string;
      setName: string;
      collectorNumber: string;
      imageUrl: string | null;
      owned: number;
      available: number;
      quantityInDeck: number;
    }>;
    matchSource: "deck" | "collection" | "cached";
    section?: string;
  }>;
  unmatchedRows: Array<{
    lineNumber: number;
    original: string;
    quantity: number;
    name: string;
    setCode?: string;
    collectorNumber?: string;
    reason: string;
    section?: string;
  }>;
  summary: {
    parsedRows: number;
    matchedRows: number;
    unmatchedRows: number;
    matchedCards: number;
    unmatchedCards: number;
  };
};

function buildAvailabilityMap(items: Array<(typeof collectionItems.$inferSelect)>) {
  return items.reduce<AvailabilityMap>((acc, item) => {
    if (!acc[item.printId]) {
      acc[item.printId] = {
        total: 0,
        available: 0
      };
    }

    acc[item.printId].total += item.quantityTotal;
    acc[item.printId].available += item.quantityAvailable;
    return acc;
  }, {});
}

async function getAvailabilityMap() {
  const items = await db.select().from(collectionItems);
  return buildAvailabilityMap(items);
}

function parseColors(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

const SECTION_HEADER_RE = /^(commanders?|mainboard|sideboard|maybeboard|tokens?|considering):?\s*$/i;
const SECTION_NORMALIZE: Record<string, string> = { commander: "commanders", token: "tokens" };

function parseDeckPaste(raw: string): ParsedDeckPasteRow[] {
  const lines = raw.split(/\r?\n/);
  const rows: ParsedDeckPasteRow[] = [];
  let currentSection: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const original = (lines[i] ?? "").trim();
    if (!original) continue;

    const headerMatch = original.match(SECTION_HEADER_RE);
    if (headerMatch) {
      const key = (headerMatch[1] ?? "").toLowerCase();
      currentSection = SECTION_NORMALIZE[key] ?? key;
      continue;
    }

    const parts = original.split("|").map((part) => part.trim());
    const lead = parts[0] ?? "";
    const match = lead.match(/^(\d+)x?\s+(.+)$/i);
    const quantity = match ? Number.parseInt(match[1] ?? "1", 10) : 1;
    const name = match ? match[2] ?? lead : lead;

    rows.push({
      lineNumber: i + 1,
      original,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      name,
      setCode: parts[1] ? parts[1].toUpperCase() : undefined,
      collectorNumber: parts[2] || undefined,
      section: currentSection
    });
  }

  return rows;
}

function matchesDeckPasteRow(
  row: Pick<ParsedDeckPasteRow, "name" | "setCode" | "collectorNumber">,
  print: Pick<(typeof cardPrintsCache.$inferSelect), "name" | "setCode" | "collectorNumber">
) {
  if (normalizeName(row.name) !== normalizeName(print.name)) {
    return false;
  }

  if (row.setCode && row.setCode !== print.setCode.toUpperCase()) {
    return false;
  }

  if (row.collectorNumber && row.collectorNumber !== print.collectorNumber) {
    return false;
  }

  return true;
}

function mapPreviewCandidate(
  print: typeof cardPrintsCache.$inferSelect,
  availability: AvailabilityMap,
  quantityInDeck: Record<string, number>
) {
  return {
    id: print.id,
    name: print.name,
    setCode: print.setCode,
    setName: print.setName,
    collectorNumber: print.collectorNumber,
    imageUrl: print.imageSmall,
    owned: availability[print.id]?.total ?? 0,
    available: availability[print.id]?.available ?? 0,
    quantityInDeck: quantityInDeck[print.id] ?? 0
  };
}

function isLand(typeLine: string | null) {
  return typeLine?.includes("Land") ?? false;
}

function countManaPips(manaCost: string | null, quantity: number) {
  const totals = Object.fromEntries(manaColors.map((color) => [color, 0])) as Record<(typeof manaColors)[number], number>;

  if (!manaCost) {
    return totals;
  }

  const matches = manaCost.matchAll(/\{([^}]+)\}/g);
  for (const match of matches) {
    const symbols = match[1]?.toUpperCase().split("/") ?? [];

    for (const symbol of symbols) {
      if (manaColors.includes(symbol as (typeof manaColors)[number])) {
        totals[symbol as (typeof manaColors)[number]] += quantity;
      }
    }
  }

  return totals;
}

export async function getDeckSummaries() {
  await initializeAppData();

  const availability = await getAvailabilityMap();
  const deckRows = await db.select().from(decks).orderBy(desc(decks.updatedAt));
  const entries = await db
    .select({
      deckId: deckEntries.deckId,
      printId: deckEntries.printId,
      quantity: deckEntries.quantity,
      colorIdentity: cardPrintsCache.colorIdentity
    })
    .from(deckEntries)
    .leftJoin(cardPrintsCache, eq(deckEntries.printId, cardPrintsCache.id));
  const tagRows = await db
    .select({
      deckId: deckTags.deckId,
      name: tags.name
    })
    .from(deckTags)
    .innerJoin(tags, eq(deckTags.tagId, tags.id));

  return deckRows.map((deck) => {
    const deckEntriesForDeck = entries.filter((entry) => entry.deckId === deck.id);
    const shortfall = deckEntriesForDeck.reduce((sum, entry) => {
      const available = availability[entry.printId]?.available ?? 0;
      return sum + Math.max(entry.quantity - available, 0);
    }, 0);

    const colorSet = new Set<string>();
    for (const entry of deckEntriesForDeck) {
      for (const color of parseColors(entry.colorIdentity)) {
        colorSet.add(color);
      }
    }
    const wubrg = ["W", "U", "B", "R", "G"];
    const colorIdentity = wubrg.filter((c) => colorSet.has(c));

    return {
      ...deck,
      totalCards: deckEntriesForDeck.reduce((sum, entry) => sum + entry.quantity, 0),
      shortfall,
      tags: tagRows.filter((tag) => tag.deckId === deck.id).map((tag) => tag.name),
      colorIdentity
    };
  });
}

export async function getDeckDetail(deckId: string) {
  await initializeAppData();

  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId));
  if (!deck) {
    return null;
  }

  const availability = await getAvailabilityMap();
  const entries = await db
    .select({
      id: deckEntries.id,
      quantity: deckEntries.quantity,
      section: deckEntries.section,
      notes: deckEntries.notes,
      printId: cardPrintsCache.id,
      name: cardPrintsCache.name,
      setCode: cardPrintsCache.setCode,
      collectorNumber: cardPrintsCache.collectorNumber,
      manaCost: cardPrintsCache.manaCost,
      cmc: cardPrintsCache.cmc,
      imageUrl: cardPrintsCache.imageSmall,
      typeLine: cardPrintsCache.typeLine,
      colorIdentity: cardPrintsCache.colorIdentity
    })
    .from(deckEntries)
    .innerJoin(cardPrintsCache, eq(deckEntries.printId, cardPrintsCache.id))
    .where(eq(deckEntries.deckId, deckId));

  const tagsForDeck = await db
    .select({
      id: tags.id,
      name: tags.name
    })
    .from(deckTags)
    .innerJoin(tags, eq(deckTags.tagId, tags.id))
    .where(eq(deckTags.deckId, deckId));

  const commander = deck.commanderPrintId
    ? (await db.select().from(cardPrintsCache).where(eq(cardPrintsCache.id, deck.commanderPrintId)))[0] ?? null
    : null;

  const enrichedEntries = entries
    .map((entry) => ({
      ...entry,
      colors: parseColors(entry.colorIdentity),
      owned: availability[entry.printId]?.total ?? 0,
      available: availability[entry.printId]?.available ?? 0,
      shortfall: Math.max(entry.quantity - (availability[entry.printId]?.available ?? 0), 0)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const analyticsEntries = [...enrichedEntries];
  if (commander && !analyticsEntries.some((entry) => entry.printId === commander.id && entry.section === "commanders")) {
    analyticsEntries.unshift({
      id: `commander:${commander.id}`,
      quantity: 1,
      section: "commanders",
      notes: null,
      printId: commander.id,
      name: commander.name,
      setCode: commander.setCode,
      collectorNumber: commander.collectorNumber,
      manaCost: commander.manaCost,
      cmc: commander.cmc,
      imageUrl: commander.imageSmall,
      typeLine: commander.typeLine,
      colorIdentity: commander.colorIdentity,
      colors: parseColors(commander.colorIdentity),
      owned: availability[commander.id]?.total ?? 0,
      available: availability[commander.id]?.available ?? 0,
      shortfall: Math.max(1 - (availability[commander.id]?.available ?? 0), 0)
    });
  }

  const analyticsTrackedEntries = analyticsEntries.filter((entry) => analyticsSections.has(entry.section));
  const spellEntries = analyticsTrackedEntries.filter((entry) => !isLand(entry.typeLine));
  const landCount = analyticsTrackedEntries
    .filter((entry) => isLand(entry.typeLine))
    .reduce((sum, entry) => sum + entry.quantity, 0);
  const spellCount = spellEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalSpellCmc = spellEntries.reduce((sum, entry) => sum + (entry.cmc ?? 0) * entry.quantity, 0);

  const manaCurve = manaCurveBuckets.map((bucket) => ({
    label: bucket.label,
    cards: spellEntries.reduce((sum, entry) => {
      const cmc = entry.cmc ?? 0;
      return cmc >= bucket.min && cmc <= bucket.max ? sum + entry.quantity : sum;
    }, 0)
  }));

  const manaPips = manaColors.map((color) => ({
    color,
    count: spellEntries.reduce((sum, entry) => sum + countManaPips(entry.manaCost, entry.quantity)[color], 0)
  }));

  const colorBreakdown = [
    ...manaColors.map((color) => ({
      color,
      cards: analyticsTrackedEntries.reduce(
        (sum, entry) => sum + (entry.colors.includes(color) ? entry.quantity : 0),
        0
      )
    })),
    {
      color: "C",
      cards: analyticsTrackedEntries.reduce((sum, entry) => sum + (entry.colors.length === 0 ? entry.quantity : 0), 0)
    }
  ];

  const sectionTotals = deckSections.map((section) => {
    const entriesForSection = analyticsEntries.filter((entry) => entry.section === section);

    return {
      section,
      cards: entriesForSection.reduce((sum, entry) => sum + entry.quantity, 0),
      uniquePrints: entriesForSection.length
    };
  });

  return {
    deck,
    commander,
    entries: enrichedEntries,
    groupedEntries: deckSections.map((section) => ({
      section,
      entries: enrichedEntries.filter((entry) => entry.section === section)
    })),
    tags: tagsForDeck,
    summary: {
      totalCards: enrichedEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      uniquePrints: enrichedEntries.length,
      shortfall: enrichedEntries.reduce((sum, entry) => sum + entry.shortfall, 0)
    },
    analytics: {
      trackedCards: analyticsTrackedEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      spellCount,
      landCount,
      averageSpellCmc: spellCount > 0 ? Number((totalSpellCmc / spellCount).toFixed(2)) : null,
      sectionTotals,
      manaCurve,
      manaPips,
      colorBreakdown
    }
  };
}

export async function searchCachedPrints(query: string, deckId?: string) {
  await initializeAppData();

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }

  const availability = await getAvailabilityMap();
  const prints = await db.select().from(cardPrintsCache).orderBy(asc(cardPrintsCache.name));
  const currentDeckEntries = deckId
    ? await db
        .select({
          printId: deckEntries.printId,
          quantity: deckEntries.quantity
        })
        .from(deckEntries)
        .where(eq(deckEntries.deckId, deckId))
    : [];

  const quantityInDeck = currentDeckEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.printId] = (acc[entry.printId] ?? 0) + entry.quantity;
    return acc;
  }, {});

  return prints
    .filter((print) =>
      `${print.name} ${print.setCode} ${print.setName} ${print.collectorNumber}`.toLowerCase().includes(trimmed)
    )
    .slice(0, 18)
    .map((print) => ({
      id: print.id,
      name: print.name,
      setCode: print.setCode,
      setName: print.setName,
      collectorNumber: print.collectorNumber,
      imageUrl: print.imageSmall,
      imageNormal: print.imageNormal,
      typeLine: print.typeLine,
      manaCost: print.manaCost,
      colors: parseColors(print.colorIdentity),
      owned: availability[print.id]?.total ?? 0,
      available: availability[print.id]?.available ?? 0,
      quantityInDeck: quantityInDeck[print.id] ?? 0
    }));
}

export async function previewDeckBulkPaste(input: { deckId: string; raw: string }): Promise<DeckBulkPastePreview> {
  await initializeAppData();

  const parsedRows = parseDeckPaste(input.raw);
  if (parsedRows.length === 0) {
    throw new Error("Paste at least one card line.");
  }

  const availability = await getAvailabilityMap();
  const prints = await db.select().from(cardPrintsCache).orderBy(asc(cardPrintsCache.name));
  const currentDeckEntries = await db
    .select({
      printId: deckEntries.printId,
      quantity: deckEntries.quantity
    })
    .from(deckEntries)
    .where(eq(deckEntries.deckId, input.deckId));

  const quantityInDeck = currentDeckEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.printId] = (acc[entry.printId] ?? 0) + entry.quantity;
    return acc;
  }, {});

  const matchedRows: DeckBulkPastePreview["matchedRows"] = [];
  const unmatchedRows: DeckBulkPastePreview["unmatchedRows"] = [];

  for (const row of parsedRows) {
    const candidates = prints.filter((print) => matchesDeckPasteRow(row, print));
    const deckMatches = candidates.filter((print) => (quantityInDeck[print.id] ?? 0) > 0);
    const collectionMatches = candidates.filter((print) => (availability[print.id]?.total ?? 0) > 0);

    if (deckMatches.length > 0) {
      matchedRows.push({
        lineNumber: row.lineNumber,
        original: row.original,
        quantity: row.quantity,
        selectedPrintId: deckMatches[0]?.id ?? "",
        name: row.name,
        setCode: row.setCode,
        collectorNumber: row.collectorNumber,
        candidatePrints: deckMatches.map((print) => mapPreviewCandidate(print, availability, quantityInDeck)),
        matchSource: "deck",
        section: row.section
      });
      continue;
    }

    if (collectionMatches.length > 0) {
      matchedRows.push({
        lineNumber: row.lineNumber,
        original: row.original,
        quantity: row.quantity,
        selectedPrintId: collectionMatches[0]?.id ?? "",
        name: row.name,
        setCode: row.setCode,
        collectorNumber: row.collectorNumber,
        candidatePrints: collectionMatches.map((print) => mapPreviewCandidate(print, availability, quantityInDeck)),
        matchSource: "collection",
        section: row.section
      });
      continue;
    }

    if (candidates.length > 0) {
      matchedRows.push({
        lineNumber: row.lineNumber,
        original: row.original,
        quantity: row.quantity,
        selectedPrintId: candidates[0]?.id ?? "",
        name: row.name,
        setCode: row.setCode,
        collectorNumber: row.collectorNumber,
        candidatePrints: candidates.map((print) => mapPreviewCandidate(print, availability, quantityInDeck)),
        matchSource: "cached",
        section: row.section
      });
      continue;
    }

    unmatchedRows.push({
      lineNumber: row.lineNumber,
      original: row.original,
      quantity: row.quantity,
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber,
      reason: "Not found in your local collection cache.",
      section: row.section
    });
  }

  return {
    matchedRows,
    unmatchedRows,
    summary: {
      parsedRows: parsedRows.length,
      matchedRows: matchedRows.length,
      unmatchedRows: unmatchedRows.length,
      matchedCards: matchedRows.reduce((sum, row) => sum + row.quantity, 0),
      unmatchedCards: unmatchedRows.reduce((sum, row) => sum + row.quantity, 0)
    }
  };
}

export async function createDeck(input: {
  name: string;
  format: string;
  description: string;
  commanderPrintId?: string;
}) {
  await initializeAppData();

  const deckId = randomUUID();
  await db.insert(decks).values({
    id: deckId,
    name: input.name.trim(),
    format: input.format.trim(),
    description: input.description.trim() || null,
    commanderPrintId: input.commanderPrintId || null
  });

  return deckId;
}

export async function deleteDeck(input: { deckId: string }) {
  await initializeAppData();

  const [deck] = await db.select().from(decks).where(eq(decks.id, input.deckId));
  if (!deck) {
    throw new Error("Deck not found.");
  }

  await db.delete(decks).where(eq(decks.id, input.deckId));

  return {
    deckId: deck.id,
    deckName: deck.name
  };
}

export async function updateDeckNotes(input: { deckId: string; notes: string }) {
  await initializeAppData();

  await db.update(decks).set({ notes: input.notes || null }).where(eq(decks.id, input.deckId));
}

export async function updateDeckMeta(input: {
  deckId: string;
  name: string;
  format: string;
  description: string;
  commanderPrintId?: string;
}) {
  await initializeAppData();

  await db
    .update(decks)
    .set({
      name: input.name.trim(),
      format: input.format.trim(),
      description: input.description.trim() || null,
      commanderPrintId: input.commanderPrintId || null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(decks.id, input.deckId));
}

export async function setDeckCommander(input: { deckId: string; commanderPrintId?: string | null }) {
  await initializeAppData();

  await db
    .update(decks)
    .set({
      commanderPrintId: input.commanderPrintId || null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(decks.id, input.deckId));
}

export async function addDeckEntry(input: {
  deckId: string;
  printId: string;
  quantity: number;
  section: string;
}) {
  await initializeAppData();

  const existing = await db
    .select()
    .from(deckEntries)
    .where(eq(deckEntries.deckId, input.deckId));
  const match = existing.find((entry) => entry.printId === input.printId && entry.section === input.section);

  if (match) {
    await db
      .update(deckEntries)
      .set({
        quantity: match.quantity + input.quantity
      })
      .where(eq(deckEntries.id, match.id));
  } else {
    await db.insert(deckEntries).values({
      id: randomUUID(),
      deckId: input.deckId,
      printId: input.printId,
      quantity: input.quantity,
      section: input.section
    });
  }

  await db
    .update(decks)
    .set({
      updatedAt: new Date().toISOString()
    })
    .where(eq(decks.id, input.deckId));
}

export async function commitDeckBulkPaste(input: {
  deckId: string;
  section: string;
  matchedRows: Array<{ printId: string; quantity: number; section?: string }>;
}) {
  await initializeAppData();

  if (!deckSections.includes(input.section as (typeof deckSections)[number])) {
    throw new Error("Choose a valid section.");
  }

  const normalizedRows = input.matchedRows
    .map((row) => {
      const resolvedSection = row.section ?? input.section;
      if (!deckSections.includes(resolvedSection as (typeof deckSections)[number])) {
        return null;
      }
      return {
        printId: row.printId,
        quantity: Number.isFinite(row.quantity) && row.quantity > 0 ? Math.floor(row.quantity) : 0,
        section: resolvedSection
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && row.printId !== "" && row.quantity > 0);

  if (normalizedRows.length === 0) {
    throw new Error("No matched rows to add.");
  }

  const uniquePrintIds = [...new Set(normalizedRows.map((row) => row.printId))];
  const existingPrints = await db
    .select({ id: cardPrintsCache.id })
    .from(cardPrintsCache)
    .where(inArray(cardPrintsCache.id, uniquePrintIds));

  if (existingPrints.length !== uniquePrintIds.length) {
    throw new Error("One or more matched prints are no longer cached.");
  }

  const quantitiesByPrintAndSection = normalizedRows.reduce<Record<string, number>>((acc, row) => {
    const key = `${row.printId}::${row.section}`;
    acc[key] = (acc[key] ?? 0) + row.quantity;
    return acc;
  }, {});

  const existingEntries = await db
    .select()
    .from(deckEntries)
    .where(eq(deckEntries.deckId, input.deckId));

  for (const [key, quantity] of Object.entries(quantitiesByPrintAndSection)) {
    const [printId, section] = key.split("::") as [string, string];
    const existingEntry = existingEntries.find((entry) => entry.printId === printId && entry.section === section);

    if (existingEntry) {
      await db
        .update(deckEntries)
        .set({
          quantity: existingEntry.quantity + quantity
        })
        .where(eq(deckEntries.id, existingEntry.id));
      continue;
    }

    await db.insert(deckEntries).values({
      id: randomUUID(),
      deckId: input.deckId,
      printId,
      quantity,
      section
    });
  }

  await db
    .update(decks)
    .set({
      updatedAt: new Date().toISOString()
    })
    .where(eq(decks.id, input.deckId));

  return {
    addedRows: normalizedRows.length,
    addedCards: normalizedRows.reduce((sum, row) => sum + row.quantity, 0)
  };
}

export async function setDeckEntryQuantity(input: { deckId: string; entryId: string; quantity: number }) {
  await initializeAppData();

  if (input.quantity <= 0) {
    await db.delete(deckEntries).where(eq(deckEntries.id, input.entryId));
  } else {
    await db.update(deckEntries).set({ quantity: input.quantity }).where(eq(deckEntries.id, input.entryId));
  }

  await db
    .update(decks)
    .set({
      updatedAt: new Date().toISOString()
    })
    .where(eq(decks.id, input.deckId));
}

export async function updateDeckEntrySection(input: { deckId: string; entryId: string; section: string }) {
  await initializeAppData();

  await db.update(deckEntries).set({ section: input.section }).where(eq(deckEntries.id, input.entryId));
  await db
    .update(decks)
    .set({
      updatedAt: new Date().toISOString()
    })
    .where(eq(decks.id, input.deckId));
}

export async function removeDeckEntry(input: { deckId: string; entryId: string }) {
  await initializeAppData();

  await db.delete(deckEntries).where(eq(deckEntries.id, input.entryId));
  await db
    .update(decks)
    .set({
      updatedAt: new Date().toISOString()
    })
    .where(eq(decks.id, input.deckId));
}
