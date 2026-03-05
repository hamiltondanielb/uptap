import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCollectionPrintDetail } from "@/lib/collection/service";

export default async function CollectionPrintPage({ params }: { params: { printId: string } }) {
  const detail = await getCollectionPrintDetail(params.printId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Print detail</p>
        <h2 className="font-display text-4xl">{detail.owned.name}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{detail.owned.oracleText}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardDescription>
              {detail.owned.setName} · {detail.owned.setCode} #{detail.owned.collectorNumber}
            </CardDescription>
            <CardTitle>Owned print bucket</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-4 text-slate-50">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finish</p>
              <p className="mt-3 text-2xl font-semibold">{detail.owned.finish}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Condition</p>
              <p className="mt-3 text-2xl font-semibold">{detail.owned.condition.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Total copies</p>
              <p className="mt-3 text-2xl font-semibold">{detail.owned.quantityTotal}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Available copies</p>
              <p className="mt-3 text-2xl font-semibold">{detail.owned.quantityAvailable}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deck usage</CardTitle>
            <CardDescription>Prototype view for where this exact print is already referenced.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.usedInDecks.length > 0 ? (
              detail.usedInDecks.map((deck) => (
                <div key={`${deck.deckId}-${deck.section}`} className="rounded-2xl border border-border/70 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{deck.deckName}</p>
                      <p className="text-sm text-muted-foreground">{deck.section}</p>
                    </div>
                    <Badge variant="outline">{deck.quantity} copies</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">This print is not used in any tracked deck yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

