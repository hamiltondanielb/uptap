import Link from "next/link";
import { ArrowRight, CheckCircle2, LibraryBig, Swords } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCollectionSnapshot } from "@/lib/collection/service";
import { getDeckSummaries } from "@/lib/decks/service";

export default async function HomePage() {
  const [{ summary }, decks] = await Promise.all([getCollectionSnapshot(), getDeckSummaries()]);
  const activeDeck = decks[0];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="overflow-hidden border-none bg-slate-950 text-slate-50">
          <CardHeader className="relative gap-5">
            <Badge className="w-fit" variant="warning">
              Moxfield-style, collection-first
            </Badge>
            <div className="space-y-4">
              <CardTitle className="max-w-3xl text-5xl leading-tight">
                Untap keeps the deck builder, but treats your collection like a real inventory system.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7 text-slate-300">
                Exact print ownership, available-versus-total counts, and deck shortfalls are already wired into the first
                slice.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/collection">
              <Button size="lg">
                Open collection
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/decks">
              <Button variant="outline" size="lg" className="border-white/15 text-slate-100 hover:bg-white/10">
                View decks
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card/85">
          <CardHeader>
            <CardDescription>Current local snapshot</CardDescription>
            <CardTitle>What the app already knows</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-4 text-slate-50">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Owned prints</p>
              <p className="mt-3 text-4xl font-semibold">{summary.ownedPrints}</p>
            </div>
            <div className="rounded-2xl bg-card p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Unique cards</p>
              <p className="mt-3 text-4xl font-semibold">{summary.uniqueCards}</p>
            </div>
            <div className="rounded-2xl bg-card p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Total copies</p>
              <p className="mt-3 text-4xl font-semibold">{summary.totalCopies}</p>
            </div>
            <div className="rounded-2xl bg-card p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Available now</p>
              <p className="mt-3 text-4xl font-semibold">{summary.availableCopies}</p>
            </div>
            <div className="rounded-2xl bg-card p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Est. market value</p>
              <p className="mt-3 text-4xl font-semibold">
                {summary.totalMarketValue != null
                  ? `$${summary.totalMarketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <LibraryBig className="h-5 w-5 text-primary" />
              <CardTitle>Collection-first decisions baked in</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 text-primary" />
              <p>Ownership is tracked by exact print, finish, and condition buckets rather than flattened card totals.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 text-primary" />
              <p>Collection listings show available versus total quantities so decks can expose shortages immediately.</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 text-primary" />
              <p>Scryfall search is isolated behind a typed client so card metadata and local state stay decoupled.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Swords className="h-5 w-5 text-primary" />
              <CardTitle>Deck status</CardTitle>
            </div>
            <CardDescription>First deck summary from the seeded local SQLite database.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeDeck ? (
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl">{activeDeck.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{activeDeck.description}</p>
                  </div>
                  <Badge variant={activeDeck.shortfall > 0 ? "warning" : "success"}>
                    {activeDeck.shortfall > 0 ? `${activeDeck.shortfall} cards short` : "Fully covered"}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeDeck.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{activeDeck.totalCards} tracked cards in prototype deck</span>
                  <Link className="font-medium text-primary" href={`/decks/${activeDeck.id}`}>
                    Open deck
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No decks yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
