"use client";

import { useSyncExternalStore } from "react";
import { DEMO_OFFER_NOTE, offerMessage, offerState } from "@rct/shared";
import styles from "./OfferBanner.module.css";

const noop = () => () => {};

/**
 * Deadline banner for the challenge offer. The day count depends on "now", so it is only
 * rendered in the browser (the static HTML carries the headline without a count).
 */
export function OfferBanner() {
  const daysLeft = useSyncExternalStore(noop, () => offerState().daysLeft, () => null);
  const ended = useSyncExternalStore(noop, () => offerState().ended, () => false);
  const message = offerMessage({ ...offerState(), daysLeft: daysLeft ?? 0, ended });

  return (
    <aside className={`glass ${styles.banner}`} aria-labelledby="offer-heading" data-testid="offer-banner" data-tour="offer">
      <span className={styles.badge} aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 2.8l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.1l-5.2 2.7 1-5.8L3.6 8.9l5.8-.8z" />
        </svg>
      </span>
      <div className={styles.text}>
        <h2 id="offer-heading" className={styles.heading}>
          {message.headline}
        </h2>
        <p className={styles.detail}>
          {daysLeft !== null && <strong className={styles.days}>{message.detail}</strong>}
          {daysLeft !== null && " · "}
          Rewards unlock as you finish each list. <a href="#rewards-heading">See rewards</a>
        </p>
        <p className={styles.note}>{DEMO_OFFER_NOTE}</p>
      </div>
    </aside>
  );
}
