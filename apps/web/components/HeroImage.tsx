"use client";

import { useState } from "react";
import styles from "./HeroImage.module.css";

/** Decorative photo. If it fails to load it simply disappears; nothing depends on it. */
export function HeroImage() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className={styles.figure}>
      {/* Plain <img>: a local, pre-optimised WebP with explicit size; no image optimiser needed. */}
      <img
        src="/images/reading-room.webp"
        alt=""
        width={960}
        height={640}
        className={styles.img}
        fetchPriority="high"
        onError={() => setFailed(true)}
      />
    </figure>
  );
}
