import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { eq } from "drizzle-orm";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "untap-tests-"));
process.env.DATABASE_FILE = path.join(tempDir, "untap.db");

after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const { commitDeckBulkPaste, deleteDeck, getDeckDetail, previewDeckBulkPaste } = await import("@/lib/decks/service");
const { db } = await import("@/lib/db/client");
const { cardPrintsCache, collectionItems, deckEntries } = await import("@/lib/db/schema");
const {
  addCollectionBucketFromPrint,
  deleteCollectionBuckets,
  deleteCollectionPrint,
  getCollectionPrintDetail,
  getCollectionSnapshot
} = await import("@/lib/collection/service");
const { getImportJobDetail, previewCollectionImport, resolvePreviewImportRawInput } = await import("@/lib/collection/import");
const { buildCollectionCsv, buildDeckCsvExport, buildDeckTextExport } = await import("@/lib/export");

test("deck analytics are computed from the seeded demo deck", async () => {
  const detail = await getDeckDetail("deck-esper-connive");

  assert.ok(detail, "expected seeded deck to exist");
  assert.equal(detail.analytics.trackedCards, 6);
  assert.equal(detail.analytics.spellCount, 6);
  assert.equal(detail.analytics.landCount, 0);
  assert.equal(detail.analytics.averageSpellCmc, 2.17);

  assert.deepEqual(detail.analytics.sectionTotals, [
    { section: "commanders", cards: 1, uniquePrints: 1 },
    { section: "mainboard", cards: 5, uniquePrints: 4 },
    { section: "sideboard", cards: 0, uniquePrints: 0 },
    { section: "maybeboard", cards: 0, uniquePrints: 0 },
    { section: "tokens", cards: 0, uniquePrints: 0 },
    { section: "considering", cards: 0, uniquePrints: 0 }
  ]);

  assert.deepEqual(detail.analytics.manaCurve, [
    { label: "0", cards: 0 },
    { label: "1", cards: 2 },
    { label: "2", cards: 1 },
    { label: "3", cards: 3 },
    { label: "4", cards: 0 },
    { label: "5", cards: 0 },
    { label: "6", cards: 0 },
    { label: "7+", cards: 0 }
  ]);

  assert.deepEqual(detail.analytics.colorBreakdown, [
    { color: "W", cards: 2 },
    { color: "U", cards: 3 },
    { color: "B", cards: 3 },
    { color: "R", cards: 0 },
    { color: "G", cards: 0 },
    { color: "C", cards: 2 }
  ]);

  assert.deepEqual(detail.analytics.manaPips, [
    { color: "W", count: 2 },
    { color: "U", count: 3 },
    { color: "B", count: 3 },
    { color: "R", count: 0 },
    { color: "G", count: 0 }
  ]);
});

test("collection CSV export preserves exact-print rows and escapes fields", async () => {
  const snapshot = await getCollectionSnapshot({ query: "Arcane Signet" });
  const csv = buildCollectionCsv({
    ...snapshot,
    items: snapshot.items.map((item) => ({
      ...item,
      location: 'Binder, "A"'
    }))
  });

  const lines = csv.trim().split("\n");

  assert.equal(lines.length, 2);
  assert.equal(
    lines[0],
    "name,set_code,set_name,collector_number,finish,condition,quantity_total,quantity_available,location,oracle_id,print_id"
  );
  assert.match(lines[1], /^Arcane Signet,CLB,/);
  assert.match(lines[1], /"Binder, ""A"""/);
  assert.match(lines[1], /oracle-arcane-signet/);
});

test("collection snapshot filters by deck membership using exact print IDs", async () => {
  const inDeck = await getCollectionSnapshot({
    deckFilterMode: "in_deck",
    deckId: "deck-esper-connive"
  });
  const notInDeck = await getCollectionSnapshot({
    deckFilterMode: "not_in_deck",
    deckId: "deck-esper-connive"
  });
  const notInAnyDeck = await getCollectionSnapshot({
    deckFilterMode: "not_in_any_deck"
  });

  assert.deepEqual(
    inDeck.items.map((item) => item.name),
    [
      "Arcane Signet",
      "Raffine, Scheming Seer",
      "Sol Ring",
      "Swords to Plowshares",
      "Talion's Messenger"
    ]
  );
  assert.deepEqual(notInDeck.items.map((item) => item.name), ["Mondrak, Glory Dominus"]);
  assert.deepEqual(notInAnyDeck.items.map((item) => item.name), ["Mondrak, Glory Dominus"]);
});

test("collection snapshot exposes deck names for exact-print usage", async () => {
  const snapshot = await getCollectionSnapshot();
  const arcaneSignet = snapshot.items.find((item) => item.printId === "clb-arcane-signet-297");
  const mondrak = snapshot.items.find((item) => item.printId === "one-mondrak-23");

  assert.ok(arcaneSignet, "expected Arcane Signet collection row");
  assert.ok(mondrak, "expected Mondrak collection row");
  assert.deepEqual(arcaneSignet.deckNames, ["Esper Connive"]);
  assert.deepEqual(mondrak.deckNames, []);
});

test("collection print detail includes all owned buckets and linked deck usage", async () => {
  await addCollectionBucketFromPrint({
    printId: "clb-arcane-signet-297",
    quantity: 1,
    finish: "foil",
    condition: "near_mint",
    location: "Deckbox Drawer"
  });

  const detail = await getCollectionPrintDetail("clb-arcane-signet-297");

  assert.ok(detail, "expected Arcane Signet detail");
  assert.equal(detail.print.name, "Arcane Signet");
  assert.equal(detail.summary.bucketCount, 2);
  assert.equal(detail.summary.totalCopies, 4);
  assert.equal(detail.summary.availableCopies, 3);
  assert.deepEqual(
    detail.ownedBuckets.map((bucket) => [bucket.finish, bucket.location]),
    [
      ["nonfoil", "Commander Staples"],
      ["foil", "Deckbox Drawer"]
    ]
  );
  assert.deepEqual(detail.usedInDecks, [
    {
      deckId: "deck-esper-connive",
      deckName: "Esper Connive",
      quantity: 1,
      section: "mainboard"
    }
  ]);
});

test("collection CSV export honors deck filters", async () => {
  const snapshot = await getCollectionSnapshot({
    deckFilterMode: "not_in_any_deck"
  });
  const csv = buildCollectionCsv(snapshot);

  const lines = csv.trim().split("\n");

  assert.equal(lines.length, 2);
  assert.match(lines[1], /^"Mondrak, Glory Dominus",ONE,/);
});

test("uploaded CSV input is normalized to raw text for preview imports", async () => {
  const previewInput = await resolvePreviewImportRawInput({
    sourceTypeInput: "csv",
    rawInput: "",
    fileInput: new File(
      ["quantity,name,set,collector_number,finish\n1,Arcane Signet,CLB,297,nonfoil"],
      "collection.csv",
      { type: "text/csv" }
    )
  });

  assert.equal(previewInput.sourceType, "csv");
  assert.equal(previewInput.raw, "quantity,name,set,collector_number,finish\n1,Arcane Signet,CLB,297,nonfoil");
});

test("uploaded file forces CSV mode even when the selector says plaintext", async () => {
  const previewInput = await resolvePreviewImportRawInput({
    sourceTypeInput: "plaintext",
    rawInput: "",
    fileInput: new File(
      ['"Count","Name","Edition","Collector Number","Foil"\n"1","Arcane Signet","clb","297",""'],
      "moxfield.csv",
      { type: "text/csv" }
    )
  });

  assert.equal(previewInput.sourceType, "csv");
  assert.match(previewInput.raw, /"Edition"/);
});

test("csv preview import still creates a persisted preview job", async () => {
  const jobId = await previewCollectionImport("csv", "quantity,name,set,collector_number,finish\n1,Arcane Signet,CLB,297,nonfoil");
  const detail = await getImportJobDetail(jobId);

  assert.ok(detail, "expected persisted import preview job");
  assert.equal(detail.job.sourceType, "csv");
  assert.equal(detail.job.totalRows, 1);
  assert.equal(detail.job.matchedRows, 1);
  assert.equal(detail.rows[0]?.resolvedCard?.name, "Arcane Signet");
});

test("moxfield-style csv headers are accepted for preview imports", async () => {
  const jobId = await previewCollectionImport(
    "csv",
    '"Count","Name","Edition","Collector Number","Foil"\n"1","Arcane Signet","clb","297",""'
  );
  const detail = await getImportJobDetail(jobId);

  assert.ok(detail, "expected persisted Moxfield import preview job");
  assert.equal(detail.job.totalRows, 1);
  assert.equal(detail.job.matchedRows, 1);
  assert.equal(detail.rows[0]?.resolvedCard?.setCode, "CLB");
  assert.equal(detail.rows[0]?.resolvedCard?.collectorNumber, "297");
});

test("deck exports include commander metadata and structured sections", async () => {
  const detail = await getDeckDetail("deck-esper-connive");

  assert.ok(detail, "expected seeded deck to exist");

  const detailWithoutCommanderEntry = {
    ...detail,
    entries: detail.entries.filter((entry) => entry.section !== "commanders"),
    groupedEntries: detail.groupedEntries.map((group) =>
      group.section === "commanders" ? { ...group, entries: [] } : group
    )
  };

  const textExport = buildDeckTextExport(detailWithoutCommanderEntry);
  const csvExport = buildDeckCsvExport(detailWithoutCommanderEntry);

  assert.match(textExport, /# Esper Connive/);
  assert.match(textExport, /\[COMMANDERS\]/);
  assert.match(textExport, /1 Raffine, Scheming Seer \(SNC\) 213/);
  assert.match(textExport, /\[MAINBOARD\]/);
  assert.match(textExport, /2 Talion's Messenger \(WOE\) 206/);

  const csvLines = csvExport.trim().split("\n");
  assert.equal(
    csvLines[0],
    "section,quantity,name,set_code,collector_number,mana_cost,type_line,owned,available,shortfall,print_id"
  );
  assert.equal(csvLines[1], 'commanders,1,"Raffine, Scheming Seer",SNC,213,{W}{U}{B},Legendary Creature — Sphinx Demon,0,0,0,neo-raffine-001');
  assert.ok(csvLines.some((line) => line.startsWith("mainboard,2,Talion's Messenger,WOE,206,{1}{U}{B},")));
});

test("deck bulk paste preview matches count-name and pipe-delimited lines from local collection", async () => {
  const preview = await previewDeckBulkPaste({
    deckId: "deck-esper-connive",
    raw: "2 Arcane Signet\n1 Mondrak, Glory Dominus | ONE | 23"
  });

  assert.equal(preview.summary.parsedRows, 2);
  assert.equal(preview.summary.matchedRows, 2);
  assert.equal(preview.summary.unmatchedRows, 0);
  assert.deepEqual(
    preview.matchedRows.map((row) => [row.name, row.quantity, row.matchSource]),
    [
      ["Arcane Signet", 2, "deck"],
      ["Mondrak, Glory Dominus", 1, "collection"]
    ]
  );
});

test("deck bulk paste prefers a print already in the current deck when cached names are ambiguous", async () => {
  await db.insert(cardPrintsCache).values({
    id: "cmm-arcane-signet-001",
    oracleId: "oracle-arcane-signet",
    name: "Arcane Signet",
    setCode: "CMM",
    setName: "Commander Masters",
    collectorNumber: "001",
    rarity: "uncommon",
    lang: "en",
    layout: "normal"
  });

  const preview = await previewDeckBulkPaste({
    deckId: "deck-esper-connive",
    raw: "1 Arcane Signet"
  });

  assert.equal(preview.summary.matchedRows, 1);
  assert.equal(preview.matchedRows[0]?.selectedPrintId, "clb-arcane-signet-297");
  assert.equal(preview.matchedRows[0]?.candidatePrints.length, 1);
  assert.equal(preview.matchedRows[0]?.matchSource, "deck");
});

test("deck bulk paste leaves unmatched cards out of cache and collection", async () => {
  const printCountBefore = (await db.select({ id: cardPrintsCache.id }).from(cardPrintsCache)).length;
  const collectionCountBefore = (await db.select({ id: collectionItems.id }).from(collectionItems)).length;

  const preview = await previewDeckBulkPaste({
    deckId: "deck-esper-connive",
    raw: "3 Completely Imaginary Card"
  });

  const printCountAfter = (await db.select({ id: cardPrintsCache.id }).from(cardPrintsCache)).length;
  const collectionCountAfter = (await db.select({ id: collectionItems.id }).from(collectionItems)).length;

  assert.equal(preview.summary.matchedRows, 0);
  assert.equal(preview.summary.unmatchedRows, 1);
  assert.match(preview.unmatchedRows[0]?.reason ?? "", /local collection cache/i);
  assert.equal(printCountAfter, printCountBefore);
  assert.equal(collectionCountAfter, collectionCountBefore);
});

test("deck bulk paste exposes selectable collection candidates and defaults to the first print", async () => {
  await db.insert(cardPrintsCache).values({
    id: "one-mondrak-230",
    oracleId: "oracle-mondrak",
    name: "Mondrak, Glory Dominus",
    setCode: "ONE",
    setName: "Phyrexia: All Will Be One",
    collectorNumber: "230",
    rarity: "mythic",
    lang: "en",
    layout: "normal"
  });
  await addCollectionBucketFromPrint({
    printId: "one-mondrak-230",
    quantity: 1,
    finish: "nonfoil",
    condition: "near_mint",
    location: "Binder"
  });

  const preview = await previewDeckBulkPaste({
    deckId: "deck-esper-connive",
    raw: "1 Mondrak, Glory Dominus"
  });
  const row = preview.matchedRows[0];

  assert.ok(row, "expected Mondrak preview row");
  assert.equal(row.matchSource, "collection");
  assert.equal(row.candidatePrints.length, 2);
  assert.equal(row.selectedPrintId, row.candidatePrints[0]?.id);

  const result = await commitDeckBulkPaste({
    deckId: "deck-esper-connive",
    section: "considering",
    matchedRows: [
      {
        printId: row.candidatePrints[1]?.id ?? "",
        quantity: row.quantity
      }
    ]
  });
  const consideringEntries = await db
    .select({
      printId: deckEntries.printId,
      quantity: deckEntries.quantity,
      section: deckEntries.section
    })
    .from(deckEntries)
    .where(eq(deckEntries.deckId, "deck-esper-connive"));

  const selectedEntry = consideringEntries.find(
    (entry) => entry.printId === row.candidatePrints[1]?.id && entry.section === "considering"
  );

  assert.equal(result.addedCards, 1);
  assert.equal(selectedEntry?.quantity, 1);
});

test("deck bulk paste keeps cached-but-unowned prints committable", async () => {
  await db.insert(cardPrintsCache).values({
    id: "bro-mindsplice-12",
    oracleId: "oracle-mindsplice-apparatus",
    name: "Mindsplice Apparatus",
    setCode: "BRO",
    setName: "The Brothers' War",
    collectorNumber: "12",
    rarity: "rare",
    lang: "en",
    layout: "normal"
  });

  const preview = await previewDeckBulkPaste({
    deckId: "deck-esper-connive",
    raw: "1 Mindsplice Apparatus"
  });
  const row = preview.matchedRows[0];

  assert.equal(preview.summary.unmatchedRows, 0);
  assert.ok(row, "expected cached-only preview row");
  assert.equal(row.matchSource, "cached");
  assert.equal(row.candidatePrints[0]?.owned, 0);

  await commitDeckBulkPaste({
    deckId: "deck-esper-connive",
    section: "mainboard",
    matchedRows: [
      {
        printId: row.selectedPrintId,
        quantity: row.quantity
      }
    ]
  });

  const detail = await getDeckDetail("deck-esper-connive");
  const addedEntry = detail?.entries.find((entry) => entry.printId === "bro-mindsplice-12");

  assert.ok(addedEntry, "expected cached-only print to be added to the deck");
  assert.equal(addedEntry?.owned, 0);
});

test("deck bulk paste commit adds only matched rows into the chosen section", async () => {
  const preview = await previewDeckBulkPaste({
    deckId: "deck-esper-connive",
    raw: "2 Mondrak, Glory Dominus"
  });

  const result = await commitDeckBulkPaste({
    deckId: "deck-esper-connive",
    section: "sideboard",
    matchedRows: preview.matchedRows.map((row) => ({
      printId: row.selectedPrintId,
      quantity: row.quantity
    }))
  });
  const sideboardEntries = await db
    .select({
      printId: deckEntries.printId,
      quantity: deckEntries.quantity,
      section: deckEntries.section
    })
    .from(deckEntries)
    .where(eq(deckEntries.deckId, "deck-esper-connive"));

  const mondrakEntry = sideboardEntries.find(
    (entry) => entry.printId === preview.matchedRows[0]?.selectedPrintId && entry.section === "sideboard"
  );

  assert.equal(result.addedCards, 2);
  assert.equal(mondrakEntry?.quantity, 2);
});

test("deleting a deck removes the deck and its entries", async () => {
  const entriesBefore = await db
    .select({ id: deckEntries.id })
    .from(deckEntries)
    .where(eq(deckEntries.deckId, "deck-esper-connive"));

  assert.ok(entriesBefore.length > 0, "expected seeded deck entries");

  const result = await deleteDeck({ deckId: "deck-esper-connive" });
  const detail = await getDeckDetail("deck-esper-connive");
  const entriesAfter = await db
    .select({ id: deckEntries.id })
    .from(deckEntries)
    .where(eq(deckEntries.deckId, "deck-esper-connive"));

  assert.equal(result.deckName, "Esper Connive");
  assert.equal(detail, null);
  assert.equal(entriesAfter.length, 0);
});

test("deleting a print removes all owned buckets for that exact print", async () => {
  const detailBefore = await getCollectionPrintDetail("one-mondrak-23");

  assert.ok(detailBefore, "expected Mondrak print detail before delete");

  const result = await deleteCollectionPrint("one-mondrak-23");
  const detailAfter = await getCollectionPrintDetail("one-mondrak-23");
  const snapshot = await getCollectionSnapshot();

  assert.equal(result.deletedBuckets, 1);
  assert.equal(detailAfter, null);
  assert.ok(!snapshot.items.some((item) => item.printId === "one-mondrak-23"));
});

test("bulk bucket delete removes only the selected collection rows", async () => {
  const snapshotBefore = await getCollectionSnapshot();
  const solRingBucket = snapshotBefore.items.find((item) => item.bucketId === "owned-sol-ring");
  const swordsBucket = snapshotBefore.items.find((item) => item.bucketId === "owned-swords");

  assert.ok(solRingBucket, "expected Sol Ring bucket before delete");
  assert.ok(swordsBucket, "expected Swords bucket before delete");

  const result = await deleteCollectionBuckets(["owned-sol-ring"]);
  const snapshotAfter = await getCollectionSnapshot();

  assert.equal(result.deletedBuckets, 1);
  assert.deepEqual(result.printIds, ["ltr-sol-ring-246"]);
  assert.ok(!snapshotAfter.items.some((item) => item.bucketId === "owned-sol-ring"));
  assert.ok(snapshotAfter.items.some((item) => item.bucketId === "owned-swords"));
});
