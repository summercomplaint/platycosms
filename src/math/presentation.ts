/**
 * Group presentations written as plain generators and relators.
 * A relator is a word in the generator letters: lower case is the generator, upper case its inverse,
 * and [a,b] is the commutator a b a⁻¹ b⁻¹.
 */
export interface Presentation {
  gens: string[];
  relators: string[];
}

/** a word as a list of [letter, ±1] */
export function letters(word: string): [string, 1 | -1][] {
  const out: [string, 1 | -1][] = [];
  const re = /\[(\w),(\w)\]|(\w)/g;
  for (let m; (m = re.exec(word.replace(/\s/g, ''))); ) {
    if (m[3]) out.push([m[3].toLowerCase(), m[3] === m[3].toLowerCase() ? 1 : -1]);
    else {
      const a = (s: string): [string, 1 | -1] => [s.toLowerCase(), s === s.toLowerCase() ? 1 : -1];
      const [x, y] = [a(m[1]), a(m[2])];
      out.push(x, y, [x[0], x[1] === 1 ? -1 : 1], [y[0], y[1] === 1 ? -1 : 1]);
    }
  }
  return out;
}

const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n: number) => String(n).split('').map((c) => SUP[c]).join('');

/** one relator for display: commutators stay as [a, b], runs become powers (aabaaB → a²ba²b⁻¹) */
export function formatWord(word: string): string {
  return word.split(/(\[\w,\w\])/).filter(Boolean).map((part) => {
    if (part.startsWith('[')) return `[${formatWord(part[1])}, ${formatWord(part[3])}]`;
    let s = '';
    const ls = letters(part);
    for (let i = 0; i < ls.length; ) {
      let j = i;
      while (j < ls.length && ls[j][0] === ls[i][0] && ls[j][1] === ls[i][1]) j++;
      const n = (j - i) * ls[i][1];
      s += ls[i][0] + (n === 1 ? '' : sup(n));
      i = j;
    }
    return s;
  }).join('');
}

export const formatPresentation = (p: Presentation): string =>
  `⟨${p.gens.join(', ')} | ${p.relators.map(formatWord).join(', ')}⟩`;

/** the invariant factors of the abelianization (0 stands for a free ℤ factor; factors of 1 are dropped) */
export function abelianInvariants(p: Presentation): number[] {
  const M = p.relators.map((r) => {
    const row = p.gens.map(() => 0);
    for (const [g, e] of letters(r)) row[p.gens.indexOf(g)] += e;
    return row;
  });
  const d = smithDiagonal(M, p.gens.length);
  return d.filter((x) => x !== 1).sort((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));
}

/** diagonal of the Smith normal form of an integer matrix with `cols` columns, padded with zeros to `cols` entries */
function smithDiagonal(M0: number[][], cols: number): number[] {
  const M = M0.map((r) => r.slice());
  const rows = M.length, out: number[] = [];
  for (let k = 0; k < Math.min(rows, cols); k++) {
    for (;;) {
      // the smallest non-zero entry in the remaining block goes to (k, k)
      let best: [number, number] | null = null;
      for (let i = k; i < rows; i++) for (let j = k; j < cols; j++)
        if (M[i][j] !== 0 && (!best || Math.abs(M[i][j]) < Math.abs(M[best[0]][best[1]]))) best = [i, j];
      if (!best) return out.concat(Array(cols - out.length).fill(0));
      [M[k], M[best[0]]] = [M[best[0]], M[k]];
      for (const r of M) [r[k], r[best[1]]] = [r[best[1]], r[k]];
      let clean = true;
      for (let i = k + 1; i < rows; i++) {
        const q = Math.trunc(M[i][k] / M[k][k]);
        for (let j = k; j < cols; j++) M[i][j] -= q * M[k][j];
        if (M[i][k] !== 0) clean = false;
      }
      for (let j = k + 1; j < cols; j++) {
        const q = Math.trunc(M[k][j] / M[k][k]);
        for (let i = k; i < rows; i++) M[i][j] -= q * M[i][k];
        if (M[k][j] !== 0) clean = false;
      }
      if (!clean) continue;
      // the pivot must divide the rest of the block; if not, fold an offending row in and go again
      let bad = -1;
      for (let i = k + 1; i < rows && bad < 0; i++) for (let j = k + 1; j < cols; j++) if (M[i][j] % M[k][k] !== 0) { bad = i; break; }
      if (bad < 0) break;
      for (let j = k; j < cols; j++) M[k][j] += M[bad][j];
    }
    out.push(Math.abs(M[k][k]));
  }
  return out.concat(Array(cols - out.length).fill(0));
}
