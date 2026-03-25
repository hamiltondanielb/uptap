"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { deleteCollectionBucketsAction } from "@/app/collection/actions";
import { Button } from "@/components/ui/button";
import { CardImagePreview } from "@/components/ui/card-image-preview";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ManaSymbol } from "@/components/ui/mana-symbol";
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
  imageUrl: string | null;
  colors: string | string[] | null;
};

function parseColors(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try { return (JSON.parse(raw) as string[]).filter(Boolean); } catch { return []; }
}

export function CollectionInventoryTable({
  deckFilterMode,
  deckId,
  items,
  page,
  query
}: {
  deckFilterMode: string;
  deckId: string;
  items: CollectionInventoryItem[];
  page: number;
  query: string;
}) {
  const router = useRouter();
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);
  const allSelected = items.length > 0 && selectedBucketIds.length === items.length;
  const selectedCount = selectedBucketIds.length;
  const selectedBucketIdSet = useMemo(() => new Set(selectedBucketIds), [selectedBucketIds]);

  return (
    <form action={deleteCollectionBucketsAction} className="space-y-4">
      <input name="query" type="hidden" value={query} />
      <input name="deckFilterMode" type="hidden" value={deckFilterMode} />
      <input name="deckId" type="hidden" value={deckId} />
      <input name="page" type="hidden" value={String(page)} />

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm text-rose-900 dark:text-rose-400">
            {selectedCount} collection {selectedCount === 1 ? "row" : "rows"} selected for deletion.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSelectedBucketIds([])} type="button" variant="ghost">
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
            <TableHead className="w-10" />
            <TableHead className="w-10" />
            <TableHead>Card</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Free</TableHead>
            <TableHead>Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const colors = parseColors(item.colors);
            return (
              <TableRow
                key={item.bucketId}
                className="cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("input")) return;
                  router.push(`/collection/card/${item.printId}`);
                }}
              >
                {/* Checkbox */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    aria-label={`Select ${item.name}`}
                    checked={selectedBucketIdSet.has(item.bucketId)}
                    className="h-4 w-4 rounded border-border"
                    name="bucketIds"
                    onChange={(e) =>
                      setSelectedBucketIds((cur) =>
                        e.target.checked
                          ? [...new Set([...cur, item.bucketId])]
                          : cur.filter((id) => id !== item.bucketId)
                      )
                    }
                    type="checkbox"
                    value={item.bucketId}
                  />
                </TableCell>

                {/* Thumbnail with hover preview */}
                <TableCell className="pr-0">
                  <CardImagePreview imageUrl={item.imageUrl} name={item.name}>
                    <div className="relative h-10 w-7 overflow-hidden rounded bg-muted">
                      {item.imageUrl ? (
                        <Image alt={item.name} className="object-cover object-top" fill sizes="28px" src={item.imageUrl} />
                      ) : null}
                    </div>
                  </CardImagePreview>
                </TableCell>

                {/* Card info */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 items-center gap-0.5">
                      {colors.length > 0 ? (
                        colors.map((c) => <ManaSymbol key={c} symbol={c} size={13} />)
                      ) : (
                        <ManaSymbol symbol="C" size={13} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium leading-snug">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.setName} · {item.setCode} #{item.collectorNumber}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <p className="text-sm font-medium">{item.quantityTotal}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">{item.quantityAvailable}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground">{item.location ?? "—"}</p>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </form>
  );
}
