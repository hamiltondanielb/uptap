"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addCollectionBucketFromPrint } from "@/lib/collection/service";
import {
  addDeckEntry,
  createDeck,
  deleteDeck,
  removeDeckEntry,
  setDeckCommander,
  setDeckEntryQuantity,
  updateDeckEntrySection,
  updateDeckMeta
} from "@/lib/decks/service";
import { cacheScryfallPrints, type ScryfallSearchResult } from "@/lib/scryfall/client";

function redirectWithError(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Deck update failed.";
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function createDeckAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const format = String(formData.get("format") ?? "Commander");
  const description = String(formData.get("description") ?? "");
  const commanderPrintId = String(formData.get("commanderPrintId") ?? "");

  if (!name.trim()) {
    redirect("/decks/new?error=Deck%20name%20is%20required.");
  }

  let deckId = "";
  try {
    deckId = await createDeck({
      name,
      format,
      description,
      commanderPrintId
    });
  } catch (error) {
    redirectWithError("/decks/new", error);
  }

  revalidatePath("/decks");
  redirect(`/decks/${deckId}`);
}

export async function deleteDeckAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "detail");

  let deletedDeckName = "";
  try {
    const result = await deleteDeck({ deckId });
    deletedDeckName = result.deckName;
  } catch (error) {
    redirectWithError(returnTo === "list" ? "/decks" : `/decks/${deckId}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks?deleted=${encodeURIComponent(deletedDeckName)}`);
}

export async function updateDeckMetaAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const name = String(formData.get("name") ?? "");
  const format = String(formData.get("format") ?? "Commander");
  const description = String(formData.get("description") ?? "");
  const commanderPrintId = String(formData.get("commanderPrintId") ?? "");

  try {
    await updateDeckMeta({ deckId, name, format, description, commanderPrintId });
  } catch (error) {
    redirectWithError(`/decks/${deckId}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}?saved=1`);
}

export async function addDeckEntryAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const printId = String(formData.get("printId") ?? "");
  const section = String(formData.get("section") ?? "mainboard");
  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
  const query = String(formData.get("query") ?? "");

  try {
    await addDeckEntry({
      deckId,
      printId,
      section,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    });
  } catch (error) {
    redirectWithError(`/decks/${deckId}?q=${encodeURIComponent(query)}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}?q=${encodeURIComponent(query)}`);
}

export async function addDeckPrintToCollectionAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const printId = String(formData.get("printId") ?? "");
  const query = String(formData.get("query") ?? "");
  const commanderQuery = String(formData.get("commanderQuery") ?? "");
  const redirectParams = new URLSearchParams();

  if (query) {
    redirectParams.set("q", query);
  }

  if (commanderQuery) {
    redirectParams.set("cq", commanderQuery);
  }

  try {
    await addCollectionBucketFromPrint({
      printId,
      quantity: 1,
      finish: "nonfoil",
      condition: "near_mint",
      location: ""
    });
  } catch (error) {
    const path = `/decks/${deckId}${redirectParams.toString() ? `?${redirectParams.toString()}` : ""}`;
    redirectWithError(path, error);
  }

  revalidatePath("/collection");
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirectParams.set("collectionAdded", "1");
  redirect(`/decks/${deckId}?${redirectParams.toString()}`);
}

export async function setDeckEntryQuantityAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);

  try {
    await setDeckEntryQuantity({
      deckId,
      entryId,
      quantity: Number.isFinite(quantity) ? quantity : 1
    });
  } catch (error) {
    redirectWithError(`/decks/${deckId}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}

export async function updateDeckEntrySectionAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");
  const section = String(formData.get("section") ?? "mainboard");

  try {
    await updateDeckEntrySection({ deckId, entryId, section });
  } catch (error) {
    redirectWithError(`/decks/${deckId}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}

export async function removeDeckEntryAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const entryId = String(formData.get("entryId") ?? "");

  try {
    await removeDeckEntry({ deckId, entryId });
  } catch (error) {
    redirectWithError(`/decks/${deckId}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}`);
}

export async function setDeckCommanderAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const commanderPrintId = String(formData.get("commanderPrintId") ?? "");
  const query = String(formData.get("query") ?? "");

  try {
    await setDeckCommander({
      deckId,
      commanderPrintId: commanderPrintId || null
    });
  } catch (error) {
    redirectWithError(`/decks/${deckId}?cq=${encodeURIComponent(query)}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}?cq=${encodeURIComponent(query)}`);
}

function parseCommanderResult(formData: FormData) {
  const raw = String(formData.get("result") ?? "");
  if (!raw) {
    throw new Error("Missing commander payload.");
  }

  return JSON.parse(raw) as ScryfallSearchResult;
}

export async function cacheAndSelectCommanderForNewDeckAction(formData: FormData) {
  const query = String(formData.get("query") ?? "");

  let commanderId = "";
  try {
    const result = parseCommanderResult(formData);
    await cacheScryfallPrints([result]);
    commanderId = result.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cache commander.";
    redirect(`/decks/new?cq=${encodeURIComponent(query)}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/decks/new?cq=${encodeURIComponent(query)}&commanderId=${encodeURIComponent(commanderId)}`);
}

export async function cacheAndSetDeckCommanderFromSearchAction(formData: FormData) {
  const deckId = String(formData.get("deckId") ?? "");
  const query = String(formData.get("query") ?? "");

  try {
    const result = parseCommanderResult(formData);
    await cacheScryfallPrints([result]);
    await setDeckCommander({
      deckId,
      commanderPrintId: result.id
    });
  } catch (error) {
    redirectWithError(`/decks/${deckId}?cq=${encodeURIComponent(query)}`, error);
  }

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect(`/decks/${deckId}?cq=${encodeURIComponent(query)}`);
}
