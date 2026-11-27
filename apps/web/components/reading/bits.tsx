"use client";

import { useEffect, useRef } from "react";
import { STATUS_LABEL, type ReadingStatus } from "@rct/shared";
import styles from "./reading.module.css";

export function StatusBadge({ status }: { status: ReadingStatus }) {
  const icon = status === "completed" ? "✓ " : status === "reading" ? "◐ " : "";
  return (
    <span className={styles.badge} data-status={status}>
      {icon}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Progress bar with a text equivalent; the bar itself is decorative. */
export function ProgressMeter({ percent, label, compact = false }: { percent: number; label: string; compact?: boolean }) {
  return (
    <div className={styles.meter} data-compact={compact || undefined}>
      <div
        className={styles.meterTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% · ${label}`}
        aria-label="Reading progress"
      >
        <div className={styles.meterFill} style={{ width: `${percent}%` }} data-complete={percent === 100 || undefined} />
      </div>
      <p className={styles.meterText}>
        <strong>{percent}%</strong> · {label}
      </p>
    </div>
  );
}

/**
 * Confirmation dialog built on the native <dialog> element (focus trap, Esc to cancel).
 * `confirmLabel` should say what happens ("Mark as read"), not "OK".
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "default",
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "default" | "danger";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === "function") d.showModal();
      else d.setAttribute("open", "");
    }
    if (!open && d.open) {
      if (typeof d.close === "function") d.close();
      else d.removeAttribute("open");
    }
  }, [open]);
  return (
    <dialog ref={ref} className={`glass ${styles.dialog}`} aria-labelledby="confirm-title" onCancel={(e) => (e.preventDefault(), onCancel())}>
      <h2 id="confirm-title" className={styles.dialogTitle}>
        {title}
      </h2>
      <p className={styles.dialogBody}>{body}</p>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={tone === "danger" ? styles.dangerButton : styles.primaryButton} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div className={styles.toastRegion} role="status" aria-live="polite">
      {message && <div className={`glass ${styles.toast}`}>{message}</div>}
    </div>
  );
}
