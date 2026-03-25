import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CollectionPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  filterParams
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  filterParams: URLSearchParams;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const prevParams = new URLSearchParams(filterParams);
  if (page <= 2) {
    prevParams.delete("page");
  } else {
    prevParams.set("page", String(page - 1));
  }

  const nextParams = new URLSearchParams(filterParams);
  nextParams.set("page", String(page + 1));

  return (
    <div className="flex items-center justify-between gap-4 pt-4 text-sm text-muted-foreground">
      <span>
        {start}–{end} of {totalItems}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={`/collection?${prevParams.toString()}`}>
            <Button size="sm" variant="outline">
              Previous
            </Button>
          </Link>
        ) : (
          <Button disabled size="sm" variant="outline">
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Link href={`/collection?${nextParams.toString()}`}>
            <Button size="sm" variant="outline">
              Next
            </Button>
          </Link>
        ) : (
          <Button disabled size="sm" variant="outline">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
