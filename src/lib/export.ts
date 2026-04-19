import type { getCollectionSnapshot } from "@/lib/collection/service";
import type { getDeckDetail } from "@/lib/decks/service";

type CollectionSnapshot = Awaited<ReturnType<typeof getCollectionSnapshot>>;
type DeckDetail = NonNullable<Awaited<ReturnType<typeof getDeckDetail>>>;

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(",");
}

function csvCellQuoted(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function safeFilenamePart(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function buildCollectionCsv(snapshot: CollectionSnapshot) {
  const lines = [
    csvRow([
      "Title",
      "Edition",
      "Foil",
      "Quantity",
      "set_code",
      "collector_number",
      "finish",
      "condition",
      "quantity_available",
      "location",
      "oracle_id",
      "print_id"
    ])
  ];

  for (const item of snapshot.items) {
    lines.push(
      [
        csvCellQuoted(item.name),
        csvCell(item.setName),
        item.finish === "foil" || item.finish === "etched" ? 1 : 0,
        item.quantityTotal,
        csvCell(item.setCode),
        csvCell(item.collectorNumber),
        csvCell(item.finish),
        csvCell(item.condition),
        item.quantityAvailable,
        csvCell(item.location),
        csvCell(item.oracleId),
        csvCell(item.printId)
      ].join(",")
    );
  }

  return `${lines.join("\n")}\n`;
}

function getDeckExportEntries(detail: DeckDetail) {
  const grouped = detail.groupedEntries.map((group) => ({
    section: group.section,
    entries: [...group.entries]
  }));

  if (detail.commander && !grouped.some((group) => group.section === "commanders" && group.entries.some((entry) => entry.printId === detail.commander?.id))) {
    const commandersGroup = grouped.find((group) => group.section === "commanders");
    const syntheticCommander = {
      id: `commander:${detail.commander.id}`,
      quantity: 1,
      section: "commanders",
      notes: null,
      printId: detail.commander.id,
      oracleId: detail.commander.oracleId,
      name: detail.commander.name,
      setCode: detail.commander.setCode,
      collectorNumber: detail.commander.collectorNumber,
      manaCost: detail.commander.manaCost,
      cmc: detail.commander.cmc,
      imageUrl: detail.commander.imageSmall,
      typeLine: detail.commander.typeLine,
      colorIdentity: detail.commander.colorIdentity,
      colors: [] as string[],
      owned: 0,
      available: 0,
      shortfall: 0,
      inUseCount: 0,
      inUseDecks: [] as string[],
      ownedPrintings: [] as Array<{ printId: string; setCode: string; collectorNumber: string; quantity: number; usedInDecks: Array<{ deckId: string; deckName: string }> }>,
      useCollection: true
    };

    if (commandersGroup) {
      commandersGroup.entries.unshift(syntheticCommander);
    } else {
      grouped.unshift({
        section: "commanders",
        entries: [syntheticCommander]
      });
    }
  }

  return grouped.filter((group) => group.entries.length > 0);
}

export function buildDeckTextExport(detail: DeckDetail) {
  const lines = [`# ${detail.deck.name}`, `# Format: ${detail.deck.format}`];

  if (detail.deck.description) {
    lines.push(`# ${detail.deck.description}`);
  }

  for (const group of getDeckExportEntries(detail)) {
    lines.push("", `[${group.section.toUpperCase()}]`);

    for (const entry of group.entries) {
      lines.push(`${entry.quantity} ${entry.name} (${entry.setCode}) ${entry.collectorNumber}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function buildBuyListTextExport(detail: DeckDetail) {
  const toBuy: Array<{ name: string; setCode: string; collectorNumber: string; quantity: number; reason: "short" | "in-use" }> = [];

  for (const group of getDeckExportEntries(detail)) {
    for (const entry of group.entries) {
      if (entry.shortfall <= 0) continue;
      const reason = entry.owned >= entry.quantity ? "in-use" : "short";
      const existing = toBuy.find((b) => b.name === entry.name && b.setCode === entry.setCode && b.collectorNumber === entry.collectorNumber);
      if (existing) {
        existing.quantity += entry.shortfall;
      } else {
        toBuy.push({ name: entry.name, setCode: entry.setCode, collectorNumber: entry.collectorNumber, quantity: entry.shortfall, reason });
      }
    }
  }

  if (toBuy.length === 0) {
    return `# Buy List — ${detail.deck.name}\n# Nothing to buy — deck is fully covered!\n`;
  }

  const totalCards = toBuy.reduce((s, b) => s + b.quantity, 0);
  const lines = [`# Buy List — ${detail.deck.name}`, `# Format: ${detail.deck.format}`, `# ${totalCards} card${totalCards === 1 ? "" : "s"} to acquire`, ""];

  for (const item of toBuy) {
    const reasonNote = item.reason === "in-use" ? " # in use by another deck" : "";
    lines.push(`${item.quantity} ${item.name} (${item.setCode}) ${item.collectorNumber}${reasonNote}`);
  }

  return `${lines.join("\n")}\n`;
}

export function buildBuyListCsvExport(detail: DeckDetail) {
  const lines = [csvRow(["quantity_to_buy", "name", "set_code", "collector_number", "reason", "print_id"])];

  for (const group of getDeckExportEntries(detail)) {
    for (const entry of group.entries) {
      if (entry.shortfall <= 0) continue;
      const reason = entry.owned >= entry.quantity ? "in use" : "short";
      lines.push(csvRow([entry.shortfall, entry.name, entry.setCode, entry.collectorNumber, reason, entry.printId]));
    }
  }

  return `${lines.join("\n")}\n`;
}

export function buildDeckCsvExport(detail: DeckDetail) {
  const lines = [
    csvRow([
      "section",
      "quantity",
      "name",
      "set_code",
      "collector_number",
      "mana_cost",
      "type_line",
      "owned",
      "available",
      "shortfall",
      "print_id"
    ])
  ];

  for (const group of getDeckExportEntries(detail)) {
    for (const entry of group.entries) {
      lines.push(
        csvRow([
          group.section,
          entry.quantity,
          entry.name,
          entry.setCode,
          entry.collectorNumber,
          entry.manaCost,
          entry.typeLine,
          entry.owned,
          entry.available,
          entry.shortfall,
          entry.printId
        ])
      );
    }
  }

  return `${lines.join("\n")}\n`;
}
