/* Visual-only state: particles, floating numbers, shockwaves, banners, row flashes, screen shake.
   Fed by GameEvents from the simulation; never affects game logic. */
import type { TierId } from '../data/tiers';
import { BOARD } from '../data/tuning';
import type { UpgradeId } from '../data/upgrades';
import type { Coin, GameEvent, GameState, Vec } from '../game/types';
import { formatNumber } from '../ui/format';
import { FEATURE_BANNERS, M, S, UPGRADE_TEXT } from '../ui/strings';
import { clamp } from './draw';
import { COLORS } from './theme';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; tier: TierId; phase: number }
export interface FloatText { x: number; y: number; life: number; text: string; tier: TierId; color?: string }
export type ShockKind = TierId | 'pulse';
export interface Shock { x: number; y: number; life: number; max: number; radius: number; kind: ShockKind }
export interface Banner { title: string; sub: string; color: string; life: number; total: number }

const TRAIL_LENGTH = 14;

export class Effects {
  parts: Particle[] = [];
  floats: FloatText[] = [];
  shocks: Shock[] = [];
  /** Shown one at a time, in order. */
  banners: Banner[] = [];
  flash: Partial<Record<UpgradeId, number>> = {};
  /** "+X" pops next to the wallet when a mini-goal pays out. */
  goalPops: { text: string; life: number }[] = [];
  shake = 0;
  private earned: { t: number; v: number }[] = [];
  private trails = new WeakMap<Coin, Vec[]>();

  banner(title: string, sub: string, color: string, life = 2.4): void {
    this.banners.push({ title, sub, color, life, total: life });
  }

  burst(x: number, y: number, n: number, speed: number, tier: TierId, life = 0.5): void {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * speed;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, tier, phase: Math.random() * 6 });
    }
  }

  handle(events: GameEvent[], st: GameState): void {
    for (const e of events) {
      switch (e.type) {
        case 'pickup': {
          const c = e.coin, rare = c.tier !== 'basic';
          this.earned.push({ t: st.t, v: e.value });
          this.burst(c.x, c.y, c.tier === 'prism' ? 28 : c.tier === 'gold' ? 18 : 10, rare ? 150 : 90, c.tier);
          if (rare) this.shocks.push({ x: c.x, y: c.y, life: 0.45, max: 0.45, radius: 50, kind: c.tier });
          this.floats.push({ x: c.x, y: c.y - 8, life: rare ? 1.3 : 0.9, text: `+${formatNumber(e.value)}`, tier: c.tier });
          break;
        }
        case 'anti':
          this.burst(e.coin.x, e.coin.y, 24, 160, 'anti', 0.6);
          this.shocks.push({ x: e.coin.x, y: e.coin.y, life: 0.4, max: 0.4, radius: 40, kind: 'anti' });
          this.floats.push({ x: e.coin.x, y: e.coin.y - 10, life: 1.2, text: S.shortCircuit, tier: 'anti' });
          this.shake = 0.3;
          break;
        case 'miss':
          this.burst(clamp(e.coin.x, BOARD.x, BOARD.x + BOARD.w), clamp(e.coin.y, BOARD.y, BOARD.y + BOARD.h), 4, 50, 'anti', 0.3);
          break;
        case 'burst':
          this.banner(S.burst.title, S.burst.sub, COLORS.amber);
          break;
        case 'fountain':
          this.banner(S.fountain.title, S.fountain.sub, COLORS.cyan);
          this.shocks.push({ x: e.x, y: e.y, life: 0.6, max: 0.6, radius: 80, kind: 'basic' });
          break;
        case 'unlock':
          // after the first shift the player knows the upgrades – just flash the row, no banner every run
          if (st.meta.shifts === 0) this.banner(S.newUpgrade(UPGRADE_TEXT[e.id].name), UPGRADE_TEXT[e.id].desc, COLORS.cyan, 6);
          this.flash[e.id] = 1.2;
          break;
        case 'feature': {
          if (st.meta.shifts > 0 && e.id !== 'anti') break;
          const b = FEATURE_BANNERS[e.id];
          const color = e.id === 'anti' ? COLORS.red : e.id === 'combo' ? COLORS.amber : COLORS.magenta;
          this.banner(b.title, b.sub, color, 3.2);
          break;
        }
        case 'meteor':
          this.banner(M.meteor.title, M.meteor.sub, COLORS.amber);
          break;
        case 'crystal': // only once the Magnetron is open – before that crystals pile up silently
          if (st.meta.shifts > 0) this.floats.push({ x: e.x, y: e.y, life: 1.2, text: `+${e.amount} ◈`, tier: 'gold', color: COLORS.core });
          break;
        case 'shield':
          this.floats.push({ x: e.x, y: e.y - 10, life: 1.2, text: M.shieldPop, tier: 'gold', color: COLORS.core });
          this.shocks.push({ x: e.x, y: e.y, life: 0.4, max: 0.4, radius: 36, kind: 'pulse' });
          break;
        case 'goal':
          this.earned.push({ t: st.t, v: e.reward });
          this.banner(S.goalComplete(formatNumber(e.reward)), S.goalText(e.goal), COLORS.amber, 3);
          this.goalPops.push({ text: `+${formatNumber(e.reward)}`, life: 1.6 });
          break;
      }
    }
  }

  /** Clears everything tied to the previous run (after Polarity Shift). */
  reset(): void {
    this.parts = []; this.floats = []; this.shocks = []; this.banners = []; this.flash = {}; this.goalPops = [];
    this.shake = 0; this.earned = []; this.trails = new WeakMap();
  }

  pulseShock(at: Vec, radius: number): void {
    this.shocks.push({ x: at.x, y: at.y, life: 0.5, max: 0.5, radius, kind: 'pulse' });
  }

  /** Recent positions of a rare coin, oldest first (recorded in update(), so the length doesn't depend on frame rate). */
  trailOf(c: Coin): readonly Vec[] {
    return this.trails.get(c) ?? [];
  }

  private recordTrails(st: GameState): void {
    for (const c of st.coins) {
      if (c.tier === 'basic') continue;
      let t = this.trails.get(c);
      if (!t) { t = []; this.trails.set(c, t); }
      t.push({ x: c.x, y: c.y });
      if (t.length > TRAIL_LENGTH) t.shift();
    }
  }

  incomePerSecond(st: GameState): number {
    return this.earned.reduce((a, e) => a + e.v, 0) / Math.min(10, Math.max(1, st.t));
  }

  /** Advance visual effects; called once per simulation step (fixed dt). */
  update(dt: number, st: GameState): void {
    this.recordTrails(st);
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const s of this.shocks) s.life -= dt;
    this.shocks = this.shocks.filter(s => s.life > 0);
    for (const f of this.floats) { f.y -= 34 * dt; f.life -= dt; }
    this.floats = this.floats.filter(f => f.life > 0);
    for (const g of this.goalPops) g.life -= dt;
    this.goalPops = this.goalPops.filter(g => g.life > 0);
    const b = this.banners[0];
    if (b && (b.life -= dt) <= 0) this.banners.shift();
    this.earned = this.earned.filter(e => st.t - e.t < 10);
    for (const k of Object.keys(this.flash) as UpgradeId[]) this.flash[k] = (this.flash[k] ?? 0) - dt;
    if (this.shake > 0) this.shake -= dt;
  }
}
