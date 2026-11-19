/** The published Tranco list used here is the top 1 million. */
export const TRANCO_TOP_MILLION = 1_000_000;

export interface TrancoResult {
  domain: string;
  /** Null when the name is outside the published list. */
  rank: number | null;
  date: string | null;
}

export function trancoRankUrl(domain: string): string {
  return `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`;
}

/** The newest daily rank. An empty `ranks` array means the name is unlisted. */
export function parseTrancoResponse(body: unknown, domain: string): TrancoResult | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const ranks = (body as { ranks?: unknown }).ranks;
  if (!Array.isArray(ranks)) {
    return null;
  }

  let latest: { date: string; rank: number } | null = null;
  for (const entry of ranks) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const date = (entry as { date?: unknown }).date;
    const rank = (entry as { rank?: unknown }).rank;
    if (typeof date !== 'string' || typeof rank !== 'number' || !Number.isFinite(rank)) {
      continue;
    }
    if (!latest || date > latest.date) {
      latest = { date, rank };
    }
  }

  const inTopMillion = latest !== null && latest.rank >= 1 && latest.rank <= TRANCO_TOP_MILLION;
  return {
    domain,
    rank: inTopMillion && latest ? latest.rank : null,
    date: inTopMillion && latest ? latest.date : null,
  };
}
