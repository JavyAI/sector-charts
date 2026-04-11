import axios from 'axios';
import { config } from '../config.js';

const POLYGON_BASE_URL = 'https://api.polygon.io';

export interface PolygonBar {
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  vw?: number; // volume weighted avg price
  t: number; // timestamp
  n?: number; // transactions
}

interface PolygonTicker {
  ticker: string;
  name: string;
  market_cap: number | null;
}

interface PolygonFundamentals {
  ticker: string;
  valuation_metrics: {
    pe_ratio: number | null;
  };
  market_data: {
    market_cap: number | null;
    shares_outstanding: number | null;
  };
  earnings: {
    basic_eps: number | null;
  };
}

export class PolygonService {
  private apiKey: string;
  private requestQueue: Array<() => Promise<unknown>> = [];
  private isProcessing = false;
  private windowStartTime = Date.now();
  private windowRequestCount = 0;

  constructor() {
    this.apiKey = config.polygonApiKey;
  }

  /**
   * Queue API requests to respect rate limits
   */
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeInWindow = now - this.windowStartTime;

      // ALWAYS reset window if it's expired
      if (timeInWindow >= config.rateLimiting.windowMs) {
        this.windowStartTime = now;
        this.windowRequestCount = 0;
      }

      // Now check if we need to throttle
      if (this.windowRequestCount >= config.rateLimiting.requests) {
        const waitTime = config.rateLimiting.windowMs - (Date.now() - this.windowStartTime);
        if (waitTime > 0) {
          console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        // After waiting, reset window for the new request
        this.windowStartTime = Date.now();
        this.windowRequestCount = 0;
      }

      const request = this.requestQueue.shift();
      if (request) {
        await request();
        this.windowRequestCount++;
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get S&P 500 constituents
   */
  async getSP500Constituents(): Promise<string[]> {
    return this.queueRequest(async () => {
      try {
        // Note: This endpoint requires the appropriate Polygon plan.
        // If it 404s in production, consider: 1) hardcoding S&P 500, 2) fetching from wikipedia, 3) using an alternative source.
        const response = await axios.get(`${POLYGON_BASE_URL}/v3/reference/indices/constituents/GSPC`, {
          params: { apikey: this.apiKey },
        });
        return (response.data.results || []).map((item: { ticker?: string; symbol?: string }) => item.ticker || item.symbol);
      } catch (error) {
        console.error('Failed to fetch S&P 500 constituents:', error);
        return [];
      }
    });
  }

  /**
   * Get ticker details including market cap
   */
  async getTickerDetails(symbol: string): Promise<PolygonTicker | null> {
    return this.queueRequest(async () => {
      try {
        const response = await axios.get(`${POLYGON_BASE_URL}/v3/reference/tickers/${symbol}`, {
          params: { apikey: this.apiKey },
        });
        return response.data.results || null;
      } catch (error) {
        console.error(`Error fetching ticker details for ${symbol}:`, error);
        return null;
      }
    });
  }

  /**
   * Get stock fundamentals (P/E ratio, market cap, EPS)
   */
  async getStockFundamentals(symbol: string, date?: string): Promise<PolygonFundamentals | null> {
    return this.queueRequest(async () => {
      try {
        const params: Record<string, string> = { apikey: this.apiKey };
        if (date) {
          params.date = date;
        }

        const response = await axios.get(`${POLYGON_BASE_URL}/v3/reference/tickers/${symbol}/financials`, { params });
        return response.data.results?.[0] || null;
      } catch (error) {
        console.error(`Error fetching fundamentals for ${symbol}:`, error);
        return null;
      }
    });
  }

  /**
   * Get historical daily bars for a stock
   */
  async getHistoricalBars(symbol: string, from: string, to: string): Promise<PolygonBar[]> {
    return this.queueRequest(async () => {
      try {
        const response = await axios.get(`${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`, {
          params: { apikey: this.apiKey, sort: 'asc' },
        });
        return response.data.results || [];
      } catch (error) {
        console.error(`Error fetching historical bars for ${symbol}:`, error);
        return [];
      }
    });
  }
}

export const polygonService = new PolygonService();
