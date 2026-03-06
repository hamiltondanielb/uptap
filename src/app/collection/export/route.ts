import { buildCollectionCsv, safeFilenamePart } from "@/lib/export";
import { normalizeCollectionSnapshotFilters } from "@/lib/collection/filters";
import { getCollectionSnapshot } from "@/lib/collection/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = normalizeCollectionSnapshotFilters({
    query: searchParams.get("q") ?? "",
    deckFilterMode: searchParams.get("deckFilterMode") ?? "",
    deckId: searchParams.get("deckId") ?? ""
  });
  const snapshot = await getCollectionSnapshot(filters);
  const csv = buildCollectionCsv(snapshot);
  const filename = filters.query
    ? `untap-collection-${safeFilenamePart(filters.query, "filtered")}.csv`
    : "untap-collection.csv";

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
