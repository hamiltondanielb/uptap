"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildCollectionFilterSearchParams } from "@/lib/collection/filters";
import { addCollectionBucketFromPrint, deleteCollectionBuckets, deleteCollectionPrint, getCollectionBucket, reassignCollectionPrint, updateCollectionBucket } from "@/lib/collection/service";
import { addDeckEntry, removeDeckEntry } from "@/lib/decks/service";
import { cacheScryfallPrints, refreshCachedPrices, refreshSinglePrintPrice } from "@/lib/scryfall/client";
import type { ScryfallSearchResult } from "@/lib/scryfall/client";

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

export async function addPrintToDeckAction(formData: FormData) {
  const printId = String(formData.get("printId") ?? "");
  const deckId = String(formData.get("deckId") ?? "");
  const section = String(formData.get("section") ?? "mainboard");
  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);

  try {
    await addDeckEntry({
      deckId,
      printId,
      section,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    });
    revalidatePath("/decks");
    revalidatePath(`/decks/${deckId}`);
    revalidatePath(`/collection/card/${printId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add card to deck.";
    redirect(buildCollectionDetailRedirectUrl(printId, { error: message }));
  }

  redirect(buildCollectionDetailRedirectUrl(printId, { added: "1" }));
}

export async function removePrintFromDeckAction(formData: FormData) {
  const printId = String(formData.get("printId") ?? "");
  const deckId = String(formData.get("deckId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");

  try {
    await removeDeckEntry({ deckId, entryId });
    revalidatePath("/decks");
    revalidatePath(`/decks/${deckId}`);
    revalidatePath(`/collection/card/${printId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove card from deck.";
    redirect(buildCollectionDetailRedirectUrl(printId, { error: message }));
  }

  redirect(buildCollectionDetailRedirectUrl(printId, { removed: "1" }));
}

export async function adjustCollectionBucketQuantityAction(formData: FormData) {
  const bucketId = String(formData.get("bucketId") ?? "");
  const printId = String(formData.get("printId") ?? "");
  const delta = Number.parseInt(String(formData.get("delta") ?? "0"), 10);

  try {
    const bucket = await getCollectionBucket(bucketId);
    if (!bucket) throw new Error("Collection bucket not found.");

    const newTotal = Math.max(0, bucket.quantityTotal + delta);
    const newAvailable = Math.max(0, Math.min(bucket.quantityAvailable + delta, newTotal));

    const result = await updateCollectionBucket({
      bucketId,
      quantityTotal: newTotal,
      quantityAvailable: newAvailable,
      finish: bucket.finish,
      condition: bucket.condition,
      location: bucket.location ?? ""
    });

    revalidatePath("/collection");
    revalidatePath("/decks");
    revalidatePath(`/collection/card/${result.printId}`);

    if (result.deleted && !result.printStillOwned) {
      redirect(buildCollectionRedirectUrl({}, { updated: "1" }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to adjust quantity.";
    redirect(buildCollectionDetailRedirectUrl(printId, { error: message }));
  }

  redirect(buildCollectionDetailRedirectUrl(printId, { updated: "1" }));
}

export async function addCopiesAction(formData: FormData) {
  const printId = String(formData.get("printId") ?? "");
  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
  const finish = String(formData.get("finish") ?? "nonfoil");
  const condition = String(formData.get("condition") ?? "near_mint");
  const location = String(formData.get("location") ?? "");

  try {
    await addCollectionBucketFromPrint({
      printId,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      finish,
      condition,
      location
    });
    revalidatePath("/collection");
    revalidatePath(`/collection/card/${printId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add copies.";
    redirect(buildCollectionDetailRedirectUrl(printId, { error: message }));
  }

  redirect(buildCollectionDetailRedirectUrl(printId, { updated: "1" }));
}

export async function refreshPrintPricesAction(formData: FormData) {
  const printId = String(formData.get("printId") ?? "");
  await refreshSinglePrintPrice(printId);
  revalidatePath("/collection");
  revalidatePath("/");
  revalidatePath(`/collection/card/${printId}`);
  redirect(buildCollectionDetailRedirectUrl(printId, { pricesRefreshed: "1" }));
}

export async function refreshCollectionPricesAction() {
  const result = await refreshCachedPrices();
  revalidatePath("/collection");
  revalidatePath("/");
  redirect(`/collection?pricesRefreshed=${result.updated}`);
}

export async function deleteCollectionBucketsAction(formData: FormData) {
  const bucketIds = formData
    .getAll("bucketIds")
    .map((value) => String(value ?? ""))
    .filter(Boolean);
  const query = String(formData.get("query") ?? "");
  const deckFilterMode = String(formData.get("deckFilterMode") ?? "");
  const deckId = String(formData.get("deckId") ?? "");
  const page = String(formData.get("page") ?? "1");
  const pageExtra: Record<string, string> = page !== "1" ? { page } : {};

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
    redirect(buildCollectionRedirectUrl({ query, deckFilterMode, deckId }, { error: message, ...pageExtra }));
  }

  redirect(buildCollectionRedirectUrl({ query, deckFilterMode, deckId }, { deleted: "1", ...pageExtra }));
}

export async function navigatePrintReassignSearchAction(formData: FormData) {
  const currentPrintId = String(formData.get("currentPrintId") ?? "");
  const pq = String(formData.get("pq") ?? "").trim();
  redirect(buildCollectionDetailRedirectUrl(currentPrintId, pq ? { pq } : {}));
}

export async function reassignCollectionPrintAction(formData: FormData) {
  const currentPrintId = String(formData.get("currentPrintId") ?? "");
  const newPrintId = String(formData.get("newPrintId") ?? "");

  try {
    const result = await reassignCollectionPrint(currentPrintId, newPrintId);
    revalidatePath("/collection");
    revalidatePath(`/collection/card/${currentPrintId}`);
    revalidatePath(`/collection/card/${result.newPrintId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reassign print.";
    redirect(buildCollectionDetailRedirectUrl(currentPrintId, { error: message }));
  }

  redirect(buildCollectionDetailRedirectUrl(newPrintId, { reassigned: "1" }));
}

export async function cacheAndReassignCollectionPrintAction(formData: FormData) {
  const currentPrintId = String(formData.get("currentPrintId") ?? "");
  const query = String(formData.get("query") ?? "");

  let newPrintId = "";
  try {
    const raw = String(formData.get("result") ?? "");
    if (!raw) throw new Error("Missing print payload.");
    const result = JSON.parse(raw) as ScryfallSearchResult;
    await cacheScryfallPrints([result]);
    newPrintId = result.id;
    const reassigned = await reassignCollectionPrint(currentPrintId, newPrintId);
    revalidatePath("/collection");
    revalidatePath(`/collection/card/${currentPrintId}`);
    revalidatePath(`/collection/card/${reassigned.newPrintId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reassign print.";
    redirect(buildCollectionDetailRedirectUrl(currentPrintId, { error: message, ...(query ? { pq: query } : {}) }));
  }

  redirect(buildCollectionDetailRedirectUrl(newPrintId, { reassigned: "1" }));
}
