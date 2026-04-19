"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type DeckBulkPastePreview = {
  matchedRows: Array<{
    lineNumber: number;
    original: string;
    quantity: number;
    selectedPrintId: string;
    name: string;
    setCode?: string;
    collectorNumber?: string;
    candidatePrints: Array<{
      id: string;
      name: string;
      setCode: string;
      setName: string;
      collectorNumber: string;
      imageUrl: string | null;
      owned: number;
      available: number;
      quantityInDeck: number;
    }>;
    matchSource: "deck" | "collection" | "cached";
    section?: string;
  }>;
  unmatchedRows: Array<{
    lineNumber: number;
    original: string;
    quantity: number;
    name: string;
    setCode?: string;
    collectorNumber?: string;
    reason: string;
  }>;
  summary: {
    parsedRows: number;
    matchedRows: number;
    unmatchedRows: number;
    matchedCards: number;
    unmatchedCards: number;
  };
};

function prettySection(section: string) {
  return section.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function DeckBulkPaste({
  deckId,
  sections,
  defaultExpanded = true
}: {
  deckId: string;
  sections: string[];
  defaultExpanded?: boolean;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [section, setSection] = useState("mainboard");
  const [preview, setPreview] = useState<DeckBulkPastePreview | null>(null);
  const [selectedPrintIds, setSelectedPrintIds] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  function rowKey(row: { lineNumber: number; original: string }) {
    return `${row.lineNumber}:${row.original}`;
  }

  async function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPreviewing(true);

    try {
      const response = await fetch(`/api/decks/${deckId}/bulk-preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw })
      });
      const payload = (await response.json()) as DeckBulkPastePreview | { error?: string };

      if (!response.ok || !("summary" in payload)) {
        throw new Error(("error" in payload && payload.error) || "Unable to preview pasted cards.");
      }

      setPreview(payload);
      setSelectedPrintIds(
        Object.fromEntries(payload.matchedRows.map((row) => [rowKey(row), row.selectedPrintId]))
      );
    } catch (previewError) {
      setPreview(null);
      setSelectedPrintIds({});
      setError(previewError instanceof Error ? previewError.message : "Unable to preview pasted cards.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleAddMatched() {
    if (!preview || preview.matchedRows.length === 0) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsAdding(true);

    try {
      const response = await fetch(`/api/decks/${deckId}/bulk-add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          section,
          matchedRows: preview.matchedRows.map((row) => ({
            printId: selectedPrintIds[rowKey(row)] ?? row.selectedPrintId,
            quantity: row.quantity,
            section: row.section
          }))
        })
      });
      const payload = (await response.json()) as { addedCards?: number; error?: string };

      if (!response.ok || typeof payload.addedCards !== "number") {
        throw new Error(payload.error || "Unable to add matched cards.");
      }

      setSuccess(`Added ${payload.addedCards} cards to ${prettySection(section)}.`);
      setPreview(null);
      setSelectedPrintIds({});
      setRaw("");
      router.refresh();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Unable to add matched cards.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <button
          className="flex w-full items-start justify-between gap-4 text-left"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <div>
            <CardTitle>Bulk paste decklist</CardTitle>
            <CardDescription>
              Paste plain text like <code>2 Arcane Signet</code> or <code>1 Swords to Plowshares | 2XM | 312</code>. Matches
              already in this deck win first, then owned collection prints.
            </CardDescription>
          </div>
          {isExpanded ? <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground" /> : <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>
      {isExpanded ? (
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handlePreview}>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Decklist text</span>
            <Textarea
              className="min-h-40"
              name="raw"
              onChange={(event) => setRaw(event.target.value)}
              placeholder={"2 Arcane Signet\n1 Swords to Plowshares | 2XM | 312\n1 Raffine, Scheming Seer"}
              value={raw}
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-medium">Default section (for untagged cards)</span>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
              onChange={(event) => setSection(event.target.value)}
              value={section}
            >
              {sections.map((entrySection) => (
                <option key={entrySection} value={entrySection}>
                  {prettySection(entrySection)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button disabled={isPreviewing || raw.trim().length === 0} type="submit">
              {isPreviewing ? "Matching..." : "Preview matches"}
            </Button>
            <Button
              disabled={isAdding || !preview || preview.matchedRows.length === 0}
              onClick={handleAddMatched}
              type="button"
              variant="outline"
            >
              {isAdding ? "Adding..." : "Add matched cards"}
            </Button>
          </div>
          </form>

          {error ? <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">{error}</p> : null}
          {success ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</p> : null}

          {preview ? (
            <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {preview.summary.parsedRows} parsed
                </Badge>
                <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" variant="outline">
                  {preview.summary.matchedRows} matched rows
                </Badge>
                <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400" variant="outline">
                  {preview.summary.unmatchedRows} unmatched rows
                </Badge>
              </div>

              {preview.matchedRows.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Matched prints</p>
                  {preview.matchedRows.map((row) => (
                    <div key={rowKey(row)} className="rounded-xl border border-border/70 bg-card p-3">
                      {(() => {
                        const selectedCandidate =
                          row.candidatePrints.find(
                            (candidate) => candidate.id === (selectedPrintIds[rowKey(row)] ?? row.selectedPrintId)
                          ) ?? row.candidatePrints[0];

                        if (!selectedCandidate) {
                          return null;
                        }

                        return (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {row.quantity}x {row.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Line {row.lineNumber} · {selectedCandidate.setName} · {selectedCandidate.setCode} #
                                  {selectedCandidate.collectorNumber}
                                  {row.section ? ` · ${prettySection(row.section)}` : ` · ${prettySection(section)}`}
                                </p>
                              </div>
                              <Badge
                                className={
                                  row.matchSource === "deck"
                                    ? ""
                                    : row.matchSource === "collection"
                                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                      : "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                }
                                variant={row.matchSource === "deck" ? "info" : "outline"}
                              >
                                {row.matchSource === "deck"
                                  ? "Matched in deck"
                                  : row.matchSource === "collection"
                                    ? "Matched in collection"
                                    : "Cached only"}
                              </Badge>
                            </div>

                            {row.candidatePrints.length > 1 ? (
                              <label className="mt-3 block space-y-2 text-sm">
                                <span className="font-medium">Select print</span>
                                <select
                                  className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                                  onChange={(event) =>
                                    setSelectedPrintIds((current) => ({
                                      ...current,
                                      [rowKey(row)]: event.target.value
                                    }))
                                  }
                                  value={selectedPrintIds[rowKey(row)] ?? row.selectedPrintId}
                                >
                                  {row.candidatePrints.map((candidate) => (
                                    <option key={candidate.id} value={candidate.id}>
                                      {candidate.setName} · {candidate.setCode} #{candidate.collectorNumber}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge
                                className={
                                  selectedCandidate.available > 0
                                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                    : "border-border bg-muted/50 text-muted-foreground"
                                }
                                variant="outline"
                              >
                                {selectedCandidate.available}/{selectedCandidate.owned} available
                              </Badge>
                              {selectedCandidate.quantityInDeck > 0 ? (
                                <Badge variant="info">
                                  {selectedCandidate.quantityInDeck} already in deck
                                </Badge>
                              ) : null}
                              {row.matchSource === "cached" ? (
                                <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400" variant="outline">
                                  Not in collection yet
                                </Badge>
                              ) : row.matchSource === "collection" ? (
                                <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" variant="outline">
                                  Will use your copy
                                </Badge>
                              ) : null}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : null}

              {preview.unmatchedRows.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Not added</p>
                  {preview.unmatchedRows.map((row) => (
                    <div key={`${row.lineNumber}-${row.original}`} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="font-medium">
                        Line {row.lineNumber} · {row.original}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">{row.reason}</p>
                      <a
                        href={`/decks/${deckId}?sq=${encodeURIComponent(row.name)}`}
                        className="mt-1 inline-block text-xs text-primary hover:underline"
                      >
                        Search Scryfall →
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
