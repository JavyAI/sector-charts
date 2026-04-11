import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getDatabase } from '../db/connection.js';

export interface Constituent {
  symbol: string;
  security: string;
  gics_sector: string;
  gics_sub_industry: string;
  date_added: string;
  cik: string;
  founded: string;
}

/**
 * Parse CSV text into rows, handling quoted fields (fields may contain commas).
 * Returns array of objects keyed by header row.
 */
function parseCsv(text: string): Record<string, string>[] {
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Split a single CSV line into fields, respecting double-quoted fields.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export async function fetchConstituentsFromGitHub(): Promise<Constituent[]> {
  const { repo, filePath, githubToken } = config.constituents;

  if (!githubToken) {
    throw new Error('GITHUB_TOKEN env var is required to fetch constituents from private repo');
  }

  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  let responseData: string;
  try {
    const response = await axios.get<string>(url, {
      responseType: 'text',
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3.raw',
      },
    });
    responseData = response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      if (status === 401 || status === 403) {
        logger.error({ status, repo, filePath }, 'GitHub token is invalid or lacks repo read scope');
        throw new Error(
          `GitHub API returned ${status}: token is invalid or lacks repo read scope. ` +
            'Ensure GITHUB_TOKEN has "repo" scope (classic) or "Contents: Read" (fine-grained).',
        );
      }
      if (status === 404) {
        logger.error({ status, repo, filePath }, 'GitHub repo or file not found');
        throw new Error(
          `GitHub API returned 404: repo "${repo}" or file "${filePath}" not found. ` +
            'Check CONSTITUENTS_REPO and CONSTITUENTS_FILE_PATH env vars.',
        );
      }
    }
    throw err;
  }

  const rows = parseCsv(responseData);

  const constituents: Constituent[] = [];
  for (const row of rows) {
    const symbol = row['Symbol'];
    if (!symbol) continue;
    constituents.push({
      symbol,
      security: row['Security'] ?? '',
      gics_sector: row['GICS Sector'] ?? '',
      gics_sub_industry: row['GICS Sub-Industry'] ?? '',
      date_added: row['Date added'] ?? '',
      cik: row['CIK'] ?? '',
      founded: row['Founded'] ?? '',
    });
  }

  return constituents;
}

export function storeConstituents(constituents: Constituent[]): void {
  const db = getDatabase();
  const lastUpdated = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO constituents
      (symbol, security, gics_sector, gics_sub_industry, date_added, cik, founded, last_updated)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
      security = excluded.security,
      gics_sector = excluded.gics_sector,
      gics_sub_industry = excluded.gics_sub_industry,
      date_added = excluded.date_added,
      cik = excluded.cik,
      founded = excluded.founded,
      last_updated = excluded.last_updated
  `);

  const upsertMany = db.transaction((rows: Constituent[]) => {
    for (const row of rows) {
      upsert.run(
        row.symbol,
        row.security,
        row.gics_sector,
        row.gics_sub_industry,
        row.date_added,
        row.cik,
        row.founded,
        lastUpdated,
      );
    }
  });

  upsertMany(constituents);
}

export function getAllConstituents(): Constituent[] {
  const db = getDatabase();
  return db
    .prepare('SELECT symbol, security, gics_sector, gics_sub_industry, date_added, cik, founded, last_updated FROM constituents ORDER BY symbol')
    .all() as Constituent[];
}

export function getConstituentsBySector(sector: string): Constituent[] {
  const db = getDatabase();
  return db
    .prepare('SELECT symbol, security, gics_sector, gics_sub_industry, date_added, cik, founded, last_updated FROM constituents WHERE gics_sector = ? ORDER BY symbol')
    .all(sector) as Constituent[];
}
