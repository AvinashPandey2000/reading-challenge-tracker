import { createContext, useContext } from "react";
import { useBooks } from "./useBooks";

type BooksValue = ReturnType<typeof useBooks>;
const BooksContext = createContext<BooksValue | null>(null);

/** One confirmed reading-list state shared by the Challenge and Rewards tabs. */
export function BooksProvider({ children }: { children: React.ReactNode }) {
  const value = useBooks();
  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>;
}

export function useBooksContext(): BooksValue {
  const ctx = useContext(BooksContext);
  if (!ctx) throw new Error("useBooksContext must be used inside <BooksProvider>");
  return ctx;
}
