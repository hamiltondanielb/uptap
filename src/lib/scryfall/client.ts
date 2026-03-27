import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cardPrintsCache } from "@/lib/db/schema";

const bulkCollectionResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      prices: z
        .object({
          usd: z.string().nullable().optional(),
          usd_foil: z.string().nullable().optional()
        })
        .partial()
        .nullable()
        .optional()
    })
  ),
  not_found: z.array(z.unknown()).optional()
});

const printSchema = z.object({
  id: z.string(),
  oracle_id: z.string(),
  name: z.string(),
  set: z.string(),
  set_name: z.string(),
  collector_number: z.string(),
  rarity: z.string(),
  lang: z.string(),
  released_at: z.string().nullable().optional(),
  mana_cost: z.string().nullable().optional(),
  type_line: z.string().nullable().optional(),
  oracle_text: z.string().nullable().optional(),
  colors: z.array(z.string()).nullable().optional(),
  color_identity: z.array(z.string()).nullable().optional(),
  cmc: z.number().nullable().optional(),
  layout: z.string().optional(),
  image_uris: z
    .object({
      small: z.string().url().optional(),
      normal: z.string().url().optional()
    })
    .partial()
    .nullable()
    .optional(),
  prices: z
    .object({
      usd: z.string().nullable().optional(),
      usd_foil: z.string().nullable().optional()
    })
    .partial()
    .nullable()
    .optional()
});

const searchResponseSchema = z.object({
  data: z.array(printSchema)
});

export type ScryfallSearchResult = {
  id: string;
  oracleId: string;
  name: string;
  set: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string | null;
  imageNormalUrl: string | null;
  priceUsd: string | null;
  priceUsdFoil: string | null;
  rarity: string;
  lang: string;
  releasedAt: string | null;
  manaCost: string | null;
  typeLine: string | null;
  oracleText: string | null;
  colors: string[];
  colorIdentity: string[];
  cmc: number | null;
  layout: string;
};

export async function searchCardPrints(query: string): Promise<{ results: ScryfallSearchResult[]; error?: string }> {
  if (!query.trim()) {
    return { results: [] };
  }

  try {
    const response = await fetch(`https://api.scryfall.com/cards/search?unique=prints&q=${encodeURIComponent(query)}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return { results: [], error: `Scryfall returned ${response.status}.` };
    }

    const parsed = searchResponseSchema.parse(await response.json());

    return {
      results: parsed.data.map((item) => ({
        id: item.id,
        oracleId: item.oracle_id,
        name: item.name,
        set: item.set.toUpperCase(),
        setName: item.set_name,
        collectorNumber: item.collector_number,
        imageUrl: item.image_uris?.small ?? null,
        imageNormalUrl: item.image_uris?.normal ?? null,
        priceUsd: item.prices?.usd ?? null,
        priceUsdFoil: item.prices?.usd_foil ?? null,
        rarity: item.rarity,
        lang: item.lang,
        releasedAt: item.released_at ?? null,
        manaCost: item.mana_cost ?? null,
        typeLine: item.type_line ?? null,
        oracleText: item.oracle_text ?? null,
        colors: item.colors ?? [],
        colorIdentity: item.color_identity ?? [],
        cmc: item.cmc ?? null,
        layout: item.layout ?? "normal"
      }))
    };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : "Unable to reach Scryfall from this environment."
    };
  }
}

export async function refreshSinglePrintPrice(printId: string): Promise<{ updated: number; notFound: number }> {
  try {
    const response = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: [{ id: printId }] }),
      cache: "no-store"
    });

    if (!response.ok) {
      return { updated: 0, notFound: 0 };
    }

    const parsed = bulkCollectionResponseSchema.parse(await response.json());
    const notFound = parsed.not_found?.length ?? 0;
    const now = new Date().toISOString();

    for (const card of parsed.data) {
      await db
        .update(cardPrintsCache)
        .set({
          priceUsd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
          priceUsdFoil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
          scryfallUpdatedAt: now
        })
        .where(eq(cardPrintsCache.id, card.id));
    }

    return { updated: parsed.data.length, notFound };
  } catch {
    return { updated: 0, notFound: 0 };
  }
}

export async function refreshCachedPrices(): Promise<{ updated: number; notFound: number; errors: string[] }> {
  const rows = await db.select({ id: cardPrintsCache.id }).from(cardPrintsCache);
  const ids = rows.map((r) => r.id);

  const BATCH_SIZE = 75;
  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: batch.map((id) => ({ id })) }),
        cache: "no-store"
      });

      if (!response.ok) {
        errors.push(`Scryfall returned ${response.status} for batch starting at index ${i}.`);
        continue;
      }

      const parsed = bulkCollectionResponseSchema.parse(await response.json());
      notFound += parsed.not_found?.length ?? 0;

      const now = new Date().toISOString();
      for (const card of parsed.data) {
        await db
          .update(cardPrintsCache)
          .set({
            priceUsd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
            priceUsdFoil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
            scryfallUpdatedAt: now
          })
          .where(eq(cardPrintsCache.id, card.id));
        updated++;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown error processing batch.");
    }
  }

  return { updated, notFound, errors };
}

export async function cacheScryfallPrints(results: ScryfallSearchResult[]) {
  for (const result of results) {
    const payload = {
      id: result.id,
      oracleId: result.oracleId,
      name: result.name,
      setCode: result.set,
      setName: result.setName,
      collectorNumber: result.collectorNumber,
      rarity: result.rarity,
      lang: result.lang,
      releasedAt: result.releasedAt,
      imageSmall: result.imageUrl,
      imageNormal: result.imageNormalUrl,
      manaCost: result.manaCost,
      typeLine: result.typeLine,
      oracleText: result.oracleText,
      colors: JSON.stringify(result.colors),
      colorIdentity: JSON.stringify(result.colorIdentity),
      cmc: result.cmc,
      priceUsd: result.priceUsd ? parseFloat(result.priceUsd) : null,
      priceUsdFoil: result.priceUsdFoil ? parseFloat(result.priceUsdFoil) : null,
      layout: result.layout,
      scryfallUpdatedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString()
    };

    const [existing] = await db.select({ id: cardPrintsCache.id }).from(cardPrintsCache).where(eq(cardPrintsCache.id, result.id));

    if (existing) {
      await db.update(cardPrintsCache).set(payload).where(eq(cardPrintsCache.id, result.id));
    } else {
      await db.insert(cardPrintsCache).values(payload);
    }
  }
}
