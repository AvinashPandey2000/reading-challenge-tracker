/**
 * First-visit walkthrough: a short "this is what that is" tour, stepped with Next / Back / Skip.
 * Web and Expo show the same copy; `target` names the element each step highlights
 * (null = a centred card with no highlight).
 */
export interface WalkthroughStep {
  id: string;
  target: string | null;
  title: string;
  body: string;
}

const welcome: WalkthroughStep = {
  id: "welcome",
  target: null,
  title: "Welcome to Lantern Lane Library 👋",
  body: "This quick tour shows what each part of the app does. It takes under a minute — use Next to move on, or Skip anytime.",
};
const lists: WalkthroughStep = {
  id: "lists",
  target: "lists",
  title: "Your reading lists",
  body: "Two lists — Fiction and Nonfiction — with three books each. The count shows how many you've read, like “1 of 3 read”.",
};
const book: WalkthroughStep = {
  id: "book",
  target: "book",
  title: "Mark a book as read",
  body: "Tap a book when you finish it. It's saved straight away, and you can tap again to mark it unread.",
};
const offer: WalkthroughStep = {
  id: "offer",
  target: "offer",
  title: "Challenge offer",
  body: "Finish both lists before the deadline to unlock the offer. The banner counts down the days left.",
};
const done: WalkthroughStep = {
  id: "done",
  target: null,
  title: "You're all set!",
  body: "Happy reading. You can replay this tour anytime from “Take the tour”.",
};

export const WEB_WALKTHROUGH: WalkthroughStep[] = [
  welcome,
  { id: "nav", target: "nav", title: "Challenge and My Library", body: "Switch between your reading challenge and My Library, where you can read books, track pages and take notes." },
  { id: "theme", target: "theme", title: "Light or dark", body: "Choose Light, Dark, or follow your device's setting. Your choice is remembered." },
  offer,
  lists,
  { ...book, body: "Click a book when you finish it. It's saved straight away, and you can click again to mark it unread." },
  { id: "details", target: "details", title: "Open a book", body: "The arrow opens a book's page: details, Start reading, bookmarks, highlights and notes." },
  { id: "rewards", target: "rewards", title: "Rewards", body: "Finish a list to unlock a bookmark. Finish both to collect a free tote bag." },
  { id: "video", target: "video", title: "Welcome video", body: "Play, pause and seek. When you pause, we save your place and resume there next time." },
  { id: "sample", target: "sample", title: "Free sample", body: "Download the first chapter of The Secret Garden as a PDF." },
  { ...done, body: "Happy reading. You can replay this tour anytime with “Take the tour” in the footer." },
];

export const MOBILE_WALKTHROUGH: WalkthroughStep[] = [
  welcome,
  lists,
  book,
  offer,
  { id: "tabs", target: "tabs", title: "Tabs at the bottom", body: "Library — read books and see stats. Video — the welcome video. Rewards — rewards, settings and the free sample." },
  { ...done, body: "Happy reading. You can replay this tour anytime from Rewards → Settings → “Take the tour”." },
];

export const WALKTHROUGH_STORAGE_KEY = "rct-walkthrough-done";
