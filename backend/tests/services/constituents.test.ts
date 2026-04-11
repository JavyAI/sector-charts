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

// --- mock axios ---
vi.mock('axios');
import axios from 'axios';

const SAMPLE_CSV = `Symbol,Security,GICS Sector,GICS Sub-Industry,Headquarters Location,Date added,CIK,Founded
AAPL,Apple Inc.,Information Technology,Technology Hardware Storage & Peripherals,"Cupertino, California",1982-11-30,320193,1977
MSFT,Microsoft Corporation,Information Technology,Systems Software,"Redmond, Washington",1994-06-01,789019,1975
JPM,JPMorgan Chase & Co.,Financials,Diversified Banks,"New York, New York",1975-06-30,19617,1799
XOM,Exxon Mobil Corporation,Energy,Integrated Oil & Gas,"Spring, Texas",1928-01-01,34088,1870
`;

// CSV with a quoted Security field containing a comma
const CSV_WITH_QUOTED_COMMA = `Symbol,Security,GICS Sector,GICS Sub-Industry,Headquarters Location,Date added,CIK,Founded
BRK.B,"Berkshire Hathaway Inc., Class B",Financials,Multi-Sector Holdings,"Omaha, Nebraska",2010-02-16,1067983,1839
`;

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
  });

  // ------------------------------------------------------------------ //
  describe('fetchConstituentsFromGitHub', () => {
    it('parses standard CSV rows correctly', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: SAMPLE_CSV });

      const result = await fetchConstituentsFromGitHub();

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject<Constituent>({
        symbol: 'AAPL',
        security: 'Apple Inc.',
        gics_sector: 'Information Technology',
        gics_sub_industry: 'Technology Hardware Storage & Peripherals',
        date_added: '1982-11-30',
        cik: '320193',
        founded: '1977',
      });
      expect(result[2]).toMatchObject({
        symbol: 'JPM',
        gics_sector: 'Financials',
      });
    });

    it('handles quoted fields containing commas', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: CSV_WITH_QUOTED_COMMA });

      const result = await fetchConstituentsFromGitHub();

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BRK.B');
      expect(result[0].security).toBe('Berkshire Hathaway Inc., Class B');
      expect(result[0].gics_sector).toBe('Financials');
    });

    it('handles BOM at start of file', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: '\uFEFF' + SAMPLE_CSV });

      const result = await fetchConstituentsFromGitHub();
      expect(result).toHaveLength(4);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('returns empty array for CSV with only header', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: 'Symbol,Security,GICS Sector,GICS Sub-Industry,Headquarters Location,Date added,CIK,Founded\n',
      });

      const result = await fetchConstituentsFromGitHub();
      expect(result).toHaveLength(0);
    });

    it('throws on network failure', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

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
      // ordered by symbol
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
