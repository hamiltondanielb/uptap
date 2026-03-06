"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  commitImportJob,
  previewCollectionImport,
  resolvePreviewImportRawInput,
  resolveAmbiguousRowsBySet,
  resolveImportRow,
  searchAndCacheAllFailedRows,
  searchAndCacheImportRowCandidates
} from "@/lib/collection/import";

const importPath = "/import";

export async function previewImportAction(formData: FormData) {
  const previewInput = await resolvePreviewImportRawInput({
    sourceTypeInput: String(formData.get("sourceType") ?? "plaintext"),
    rawInput: String(formData.get("raw") ?? ""),
    fileInput: formData.get("file")
  });

  let jobId = "";
  try {
    jobId = await previewCollectionImport(previewInput.sourceType, previewInput.raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview import.";
    redirect(`${importPath}?error=${encodeURIComponent(message)}`);
  }

  redirect(`${importPath}?job=${jobId}`);
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
    revalidatePath(importPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to commit import.";
    redirect(`${importPath}?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`${importPath}?job=${committedJobId}&committed=1`);
}

export async function resolveImportRowAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const rowId = String(formData.get("rowId") ?? "");
  const printId = String(formData.get("printId") ?? "");

  try {
    await resolveImportRow({ jobId, rowId, printId });
    revalidatePath(importPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve import row.";
    redirect(`${importPath}?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`${importPath}?job=${jobId}`);
}

export async function searchImportRowCandidatesAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const rowId = String(formData.get("rowId") ?? "");

  try {
    await searchAndCacheImportRowCandidates({ jobId, rowId });
    revalidatePath(importPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search Scryfall for this row.";
    redirect(`${importPath}?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`${importPath}?job=${jobId}`);
}

export async function searchAllFailedRowsAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");

  try {
    await searchAndCacheAllFailedRows(jobId);
    revalidatePath(importPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search all failed rows.";
    redirect(`${importPath}?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`${importPath}?job=${jobId}`);
}

export async function resolveAmbiguousRowsBySetAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const setCode = String(formData.get("setCode") ?? "");

  try {
    await resolveAmbiguousRowsBySet({ jobId, setCode });
    revalidatePath(importPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to bulk resolve ambiguous rows.";
    redirect(`${importPath}?job=${jobId}&error=${encodeURIComponent(message)}`);
  }

  redirect(`${importPath}?job=${jobId}`);
}
