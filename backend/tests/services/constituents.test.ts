import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createSchema } from '../../src/db/schema.js';
import {
  fetchConstituentsFromGitHub,
  storeConstituents,
  getAllConstituents,
  getConstituentsBySector,
  type Constituent,
} from '../../src/services/constituents.js';

// --- in-memory DB wiring ---
let testDb: Database.Database;

vi.mock('../../src/db/connection.js', () => ({
  getDatabase: () => testDb,
}));

// --- mock the shared GitHub helper (constituents.ts now calls this) ---
vi.mock('../../src/services/privateDataSource.js', () => ({
  fetchPrivateCsvFromGitHub: vi.fn(),
}));
import { fetchPrivateCsvFromGitHub } from '../../src/services/privateDataSource.js';

// --- mock config with new flat shape ---
vi.mock('../../src/config.js', () => ({
  config: {
    privateDataRepo: 'JavyAI/sector-data',
    githubToken: 'ghp_test_token',
    constituents: {
      filePath: 'constituents.csv',
    },
    shiller: {
      filePath: 'shiller.csv',
    },
  },
}));

/**
 * Helper: generate a valid CSV with N rows so the validator accepts it.
 * The validator requires at least 100 data rows.
 */
function buildLargeCsv(extraRows: Array<[string, string, string, string]> = []): string {
  const header =
    'Symbol,Security,GICS Sector,GICS Sub-Industry,Headquarters Location,Date added,CIK,Founded';
  const baseRows = [
    ['AAPL', 'Apple Inc.', 'Information Technology', 'Technology Hardware Storage & Peripherals'],
    ['MSFT', 'Microsoft Corporation', 'Information Technology', 'Systems Software'],
    ['JPM', 'JPMorgan Chase & Co.', 'Financials', 'Diversified Banks'],
    ['XOM', 'Exxon Mobil Corporation', 'Energy', 'Integrated Oil & Gas'],
    ...extraRows,
  ];

  // Pad to at least 105 rows so the validator happily passes
  const padding: string[] = [];
  for (let i = baseRows.length; i < 105; i++) {
    padding.push(
      `TKR${i},Filler Corp ${i},Industrials,Building Products,"City, State",2020-01-01,${1000000 + i},1950`,
    );
  }

  const baseRowLines = baseRows.map(
    ([sym, sec, sector, sub]) => `${sym},${sec},${sector},${sub},"City, State",2000-01-01,0,1900`,
  );

  return [header, ...baseRowLines, ...padding].join('\n') + '\n';
}

// CSV with a quoted Security field containing a comma
const CSV_WITH_QUOTED_COMMA = (() => {
  const header =
    'Symbol,Security,GICS Sector,GICS Sub-Industry,Headquarters Location,Date added,CIK,Founded';
  const brkRow = `BRK.B,"Berkshire Hathaway Inc., Class B",Financials,Multi-Sector Holdings,"Omaha, Nebraska",2010-02-16,1067983,1839`;
  const padding: string[] = [];
  for (let i = 0; i < 104; i++) {
    padding.push(
      `TKR${i},Filler Corp ${i},Industrials,Building Products,"City, State",2020-01-01,${1000000 + i},1950`,
    );
  }
  return [header, brkRow, ...padding].join('\n') + '\n';
})();

describe('constituents service', () => {
  beforeAll(() => {
    testDb = new Database(':memory:');
    createSchema(testDb);
  });

  afterAll(() => {
    testDb.close();
  });

  beforeEach(() => {
    testDb.exec('DELETE FROM constituents');
    vi.mocked(fetchPrivateCsvFromGitHub).mockReset();
  });

  // ------------------------------------------------------------------ //
  describe('fetchConstituentsFromGitHub', () => {
    it('calls the shared helper with the configured file path', async () => {
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(buildLargeCsv());

      await fetchConstituentsFromGitHub();

      expect(fetchPrivateCsvFromGitHub).toHaveBeenCalledWith({ filePath: 'constituents.csv' });
    });

    it('parses standard CSV rows correctly', async () => {
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(buildLargeCsv());

      const result = await fetchConstituentsFromGitHub();

      // baseRows(4) + padding(101) = 105
      expect(result.length).toBeGreaterThanOrEqual(105);
      expect(result[0]).toMatchObject<Partial<Constituent>>({
        symbol: 'AAPL',
        security: 'Apple Inc.',
        gics_sector: 'Information Technology',
        gics_sub_industry: 'Technology Hardware Storage & Peripherals',
      });
      const jpm = result.find((r) => r.symbol === 'JPM');
      expect(jpm).toBeDefined();
      expect(jpm?.gics_sector).toBe('Financials');
    });

    it('handles quoted fields containing commas', async () => {
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(CSV_WITH_QUOTED_COMMA);

      const result = await fetchConstituentsFromGitHub();

      const brk = result.find((r) => r.symbol === 'BRK.B');
      expect(brk).toBeDefined();
      expect(brk?.security).toBe('Berkshire Hathaway Inc., Class B');
      expect(brk?.gics_sector).toBe('Financials');
    });

    it('handles BOM at start of file', async () => {
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce('\uFEFF' + buildLargeCsv());

      const result = await fetchConstituentsFromGitHub();
      expect(result.length).toBeGreaterThanOrEqual(105);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('throws validation error for CSV with only header', async () => {
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(
        'Symbol,Security,GICS Sector,GICS Sub-Industry,Headquarters Location,Date added,CIK,Founded\n',
      );

      await expect(fetchConstituentsFromGitHub()).rejects.toThrow(
        /Constituents CSV validation failed/,
      );
    });

    it('throws validation error for CSV missing required column', async () => {
      const badCsv = 'Symbol,Wrong\nAAPL,x\n'.repeat(50);
      vi.mocked(fetchPrivateCsvFromGitHub).mockResolvedValueOnce(badCsv);

      await expect(fetchConstituentsFromGitHub()).rejects.toThrow(
        /Missing required column/,
      );
    });

    it('propagates network failures from the shared helper', async () => {
      vi.mocked(fetchPrivateCsvFromGitHub).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchConstituentsFromGitHub()).rejects.toThrow('Network error');
    });
  });

  // ------------------------------------------------------------------ //
  describe('storeConstituents and retrieval', () => {
    const sampleConstituents: Constituent[] = [
      {
        symbol: 'AAPL',
        security: 'Apple Inc.',
        gics_sector: 'Information Technology',
        gics_sub_industry: 'Technology Hardware Storage & Peripherals',
        date_added: '1982-11-30',
        cik: '320193',
        founded: '1977',
      },
      {
        symbol: 'MSFT',
        security: 'Microsoft Corporation',
        gics_sector: 'Information Technology',
        gics_sub_industry: 'Systems Software',
        date_added: '1994-06-01',
        cik: '789019',
        founded: '1975',
      },
      {
        symbol: 'JPM',
        security: 'JPMorgan Chase & Co.',
        gics_sector: 'Financials',
        gics_sub_industry: 'Diversified Banks',
        date_added: '1975-06-30',
        cik: '19617',
        founded: '1799',
      },
    ];

    it('stores constituents and retrieves all', () => {
      storeConstituents(sampleConstituents);
      const all = getAllConstituents();

      expect(all).toHaveLength(3);
      expect(all[0].symbol).toBe('AAPL');
      expect(all[1].symbol).toBe('JPM');
      expect(all[2].symbol).toBe('MSFT');
    });

    it('upserts: updates existing rows on second call', () => {
      storeConstituents(sampleConstituents);

      const updated = [{ ...sampleConstituents[0], security: 'Apple Inc. (Updated)' }];
      storeConstituents(updated);

      const all = getAllConstituents();
      expect(all).toHaveLength(3);
      const aapl = all.find((c) => c.symbol === 'AAPL');
      expect(aapl?.security).toBe('Apple Inc. (Updated)');
    });

    it('retrieves constituents by sector', () => {
      storeConstituents(sampleConstituents);

      const it_sector = getConstituentsBySector('Information Technology');
      expect(it_sector).toHaveLength(2);
      expect(it_sector.map((c) => c.symbol)).toEqual(['AAPL', 'MSFT']);

      const financials = getConstituentsBySector('Financials');
      expect(financials).toHaveLength(1);
      expect(financials[0].symbol).toBe('JPM');
    });

    it('returns empty array for unknown sector', () => {
      storeConstituents(sampleConstituents);
      const result = getConstituentsBySector('Unknown Sector');
      expect(result).toHaveLength(0);
    });
  });
});
