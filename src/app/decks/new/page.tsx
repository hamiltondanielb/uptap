import { cacheAndSelectCommanderForNewDeckAction, createDeckAction } from "@/app/decks/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deckFormats, searchCachedPrints } from "@/lib/decks/service";
import { searchCardPrints } from "@/lib/scryfall/client";

export default async function NewDeckPage({
  searchParams
}: {
  searchParams?: { error?: string; cq?: string; commanderId?: string };
}) {
  const commanderQuery = searchParams?.cq?.trim() ?? "";
  const selectedCommanderId = searchParams?.commanderId ?? "";

  const [cachedCommanderResults, liveCommanderSearch] = await Promise.all([
    commanderQuery ? searchCachedPrints(commanderQuery) : Promise.resolve([]),
    commanderQuery
      ? searchCardPrints(commanderQuery)
      : Promise.resolve({ results: [] as Awaited<ReturnType<typeof searchCardPrints>>["results"], error: undefined })
  ]);

  const selectedCachedCommander = cachedCommanderResults.find((result) => result.id === selectedCommanderId) ?? null;
  const selectedLiveCommander = liveCommanderSearch.results.find((result) => result.id === selectedCommanderId) ?? null;
  const selectedCommanderName = selectedCachedCommander?.name ?? selectedLiveCommander?.name ?? null;
  const selectedCommanderSet = selectedCachedCommander?.setCode ?? selectedLiveCommander?.set ?? null;
  const selectedCommanderSetName = selectedCachedCommander?.setName ?? selectedLiveCommander?.setName ?? null;
  const selectedCommanderCollectorNumber =
    selectedCachedCommander?.collectorNumber ?? selectedLiveCommander?.collectorNumber ?? null;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New deck</p>
        <h2 className="mt-2 font-display text-4xl">Create a real deck, not another placeholder</h2>
      </section>

      {searchParams?.error ? (
        <Card className="border-amber-300/70 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Deck metadata</CardTitle>
            <CardDescription>This creates the deck record immediately, then you land on the editor to add cards.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createDeckAction} className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <input name="commanderPrintId" type="hidden" value={selectedCommanderId} />
              <label className="space-y-2 text-sm">
                <span className="font-medium">Deck name</span>
                <Input name="name" placeholder="Esper Connive, Mono-White Tokens, Grixis Reanimator..." />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Format</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                  defaultValue="Commander"
                  name="format"
                >
                  {deckFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm lg:col-span-2">
                <span className="font-medium">Description</span>
                <Textarea name="description" placeholder="What is the deck trying to do, and what cards matter most?" />
              </label>
              <div className="lg:col-span-2">
                <Button type="submit">Create deck</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commander picker</CardTitle>
            <CardDescription>Search cached prints first, then fall back to live Scryfall results that can be cached automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-3">
              <Input defaultValue={commanderQuery} name="cq" placeholder="Search commander prints" />
              {selectedCommanderId ? <input name="commanderId" type="hidden" value={selectedCommanderId} /> : null}
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>

            {selectedCommanderName ? (
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <Badge variant="success">Selected commander</Badge>
                <p className="mt-3 font-medium">{selectedCommanderName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCommanderSetName} · {selectedCommanderSet} #{selectedCommanderCollectorNumber}
                </p>
              </div>
            ) : null}

            {cachedCommanderResults.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Cached</Badge>
                  <p className="text-sm text-muted-foreground">Already available locally.</p>
                </div>
                {cachedCommanderResults.map((result) => (
                  <div key={result.id} className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="font-medium">{result.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.setName} · {result.setCode} #{result.collectorNumber}
                    </p>
                    <div className="mt-3">
                      <a
                        className="text-sm font-medium text-primary"
                        href={`/decks/new?cq=${encodeURIComponent(commanderQuery)}&commanderId=${encodeURIComponent(result.id)}`}
                      >
                        Use cached commander
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {liveCommanderSearch.results.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Live Scryfall</Badge>
                  <p className="text-sm text-muted-foreground">Selecting one will cache it locally first.</p>
                </div>
                {liveCommanderSearch.results.map((result) => (
                  <div key={result.id} className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="font-medium">{result.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.setName} · {result.set} #{result.collectorNumber}
                    </p>
                    <form action={cacheAndSelectCommanderForNewDeckAction} className="mt-3">
                      <input name="query" type="hidden" value={commanderQuery} />
                      <input name="result" type="hidden" value={JSON.stringify(result)} />
                      <Button size="sm" type="submit" variant="outline">
                        Cache and use this commander
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : null}

            {liveCommanderSearch.error ? (
              <p className="text-sm text-muted-foreground">{liveCommanderSearch.error}</p>
            ) : null}

            {!commanderQuery ? <p className="text-sm text-muted-foreground">Search results will appear here.</p> : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
