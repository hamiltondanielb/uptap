import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(path.join(os.tmpdir(), "untap-tests-"));
process.env.DATABASE_FILE = path.join(tempDir, "untap.db");

after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const { getDeckDetail } = await import("@/lib/decks/service");
const { getCollectionSnapshot } = await import("@/lib/collection/service");
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
  const snapshot = await getCollectionSnapshot("Arcane Signet");
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
