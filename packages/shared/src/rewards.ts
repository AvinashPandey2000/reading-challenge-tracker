import type { ListId, ReadingList } from "./schemas.js";

/**
 * Library rewards and the challenge offer (a demo from the fictional Lantern Lane Library).
 * Rewards are derived from confirmed reading progress only, so the API and both clients
 * compute exactly the same result from the same lists.
 */

/** The single demo reader shared by the web and Expo clients. */
export const DEMO_READER_ID = "demo-reader";

/** Single source of truth for the offer deadline, used by the API and both clients. */
export const CHALLENGE_ENDS_AT = "2027-01-31T23:59:59Z";

export type RewardId = "fiction-bookmark" | "nonfiction-bookmark" | "challenge-tote";

export interface Reward {
  id: RewardId;
  title: string;
  description: string;
  /** Books read toward this reward and how many are needed. */
  current: number;
  total: number;
  unlocked: boolean;
  /** Only for the unlocked tote bag: a code to show at the front desk. */
  claimCode: string | null;
}

export interface OfferState {
  endsAt: string;
  daysLeft: number;
  ended: boolean;
}

interface RewardDef {
  id: RewardId;
  title: string;
  description: string;
  lists: ListId[];
  claimable: boolean;
}

const DEFS: RewardDef[] = [
  {
    id: "fiction-bookmark",
    title: "Fiction bookmark",
    description: "Finish all three fiction books.",
    lists: ["fiction"],
    claimable: false,
  },
  {
    id: "nonfiction-bookmark",
    title: "Nonfiction bookmark",
    description: "Finish all three nonfiction books.",
    lists: ["nonfiction"],
    claimable: false,
  },
  {
    id: "challenge-tote",
    title: "Lantern Lane tote bag",
    description: "Finish both lists to collect a free tote bag at the front desk.",
    lists: ["fiction", "nonfiction"],
    claimable: true,
  },
];

/** Small deterministic hash (FNV-1a) → 4 characters from an unambiguous alphabet. */
export function claimCodeFor(readerId: string, rewardId: RewardId): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let h = 0x811c9dc5;
  for (const ch of `${readerId}:${rewardId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length);
  }
  return `LANTERN-${out}`;
}

export function computeRewards(lists: ReadingList[], readerId: string): Reward[] {
  return DEFS.map((def) => {
    const relevant = lists.filter((l) => def.lists.includes(l.id));
    const current = relevant.reduce((n, l) => n + l.readCount, 0);
    const total = relevant.reduce((n, l) => n + l.total, 0);
    const allListsPresent = def.lists.every((id) => relevant.some((l) => l.id === id));
    const unlocked = allListsPresent && total > 0 && current === total;
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      current,
      total,
      unlocked,
      claimCode: unlocked && def.claimable ? claimCodeFor(readerId, def.id) : null,
    };
  });
}

/** Titles of rewards that are unlocked in `next` but were not in `prev`. */
export function newlyUnlocked(prev: Reward[], next: Reward[]): string[] {
  const before = new Set(prev.filter((r) => r.unlocked).map((r) => r.id));
  return next.filter((r) => r.unlocked && !before.has(r.id)).map((r) => r.title);
}

const DAY = 24 * 60 * 60 * 1000;

export function offerState(now: Date = new Date(), endsAt: string = CHALLENGE_ENDS_AT): OfferState {
  const remaining = new Date(endsAt).getTime() - now.getTime();
  return { endsAt, daysLeft: Math.max(0, Math.ceil(remaining / DAY)), ended: remaining <= 0 };
}

/** "31 January 2027" (UTC, so every client shows the same date). */
export function formatOfferDate(endsAt: string = CHALLENGE_ENDS_AT): string {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const d = new Date(endsAt);
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Banner copy shared by web and Expo. */
export function offerMessage(state: OfferState): { headline: string; detail: string } {
  const date = formatOfferDate(state.endsAt);
  if (state.ended) {
    return { headline: `This offer ended on ${date}.`, detail: "Rewards can still be unlocked." };
  }
  const left = state.daysLeft === 1 ? "1 day left" : `${state.daysLeft} days left`;
  return {
    headline: `Finish both lists by ${date} and your late fees are waived.`,
    detail: left,
  };
}

export const DEMO_OFFER_NOTE = "Demo offer — Lantern Lane is a fictional library.";
