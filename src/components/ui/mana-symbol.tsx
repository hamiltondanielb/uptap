/* eslint-disable @next/next/no-img-element */
// Renders a single MTG mana symbol using Scryfall's official SVGs.
// `symbol` accepts "W", "U", "B", "R", "G", "C", "X", "3", "W/U", etc.

export function ManaSymbol({ symbol, size = 16 }: { symbol: string; size?: number }) {
  const normalized = symbol.toUpperCase().replace(/[{}]/g, "").replace("/", "");
  return (
    <img
      src={`https://svgs.scryfall.io/card-symbols/${normalized}.svg`}
      alt={symbol}
      width={size}
      height={size}
      className="inline-block"
      style={{ width: size, height: size }}
    />
  );
}
