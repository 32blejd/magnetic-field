/* Lodestones – collectible magnets pulled from the Magnetron (gacha) with Charge Crystals. Kept forever (meta).
   Names/descriptions live in ui/strings.ts; effects are combined in game/prestige.ts → bonuses(). */

export type Element = 'iron' | 'cobalt' | 'nickel' | 'neodymium';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const ELEMENTS: readonly Element[] = ['iron', 'cobalt', 'nickel', 'neodymium'];
export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** Extra effect on Epic/Legendary stones (on top of coin value). */
export type LodestoneExtra = 'range' | 'rareChance' | 'goalReward' | 'crystalFind';

export interface LodestoneDef {
  id: string;
  element: Element;
  rarity: Rarity;
  /** Coin value bonus per level (0.01 = +1%). */
  valuePerLevel: number;
  extra?: { kind: LodestoneExtra; perLevel: number };
}

export const GACHA = {
  /** Charge Crystals per pull. */
  pullCost: 10,
  /** Pull chances by rarity (sum = 1). */
  odds: { common: 0.45, rare: 0.32, epic: 0.17, legendary: 0.06 } as Record<Rarity, number>,
  /** An Epic or better is guaranteed on this pull if none dropped in the previous ones.
      Once every Common, Rare and Epic stone is at max level, every pull is a not-yet-maxed Legendary instead (game/lodestones.ts). */
  pity: 20,
  maxLevel: 3,
  /** Crystals refunded for a duplicate of a max-level stone. */
  maxedRefund: 3,
  /** Owning all four stones of an element: +5% coin value. */
  setBonus: 0.05,
  /** The Magnetron opens after the first Polarity Shift. */
  unlockShifts: 1,
};

/** Where Charge Crystals come from. */
export const CRYSTALS = {
  perGoal: 1,
  perEvent: 1,
  perShift: 3,
  /** Chance for a Prism pickup to drop a crystal (Neodymium stones add to it). */
  prismChance: 0.05,
};

const VALUE: Record<Rarity, number> = { common: 0.01, rare: 0.02, epic: 0.03, legendary: 0.05 };
const EXTRA: Record<Element, LodestoneExtra> = { iron: 'range', cobalt: 'rareChance', nickel: 'goalReward', neodymium: 'crystalFind' };
/** Extra per level on Epic; Legendary gets double. */
const EXTRA_EPIC: Record<LodestoneExtra, number> = { range: 0.02, rareChance: 0.002, goalReward: 0.05, crystalFind: 0.01 };

export const LODESTONES: readonly LodestoneDef[] = ELEMENTS.flatMap(element =>
  RARITIES.map(rarity => ({
    id: `${element}-${rarity}`,
    element,
    rarity,
    valuePerLevel: VALUE[rarity],
    ...(rarity === 'epic' || rarity === 'legendary'
      ? { extra: { kind: EXTRA[element], perLevel: EXTRA_EPIC[EXTRA[element]] * (rarity === 'legendary' ? 2 : 1) } }
      : {}),
  })),
);

export const LODESTONE_BY_ID: Readonly<Record<string, LodestoneDef>> = Object.fromEntries(LODESTONES.map(l => [l.id, l]));
