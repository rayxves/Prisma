export function levenshtein(a: string, b: string): number {
  const n = b.length;
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const curr: number[] = new Array<number>(n + 1);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j]   ?? 0) + 1,
        (curr[j-1] ?? 0) + 1,
        (prev[j-1] ?? 0) + cost,
      );
    }
    prev = curr;
  }

  return prev[n] ?? 0;
}

export function similarity(a: string, b: string): number {
  const norm  = a.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
  const normB = b.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
  const dist  = levenshtein(norm, normB);
  return 1 - dist / Math.max(norm.length, normB.length, 1);
}

export function buildSuggestedMapping(
  headers:        string[],
  internalFields: readonly string[],
  threshold       = 0.4,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const field of internalFields) {
    let bestHeader = '';
    let bestScore  = 0;
    for (const header of headers) {
      const score = similarity(field, header);
      if (score > bestScore) {
        bestScore  = score;
        bestHeader = header;
      }
    }
    if (bestScore >= threshold) {
      mapping[field] = bestHeader;
    }
  }
  return mapping;
}
