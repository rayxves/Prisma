import { describe, it, expect } from 'vitest';
import { levenshtein, similarity, buildSuggestedMapping } from '../../utils/fuzzy';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('returns string length for empty vs non-empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
  });

  it('counts single substitution', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
  });

  it('counts single insertion', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
  });

  it('counts single deletion', () => {
    expect(levenshtein('cats', 'cat')).toBe(1);
  });

  it('handles completely different strings', () => {
    expect(levenshtein('abc', 'xyz')).toBe(3);
  });

  it('is symmetric', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(levenshtein('sitting', 'kitten'));
  });
});

describe('similarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(similarity('data_venda', 'data_venda')).toBe(1);
  });

  it('returns 1.0 ignoring case and punctuation', () => {
    expect(similarity('Data Venda', 'datavenda')).toBe(1);
  });

  it('returns > 0.8 for close match', () => {
    expect(similarity('valor_bruto', 'ValorBruto')).toBeGreaterThan(0.8);
  });

  it('returns low score for unrelated strings', () => {
    expect(similarity('data_venda', 'xyz')).toBeLessThan(0.5);
  });

  it('handles empty strings without throwing', () => {
    expect(() => similarity('', '')).not.toThrow();
    expect(similarity('', '')).toBe(1);
  });

  it('handles one empty string', () => {
    expect(similarity('abc', '')).toBe(0);
  });
});

describe('buildSuggestedMapping', () => {
  const FIELDS = ['data_venda', 'valor_bruto', 'produto_nome'] as const;

  it('maps exact header names', () => {
    const result = buildSuggestedMapping(
      ['data_venda', 'valor_bruto', 'produto_nome'],
      FIELDS,
    );
    expect(result['data_venda']).toBe('data_venda');
    expect(result['valor_bruto']).toBe('valor_bruto');
    expect(result['produto_nome']).toBe('produto_nome');
  });

  it('fuzzy-matches close header names', () => {
    const result = buildSuggestedMapping(
      ['DataVenda', 'ValorBruto', 'ProdutoNome'],
      FIELDS,
    );
    expect(result['data_venda']).toBe('DataVenda');
    expect(result['valor_bruto']).toBe('ValorBruto');
    expect(result['produto_nome']).toBe('ProdutoNome');
  });

  it('omits fields with no good match', () => {
    const result = buildSuggestedMapping(['foo', 'bar', 'baz'], FIELDS);
    expect(Object.keys(result).length).toBe(0);
  });

  it('respects custom threshold', () => {
    const result = buildSuggestedMapping(
      ['DataVendaXYZ'],
      ['data_venda'] as const,
      0.95,
    );
    expect(result['data_venda']).toBeUndefined();
  });

  it('returns empty mapping for empty headers', () => {
    expect(buildSuggestedMapping([], FIELDS)).toEqual({});
  });
});
