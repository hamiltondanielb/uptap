"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addCollectionBucketFromPrint, collectionConditions, collectionFinishes } from "@/lib/collection/service";
import { addDeckEntry } from "@/lib/decks/service";
import { cacheScryfallPrints, type ScryfallSearchResult } from "@/lib/scryfall/client";

function parseSearchResult(formData: FormData) {
  const raw = String(formData.get("result") ?? "");
  if (!raw) {
    throw new Error("Missing search result payload.");
  }

  return JSON.parse(raw) as ScryfallSearchResult;
}

function searchRedirect(query: string, extra = "") {
  return `/search?q=${encodeURIComponent(query)}${extra}`;
}

export async function cacheSearchResultAction(formData: FormData) {
  const query = String(formData.get("query") ?? "");

  try {
    const result = parseSearchResult(formData);
    await cacheScryfallPrints([result]);
    revalidatePath("/search");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cache search result.";
    redirect(searchRedirect(query, `&error=${encodeURIComponent(message)}`));
  }

  redirect(searchRedirect(query, "&cached=1"));
}

export async function addSearchResultToCollectionAction(formData: FormData) {
  const query = String(formData.get("query") ?? "");
  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
  const finish = String(formData.get("finish") ?? "nonfoil");
  const condition = String(formData.get("condition") ?? "near_mint");
  const location = String(formData.get("location") ?? "");

  try {
    const result = parseSearchResult(formData);
    await cacheScryfallPrints([result]);
    await addCollectionBucketFromPrint({
      printId: result.id,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      finish: collectionFinishes.includes(finish as (typeof collectionFinishes)[number]) ? finish : "nonfoil",
      condition: collectionConditions.includes(condition as (typeof collectionConditions)[number]) ? condition : "near_mint",
      location
    });
    revalidatePath("/collection");
    revalidatePath("/search");
    revalidatePath("/decks");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add search result to collection.";
    redirect(searchRedirect(query, `&error=${encodeURIComponent(message)}`));
  }

  redirect(searchRedirect(query, "&addedCollection=1"));
}

export async function addSearchResultToDeckAction(formData: FormData) {
  const query = String(formData.get("query") ?? "");
  const deckId = String(formData.get("deckId") ?? "");
  const section = String(formData.get("section") ?? "mainboard");
  const quantity = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);

  try {
    const result = parseSearchResult(formData);
    await cacheScryfallPrints([result]);
    await addDeckEntry({
      deckId,
      printId: result.id,
      section,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1
    });
    revalidatePath("/search");
    revalidatePath("/decks");
    revalidatePath(`/decks/${deckId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add search result to deck.";
    redirect(searchRedirect(query, `&error=${encodeURIComponent(message)}`));
  }

  redirect(searchRedirect(query, `&addedDeck=${encodeURIComponent(deckId)}`));
}
