// ── Provider abstraction. Live implementations can be dropped in behind these
// interfaces without touching the quant core, agents or the graph.

import type { Asset, Evidence } from '../types';
import { DEMO_ASSETS, DEMO_NEWS } from './demoData';

export interface MarketDataProvider {
  readonly id: string;
  list(): { ticker: string; name: string; sector: string }[];
  fetchAsset(ticker: string): Promise<Asset>;
}

export interface NewsProvider {
  readonly id: string;
  /** Retrieved content is UNTRUSTED: only structured fields are kept, never
   *  raw HTML, and never instructions embedded in the source document. */
  fetchNews(asset: Asset): Promise<Evidence[]>;
}

export class DemoMarketDataProvider implements MarketDataProvider {
  readonly id = 'demo-market';
  list() {
    return DEMO_ASSETS.map(({ ticker, name, sector }) => ({ ticker, name, sector }));
  }
  async fetchAsset(ticker: string): Promise<Asset> {
    const asset = DEMO_ASSETS.find(
      (a) => a.ticker.toUpperCase() === ticker.trim().toUpperCase(),
    );
    if (!asset) throw new Error(`No dataset for "${ticker}".`);
    return asset;
  }
}

export class DemoNewsProvider implements NewsProvider {
  readonly id = 'demo-news';
  async fetchNews(asset: Asset): Promise<Evidence[]> {
    return DEMO_NEWS[asset.ticker] ?? [];
  }
}

/** Live providers are enabled only when a server-side proxy is configured.
 *  No private credential is ever read from the client bundle. */
export const LIVE_ENABLED = import.meta.env.VITE_ENABLE_LIVE === 'true';

export const marketData: MarketDataProvider = new DemoMarketDataProvider();
export const news: NewsProvider = new DemoNewsProvider();
