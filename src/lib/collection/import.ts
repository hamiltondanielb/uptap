import { randomUUID } from "node:crypto";

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { initializeAppData } from "@/lib/db/bootstrap";
import { db } from "@/lib/db/client";
import { cardPrintsCache, collectionImportJobs, collectionImportRows, collectionItems } from "@/lib/db/schema";
import { cacheScryfallPrints, searchCardPrints } from "@/lib/scryfall/client";

const sourceTypeSchema = z.enum(["csv", "plaintext"]);
const finishSchema = z.enum(["nonfoil", "foil", "etched"]);
const conditionSchema = z.enum([
  "mint",
  "near_mint",
  "lightly_played",
  "moderately_played",
  "heavily_played",
  "damaged"
]);

type SourceType = z.infer<typeof sourceTypeSchema>;
type Finish = z.infer<typeof finishSchema>;
type Condition = z.infer<typeof conditionSchema>;

type ParsedImportRow = {
  original: string;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  finish?: Finish;
};

type ResolvedImportRow = ParsedImportRow & {
  rowId: string;
  status: "matched" | "ambiguous" | "failed";
  resolvedPrintId: string | null;
  errorMessage: string | null;
};

type ImportJobDetail = {
  job: {
    id: string;
    sourceType: string;
    status: string;
    totalRows: number;
    matchedRows: number;
    ambiguousRows: number;
    failedRows: number;
    createdAt: string;
    completedAt: string | null;
  };
  rows: Array<{
    id: string;
    original: string;
    quantity: number;
    name: string;
    setCode: string | null;
    collectorNumber: string | null;
    finish: string | null;
    status: string;
    resolvedPrintId: string | null;
    errorMessage: string | null;
    resolvedCard:
      | {
          id: string;
          name: string;
          setCode: string;
          setName: string;
          collectorNumber: string;
        }
      | null;
    candidatePrints: Array<{
      id: string;
      name: string;
      setCode: string;
      setName: string;
      collectorNumber: string;
    }>;
  }>;
};

export async function resolvePreviewImportRawInput(input: {
  sourceTypeInput: string;
  rawInput: string;
  fileInput?: FormDataEntryValue | null;
}) {
  const sourceType = sourceTypeSchema.parse(input.sourceTypeInput);

  if (input.fileInput instanceof File && input.fileInput.size > 0) {
    try {
      return {
        sourceType: "csv" as const,
        raw: (await input.fileInput.text()).trim()
      };
    } catch {
      throw new Error("Unable to read uploaded CSV file.");
    }
  }

  return {
    sourceType,
    raw: input.rawInput.trim()
  };
}

function parseFinish(input: string | undefined): Finish | undefined {
  const value = input?.trim().toLowerCase();
  if (!value) {
    return undefined;
  }

  const normalized =
    value === "nf" ? "nonfoil" : value === "f" ? "foil" : value === "e" ? "etched" : value;
  return finishSchema.safeParse(normalized).success ? (normalized as Finish) : undefined;
}

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

function matchesImportRow(
  row: {
    name: string;
    setCode?: string | null;
    collectorNumber?: string | null;
  },
  print: {
    name: string;
    setCode: string;
    collectorNumber: string;
  }
) {
  if (normalizeName(print.name) !== normalizeName(row.name)) {
    return false;
  }

  if (row.setCode && print.setCode.toUpperCase() !== row.setCode.toUpperCase()) {
    return false;
  }

  if (row.collectorNumber && print.collectorNumber !== row.collectorNumber) {
    return false;
  }

  return true;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function findHeaderIndex(header: string[], aliases: string[]) {
  return header.findIndex((cell) => aliases.includes(cell));
}

function parseCsvImport(raw: string): ParsedImportRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const quantityIndex = findHeaderIndex(header, ["quantity", "qty", "count", "copies"]);
  const nameIndex = findHeaderIndex(header, ["name", "card", "card_name", "cardname"]);
  const setCodeIndex = findHeaderIndex(header, ["set", "set_code", "setcode", "edition"]);
  const collectorNumberIndex = findHeaderIndex(header, ["collector_number", "collector number", "collector", "collector_no", "cn"]);
  const finishIndex = findHeaderIndex(header, ["finish", "foil", "printing"]);

  if (nameIndex < 0) {
    throw new Error("CSV import requires a card name column such as `name` or `card`.");
  }

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const quantity = Number.parseInt(cells[quantityIndex] ?? "1", 10);
    return {
      original: line,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      name: cells[nameIndex] ?? "",
      setCode: setCodeIndex >= 0 ? cells[setCodeIndex]?.toUpperCase() || undefined : undefined,
      collectorNumber: collectorNumberIndex >= 0 ? cells[collectorNumberIndex] || undefined : undefined,
      finish: finishIndex >= 0 ? parseFinish(cells[finishIndex]) : undefined
    };
  });
}

function parsePlaintextImport(raw: string): ParsedImportRow[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const lead = parts[0];
      const match = lead.match(/^(\d+)\s+(.+)$/);

      if (!match) {
        return {
          original: line,
          quantity: 1,
          name: lead
        };
      }

      return {
        original: line,
        quantity: Number.parseInt(match[1], 10),
        name: match[2],
        setCode: parts[1] ? parts[1].toUpperCase() : undefined,
        collectorNumber: parts[2] || undefined,
        finish: parseFinish(parts[3])
      };
    });
}

async function resolveRows(rows: ParsedImportRow[]): Promise<ResolvedImportRow[]> {
  const cachedPrints = await db.select().from(cardPrintsCache);

  return rows.map((row) => {
    const candidates = cachedPrints.filter((print) => matchesImportRow(row, print));

    if (!row.name.trim()) {
      return {
        ...row,
        rowId: randomUUID(),
        status: "failed",
        resolvedPrintId: null,
        errorMessage: "Missing card name."
      };
    }

    if (candidates.length === 1) {
      return {
        ...row,
        rowId: randomUUID(),
        status: "matched",
        resolvedPrintId: candidates[0].id,
        errorMessage: null
      };
    }

    if (candidates.length > 1) {
      return {
        ...row,
        rowId: randomUUID(),
        status: "ambiguous",
        resolvedPrintId: null,
        errorMessage: "Multiple cached prints matched. Provide set and collector number."
      };
    }

    return {
      ...row,
      rowId: randomUUID(),
      status: "failed",
      resolvedPrintId: null,
      errorMessage: row.setCode
        ? "No cached print matched that set and collector number."
        : "No cached print matched. Search/cache the card first or include a precise print."
    };
  });
}

function summarizeRows(rows: ResolvedImportRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.totalRows += 1;
      if (row.status === "matched") {
        summary.matchedRows += 1;
      } else if (row.status === "ambiguous") {
        summary.ambiguousRows += 1;
      } else {
        summary.failedRows += 1;
      }
      return summary;
    },
    {
      totalRows: 0,
      matchedRows: 0,
      ambiguousRows: 0,
      failedRows: 0
    }
  );
}

async function resolveRowAgainstCache(row: {
  id: string;
  name: string;
  original: string;
  quantity: number;
  setCode: string | null;
  collectorNumber: string | null;
  finish: string | null;
}) {
  const cachedPrints = await db.select().from(cardPrintsCache);
  const candidates = cachedPrints.filter((print) => matchesImportRow(row, print));

  if (candidates.length === 1) {
    await db
      .update(collectionImportRows)
      .set({
        status: "matched",
        resolvedPrintId: candidates[0].id,
        errorMessage: null
      })
      .where(eq(collectionImportRows.id, row.id));
    return;
  }

  if (candidates.length > 1) {
    await db
      .update(collectionImportRows)
      .set({
        status: "ambiguous",
        resolvedPrintId: null,
        errorMessage: "Multiple cached prints matched. Select the exact print below."
      })
      .where(eq(collectionImportRows.id, row.id));
    return;
  }

  await db
    .update(collectionImportRows)
    .set({
      status: "failed",
      resolvedPrintId: null,
      errorMessage: row.setCode
        ? "No cached print matched that set and collector number."
        : "No cached print matched. Search/cache the card first or include a precise print."
    })
    .where(eq(collectionImportRows.id, row.id));
}

async function refreshJobSummary(jobId: string) {
  const rows = await db
    .select({
      status: collectionImportRows.status
    })
    .from(collectionImportRows)
    .where(eq(collectionImportRows.jobId, jobId));

  const summary = summarizeRows(
    rows.map((row, index) => ({
      rowId: `${jobId}-${index}`,
      original: "",
      quantity: 0,
      name: "",
      status: row.status as ResolvedImportRow["status"],
      resolvedPrintId: null,
      errorMessage: null
    }))
  );

  await db
    .update(collectionImportJobs)
    .set({
      totalRows: summary.totalRows,
      matchedRows: summary.matchedRows,
      ambiguousRows: summary.ambiguousRows,
      failedRows: summary.failedRows
    })
    .where(eq(collectionImportJobs.id, jobId));
}

export async function previewCollectionImport(sourceTypeInput: string, rawInput: string) {
  await initializeAppData();

  const sourceType = sourceTypeSchema.parse(sourceTypeInput);
  const raw = rawInput.trim();
  if (!raw) {
    throw new Error("Import content is empty.");
  }

  const parsedRows = sourceType === "csv" ? parseCsvImport(raw) : parsePlaintextImport(raw);
  const resolvedRows = await resolveRows(parsedRows);
  const summary = summarizeRows(resolvedRows);
  const jobId = randomUUID();

  await db.insert(collectionImportJobs).values({
    id: jobId,
    sourceType,
    status: "preview",
    totalRows: summary.totalRows,
    matchedRows: summary.matchedRows,
    ambiguousRows: summary.ambiguousRows,
    failedRows: summary.failedRows
  });

  if (resolvedRows.length > 0) {
    await db.insert(collectionImportRows).values(
      resolvedRows.map((row) => ({
        id: row.rowId,
        jobId,
        original: row.original,
        quantity: row.quantity,
        name: row.name,
        setCode: row.setCode,
        collectorNumber: row.collectorNumber,
        finish: row.finish,
        status: row.status,
        resolvedPrintId: row.resolvedPrintId,
        errorMessage: row.errorMessage
      }))
    );
  }

  return jobId;
}

export async function getImportJobDetail(jobId: string): Promise<ImportJobDetail | null> {
  await initializeAppData();

  const [job] = await db.select().from(collectionImportJobs).where(eq(collectionImportJobs.id, jobId));
  if (!job) {
    return null;
  }

  const rows = await db
    .select()
    .from(collectionImportRows)
    .where(eq(collectionImportRows.jobId, jobId));
  const cachedPrints = await db.select().from(cardPrintsCache);

  const resolvedPrintIds = rows.flatMap((row) => (row.resolvedPrintId ? [row.resolvedPrintId] : []));
  const resolvedCards =
    resolvedPrintIds.length > 0
      ? await db.select().from(cardPrintsCache).where(inArray(cardPrintsCache.id, resolvedPrintIds))
      : [];
  const resolvedCardMap = new Map(
    resolvedCards.map((card) => [
      card.id,
      {
        id: card.id,
        name: card.name,
        setCode: card.setCode,
        setName: card.setName,
        collectorNumber: card.collectorNumber
      }
    ])
  );

  return {
    job,
    rows: rows.map((row) => ({
      ...row,
      resolvedCard: row.resolvedPrintId ? resolvedCardMap.get(row.resolvedPrintId) ?? null : null,
      candidatePrints: cachedPrints
        .filter((print) => matchesImportRow(row, print))
        .map((print) => ({
          id: print.id,
          name: print.name,
          setCode: print.setCode,
          setName: print.setName,
          collectorNumber: print.collectorNumber
        }))
    }))
  };
}

export async function getRecentImportJobs() {
  await initializeAppData();

  return db
    .select()
    .from(collectionImportJobs)
    .orderBy(desc(collectionImportJobs.createdAt))
    .limit(6);
}

export async function commitImportJob(input: {
  jobId: string;
  defaultFinish: string;
  defaultCondition: string;
  location: string;
}) {
  await initializeAppData();

  const finish = finishSchema.parse(input.defaultFinish);
  const condition = conditionSchema.parse(input.defaultCondition);
  const location = input.location.trim();

  const detail = await getImportJobDetail(input.jobId);
  if (!detail) {
    throw new Error("Import job not found.");
  }

  if (detail.job.status === "completed") {
    return detail.job.id;
  }

  const matchedRows = detail.rows.filter((row) => row.status === "matched" && row.resolvedPrintId);

  for (const row of matchedRows) {
    const bucketFinish = parseFinish(row.finish ?? undefined) ?? finish;

    const existingCandidates = await db
      .select()
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.printId, row.resolvedPrintId!),
          eq(collectionItems.finish, bucketFinish),
          eq(collectionItems.condition, condition)
        )
      );
    const existing = existingCandidates.find((item) => (item.location ?? "") === location);

    if (existing) {
      await db
        .update(collectionItems)
        .set({
          quantityTotal: existing.quantityTotal + row.quantity,
          quantityAvailable: existing.quantityAvailable + row.quantity,
          updatedAt: new Date().toISOString()
        })
        .where(eq(collectionItems.id, existing.id));
    } else {
      await db.insert(collectionItems).values({
        id: randomUUID(),
        printId: row.resolvedPrintId!,
        quantityTotal: row.quantity,
        quantityAvailable: row.quantity,
        finish: bucketFinish,
        condition,
        location: location || null
      });
    }
  }

  await db
    .update(collectionImportJobs)
    .set({
      status: "completed",
      completedAt: new Date().toISOString()
    })
    .where(eq(collectionImportJobs.id, input.jobId));

  return input.jobId;
}

export async function resolveImportRow(input: { jobId: string; rowId: string; printId: string }) {
  await initializeAppData();

  const [row] = await db
    .select()
    .from(collectionImportRows)
    .where(and(eq(collectionImportRows.id, input.rowId), eq(collectionImportRows.jobId, input.jobId)));

  if (!row) {
    throw new Error("Import row not found.");
  }

  const [print] = await db.select().from(cardPrintsCache).where(eq(cardPrintsCache.id, input.printId));
  if (!print) {
    throw new Error("Selected print not found.");
  }

  if (!matchesImportRow(row, print)) {
    throw new Error("Selected print does not match this import row.");
  }

  await db
    .update(collectionImportRows)
    .set({
      status: "matched",
      resolvedPrintId: print.id,
      errorMessage: null
    })
    .where(eq(collectionImportRows.id, input.rowId));

  await refreshJobSummary(input.jobId);
}

function buildRowSearchQuery(row: { name: string; setCode: string | null; collectorNumber: string | null }) {
  const parts = [`!"${row.name}"`];

  if (row.setCode) {
    parts.push(`set:${row.setCode.toLowerCase()}`);
  }

  if (row.collectorNumber) {
    parts.push(`cn:${row.collectorNumber}`);
  }

  return parts.join(" ");
}

export async function searchAndCacheImportRowCandidates(input: { jobId: string; rowId: string }) {
  await initializeAppData();

  const [row] = await db
    .select()
    .from(collectionImportRows)
    .where(and(eq(collectionImportRows.id, input.rowId), eq(collectionImportRows.jobId, input.jobId)));

  if (!row) {
    throw new Error("Import row not found.");
  }

  const query = buildRowSearchQuery(row);
  const { results, error } = await searchCardPrints(query);

  if (error) {
    throw new Error(error);
  }

  if (results.length === 0) {
    throw new Error("Scryfall returned no matching prints for this row.");
  }

  await cacheScryfallPrints(results);
  await resolveRowAgainstCache(row);
  await refreshJobSummary(input.jobId);

  return input.jobId;
}

export async function searchAndCacheAllFailedRows(jobId: string) {
  await initializeAppData();

  const failedRows = await db
    .select()
    .from(collectionImportRows)
    .where(and(eq(collectionImportRows.jobId, jobId), eq(collectionImportRows.status, "failed")));

  let touched = 0;

  for (const row of failedRows) {
    const query = buildRowSearchQuery(row);
    const { results } = await searchCardPrints(query);
    if (results.length === 0) {
      continue;
    }

    await cacheScryfallPrints(results);
    await resolveRowAgainstCache(row);
    touched += 1;
  }

  await refreshJobSummary(jobId);

  if (touched === 0) {
    throw new Error("No failed rows could be improved from Scryfall results.");
  }
}

export async function resolveAmbiguousRowsBySet(input: { jobId: string; setCode: string }) {
  await initializeAppData();

  const setCode = input.setCode.trim().toUpperCase();
  if (!setCode) {
    throw new Error("Set code is required.");
  }

  const rows = await db
    .select()
    .from(collectionImportRows)
    .where(and(eq(collectionImportRows.jobId, input.jobId), eq(collectionImportRows.status, "ambiguous")));
  const cachedPrints = await db.select().from(cardPrintsCache);

  let resolvedCount = 0;

  for (const row of rows) {
    const candidates = cachedPrints.filter((print) => matchesImportRow(row, print) && print.setCode.toUpperCase() === setCode);

    if (candidates.length === 1) {
      await db
        .update(collectionImportRows)
        .set({
          status: "matched",
          resolvedPrintId: candidates[0].id,
          errorMessage: null
        })
        .where(eq(collectionImportRows.id, row.id));
      resolvedCount += 1;
    }
  }

  await refreshJobSummary(input.jobId);

  if (resolvedCount === 0) {
    throw new Error(`No ambiguous rows had a unique ${setCode} print candidate.`);
  }
}
