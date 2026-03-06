import { NextResponse } from "next/server";

import { previewDeckBulkPaste } from "@/lib/decks/service";

export async function POST(request: Request, { params }: { params: { deckId: string } }) {
  try {
    const body = (await request.json()) as { raw?: string };
    const preview = await previewDeckBulkPaste({
      deckId: params.deckId,
      raw: body.raw ?? ""
    });

    return NextResponse.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview pasted cards.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
