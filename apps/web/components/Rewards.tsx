"use client";

import { DEMO_READER_ID, computeRewards, type ReadingList, type RewardId } from "@rct/shared";
import styles from "./Rewards.module.css";

const ICONS: Record<RewardId, React.ReactNode> = {
  "fiction-bookmark": <path d="M7 3h10v18l-5-4-5 4z" />,
  "nonfiction-bookmark": <path d="M7 3h10v18l-5-4-5 4z" />,
  "challenge-tote": <path d="M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8" />,
};

export function Rewards({ lists, justUnlocked }: { lists: ReadingList[]; justUnlocked: RewardId[] }) {
  const rewards = computeRewards(lists, DEMO_READER_ID);
  return (
    <section className={styles.section} aria-labelledby="rewards-heading" data-testid="rewards">
      <h2 id="rewards-heading" className={styles.heading}>
        Rewards
      </h2>
      <ul className={styles.grid}>
        {rewards.map((r) => (
          <li
            key={r.id}
            className={`glass ${styles.card}`}
            data-unlocked={r.unlocked || undefined}
            data-just-unlocked={justUnlocked.includes(r.id) || undefined}
            data-testid={`reward-${r.id}`}
          >
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">{ICONS[r.id]}</svg>
            </span>
            <div className={styles.body}>
              <h3 className={styles.title}>{r.title}</h3>
              <p className={styles.description}>{r.description}</p>
              <p className={styles.progress}>
                {r.current} of {r.total} read
              </p>
              {r.claimCode && (
                <p className={styles.claim} data-testid="claim-code">
                  Show code <strong>{r.claimCode}</strong> at the front desk.
                </p>
              )}
            </div>
            <span className={styles.state}>{r.unlocked ? "✓ Unlocked" : "🔒 Locked"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
