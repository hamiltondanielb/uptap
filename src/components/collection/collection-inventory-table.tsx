"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { deleteCollectionBucketsAction } from "@/app/collection/actions";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CollectionInventoryItem = {
  bucketId: string;
  printId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  quantityTotal: number;
  quantityAvailable: number;
  location: string | null;
};

export function CollectionInventoryTable({
  deckFilterMode,
  deckId,
  items,
  query
}: {
  deckFilterMode: string;
  deckId: string;
  items: CollectionInventoryItem[];
  query: string;
}) {
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);
  const allSelected = items.length > 0 && selectedBucketIds.length === items.length;
  const selectedCount = selectedBucketIds.length;
  const selectedBucketIdSet = useMemo(() => new Set(selectedBucketIds), [selectedBucketIds]);

  return (
    <form action={deleteCollectionBucketsAction} className="space-y-4">
      <input name="query" type="hidden" value={query} />
      <input name="deckFilterMode" type="hidden" value={deckFilterMode} />
      <input name="deckId" type="hidden" value={deckId} />

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-900">
            {selectedCount} collection {selectedCount === 1 ? "row" : "rows"} selected for deletion.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setSelectedBucketIds([])}
              type="button"
              variant="ghost"
            >
              Clear selection
            </Button>
            <ConfirmSubmitButton
              className="border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
              confirmMessage={`Delete ${selectedCount} selected collection ${selectedCount === 1 ? "row" : "rows"}? This cannot be undone.`}
              variant="outline"
            >
              Delete selected
            </ConfirmSubmitButton>
          </div>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                aria-label="Select all collection rows"
                checked={allSelected}
                className="h-4 w-4 rounded border-border"
                onChange={(event) => setSelectedBucketIds(event.target.checked ? items.map((item) => item.bucketId) : [])}
                type="checkbox"
              />
            </TableHead>
            <TableHead>Card</TableHead>
            <TableHead>Print</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Free</TableHead>
            <TableHead>Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.bucketId}>
              <TableCell>
                <input
                  aria-label={`Select ${item.name} ${item.setCode} ${item.collectorNumber}`}
                  checked={selectedBucketIdSet.has(item.bucketId)}
                  className="h-4 w-4 rounded border-border"
                  name="bucketIds"
                  onChange={(event) =>
                    setSelectedBucketIds((current) =>
                      event.target.checked
                        ? [...new Set([...current, item.bucketId])]
                        : current.filter((bucketId) => bucketId !== item.bucketId)
                    )
                  }
                  type="checkbox"
                  value={item.bucketId}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Link className="font-medium text-primary hover:underline" href={`/collection/card/${item.printId}`}>
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {item.setCode} · {item.collectorNumber}
                  </p>
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
                <p className="text-sm font-medium text-foreground">{item.quantityTotal}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm font-medium text-foreground">{item.quantityAvailable}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm text-muted-foreground">{item.location ?? "Unassigned"}</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </form>
  );
}
