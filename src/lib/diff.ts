/** `src` is the Spanish letter for kept tokens (may differ by accent, e.g. ó → o). */
export type DiffToken = { ch: string; src?: string; type: "keep" | "del" | "ins"; key: string };

const base = (c: string) => c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Character-level LCS diff, used to animate Spanish → Italian. Accents don't break a match. */
export function charDiff(a: string, b: string): DiffToken[] {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = base(a[i]) === base(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && base(a[i]) === base(b[j])) {
      out.push({ ch: b[j], src: a[i], type: "keep", key: `k${i}-${j}` });
      i++;
      j++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push({ ch: b[j], type: "ins", key: `i${j}` });
      j++;
    } else {
      out.push({ ch: a[i], type: "del", key: `d${i}` });
      i++;
    }
  }
  // Show deletions before insertions within each changed run, so letters
  // leave before new ones arrive in the same slot.
  const runs: DiffToken[] = [];
  let buf: DiffToken[] = [];
  const flush = () => {
    runs.push(...buf.filter((t) => t.type === "del"), ...buf.filter((t) => t.type === "ins"));
    buf = [];
  };
  for (const t of out) {
    if (t.type === "keep") {
      flush();
      runs.push(t);
    } else buf.push(t);
  }
  flush();
  return runs;
}

export function shuffle<T>(arr: readonly T[], seed?: number): T[] {
  const a = [...arr];
  let s = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
