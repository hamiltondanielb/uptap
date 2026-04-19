import { buildBuyListCsvExport, buildBuyListTextExport, buildDeckCsvExport, buildDeckTextExport, safeFilenamePart } from "@/lib/export";
import { getDeckDetail } from "@/lib/decks/service";

export async function GET(request: Request, { params }: { params: { deckId: string } }) {
  const { searchParams } = new URL(request.url);
  const formatParam = searchParams.get("format");
  const detail = await getDeckDetail(params.deckId);

  if (!detail) {
    return new Response("Deck not found.", { status: 404 });
  }

  const deckSlug = safeFilenamePart(detail.deck.name, "decklist");

  if (formatParam === "buy-csv") {
    return new Response(buildBuyListCsvExport(detail), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="untap-${deckSlug}-buy-list.csv"`
      }
    });
  }

  if (formatParam === "buy") {
    return new Response(buildBuyListTextExport(detail), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="untap-${deckSlug}-buy-list.txt"`
      }
    });
  }

  const format = formatParam === "csv" ? "csv" : "txt";
  const body = format === "csv" ? buildDeckCsvExport(detail) : buildDeckTextExport(detail);

  return new Response(body, {
    headers: {
      "content-type": format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="untap-${deckSlug}.${format}"`
    }
  });
}
