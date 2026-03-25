import Link from "next/link";

import { deleteDeckAction } from "@/app/decks/actions";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ManaSymbol } from "@/components/ui/mana-symbol";
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
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">
            Deleted {decodeURIComponent(searchParams.deleted)}.
          </CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {decks.map((deck) => (
          <div key={deck.id} className="relative">
            {/* Full-card link underneath interactive elements */}
            <Link href={`/decks/${deck.id}`} className="absolute inset-0 rounded-xl" aria-label={`Open ${deck.name}`} />
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col p-5">
                {/* Top row: format + status badge */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{deck.format}</p>
                  <Badge variant={deck.shortfall > 0 ? "warning" : "success"} className="shrink-0">
                    {deck.shortfall > 0 ? `${deck.shortfall} missing` : "In collection"}
                  </Badge>
                </div>

                {/* Deck name */}
                <p className="mt-1.5 font-display text-xl leading-snug">{deck.name}</p>

                {/* Description */}
                {deck.description ? (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>
                ) : null}

                {/* Color identity */}
                {deck.colorIdentity.length > 0 ? (
                  <div className="mt-3 flex items-center gap-1">
                    {deck.colorIdentity.map((color) => (
                      <ManaSymbol key={color} symbol={color} size={18} />
                    ))}
                  </div>
                ) : null}

                {/* Tags */}
                {deck.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {deck.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {/* Footer */}
                <div className="relative mt-auto flex items-center justify-between pt-4">
                  <span className="text-sm text-muted-foreground">{deck.totalCards} cards</span>
                  <form action={deleteDeckAction}>
                    <input name="deckId" type="hidden" value={deck.id} />
                    <input name="returnTo" type="hidden" value="list" />
                    <ConfirmSubmitButton
                      confirmMessage={`Delete ${deck.name}? This removes the deck and all of its entries.`}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </section>
    </div>
  );
}
