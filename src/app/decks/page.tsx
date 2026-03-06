import Link from "next/link";

import { deleteDeckAction } from "@/app/decks/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDeckSummaries } from "@/lib/decks/service";

export default async function DecksPage({
  searchParams
}: {
  searchParams?: { deleted?: string; error?: string };
}) {
  const decks = await getDeckSummaries();

  return (
    <div className="space-y-6">
      <section className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Decks</p>
          <h2 className="mt-2 font-display text-4xl">Collection-aware deck tracking</h2>
        </div>
        <Link className="text-sm font-medium text-primary" href="/decks/new">
          Create deck
        </Link>
      </section>

      {searchParams?.deleted ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">
            Deleted {decodeURIComponent(searchParams.deleted)}.
          </CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-300/70 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5">
        {decks.map((deck) => (
          <Card key={deck.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardDescription>{deck.format}</CardDescription>
                  <CardTitle>{deck.name}</CardTitle>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{deck.description}</p>
                </div>
                <Badge variant={deck.shortfall > 0 ? "warning" : "success"}>
                  {deck.shortfall > 0 ? `${deck.shortfall} missing` : "In collection"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {deck.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{deck.totalCards} tracked cards</span>
                <Link className="font-medium text-primary" href={`/decks/${deck.id}`}>
                  Open editor
                </Link>
                <form action={deleteDeckAction}>
                  <input name="deckId" type="hidden" value={deck.id} />
                  <input name="returnTo" type="hidden" value="list" />
                  <ConfirmSubmitButton
                    confirmMessage={`Delete ${deck.name}? This removes the deck and all of its entries.`}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Delete deck
                  </ConfirmSubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
