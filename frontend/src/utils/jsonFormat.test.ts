import { describe, expect, it } from 'vitest';

import { formatJsonPreservingNumberLiterals, tryFormatJsonPreservingNumberLiterals } from './jsonFormat';

describe('formatJsonPreservingNumberLiterals', () => {
  it('preserves large integer literals when pretty-printing', () => {
    const value = '{"id":2108930450594140162,"ids":[1494694751571226624]}';
    const formatted = formatJsonPreservingNumberLiterals(value);

    expect(formatted).toContain('2108930450594140162');
    expect(formatted).toContain('1494694751571226624');
    expect(formatted).not.toContain('2108930450594140200');
    expect(formatted).not.toContain('1494694751571226600');
  });

  it('preserves large integer literals when compacting', () => {
    const value = `{
  "id": 2108930450594140162
}`;
    expect(formatJsonPreservingNumberLiterals(value, 'compact')).toBe('{"id":2108930450594140162}');
  });

  it('normalizes string escapes while keeping number tokens intact', () => {
    const formatted = formatJsonPreservingNumberLiterals('{"name":"\\u4e2d\\u6587","id":2108930450594140162}');

    expect(formatted).toContain('"name": "中文"');
    expect(formatted).toContain('"id": 2108930450594140162');
  });

  it('returns null for invalid json', () => {
    expect(formatJsonPreservingNumberLiterals('{')).toBeNull();
  });

  it('returns parse error details for invalid json', () => {
    const result = tryFormatJsonPreservingNumberLiterals('{');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
