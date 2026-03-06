import { CollectionFilters } from "@/components/collection/collection-filters";
import { CollectionInventoryTable } from "@/components/collection/collection-inventory-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCollectionFilterSearchParams, normalizeCollectionSnapshotFilters } from "@/lib/collection/filters";
import { getCollectionSnapshot } from "@/lib/collection/service";
import { getDeckSummaries } from "@/lib/decks/service";

export default async function CollectionPage({
  searchParams
}: {
  searchParams?: { q?: string; updated?: string; deleted?: string; error?: string; deckFilterMode?: string; deckId?: string };
}) {
  const filters = normalizeCollectionSnapshotFilters({
    query: searchParams?.q,
    deckFilterMode: searchParams?.deckFilterMode,
    deckId: searchParams?.deckId
  });
  const [snapshot, decks] = await Promise.all([getCollectionSnapshot(filters), getDeckSummaries()]);
  const filterSearchParams = buildCollectionFilterSearchParams(filters);
  const exportHref = `/collection/export${filterSearchParams.size > 0 ? `?${filterSearchParams.toString()}` : ""}`;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Collection</p>
          <h2 className="mt-2 font-display text-4xl">Owned cards by exact print</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            This view is the core product difference: set, collector number, finish, and actual free copies are visible
            without leaving the page.
          </p>
        </div>
        <CollectionFilters
          clearHref="/collection"
          deckFilterMode={filters.deckFilterMode}
          deckId={filters.deckId}
          decks={decks.map((deck) => ({ id: deck.id, name: deck.name }))}
          exportHref={exportHref}
          query={filters.query}
        />
      </section>

      {searchParams?.updated === "1" ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">Collection bucket updated.</CardContent>
        </Card>
      ) : null}

      {searchParams?.deleted === "1" ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">Collection items deleted.</CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-300/70 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Owned prints</CardDescription>
            <CardTitle>{snapshot.summary.ownedPrints}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unique cards</CardDescription>
            <CardTitle>{snapshot.summary.uniqueCards}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total copies</CardDescription>
            <CardTitle>{snapshot.summary.totalCopies}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Available copies</CardDescription>
            <CardTitle>{snapshot.summary.availableCopies}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Inventory table</CardTitle>
          <CardDescription>Browse the exact prints you own, then open a print to edit buckets and inspect deck usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <CollectionInventoryTable
            deckFilterMode={filters.deckFilterMode}
            deckId={filters.deckId}
            items={snapshot.items}
            query={filters.query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
