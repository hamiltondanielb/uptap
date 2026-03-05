"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  commitImportJob,
  previewCollectionImport,
  resolveAmbiguousRowsBySet,
  resolveImportRow,
  searchAndCacheAllFailedRows,
  searchAndCacheImportRowCandidates
} from "@/lib/collection/import";

export async function previewImportAction(formData: FormData) {
  const sourceType = String(formData.get("sourceType") ?? "plaintext");
  const raw = String(formData.get("raw") ?? "");

  let jobId = "";
  try {
    jobId = await previewCollectionImport(sourceType, raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview import.";
    redirect(`/collection/import?error=${encodeURIComponent(message)}`);
  }

  redirect(`/collection/import?job=${jobId}`);
}

export async function commitImportAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const defaultFinish = String(formData.get("defaultFinish") ?? "nonfoil");
  const defaultCondition = String(formData.get("defaultCondition") ?? "near_mint");
  const location = String(formData.get("location") ?? "");

  let committedJobId = "";
  try {
    committedJobId = await commitImportJob({
      jobId,
      defaultFinish,
      defaultCondition,
      location
    });

    revalidatePath("/collection");
    revalidatePath("/collection/import");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to commit import.";
    redirect(`/collection/import?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/collection/import?job=${committedJobId}&committed=1`);
}

export async function resolveImportRowAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const rowId = String(formData.get("rowId") ?? "");
  const printId = String(formData.get("printId") ?? "");

  try {
    await resolveImportRow({ jobId, rowId, printId });
    revalidatePath("/collection/import");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve import row.";
    redirect(`/collection/import?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/collection/import?job=${jobId}`);
}

export async function searchImportRowCandidatesAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const rowId = String(formData.get("rowId") ?? "");

  try {
    await searchAndCacheImportRowCandidates({ jobId, rowId });
    revalidatePath("/collection/import");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search Scryfall for this row.";
    redirect(`/collection/import?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/collection/import?job=${jobId}`);
}

export async function searchAllFailedRowsAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");

  try {
    await searchAndCacheAllFailedRows(jobId);
    revalidatePath("/collection/import");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search all failed rows.";
    redirect(`/collection/import?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/collection/import?job=${jobId}`);
}

export async function resolveAmbiguousRowsBySetAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const setCode = String(formData.get("setCode") ?? "");

  try {
    await resolveAmbiguousRowsBySet({ jobId, setCode });
    revalidatePath("/collection/import");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to bulk resolve ambiguous rows.";
    redirect(`/collection/import?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/collection/import?job=${jobId}`);
}
