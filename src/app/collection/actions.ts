"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateCollectionBucket } from "@/lib/collection/service";

export async function updateCollectionBucketAction(formData: FormData) {
  const bucketId = String(formData.get("bucketId") ?? "");
  const quantityTotal = Number.parseInt(String(formData.get("quantityTotal") ?? "0"), 10);
  const quantityAvailable = Number.parseInt(String(formData.get("quantityAvailable") ?? "0"), 10);
  const finish = String(formData.get("finish") ?? "nonfoil");
  const condition = String(formData.get("condition") ?? "near_mint");
  const location = String(formData.get("location") ?? "");
  const query = String(formData.get("query") ?? "");

  try {
    const result = await updateCollectionBucket({
      bucketId,
      quantityTotal: Number.isFinite(quantityTotal) ? quantityTotal : 0,
      quantityAvailable: Number.isFinite(quantityAvailable) ? quantityAvailable : 0,
      finish,
      condition,
      location
    });

    revalidatePath("/collection");
    revalidatePath("/decks");
    revalidatePath("/decks/[deckId]");
    revalidatePath(`/collection/card/${result.printId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update collection row.";
    redirect(`/collection?error=${encodeURIComponent(message)}&q=${encodeURIComponent(query)}`);
  }

  redirect(`/collection?updated=1&q=${encodeURIComponent(query)}`);
}
