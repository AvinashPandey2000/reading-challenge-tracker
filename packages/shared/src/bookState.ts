import type { ReadingList, UpdateBookResponse } from "./schemas.js";
import { saveErrorMessage } from "./format.js";
import { computeRewards, newlyUnlocked, type RewardId } from "./rewards.js";

/**
 * Framework-agnostic state for the reading lists, shared by the web and Expo clients.
 *
 * Rules (from the brief):
 * - `lists` only ever holds server-confirmed values. While a save is in flight the
 *   last confirmed status and count stay visible.
 * - One in-flight save per book; a second toggle for the same book is ignored.
 * - On success the book row and its list count are replaced together from the response.
 * - On failure the confirmed value stays and an error with a retry target is recorded.
 */
export type LoadStatus = "loading" | "ready" | "error";

export interface SaveError {
  /** The status the reader asked for, re-sent by Retry. */
  target: boolean;
  message: string;
}

export interface BooksState {
  status: LoadStatus;
  lists: ReadingList[];
  /** bookId -> requested status for saves in flight */
  pending: Record<string, boolean>;
  /** bookId -> last failed save */
  errors: Record<string, SaveError>;
  loadError: string | null;
  /** Last polite announcement for screen readers. */
  announcement: string;
  /** bookId of the most recent successful save, used to trigger the checkmark transition once. */
  lastSavedId: string | null;
  /** Rewards unlocked by the most recent successful save (for a brief highlight). */
  justUnlocked: RewardId[];
}

export type BooksAction =
  | { type: "load/start" }
  | { type: "load/success"; lists: ReadingList[] }
  | { type: "load/failure"; message: string }
  | { type: "save/start"; bookId: string; read: boolean }
  | { type: "save/success"; response: UpdateBookResponse; announcement: string }
  | { type: "save/failure"; bookId: string; read: boolean };

export const initialBooksState: BooksState = {
  status: "loading",
  lists: [],
  pending: {},
  errors: {},
  loadError: null,
  announcement: "",
  lastSavedId: null,
  justUnlocked: [],
};

export const LOAD_ERROR_MESSAGE = "Couldn't load your reading lists. Check your connection and try again.";

export function findBook(state: BooksState, bookId: string) {
  for (const list of state.lists) {
    const book = list.books.find((b) => b.id === bookId);
    if (book) return { list, book };
  }
  return null;
}

/** Whether a save for this book may start now (no duplicate in-flight actions). */
export function canStartSave(state: BooksState, bookId: string): boolean {
  return state.status === "ready" && !(bookId in state.pending) && findBook(state, bookId) !== null;
}

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

export function booksReducer(state: BooksState, action: BooksAction): BooksState {
  switch (action.type) {
    case "load/start":
      return { ...state, status: state.lists.length ? state.status : "loading", loadError: null };
    case "load/success":
      return { ...state, status: "ready", lists: action.lists, loadError: null, pending: {}, errors: {} };
    case "load/failure":
      // Keep anything already confirmed on screen; only show the full error state if nothing loaded yet.
      return {
        ...state,
        status: state.lists.length ? "ready" : "error",
        loadError: action.message,
      };
    case "save/start": {
      if (!canStartSave(state, action.bookId)) return state;
      return {
        ...state,
        pending: { ...state.pending, [action.bookId]: action.read },
        errors: omit(state.errors, action.bookId),
      };
    }
    case "save/success": {
      const { book, list: summary } = action.response;
      if (!summary) return { ...state, pending: omit(state.pending, book.id) };
      const lists = state.lists.map((list) =>
        list.id !== summary.id
          ? list
          : {
              ...list,
              readCount: summary.readCount,
              total: summary.total,
              books: list.books.map((b) => (b.id === book.id ? book : b)),
            },
      );
      // Rewards are derived from confirmed lists; announce any that this save unlocked.
      const before = computeRewards(state.lists, "");
      const after = computeRewards(lists, "");
      const unlockedTitles = newlyUnlocked(before, after);
      const justUnlocked = after.filter((r) => unlockedTitles.includes(r.title)).map((r) => r.id);
      return {
        ...state,
        lists,
        pending: omit(state.pending, book.id),
        errors: omit(state.errors, book.id),
        announcement: unlockedTitles.length
          ? `${action.announcement} Reward unlocked: ${unlockedTitles.join(", ")}.`
          : action.announcement,
        lastSavedId: book.id,
        justUnlocked,
      };
    }
    case "save/failure": {
      const found = findBook(state, action.bookId);
      const title = found?.book.title ?? "this book";
      const message = saveErrorMessage(title);
      return {
        ...state,
        pending: omit(state.pending, action.bookId),
        errors: { ...state.errors, [action.bookId]: { target: action.read, message } },
        announcement: message,
      };
    }
    default:
      return state;
  }
}
