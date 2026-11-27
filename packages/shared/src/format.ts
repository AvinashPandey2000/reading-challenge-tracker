/** "1 of 3 read" */
export function formatCount(readCount: number, total: number): string {
  return `${readCount} of ${total} read`;
}

/** 75.4 -> "1:15", 3725 -> "1:02:05" */
export function formatTimestamp(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Message for a failed book save, e.g. "Couldn't save Matilda. Try again." */
export function saveErrorMessage(title: string): string {
  return `Couldn't save ${title}. Try again.`;
}

/** Screen-reader announcement after a successful save. */
export function savedAnnouncement(title: string, read: boolean, listTitle: string, readCount: number, total: number): string {
  return `${title} marked as ${read ? "read" : "unread"}. ${listTitle}: ${formatCount(readCount, total)}.`;
}

/**
 * Clamp a saved resume point to something the player can seek to.
 * Positions at (or within half a second of) the end restart from 0 so Play doesn't instantly end.
 */
export function resumePosition(saved: number, duration: number | null | undefined): number {
  if (!Number.isFinite(saved) || saved <= 0) return 0;
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return saved;
  if (saved >= duration - 0.5) return 0;
  return saved;
}
