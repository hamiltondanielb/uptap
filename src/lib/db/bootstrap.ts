import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { cardPrintsCache, collectionItems, deckEntries, decks, deckTags, tags } from "@/lib/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __untapBootstrapped: boolean | undefined;
  // eslint-disable-next-line no-var
  var __untapBootstrapPromise: Promise<void> | undefined;
}

function json(value: string[]) {
  return JSON.stringify(value);
}

const demoPrints = [
    {
      id: "neo-raffine-001",
      oracleId: "oracle-raffine",
      name: "Raffine, Scheming Seer",
      setCode: "SNC",
      setName: "Streets of New Capenna",
      collectorNumber: "213",
      rarity: "mythic",
      lang: "en",
      releasedAt: "2022-04-29",
      imageSmall: "https://cards.scryfall.io/small/front/c/b/cb1fdb39-f7e7-423a-b9f3-bf0106b4d9c5.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/c/b/cb1fdb39-f7e7-423a-b9f3-bf0106b4d9c5.jpg",
      manaCost: "{W}{U}{B}",
      typeLine: "Legendary Creature — Sphinx Demon",
      oracleText: "Flying, ward 1. Whenever you attack, target attacking creature connives X, where X is the number of attacking creatures.",
      colors: json(["W", "U", "B"]),
      colorIdentity: json(["W", "U", "B"]),
      cmc: 3,
      layout: "normal"
    },
    {
      id: "clb-arcane-signet-297",
      oracleId: "oracle-arcane-signet",
      name: "Arcane Signet",
      setCode: "CLB",
      setName: "Commander Legends: Battle for Baldur's Gate",
      collectorNumber: "297",
      rarity: "common",
      lang: "en",
      releasedAt: "2022-06-10",
      imageSmall: "https://cards.scryfall.io/small/front/c/5/c53d833f-4f8b-4305-97c0-9a1672365f6d.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/c/5/c53d833f-4f8b-4305-97c0-9a1672365f6d.jpg",
      manaCost: "{2}",
      typeLine: "Artifact",
      oracleText: "{T}: Add one mana of any color in your commander's color identity.",
      colors: json([]),
      colorIdentity: json([]),
      cmc: 2,
      layout: "normal"
    },
    {
      id: "mkc-arcane-signet-233",
      oracleId: "oracle-arcane-signet",
      name: "Arcane Signet",
      setCode: "MKC",
      setName: "Murders at Karlov Manor Commander",
      collectorNumber: "233",
      rarity: "common",
      lang: "en",
      releasedAt: "2024-02-09",
      imageSmall: "https://cards.scryfall.io/small/front/7/9/79ad094b-4a4b-43ed-bb69-d164d7d0bf8f.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/7/9/79ad094b-4a4b-43ed-bb69-d164d7d0bf8f.jpg",
      manaCost: "{2}",
      typeLine: "Artifact",
      oracleText: "{T}: Add one mana of any color in your commander's color identity.",
      colors: json([]),
      colorIdentity: json([]),
      cmc: 2,
      layout: "normal"
    },
    {
      id: "2xm-swords-312",
      oracleId: "oracle-swords",
      name: "Swords to Plowshares",
      setCode: "2XM",
      setName: "Double Masters",
      collectorNumber: "312",
      rarity: "uncommon",
      lang: "en",
      releasedAt: "2020-08-07",
      imageSmall: "https://cards.scryfall.io/small/front/c/8/c829aa1d-f8dc-40f1-a19e-6d9206ee7ba6.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/c/8/c829aa1d-f8dc-40f1-a19e-6d9206ee7ba6.jpg",
      manaCost: "{W}",
      typeLine: "Instant",
      oracleText: "Exile target creature. Its controller gains life equal to its power.",
      colors: json(["W"]),
      colorIdentity: json(["W"]),
      cmc: 1,
      layout: "normal"
    },
    {
      id: "one-mondrak-23",
      oracleId: "oracle-mondrak",
      name: "Mondrak, Glory Dominus",
      setCode: "ONE",
      setName: "Phyrexia: All Will Be One",
      collectorNumber: "23",
      rarity: "mythic",
      lang: "en",
      releasedAt: "2023-02-10",
      imageSmall: "https://cards.scryfall.io/small/front/2/3/23f4f112-4833-41a9-b4d4-e4ecb2b2f9d4.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/2/3/23f4f112-4833-41a9-b4d4-e4ecb2b2f9d4.jpg",
      manaCost: "{2}{W}{W}",
      typeLine: "Legendary Creature — Phyrexian Horror",
      oracleText: "If one or more tokens would be created under your control, twice that many are created instead.",
      colors: json(["W"]),
      colorIdentity: json(["W"]),
      cmc: 4,
      layout: "normal"
    },
    {
      id: "woe-rhona-206",
      oracleId: "oracle-rhona",
      name: "Talion's Messenger",
      setCode: "WOE",
      setName: "Wilds of Eldraine",
      collectorNumber: "206",
      rarity: "uncommon",
      lang: "en",
      releasedAt: "2023-09-08",
      imageSmall: "https://cards.scryfall.io/small/front/f/c/fc8d7427-f7eb-4ff2-b302-4a9ccab6967e.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/f/c/fc8d7427-f7eb-4ff2-b302-4a9ccab6967e.jpg",
      manaCost: "{1}{U}{B}",
      typeLine: "Creature — Faerie Noble",
      oracleText: "Flying. When Talion's Messenger enters the battlefield, draw a card and you lose 1 life.",
      colors: json(["U", "B"]),
      colorIdentity: json(["U", "B"]),
      cmc: 3,
      layout: "normal"
    },
    {
      id: "ltr-sol-ring-246",
      oracleId: "oracle-sol-ring",
      name: "Sol Ring",
      setCode: "LTR",
      setName: "The Lord of the Rings: Tales of Middle-earth Commander",
      collectorNumber: "246",
      rarity: "uncommon",
      lang: "en",
      releasedAt: "2023-06-23",
      imageSmall: "https://cards.scryfall.io/small/front/6/9/6962ecbd-f847-4252-a1c1-77f00fc91f09.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/6/9/6962ecbd-f847-4252-a1c1-77f00fc91f09.jpg",
      manaCost: "{1}",
      typeLine: "Artifact",
      oracleText: "{T}: Add {C}{C}.",
      colors: json([]),
      colorIdentity: json([]),
      cmc: 1,
      layout: "normal"
    }
  ];

async function ensureDemoPrintCache() {
  const existingPrints = await db.select({ id: cardPrintsCache.id }).from(cardPrintsCache);
  const existingIds = new Set(existingPrints.map((print) => print.id));
  const missingPrints = demoPrints.filter((print) => !existingIds.has(print.id));

  if (missingPrints.length > 0) {
    await db.insert(cardPrintsCache).values(missingPrints);
  }
}

async function seedDemoData() {
  await ensureDemoPrintCache();

  const [existing] = await db.select({ value: count() }).from(collectionItems);
  if ((existing?.value ?? 0) > 0) {
    return;
  }

  await db.insert(collectionItems).values([
    {
      id: "owned-raffine",
      printId: "neo-raffine-001",
      quantityTotal: 1,
      quantityAvailable: 1,
      finish: "foil",
      condition: "near_mint",
      location: "Binder"
    },
    {
      id: "owned-arcane-signet",
      printId: "clb-arcane-signet-297",
      quantityTotal: 3,
      quantityAvailable: 2,
      finish: "nonfoil",
      condition: "near_mint",
      location: "Commander Staples"
    },
    {
      id: "owned-swords",
      printId: "2xm-swords-312",
      quantityTotal: 2,
      quantityAvailable: 1,
      finish: "etched",
      condition: "lightly_played",
      location: "Removal Stack"
    },
    {
      id: "owned-mondrak",
      printId: "one-mondrak-23",
      quantityTotal: 1,
      quantityAvailable: 1,
      finish: "nonfoil",
      condition: "near_mint",
      location: "White Mythics"
    },
    {
      id: "owned-rhona",
      printId: "woe-rhona-206",
      quantityTotal: 4,
      quantityAvailable: 3,
      finish: "nonfoil",
      condition: "near_mint",
      location: "Deckbox Drawer"
    },
    {
      id: "owned-sol-ring",
      printId: "ltr-sol-ring-246",
      quantityTotal: 2,
      quantityAvailable: 1,
      finish: "foil",
      condition: "near_mint",
      location: "Commander Staples"
    }
  ]);

  await db.insert(decks).values([
    {
      id: "deck-esper-connive",
      name: "Esper Connive",
      format: "Commander",
      description: "Raffine tempo shell that leans on evasive threats and tight interaction.",
      commanderPrintId: "neo-raffine-001"
    }
  ]);

  await db.insert(deckEntries).values([
    {
      id: "entry-raffine",
      deckId: "deck-esper-connive",
      printId: "neo-raffine-001",
      quantity: 1,
      section: "commanders"
    },
    {
      id: "entry-arcane-signet",
      deckId: "deck-esper-connive",
      printId: "clb-arcane-signet-297",
      quantity: 1,
      section: "mainboard"
    },
    {
      id: "entry-sol-ring",
      deckId: "deck-esper-connive",
      printId: "ltr-sol-ring-246",
      quantity: 1,
      section: "mainboard"
    },
    {
      id: "entry-swords",
      deckId: "deck-esper-connive",
      printId: "2xm-swords-312",
      quantity: 1,
      section: "mainboard"
    },
    {
      id: "entry-rhona",
      deckId: "deck-esper-connive",
      printId: "woe-rhona-206",
      quantity: 2,
      section: "mainboard"
    }
  ]);

  await db.insert(tags).values([
    { id: "tag-midrange", name: "Midrange", color: "amber" },
    { id: "tag-brew", name: "Paper Brew", color: "slate" }
  ]);

  await db.insert(deckTags).values([
    { deckId: "deck-esper-connive", tagId: "tag-midrange" },
    { deckId: "deck-esper-connive", tagId: "tag-brew" }
  ]);
}

export async function initializeAppData() {
  if (globalThis.__untapBootstrapped) {
    return;
  }

  if (!globalThis.__untapBootstrapPromise) {
    globalThis.__untapBootstrapPromise = (async () => {
      await seedDemoData();
      globalThis.__untapBootstrapped = true;
    })();
  }

  await globalThis.__untapBootstrapPromise;
}

export async function resetCollectionAvailability(printId: string, quantityAvailable: number) {
  await initializeAppData();
  await db.update(collectionItems).set({ quantityAvailable }).where(eq(collectionItems.printId, printId));
}
