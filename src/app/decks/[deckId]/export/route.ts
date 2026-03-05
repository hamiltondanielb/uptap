import { buildDeckCsvExport, buildDeckTextExport, safeFilenamePart } from "@/lib/export";
import { getDeckDetail } from "@/lib/decks/service";

export async function GET(request: Request, { params }: { params: { deckId: string } }) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "txt";
  const detail = await getDeckDetail(params.deckId);

  if (!detail) {
    return new Response("Deck not found.", { status: 404 });
  }

  const basename = `untap-${safeFilenamePart(detail.deck.name, "decklist")}`;
  const body = format === "csv" ? buildDeckCsvExport(detail) : buildDeckTextExport(detail);

  return new Response(body, {
    headers: {
      "content-type": format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${basename}.${format}"`
    }
  });
}
