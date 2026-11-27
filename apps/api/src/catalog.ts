import type { CoverTheme, ListId } from "@rct/shared";

export interface CatalogBook {
  id: string;
  /** Challenge list, or null for books that are only in My Library. */
  listId: ListId | null;
  title: string;
  author: string;
  position: number;
  category: string;
  year: number;
  /** One line for cards. Written for this app, not copied from publishers. */
  summary: string;
  description: string;
  /** Public-domain text available in apps/api/content/<id>.json */
  readable: boolean;
  /** Page count of a typical print edition, for books tracked by hand. */
  printPages: number | null;
  cover: CoverTheme;
}

export const LIST_TITLES: Record<ListId, string> = {
  fiction: "Fiction",
  nonfiction: "Nonfiction",
};

/** The six challenge books first (unchanged ids and order), then the library-only classics. */
export const CATALOG: CatalogBook[] = [
  {
    id: "the-hobbit",
    listId: "fiction",
    title: "The Hobbit",
    author: "J. R. R. Tolkien",
    position: 1,
    category: "Fantasy",
    year: 1937,
    summary: "A home-loving hobbit is swept into a quest for a dragon's treasure.",
    description:
      "Bilbo Baggins would rather stay home, but a wizard and thirteen dwarves have other plans. A journey through goblin tunnels, dark forests and a lonely mountain turns a reluctant traveller into someone braver than he thought.",
    readable: false,
    printPages: 310,
    cover: { background: "#2E4A3A", accent: "#E3B04B", ink: "#F7F1E3", motif: "key" },
  },
  {
    id: "matilda",
    listId: "fiction",
    title: "Matilda",
    author: "Roald Dahl",
    position: 2,
    category: "Children's fiction",
    year: 1988,
    summary: "A brilliant young reader stands up to the grown-ups who underestimate her.",
    description:
      "Matilda reads her way through the village library before she is five, while her parents barely notice. At school she meets a kind teacher and a terrifying headmistress — and discovers a talent of her own.",
    readable: false,
    printPages: 240,
    cover: { background: "#B8432F", accent: "#F6D06F", ink: "#FFF6EA", motif: "star" },
  },
  {
    id: "the-secret-garden",
    listId: "fiction",
    title: "The Secret Garden",
    author: "Frances Hodgson Burnett",
    position: 3,
    category: "Children's classic",
    year: 1911,
    summary: "A lonely girl finds a locked garden — and brings it back to life.",
    description:
      "Sent to a vast house on the Yorkshire moors, sour and solitary Mary Lennox hears of a garden that has been shut for ten years. Finding the key changes her, her sickly cousin Colin, and everyone around them.",
    readable: true,
    printPages: null,
    cover: { background: "#3F6B4A", accent: "#F2C46D", ink: "#FBF6EC", motif: "leaf" },
  },
  {
    id: "the-story-of-my-life",
    listId: "nonfiction",
    title: "The Story of My Life",
    author: "Helen Keller",
    position: 1,
    category: "Memoir",
    year: 1903,
    summary: "Helen Keller's own account of learning language, written at 22.",
    description:
      "Deaf and blind from infancy, Helen Keller describes the day the word “water” broke through, her teacher Anne Sullivan, and her path to studying at Radcliffe College.",
    readable: true,
    printPages: null,
    cover: { background: "#5B4A7A", accent: "#F0C9A0", ink: "#FBF6EC", motif: "sun" },
  },
  {
    id: "a-brief-history-of-time",
    listId: "nonfiction",
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    position: 2,
    category: "Science",
    year: 1988,
    summary: "Black holes, the Big Bang and the nature of time, for curious readers.",
    description:
      "Stephen Hawking explains how the universe began, what black holes are and where time comes from — with almost no equations.",
    readable: false,
    printPages: 212,
    cover: { background: "#1F2A44", accent: "#F4A422", ink: "#EEF1F7", motif: "orbit" },
  },
  {
    id: "the-diary-of-a-young-girl",
    listId: "nonfiction",
    title: "The Diary of a Young Girl",
    author: "Anne Frank",
    position: 3,
    category: "Diary",
    year: 1947,
    summary: "Two years in hiding, recorded with honesty and hope.",
    description:
      "Anne Frank kept a diary while her family hid from the Nazi occupation in Amsterdam. Her reflections on family, growing up and the world outside remain essential reading.",
    readable: false,
    printPages: 283,
    cover: { background: "#7A5C3E", accent: "#F3DDB6", ink: "#FFF8EC", motif: "page" },
  },
  {
    id: "alices-adventures-in-wonderland",
    listId: null,
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    position: 1,
    category: "Fantasy",
    year: 1865,
    summary: "Down the rabbit-hole into a world that makes no sense at all.",
    description:
      "Alice follows a White Rabbit and tumbles into Wonderland: a mad tea-party, a grinning cat, and a Queen who wants everyone's head.",
    readable: true,
    printPages: null,
    cover: { background: "#2F5F8A", accent: "#F7C6D0", ink: "#FBF6EC", motif: "rabbit" },
  },
  {
    id: "the-wind-in-the-willows",
    listId: null,
    title: "The Wind in the Willows",
    author: "Kenneth Grahame",
    position: 2,
    category: "Children's classic",
    year: 1908,
    summary: "Mole, Rat, Badger and Toad on the river bank.",
    description:
      "Mole leaves spring cleaning behind and discovers the river, a friendship with Ratty, and the reckless adventures of Mr. Toad.",
    readable: true,
    printPages: null,
    cover: { background: "#4D6B3C", accent: "#D7E3A1", ink: "#FBF6EC", motif: "boat" },
  },
  {
    id: "peter-pan",
    listId: null,
    title: "Peter Pan",
    author: "J. M. Barrie",
    position: 3,
    category: "Fantasy",
    year: 1911,
    summary: "The boy who wouldn't grow up, and a flight to Neverland.",
    description:
      "Wendy, John and Michael follow Peter Pan out of the nursery window to Neverland — mermaids, the Lost Boys and Captain Hook.",
    readable: true,
    printPages: null,
    cover: { background: "#24365C", accent: "#9FD3C7", ink: "#F1F4FA", motif: "moon" },
  },
  {
    id: "walden",
    listId: null,
    title: "Walden",
    author: "Henry David Thoreau",
    position: 4,
    category: "Essays",
    year: 1854,
    summary: "Two years in a cabin by a pond, and what it taught about living simply.",
    description:
      "Thoreau built a small cabin at Walden Pond and lived there for two years. His reflections on work, nature, solitude and attention still feel current.",
    readable: true,
    printPages: null,
    cover: { background: "#355E5B", accent: "#E9D8A6", ink: "#F6F3EA", motif: "wave" },
  },
];

export const CHALLENGE_BOOKS = CATALOG.filter((b) => b.listId !== null);

/** The single demo reader shared by the web and Expo clients. */
export { DEMO_READER_ID } from "@rct/shared";
