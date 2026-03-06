export const collectionDeckFilterModes = ["all", "in_deck", "not_in_deck", "not_in_any_deck"] as const;

export type CollectionDeckFilterMode = (typeof collectionDeckFilterModes)[number];

export type CollectionSnapshotFilters = {
  query?: string;
  deckFilterMode?: string;
  deckId?: string;
};

export function collectionFilterNeedsDeck(mode: CollectionDeckFilterMode) {
  return mode === "in_deck" || mode === "not_in_deck";
}

export function normalizeCollectionSnapshotFilters(filters: CollectionSnapshotFilters = {}) {
  const query = filters.query?.trim() ?? "";
  const deckFilterMode = collectionDeckFilterModes.includes(filters.deckFilterMode as CollectionDeckFilterMode)
    ? (filters.deckFilterMode as CollectionDeckFilterMode)
    : "all";
  const deckId = filters.deckId?.trim() ?? "";

  return {
    query,
    deckFilterMode,
    deckId
  };
}

export function buildCollectionFilterSearchParams(filters: CollectionSnapshotFilters) {
  const normalized = normalizeCollectionSnapshotFilters(filters);
  const params = new URLSearchParams();

  if (normalized.query) {
    params.set("q", normalized.query);
  }

  if (normalized.deckFilterMode !== "all") {
    params.set("deckFilterMode", normalized.deckFilterMode);
  }

  if (collectionFilterNeedsDeck(normalized.deckFilterMode) && normalized.deckId) {
    params.set("deckId", normalized.deckId);
  }

  return params;
}
