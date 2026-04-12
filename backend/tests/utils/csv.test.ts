import { describe, it, expect } from 'vitest';
import { splitCsvLine } from '../../src/utils/csv.js';

describe('splitCsvLine', () => {
  it('splits a normal row', () => {
    expect(splitCsvLine('AAPL,Apple Inc.,Technology,2000-01-01')).toEqual([
      'AAPL', 'Apple Inc.', 'Technology', '2000-01-01',
    ]);
  });

  it('handles a quoted field containing a comma', () => {
    expect(splitCsvLine('"Berkshire Hathaway, Inc.",Financials')).toEqual([
      'Berkshire Hathaway, Inc.', 'Financials',
    ]);
  });

  it('handles an escaped double-quote inside a quoted field', () => {
    expect(splitCsvLine('"Say ""hello"" world",next')).toEqual([
      'Say "hello" world', 'next',
    ]);
  });

  it('handles an empty field', () => {
    expect(splitCsvLine('AAPL,,Technology')).toEqual(['AAPL', '', 'Technology']);
  });

  it('handles a single field with no commas', () => {
    expect(splitCsvLine('AAPL')).toEqual(['AAPL']);
  });

  it('handles empty string', () => {
    expect(splitCsvLine('')).toEqual(['']);
  });

  it('handles trailing comma', () => {
    expect(splitCsvLine('A,B,')).toEqual(['A', 'B', '']);
  });
});
