"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PrintSearchForm({
  deckId,
  defaultValue,
  commanderQuery
}: {
  deckId: string;
  defaultValue: string;
  commanderQuery: string;
}) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = (new FormData(e.currentTarget).get("q") as string).trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (commanderQuery) params.set("cq", commanderQuery);
    router.push(`/decks/${deckId}?${params.toString()}#print-search`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-row">
      <Input defaultValue={defaultValue} name="q" placeholder="Search cached prints by name, set, or collector number" />
      <Button type="submit" variant="outline">
        Search
      </Button>
    </form>
  );
}
