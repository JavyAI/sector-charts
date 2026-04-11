import axios from 'axios';
import { config } from '../config.js';

const POLYGON_BASE_URL = 'https://api.polygon.io';

interface PolygonTicker {
  ticker: string;
  name: string;
  market_cap: number | null;
  last_quote: {
    bid: number;
    ask: number;
  };
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
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

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
    const startTime = Date.now();
    let requestCount = 0;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeInWindow = now - startTime;

      if (requestCount >= config.rateLimiting.requests && timeInWindow < config.rateLimiting.windowMs) {
        const waitTime = config.rateLimiting.windowMs - timeInWindow;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      const request = this.requestQueue.shift();
      if (request) {
        await request();
        requestCount++;
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get S&P 500 constituents
   */
  async getSP500Constituents(): Promise<string[]> {
    return this.queueRequest(async () => {
      const response = await axios.get(`${POLYGON_BASE_URL}/v3/reference/indices/constituents/GSPC`, {
        params: { apikey: this.apiKey },
      });
      return response.data.results || [];
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
        const params: Record<string, any> = { apikey: this.apiKey };
        if (date) {
          params.date = date;
        }

        const response = await axios.get(`${POLYGON_BASE_URL}/v3/reference/tickers/${symbol}/financials`, params);
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
  async getHistoricalBars(symbol: string, from: string, to: string): Promise<any[]> {
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
