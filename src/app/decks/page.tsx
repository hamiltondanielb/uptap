import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDeckSummaries } from "@/lib/decks/service";

export default async function DecksPage() {
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
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>{deck.totalCards} tracked cards</span>
                <Link className="font-medium text-primary" href={`/decks/${deck.id}`}>
                  Open editor
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
