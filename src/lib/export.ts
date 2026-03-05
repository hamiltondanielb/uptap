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
      "name",
      "set_code",
      "set_name",
      "collector_number",
      "finish",
      "condition",
      "quantity_total",
      "quantity_available",
      "location",
      "oracle_id",
      "print_id"
    ])
  ];

  for (const item of snapshot.items) {
    lines.push(
      csvRow([
        item.name,
        item.setCode,
        item.setName,
        item.collectorNumber,
        item.finish,
        item.condition,
        item.quantityTotal,
        item.quantityAvailable,
        item.location,
        item.oracleId,
        item.printId
      ])
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
      name: detail.commander.name,
      setCode: detail.commander.setCode,
      collectorNumber: detail.commander.collectorNumber,
      manaCost: detail.commander.manaCost,
      cmc: detail.commander.cmc,
      imageUrl: detail.commander.imageSmall,
      typeLine: detail.commander.typeLine,
      colorIdentity: detail.commander.colorIdentity,
      colors: [],
      owned: 0,
      available: 0,
      shortfall: 0
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
