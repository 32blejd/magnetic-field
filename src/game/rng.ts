/** Deterministic RNG (mulberry32). The state lives in the game state so runs are reproducible and saveable. */
export function rand(st: { rng: number }): number {
  st.rng = (st.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(st.rng ^ (st.rng >>> 15), 1 | st.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
