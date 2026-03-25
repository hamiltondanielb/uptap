import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { commitDeckBulkPaste } from "@/lib/decks/service";

export async function POST(request: Request, { params }: { params: { deckId: string } }) {
  try {
    const body = (await request.json()) as {
      section?: string;
      matchedRows?: Array<{ printId?: string; quantity?: number; section?: string }>;
    };

    const result = await commitDeckBulkPaste({
      deckId: params.deckId,
      section: body.section ?? "mainboard",
      matchedRows: (body.matchedRows ?? []).map((row) => ({
        printId: String(row.printId ?? ""),
        quantity: Number(row.quantity ?? 0),
        section: row.section ? String(row.section) : undefined
      }))
    });

    revalidatePath("/decks");
    revalidatePath(`/decks/${params.deckId}`);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add pasted cards.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
