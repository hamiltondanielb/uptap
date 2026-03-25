import Link from "next/link";

import {
  assignPrintQuantityAction,
  commitImportAction,
  previewImportAction,
  resolveAmbiguousRowsBySetAction,
  resolveImportRowAction,
  searchAllFailedRowsAction,
  switchImportRowPrintAction
} from "@/app/import/actions";
import { CardPreview } from "@/components/import/card-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PendingButton } from "@/components/ui/pending-button";
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
            <CardDescription>Use CSV when you know the print. Paste it or upload a file. Use plaintext when you only have quantity and card name.</CardDescription>
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
              <label className="space-y-2 text-sm">
                <span className="font-medium">Upload CSV</span>
                <Input accept=".csv,text/csv" name="file" type="file" />
                <p className="text-xs text-muted-foreground">Optional for CSV imports. If you upload a file, it will be used instead of pasted CSV text.</p>
              </label>
              <PendingButton pendingText="Searching Scryfall…" type="submit">Preview import rows</PendingButton>
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
                  className="block rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:bg-accent/20"
                  href={`/import?job=${job.id}`}
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
            <CardContent className="grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl bg-card p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rows</p>
                <p className="mt-3 text-3xl font-semibold">{activeJob.job.totalRows}</p>
              </div>
              <div className="rounded-2xl bg-card p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Total cards</p>
                <p className="mt-3 text-3xl font-semibold">{activeJob.rows.reduce((sum, r) => sum + r.quantity, 0)}</p>
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

          {(() => {
            const failedRows = activeJob.rows.filter((r) => r.status === "failed" || r.status === "ambiguous");
            const matchedRows = activeJob.rows.filter((r) => r.status === "matched");

            const renderRow = (row: (typeof activeJob.rows)[number]) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-sm text-muted-foreground">{row.original}</p>
                    <p className="text-xs text-muted-foreground">
                      {[row.setCode, row.collectorNumber, row.finish].filter(Boolean).join(" · ") || "No print hints"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={row.status === "matched" ? "success" : row.status === "ambiguous" ? "warning" : "outline"}>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    {row.resolvedCard ? (
                      <div className="relative flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
                        <CardPreview
                          imageNormal={row.resolvedCard.imageNormal}
                          imageSmall={row.resolvedCard.imageSmall}
                          name={row.resolvedCard.name}
                        />
                        <div>
                          <p className="font-medium">{row.resolvedCard.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {row.resolvedCard.setCode} #{row.resolvedCard.collectorNumber}
                          </p>
                        </div>
                      </div>
                    ) : row.errorMessage ? (
                      <p className="text-sm text-rose-700">{row.errorMessage}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No resolved print yet.</p>
                    )}

                    {row.status !== "matched" && row.candidatePrints.length > 0 ? (
                      row.quantity > 1 ? (
                        <form action={assignPrintQuantityAction} className="space-y-2">
                          <input name="jobId" type="hidden" value={activeJob.job.id} />
                          <input name="rowId" type="hidden" value={row.id} />
                          <p className="text-xs text-muted-foreground">{row.quantity} copies to assign</p>
                          <div className="flex flex-col gap-2 md:flex-row">
                            <select className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm" name="printId">
                              {row.candidatePrints.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.setCode} #{candidate.collectorNumber}
                                </option>
                              ))}
                            </select>
                            <input
                              className="flex h-10 w-20 shrink-0 rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                              defaultValue={1}
                              max={row.quantity}
                              min={1}
                              name="quantity"
                              type="number"
                            />
                            <Button type="submit" variant="outline">Assign</Button>
                          </div>
                        </form>
                      ) : (
                        <form action={resolveImportRowAction} className="flex flex-col gap-3 md:flex-row">
                          <input name="jobId" type="hidden" value={activeJob.job.id} />
                          <input name="rowId" type="hidden" value={row.id} />
                          <select className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm" name="printId">
                            {row.candidatePrints.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} · {candidate.setCode} #{candidate.collectorNumber}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="outline">Use selected print</Button>
                        </form>
                      )
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {(row.status === "failed" || row.status === "ambiguous") && row.candidatePrints.length === 0 ? (
                      <form action={switchImportRowPrintAction}>
                        <input name="jobId" type="hidden" value={activeJob.job.id} />
                        <input name="rowId" type="hidden" value={row.id} />
                        <PendingButton pendingText="Searching…" size="sm" type="submit" variant="outline">
                          Search by name
                        </PendingButton>
                      </form>
                    ) : null}
                    {row.status === "matched" && row.resolvedPrintId ? (
                      <>
                        <form action={resolveImportRowAction}>
                          <input name="jobId" type="hidden" value={activeJob.job.id} />
                          <input name="rowId" type="hidden" value={row.id} />
                          <input name="printId" type="hidden" value={row.resolvedPrintId} />
                          <PendingButton pendingText="Confirming…" type="submit" variant="outline">
                            Confirm match
                          </PendingButton>
                        </form>
                        <form action={switchImportRowPrintAction}>
                          <input name="jobId" type="hidden" value={activeJob.job.id} />
                          <input name="rowId" type="hidden" value={row.id} />
                          <PendingButton pendingText="Searching…" type="submit" variant="ghost">
                            Change print
                          </PendingButton>
                        </form>
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            );

            return (
              <>
                {failedRows.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-rose-700">Needs review ({failedRows.length})</CardTitle>
                          <CardDescription>
                            Select a print from the candidates, or search Scryfall by name to find alternatives.
                          </CardDescription>
                        </div>
                        {activeJob.job.status !== "completed" ? (
                          <form action={searchAllFailedRowsAction}>
                            <input name="jobId" type="hidden" value={activeJob.job.id} />
                            <PendingButton pendingText="Searching…" type="submit" variant="outline">
                              Search all by name
                            </PendingButton>
                          </form>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Input</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Resolution</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>{failedRows.map(renderRow)}</TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : null}

                {matchedRows.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Matched ({matchedRows.length})</CardTitle>
                      <CardDescription>
                        Confirm each match or change the print before committing.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Input</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Resolution</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>{matchedRows.map(renderRow)}</TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            );
          })()}
        </section>
      ) : null}
    </div>
  );
}
