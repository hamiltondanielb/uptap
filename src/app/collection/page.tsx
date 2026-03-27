import { CollectionFilters } from "@/components/collection/collection-filters";
import { CollectionInventoryTable } from "@/components/collection/collection-inventory-table";
import { CollectionPagination } from "@/components/collection/collection-pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { refreshCollectionPricesAction } from "@/app/collection/actions";
import { RefreshPricesButton } from "@/components/ui/refresh-prices-button";
import { buildCollectionFilterSearchParams, normalizeCollectionSnapshotFilters } from "@/lib/collection/filters";
import { getCollectionSnapshot } from "@/lib/collection/service";
import { getDeckSummaries } from "@/lib/decks/service";

const PAGE_SIZE = 50;

export default async function CollectionPage({
  searchParams
}: {
  searchParams?: { q?: string; updated?: string; deleted?: string; error?: string; deckFilterMode?: string; deckId?: string; page?: string; pricesRefreshed?: string };
}) {
  const filters = normalizeCollectionSnapshotFilters({
    query: searchParams?.q,
    deckFilterMode: searchParams?.deckFilterMode,
    deckId: searchParams?.deckId
  });
  const [snapshot, decks] = await Promise.all([getCollectionSnapshot(filters), getDeckSummaries()]);
  const filterSearchParams = buildCollectionFilterSearchParams(filters);
  const exportHref = `/collection/export${filterSearchParams.size > 0 ? `?${filterSearchParams.toString()}` : ""}`;

  const totalItems = snapshot.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(searchParams?.page ?? "1", 10)), totalPages);
  const pagedItems = snapshot.items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <div className="flex flex-wrap items-end gap-3">
          <CollectionFilters
            clearHref="/collection"
            deckFilterMode={filters.deckFilterMode}
            deckId={filters.deckId}
            decks={decks.map((deck) => ({ id: deck.id, name: deck.name }))}
            exportHref={exportHref}
            query={filters.query}
          />
          <form action={refreshCollectionPricesAction}>
            <RefreshPricesButton variant="outline" size="sm">
              Refresh prices
            </RefreshPricesButton>
          </form>
        </div>
      </section>

      {searchParams?.pricesRefreshed != null ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">
            Prices updated for {searchParams.pricesRefreshed} {Number(searchParams.pricesRefreshed) === 1 ? "print" : "prints"}.
          </CardContent>
        </Card>
      ) : null}

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

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
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
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Est. market value</CardDescription>
            <CardTitle>
              {snapshot.summary.totalMarketValue != null
                ? `$${snapshot.summary.totalMarketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—"}
            </CardTitle>
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
            items={pagedItems}
            page={page}
            query={filters.query}
          />
          <CollectionPagination
            filterParams={filterSearchParams}
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
