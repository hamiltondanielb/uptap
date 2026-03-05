import Link from "next/link";

import {
  commitImportAction,
  previewImportAction,
  resolveAmbiguousRowsBySetAction,
  resolveImportRowAction,
  searchAllFailedRowsAction,
  searchImportRowCandidatesAction
} from "@/app/collection/import/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getImportJobDetail, getRecentImportJobs } from "@/lib/collection/import";

const csvExample = `quantity,name,set,collector_number,finish
2,Arcane Signet,CLB,297,nonfoil
1,Swords to Plowshares,2XM,312,etched`;

const plainTextExample = `1 Raffine, Scheming Seer
2 Arcane Signet
1 Sol Ring
1 Arcane Signet | CLB | 297 | foil`;

export default async function CollectionImportPage({
  searchParams
}: {
  searchParams?: { job?: string; error?: string; committed?: string };
}) {
  const activeJobId = searchParams?.job;
  const error = searchParams?.error;
  const committed = searchParams?.committed === "1";
  const [activeJob, recentJobs] = await Promise.all([
    activeJobId ? getImportJobDetail(activeJobId) : Promise.resolve(null),
    getRecentImportJobs()
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Import</p>
        <h2 className="mt-2 font-display text-4xl">Bring paper inventory in without losing print fidelity</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Paste a collection list, preview how rows resolve against cached prints, then commit only the matched rows into
          exact-print collection buckets.
        </p>
      </section>

      {error ? (
        <Card className="border-amber-300/70 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{decodeURIComponent(error)}</CardContent>
        </Card>
      ) : null}

      {committed && activeJob ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="flex items-center justify-between gap-4 p-4 text-sm text-emerald-900">
            <span>Import committed. Matched rows were added to your collection.</span>
            <Link className="font-medium" href="/collection">
              Open collection
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Preview import</CardTitle>
            <CardDescription>Use CSV when you know the print. Use plaintext when you only have quantity and card name.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={previewImportAction} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Source type</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    defaultValue="plaintext"
                    name="sourceType"
                  >
                    <option value="plaintext">Plain text</option>
                    <option value="csv">CSV</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Paste data</span>
                  <Textarea
                    name="raw"
                    placeholder={`2 Arcane Signet | CLB | 297 | foil\n1 Swords to Plowshares | 2XM | 312 | etched`}
                  />
                </label>
              </div>
              <Button type="submit">Preview import rows</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Previews are persisted so you can inspect them before committing inventory changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <Link
                  key={job.id}
                  className="block rounded-2xl border border-border/70 bg-white p-4 transition-colors hover:bg-accent/20"
                  href={`/collection/import?job=${job.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{job.sourceType.toUpperCase()} import</p>
                      <p className="text-sm text-muted-foreground">{job.totalRows} rows parsed</p>
                    </div>
                    <Badge variant={job.status === "completed" ? "success" : "outline"}>{job.status}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No import jobs yet.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CSV shape</CardTitle>
            <CardDescription>Recommended import contract for exact-print collection rows.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">{csvExample}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plain text shape</CardTitle>
            <CardDescription>Paste-friendly fallback when your source only has quantity + card name.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">{plainTextExample}</pre>
          </CardContent>
        </Card>
      </section>

      {activeJob ? (
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardDescription>Job {activeJob.job.id.slice(0, 8)}</CardDescription>
                  <CardTitle>Preview summary</CardTitle>
                </div>
                <Badge variant={activeJob.job.status === "completed" ? "success" : "outline"}>{activeJob.job.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rows</p>
                <p className="mt-3 text-3xl font-semibold">{activeJob.job.totalRows}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Matched</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-900">{activeJob.job.matchedRows}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-700">Ambiguous</p>
                <p className="mt-3 text-3xl font-semibold text-amber-900">{activeJob.job.ambiguousRows}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-rose-700">Failed</p>
                <p className="mt-3 text-3xl font-semibold text-rose-900">{activeJob.job.failedRows}</p>
              </div>
            </CardContent>
          </Card>

          {activeJob.job.status !== "completed" && (activeJob.job.failedRows > 0 || activeJob.job.ambiguousRows > 0) ? (
            <Card>
              <CardHeader>
                <CardTitle>Bulk review tools</CardTitle>
                <CardDescription>Use batch actions before dropping to row-by-row fixes.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[auto_1fr]">
                {activeJob.job.failedRows > 0 ? (
                  <form action={searchAllFailedRowsAction}>
                    <input name="jobId" type="hidden" value={activeJob.job.id} />
                    <Button type="submit" variant="outline">
                      Search Scryfall for all failed rows
                    </Button>
                  </form>
                ) : null}
                {activeJob.job.ambiguousRows > 0 ? (
                  <form action={resolveAmbiguousRowsBySetAction} className="flex flex-col gap-3 lg:flex-row">
                    <input name="jobId" type="hidden" value={activeJob.job.id} />
                    <Input name="setCode" placeholder="Bulk resolve ambiguous rows to set code, e.g. CLB" />
                    <Button type="submit" variant="outline">
                      Resolve ambiguous rows by set
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {activeJob.job.status !== "completed" && activeJob.job.matchedRows > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Commit matched rows</CardTitle>
                <CardDescription>
                  Rows that already specify a finish keep it. The defaults below are used for rows without finish metadata.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={commitImportAction} className="grid gap-4 md:grid-cols-[1fr_220px_220px_auto]">
                  <input name="jobId" type="hidden" value={activeJob.job.id} />
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Collection location</span>
                    <Input defaultValue="Import Staging" name="location" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Default finish</span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                      defaultValue="nonfoil"
                      name="defaultFinish"
                    >
                      <option value="nonfoil">Nonfoil</option>
                      <option value="foil">Foil</option>
                      <option value="etched">Etched</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Condition</span>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                      defaultValue="near_mint"
                      name="defaultCondition"
                    >
                      <option value="mint">Mint</option>
                      <option value="near_mint">Near mint</option>
                      <option value="lightly_played">Lightly played</option>
                      <option value="moderately_played">Moderately played</option>
                      <option value="heavily_played">Heavily played</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </label>
                  <div className="flex items-end">
                    <Button type="submit">Commit matched rows</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Row resolution</CardTitle>
              <CardDescription>Resolve ambiguous rows in place, then commit once the rows you care about are matched.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Input</TableHead>
                    <TableHead>Resolved print</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeJob.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.original}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[row.setCode, row.collectorNumber, row.finish].filter(Boolean).join(" · ") || "No print hints provided"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.resolvedCard ? (
                          <div>
                            <p className="font-medium">{row.resolvedCard.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.resolvedCard.setCode} #{row.resolvedCard.collectorNumber} · {row.resolvedCard.setName}
                            </p>
                          </div>
                        ) : row.status === "ambiguous" && row.candidatePrints.length > 0 ? (
                          <form action={resolveImportRowAction} className="space-y-2">
                            <input name="jobId" type="hidden" value={activeJob.job.id} />
                            <input name="rowId" type="hidden" value={row.id} />
                            <select
                              className="flex h-10 w-full min-w-[280px] rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                              defaultValue=""
                              name="printId"
                            >
                              <option disabled value="">
                                Select exact print
                              </option>
                              {row.candidatePrints.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.setCode} #{candidate.collectorNumber} · {candidate.setName}
                                </option>
                              ))}
                            </select>
                            <Button size="sm" type="submit" variant="outline">
                              Resolve row
                            </Button>
                          </form>
                        ) : row.status === "failed" ? (
                          <form action={searchImportRowCandidatesAction} className="space-y-2">
                            <input name="jobId" type="hidden" value={activeJob.job.id} />
                            <input name="rowId" type="hidden" value={row.id} />
                            <Button size="sm" type="submit" variant="outline">
                              Search Scryfall
                            </Button>
                          </form>
                        ) : (
                          <span className="text-sm text-muted-foreground">No resolved print</span>
                        )}
                      </TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "matched" ? "success" : row.status === "ambiguous" ? "warning" : "outline"
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.status === "ambiguous" && row.candidatePrints.length > 0
                          ? `${row.candidatePrints.length} cached print candidates.`
                          : row.status === "failed"
                            ? "No cached print yet. Search Scryfall to fetch candidate prints for this row."
                          : row.errorMessage ?? "Ready to commit"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
