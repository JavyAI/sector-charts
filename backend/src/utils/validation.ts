/**
 * Validates a sector name against the allowed GICS character set.
 * Allows letters, spaces, ampersand, comma, and hyphen.
 * Max length: 100 characters.
 */
export function validateSectorName(name: string): boolean {
  if (!name || name.length > 100) return false;
  return /^[a-zA-Z\s&,-]+$/.test(name);
}

export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a constituents CSV string.
 * Required columns: Symbol, Security, GICS Sector, GICS Sub-Industry
 * Checks header row, at least 100 data rows, no empty Symbol or GICS Sector.
 */
export function validateConstituentsCsv(csv: string): CsvValidationResult {
  const errors: string[] = [];
  const clean = csv.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { valid: false, errors: ['CSV has no data rows'] };
  }

  const header = lines[0];
  const requiredColumns = ['Symbol', 'Security', 'GICS Sector', 'GICS Sub-Industry'];
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      errors.push(`Missing required column: "${col}"`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const dataRows = lines.slice(1);
  if (dataRows.length < 100) {
    errors.push(`Expected at least 100 data rows, got ${dataRows.length}`);
  }

  // Parse header indices for Symbol and GICS Sector
  const headers = header.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const symbolIdx = headers.indexOf('Symbol');
  const sectorIdx = headers.indexOf('GICS Sector');

  let emptySymbol = 0;
  let emptySector = 0;
  for (const line of dataRows) {
    const cols = line.split(',');
    const symbol = (cols[symbolIdx] ?? '').trim().replace(/^"|"$/g, '');
    const sector = (cols[sectorIdx] ?? '').trim().replace(/^"|"$/g, '');
    if (!symbol) emptySymbol++;
    if (!sector) emptySector++;
  }

  if (emptySymbol > 0) {
    errors.push(`Found ${emptySymbol} rows with empty Symbol`);
  }
  if (emptySector > 0) {
    errors.push(`Found ${emptySector} rows with empty GICS Sector`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a Shiller historical S&P 500 CSV string.
 * Required first column: Date; also expects SP500, Dividend, Earnings columns.
 * Checks at least 100 data rows; Date column must parse as YYYY-MM or YYYY-MM-DD.
 */
export function validateShillerCsv(csv: string): CsvValidationResult {
  const errors: string[] = [];
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { valid: false, errors: ['CSV has no data rows'] };
  }

  const header = lines[0];
  const requiredColumns = ['Date', 'SP500', 'Dividend', 'Earnings'];
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      errors.push(`Missing required column: "${col}"`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const dataRows = lines.slice(1);
  if (dataRows.length < 100) {
    errors.push(`Expected at least 100 data rows, got ${dataRows.length}`);
  }

  // Check date format on first few rows (YYYY-MM or YYYY-MM-DD or YYYY.MM)
  const datePattern = /^\d{4}[-\.]\d{2}([-\.]\d{2})?$/;
  let badDates = 0;
  const sampleSize = Math.min(5, dataRows.length);
  for (let i = 0; i < sampleSize; i++) {
    const cols = dataRows[i].split(',');
    const dateVal = (cols[0] ?? '').trim();
    if (dateVal && !datePattern.test(dateVal)) {
      badDates++;
    }
  }

  if (badDates > 0) {
    errors.push(`Date column does not appear to be in YYYY-MM or YYYY-MM-DD format (${badDates} bad samples)`);
  }

  return { valid: errors.length === 0, errors };
}
