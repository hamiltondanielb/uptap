import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

import { updateCollectionBucketAction } from "@/app/collection/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collectionConditions, collectionFinishes, getCollectionSnapshot } from "@/lib/collection/service";
import { cn } from "@/lib/utils";

export default async function CollectionPage({
  searchParams
}: {
  searchParams?: { q?: string; updated?: string; error?: string };
}) {
  const query = searchParams?.q?.trim() ?? "";
  const snapshot = await getCollectionSnapshot(query);

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
        <div className="flex w-full max-w-3xl flex-col gap-3 md:items-end">
          <form className="w-full max-w-md">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" defaultValue={query} name="q" placeholder="Search by card, set, or collector number" />
            </label>
          </form>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "w-full md:w-auto")}
            href={`/collection/export${query ? `?q=${encodeURIComponent(query)}` : ""}`}
          >
            Export filtered CSV
          </Link>
        </div>
      </section>

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
          <CardDescription>
            Quantities are grouped by exact print ownership buckets instead of collapsing to name-only counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Print</TableHead>
                <TableHead>Edit Bucket</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.items.map((item) => (
                <TableRow key={item.bucketId}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{item.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.colors.length > 0 ? (
                          item.colors.map((color) => (
                            <Badge key={color} variant="outline">
                              {color}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">Colorless</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link className="inline-flex items-center gap-2 font-medium text-primary" href={`/collection/card/${item.printId}`}>
                      {item.setCode} #{item.collectorNumber}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{item.setName}</p>
                  </TableCell>
                  <TableCell>
                    <form action={updateCollectionBucketAction} className="grid gap-3 md:grid-cols-[100px_110px_150px_180px_auto]">
                      <input name="bucketId" type="hidden" value={item.bucketId} />
                      <input name="query" type="hidden" value={query} />
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Total</span>
                        <Input defaultValue={String(item.quantityTotal)} min="0" name="quantityTotal" type="number" />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Available</span>
                        <Input defaultValue={String(item.quantityAvailable)} min="0" name="quantityAvailable" type="number" />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Finish</span>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                          defaultValue={item.finish}
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
                          defaultValue={item.condition}
                          name="condition"
                        >
                          {collectionConditions.map((condition) => (
                            <option key={condition} value={condition}>
                              {condition.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end md:col-span-5">
                        <label className="space-y-1 text-xs">
                          <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Location</span>
                          <Input defaultValue={item.location ?? ""} name="location" placeholder="Binder, staples box, deckbox drawer..." />
                        </label>
                        <Button type="submit" variant="outline">
                          Save
                        </Button>
                      </div>
                    </form>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant="outline">
                        {item.finish} · {item.condition.replaceAll("_", " ")}
                      </Badge>
                      <Badge variant={item.quantityAvailable > 0 ? "success" : "warning"}>
                        {item.quantityAvailable}/{item.quantityTotal} free
                      </Badge>
                      <p className="text-sm text-muted-foreground">{item.location ?? "Unassigned"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
