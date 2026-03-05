import { buildCollectionCsv, safeFilenamePart } from "@/lib/export";
import { getCollectionSnapshot } from "@/lib/collection/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const snapshot = await getCollectionSnapshot(query);
  const csv = buildCollectionCsv(snapshot);
  const filename = query
    ? `untap-collection-${safeFilenamePart(query, "filtered")}.csv`
    : "untap-collection.csv";

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
