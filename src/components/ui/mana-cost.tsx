import { ManaSymbol } from "@/components/ui/mana-symbol";

// Parses a Scryfall mana cost string like "{3}{W}{B}" and renders each symbol.
export function ManaCost({ cost, size = 16 }: { cost: string | null | undefined; size?: number }) {
  if (!cost) return null;
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1] ?? "");
  if (symbols.length === 0) return <span className="text-sm text-muted-foreground">{cost}</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {symbols.map((sym, i) => (
        <ManaSymbol key={i} symbol={sym} size={size} />
      ))}
    </span>
  );
}
