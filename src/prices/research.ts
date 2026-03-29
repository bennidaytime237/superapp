import type { ResearchBrief } from "./types.js";

const MESSARI_BASE = "https://api.messari.io/api/v1";

/**
 * Deep token research via Messari API.
 *
 * Research flow (~$1.00-$1.50 USDC per execution on Base):
 *   1. Asset fundamentals (~$0.05) — market cap, supply, ATH
 *   2. Price timeseries (~$0.18) — 30-day daily candles
 *   3. Sentiment signals (~$0.35) — mindshare, social volume
 *   4. News feed (~$0.55) — recent headlines
 *   5. AI synthesis (~$0.25) — structured research brief
 *
 * Token slugs must be lowercase, hyphenated: "bitcoin", "ethereum", "solana"
 *
 * Related skills: messari-alpha-scout, messari-funding-intel
 */
export class ResearchService {
  /**
   * Run a full research pipeline for a token.
   * Calls Messari endpoints sequentially and synthesizes results.
   */
  async research(slug: string): Promise<ResearchBrief> {
    const [fundamentals, timeseries, sentiment, news] = await Promise.all([
      this.fetchFundamentals(slug),
      this.fetchTimeseries(slug),
      this.fetchSentiment(slug),
      this.fetchNews(slug),
    ]);

    return this.synthesize(slug, fundamentals, timeseries, sentiment, news);
  }

  private async fetchFundamentals(slug: string): Promise<unknown> {
    const res = await fetch(`${MESSARI_BASE}/assets/${slug}/metrics`);
    if (!res.ok) throw new Error(`Messari fundamentals error: ${res.status}`);
    return res.json();
  }

  private async fetchTimeseries(slug: string): Promise<unknown> {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const res = await fetch(
      `${MESSARI_BASE}/assets/${slug}/metrics/price/time-series?start=${start}&end=${end}&interval=1d`
    );
    if (!res.ok) throw new Error(`Messari timeseries error: ${res.status}`);
    return res.json();
  }

  private async fetchSentiment(slug: string): Promise<unknown> {
    const res = await fetch(`${MESSARI_BASE}/assets/${slug}/metrics/sentiment`);
    if (!res.ok) throw new Error(`Messari sentiment error: ${res.status}`);
    return res.json();
  }

  private async fetchNews(slug: string): Promise<unknown> {
    const res = await fetch(`${MESSARI_BASE}/news/${slug}`);
    if (!res.ok) throw new Error(`Messari news error: ${res.status}`);
    return res.json();
  }

  private synthesize(
    slug: string,
    fundamentals: unknown,
    _timeseries: unknown,
    _sentiment: unknown,
    _news: unknown,
  ): ResearchBrief {
    // In production, this would call Messari's AI synthesis endpoint.
    // Here we extract what we can from the fundamentals response.
    const data = fundamentals as Record<string, unknown>;
    const metrics = (data?.data as Record<string, unknown>)?.market_data as Record<string, number> | undefined;

    return {
      symbol: slug,
      summary: `Research brief for ${slug}`,
      price: metrics?.price_usd ?? 0,
      marketCap: metrics?.market_cap ?? 0,
      allTimeHigh: metrics?.ath_price ?? 0,
      sentiment: { mindshare: 0, socialVolume: 0 },
      bullishFactors: [],
      bearishFactors: [],
      riskAssessment: "See full Messari report for detailed analysis",
    };
  }
}
