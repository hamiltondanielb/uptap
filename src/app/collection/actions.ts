"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildCollectionFilterSearchParams } from "@/lib/collection/filters";
import { deleteCollectionBuckets, deleteCollectionPrint, updateCollectionBucket } from "@/lib/collection/service";

function buildCollectionRedirectUrl(
  filters: {
    query?: string;
    deckFilterMode?: string;
    deckId?: string;
  },
  extraParams: Record<string, string>
) {
  const params = buildCollectionFilterSearchParams(filters);

  for (const [key, value] of Object.entries(extraParams)) {
    params.set(key, value);
  }

  const queryString = params.toString();
  return `/collection${queryString ? `?${queryString}` : ""}`;
}

function buildCollectionDetailRedirectUrl(printId: string, extraParams: Record<string, string>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(extraParams)) {
    params.set(key, value);
  }

  const queryString = params.toString();
  return `/collection/card/${printId}${queryString ? `?${queryString}` : ""}`;
}

export async function updateCollectionBucketAction(formData: FormData) {
  const bucketId = String(formData.get("bucketId") ?? "");
  const quantityTotal = Number.parseInt(String(formData.get("quantityTotal") ?? "0"), 10);
  const quantityAvailable = Number.parseInt(String(formData.get("quantityAvailable") ?? "0"), 10);
  const finish = String(formData.get("finish") ?? "nonfoil");
  const condition = String(formData.get("condition") ?? "near_mint");
  const location = String(formData.get("location") ?? "");
  const query = String(formData.get("query") ?? "");
  const deckFilterMode = String(formData.get("deckFilterMode") ?? "");
  const deckId = String(formData.get("deckId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "collection");
  const redirectPrintId = String(formData.get("redirectPrintId") ?? "");

  const buildRedirectUrl = (printId: string, extraParams: Record<string, string>) => {
    if (redirectTo === "detail") {
      return buildCollectionDetailRedirectUrl(printId, extraParams);
    }

    return buildCollectionRedirectUrl({ query, deckFilterMode, deckId }, extraParams);
  };

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

    if (redirectTo === "detail") {
      redirect(
        result.deleted && !result.printStillOwned
          ? buildCollectionRedirectUrl({ query, deckFilterMode, deckId }, { updated: "1" })
          : buildCollectionDetailRedirectUrl(result.printId, { updated: "1" })
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update collection row.";
    redirect(buildRedirectUrl(redirectPrintId, { error: message }));
  }

  redirect(buildCollectionRedirectUrl({ query, deckFilterMode, deckId }, { updated: "1" }));
}

export async function deleteCollectionPrintAction(formData: FormData) {
  const printId = String(formData.get("printId") ?? "");

  try {
    await deleteCollectionPrint(printId);
    revalidatePath("/collection");
    revalidatePath("/decks");
    revalidatePath("/decks/[deckId]");
    revalidatePath(`/collection/card/${printId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete collection print.";
    redirect(buildCollectionDetailRedirectUrl(printId, { error: message }));
  }

  redirect(buildCollectionRedirectUrl({}, { deleted: "1" }));
}

export async function deleteCollectionBucketsAction(formData: FormData) {
  const bucketIds = formData
    .getAll("bucketIds")
    .map((value) => String(value ?? ""))
    .filter(Boolean);
  const query = String(formData.get("query") ?? "");
  const deckFilterMode = String(formData.get("deckFilterMode") ?? "");
  const deckId = String(formData.get("deckId") ?? "");

  try {
    const result = await deleteCollectionBuckets(bucketIds);
    revalidatePath("/collection");
    revalidatePath("/decks");
    revalidatePath("/decks/[deckId]");

    for (const printId of result.printIds) {
      revalidatePath(`/collection/card/${printId}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete selected collection rows.";
    redirect(buildCollectionRedirectUrl({ query, deckFilterMode, deckId }, { error: message }));
  }

  redirect(buildCollectionRedirectUrl({ query, deckFilterMode, deckId }, { deleted: "1" }));
}
