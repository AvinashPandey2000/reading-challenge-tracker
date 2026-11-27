"use client";

import { useBooks } from "@/lib/useBooks";
import { BookList } from "./BookList";
import { Rewards } from "./Rewards";
import styles from "./ReadingChallenge.module.css";

export function ReadingChallenge() {
  const { state, load, setRead } = useBooks();

  return (
    <div className={styles.challenge}>
      <p className={styles.srOnly} role="status" aria-live="polite" data-testid="announcer">
        {state.announcement}
      </p>

      {state.status === "loading" && (
        <div className={styles.lists} aria-busy="true" data-testid="lists-loading">
          <p className={styles.loadingText}>Loading your reading lists…</p>
          {["Fiction", "Nonfiction"].map((title) => (
            <div key={title} className={`glass ${styles.listCard} ${styles.skeletonCard}`} aria-hidden="true">
              <div className={styles.skeletonLine} style={{ width: "40%" }} />
              <div className={styles.skeletonLine} style={{ width: "25%" }} />
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonRow} />
              ))}
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div className={styles.loadError} role="alert" data-testid="lists-error">
          <p>{state.loadError}</p>
          <button type="button" className={styles.primaryButton} onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <>
          {state.loadError && (
            <div className={styles.inlineNotice} role="alert">
              <span>{state.loadError}</span>
              <button type="button" className={styles.retryButton} onClick={() => void load()}>
                Try again
              </button>
            </div>
          )}
          <div className={styles.lists} data-tour="lists">
            {state.lists.map((list) => (
              <BookList
                key={list.id}
                list={list}
                pending={state.pending}
                errors={state.errors}
                onToggle={(id, read) => void setRead(id, read)}
              />
            ))}
          </div>
          <Rewards lists={state.lists} justUnlocked={state.justUnlocked} />
        </>
      )}
    </div>
  );
}
