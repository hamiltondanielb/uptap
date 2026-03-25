import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addPrintToDeckAction, deleteCollectionPrintAction, updateCollectionBucketAction } from "@/app/collection/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { ManaCost } from "@/components/ui/mana-cost";
import { collectionConditions, collectionFinishes, getCollectionPrintDetail } from "@/lib/collection/service";
import { deckSections, getDeckSummaries } from "@/lib/decks/service";

export default async function CollectionPrintPage({
  params,
  searchParams
}: {
  params: { printId: string };
  searchParams?: { updated?: string; error?: string; added?: string };
}) {
  const [detail, decks] = await Promise.all([
    getCollectionPrintDetail(params.printId),
    getDeckSummaries()
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {searchParams?.updated === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Collection bucket updated.</CardContent>
        </Card>
      ) : null}

      {searchParams?.added === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Card added to deck.</CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">{decodeURIComponent(searchParams.error)}</CardContent>
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
                <div className="rounded-2xl bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mana cost</p>
                  <div className="mt-3">
                    {detail.print.manaCost ? (
                      <ManaCost cost={detail.print.manaCost} size={22} />
                    ) : (
                      <span className="text-xl font-semibold text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Owned buckets</p>
                  <p className="mt-3 text-2xl font-semibold">{detail.summary.bucketCount}</p>
                </div>
                <div className="rounded-2xl bg-card p-4">
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
                    <div key={`${deck.deckId}-${deck.section}`} className="rounded-2xl border border-border/70 bg-card p-4">
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
          <CardTitle>Add to deck</CardTitle>
          <CardDescription>Add this print directly to a deck in your collection.</CardDescription>
        </CardHeader>
        <CardContent>
          {decks.length > 0 ? (
            <div className="space-y-3">
              <form action={addPrintToDeckAction} className="grid gap-4 sm:grid-cols-[1fr_160px_100px_auto] sm:items-end">
                <input name="printId" type="hidden" value={detail.print.printId} />
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Deck</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    name="deckId"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Section</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    defaultValue="mainboard"
                    name="section"
                  >
                    {deckSections.map((section) => (
                      <option key={section} value={section}>
                        {section.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Qty</span>
                  <Input
                    defaultValue="1"
                    min="1"
                    max={String(detail.summary.availableCopies)}
                    name="quantity"
                    type="number"
                    disabled={detail.summary.availableCopies === 0}
                  />
                </label>
                <Button type="submit" disabled={detail.summary.availableCopies === 0}>
                  Add to deck
                </Button>
              </form>
              {detail.summary.availableCopies === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All {detail.summary.totalCopies} {detail.summary.totalCopies === 1 ? "copy" : "copies"} of this print are already assigned to decks.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {detail.summary.availableCopies} of {detail.summary.totalCopies} {detail.summary.totalCopies === 1 ? "copy" : "copies"} available to assign.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No decks yet.{" "}
              <Link className="text-primary hover:underline" href="/decks/new">
                Create one
              </Link>{" "}
              to get started.
            </p>
          )}
        </CardContent>
      </Card>

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
            <form key={bucket.id} action={updateCollectionBucketAction} className="rounded-2xl border border-border/70 bg-card p-4">
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
