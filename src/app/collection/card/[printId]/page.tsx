import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCollectionPrintAction, updateCollectionBucketAction } from "@/app/collection/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { collectionConditions, collectionFinishes, getCollectionPrintDetail } from "@/lib/collection/service";

export default async function CollectionPrintPage({
  params,
  searchParams
}: {
  params: { printId: string };
  searchParams?: { updated?: string; error?: string };
}) {
  const detail = await getCollectionPrintDetail(params.printId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {searchParams?.updated === "1" ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">Collection bucket updated.</CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-300/70 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {detail.print.imageUrl ? (
              <div className="relative aspect-[5/7] w-full bg-slate-950/95">
                <Image alt={detail.print.name} className="object-contain" fill sizes="(min-width: 1280px) 360px, (min-width: 1024px) 320px, 100vw" src={detail.print.imageUrl} />
              </div>
            ) : (
              <div className="flex aspect-[5/7] items-center justify-center bg-slate-950 px-6 text-center text-sm text-slate-300">
                Card image unavailable for this print.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <section className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Print detail</p>
            <h2 className="font-display text-4xl">{detail.print.name}</h2>
            <p className="text-sm text-muted-foreground">
              {detail.print.setName} · {detail.print.setCode} #{detail.print.collectorNumber}
            </p>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{detail.print.oracleText}</p>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Print overview</CardTitle>
                <CardDescription>Exact-print metadata and totals across all owned buckets for this printing.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-950 p-4 text-slate-50">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Type line</p>
                  <p className="mt-3 text-lg font-semibold">{detail.print.typeLine ?? "Unknown type"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mana cost</p>
                  <p className="mt-3 text-2xl font-semibold">{detail.print.manaCost ?? "None"}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Owned buckets</p>
                  <p className="mt-3 text-2xl font-semibold">{detail.summary.bucketCount}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Total copies</p>
                  <p className="mt-3 text-2xl font-semibold">
                    {detail.summary.totalCopies} total · {detail.summary.availableCopies} free
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deck usage</CardTitle>
                <CardDescription>Every tracked deck entry that references this exact print.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.usedInDecks.length > 0 ? (
                  detail.usedInDecks.map((deck) => (
                    <div key={`${deck.deckId}-${deck.section}`} className="rounded-2xl border border-border/70 bg-white p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <Link className="font-medium text-primary hover:underline" href={`/decks/${deck.deckId}`}>
                            {deck.deckName}
                          </Link>
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
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Owned buckets</CardTitle>
              <CardDescription>Edit the finish, condition, quantities, and location for each owned bucket of this print.</CardDescription>
            </div>
            <form action={deleteCollectionPrintAction}>
              <input name="printId" type="hidden" value={detail.print.printId} />
              <ConfirmSubmitButton
                className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                confirmMessage={`Delete ${detail.print.name} from the collection? This will remove all owned buckets for this exact print.`}
                variant="outline"
              >
                Delete print
              </ConfirmSubmitButton>
            </form>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.ownedBuckets.map((bucket) => (
            <form key={bucket.id} action={updateCollectionBucketAction} className="rounded-2xl border border-border/70 bg-white p-4">
              <input name="bucketId" type="hidden" value={bucket.id} />
              <input name="redirectTo" type="hidden" value="detail" />
              <input name="redirectPrintId" type="hidden" value={detail.print.printId} />
              <div className="grid gap-3 md:grid-cols-[110px_110px_150px_180px]">
                <label className="space-y-1 text-xs">
                  <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Total</span>
                  <Input defaultValue={String(bucket.quantityTotal)} min="0" name="quantityTotal" type="number" />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Available</span>
                  <Input defaultValue={String(bucket.quantityAvailable)} min="0" name="quantityAvailable" type="number" />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Finish</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    defaultValue={bucket.finish}
                    name="finish"
                  >
                    {collectionFinishes.map((finish) => (
                      <option key={finish} value={finish}>
                        {finish}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Condition</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    defaultValue={bucket.condition}
                    name="condition"
                  >
                    {collectionConditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <label className="space-y-1 text-xs">
                  <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Location</span>
                  <Input defaultValue={bucket.location ?? ""} name="location" placeholder="Binder, staples box, deckbox drawer..." />
                </label>
                <Button type="submit" variant="outline">
                  Save bucket
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Set total to 0 to delete this bucket.</p>
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
