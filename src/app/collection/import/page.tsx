import { redirect } from "next/navigation";

export default function LegacyCollectionImportPage({
  searchParams
}: {
  searchParams?: { job?: string; error?: string; committed?: string };
}) {
  const params = new URLSearchParams();

  if (searchParams?.job) {
    params.set("job", searchParams.job);
  }

  if (searchParams?.error) {
    params.set("error", searchParams.error);
  }

  if (searchParams?.committed) {
    params.set("committed", searchParams.committed);
  }

  redirect(`/import${params.size > 0 ? `?${params.toString()}` : ""}`);
}
