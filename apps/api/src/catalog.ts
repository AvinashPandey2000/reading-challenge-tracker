import type { ListId } from "@rct/shared";

export interface CatalogBook {
  id: string;
  listId: ListId;
  title: string;
  author: string;
  position: number;
}

export const LIST_TITLES: Record<ListId, string> = {
  fiction: "Fiction",
  nonfiction: "Nonfiction",
};

/** The six books in the challenge. Every reader starts with all of them unread. */
export const CATALOG: CatalogBook[] = [
  { id: "the-hobbit", listId: "fiction", title: "The Hobbit", author: "J. R. R. Tolkien", position: 1 },
  { id: "matilda", listId: "fiction", title: "Matilda", author: "Roald Dahl", position: 2 },
  { id: "the-secret-garden", listId: "fiction", title: "The Secret Garden", author: "Frances Hodgson Burnett", position: 3 },
  { id: "the-story-of-my-life", listId: "nonfiction", title: "The Story of My Life", author: "Helen Keller", position: 1 },
  { id: "a-brief-history-of-time", listId: "nonfiction", title: "A Brief History of Time", author: "Stephen Hawking", position: 2 },
  { id: "the-diary-of-a-young-girl", listId: "nonfiction", title: "The Diary of a Young Girl", author: "Anne Frank", position: 3 },
];

export { DEMO_READER_ID } from "@rct/shared";
