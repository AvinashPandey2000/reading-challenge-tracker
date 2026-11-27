import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Library } from "@/components/reading/Library";
import { BookDetailsView } from "@/components/reading/BookDetailsView";
import { Reader } from "@/components/reading/Reader";
import { json, mockFetch } from "./fetchMock";
import { DEFAULT_READER_PREFS, book, details, libraryBooks, page, stats } from "./readingFixtures";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  window.scrollTo = () => {};
});
afterEach(() => vi.unstubAllGlobals());

const libraryRoutes = (books = libraryBooks()) => ({
  "GET /api/library": () => json({ books }),
  [`GET /api/reading/stats?today=${encodeURIComponent(new Date().toLocaleDateString("sv-SE"))}`]: () => json(stats()),
  "GET /api/reader/preferences": () => json(DEFAULT_READER_PREFS),
});

describe("My Library", () => {
  it("shows stats, goal and streak, Continue Reading, and filters/searches the book list", async () => {
    mockFetch(libraryRoutes());
    render(<Library />);
    const grid = await screen.findByTestId("library-grid");
    expect(within(grid).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByTestId("reading-stats")).toHaveTextContent("Pages read313");
    expect(screen.getByTestId("streak")).toHaveTextContent("2 days streak");
    expect(within(screen.getByTestId("continue-reading")).getByRole("link", { name: /Walden/ })).toHaveAttribute("href", "/books/walden/read");

    await userEvent.click(screen.getByRole("radio", { name: /Currently Reading/ }));
    expect(within(screen.getByTestId("library-grid")).getAllByRole("listitem")).toHaveLength(1);
    await userEvent.click(screen.getByRole("radio", { name: /All/ }));

    await userEvent.type(screen.getByRole("searchbox", { name: "Search books" }), "carroll");
    expect(within(screen.getByTestId("library-grid")).getByText("Alice's Adventures in Wonderland")).toBeInTheDocument();
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search books" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search books" }), "zzz");
    expect(screen.getByTestId("library-empty")).toHaveTextContent("No books match.");
    await userEvent.click(screen.getByRole("button", { name: "Clear search and filter" }));
    expect(within(screen.getByTestId("library-grid")).getAllByRole("listitem")).toHaveLength(3);
  });

  it("shows an error with retry when the library can't load", async () => {
    let fail = true;
    mockFetch({ ...libraryRoutes(), "GET /api/library": () => (fail ? json({ error: { code: "X", message: "x" } }, 500) : json({ books: libraryBooks() })) });
    render(<Library />);
    expect(await screen.findByTestId("library-error")).toHaveTextContent("Couldn't load your library.");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("library-grid")).toBeInTheDocument();
  });
});

describe("Book details", () => {
  const annotations = { "GET /api/books/walden/bookmarks": () => json({ bookmarks: [] }), "GET /api/books/walden/highlights": () => json({ highlights: [] }), "GET /api/books/walden/notes": () => json({ notes: [] }) };

  it("asks before marking as read; Cancel changes nothing, confirming completes the book", async () => {
    let current = book("walden", "Walden", { progress: { ...libraryBooks()[1]!.progress } });
    const patch = vi.fn(() => {
      current = { ...current, progress: { ...current.progress, status: "completed", percent: 100 } };
      return json({ book: { id: "walden", listId: null, title: "Walden", author: "x", read: true, updatedAt: "now" }, list: null });
    });
    mockFetch({ "GET /api/books/walden/details": () => json(details(current)), ...annotations, "PATCH /api/books/walden": patch });
    render(<BookDetailsView bookId="walden" />);
    expect(await screen.findByRole("link", { name: /Continue reading · page 3/ })).toHaveAttribute("href", "/books/walden/read?page=3");

    await userEvent.click(screen.getByTestId("mark-read"));
    const dialog = screen.getByRole("dialog", { name: "Mark Walden as read?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(patch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("mark-read"));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Mark Walden as read?" })).getByRole("button", { name: "Mark as read" }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("✓ Completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as unread" })).toBeInTheDocument();
  });

  it("resets progress after confirmation", async () => {
    let current = libraryBooks()[1]!;
    const del = vi.fn(() => {
      current = { ...current, progress: { ...current.progress, status: "not_started", percent: 0, currentPage: 0, furthestPage: 0 } };
      return json({ progress: current.progress });
    });
    mockFetch({ "GET /api/books/walden/details": () => json(details(current)), ...annotations, "DELETE /api/books/walden/progress": del });
    render(<BookDetailsView bookId="walden" />);
    await userEvent.click(await screen.findByTestId("reset-progress"));
    const dialog = screen.getByRole("dialog", { name: "Reset reading progress?" });
    expect(dialog).toHaveTextContent("Bookmarks, highlights and notes are kept.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reset progress" }));
    expect(await screen.findByRole("link", { name: "Start reading" })).toBeInTheDocument();
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("tracks pages by hand for books that can't be read in the app", async () => {
    const hobbit = book("the-hobbit", "The Hobbit", { readable: false, pagesApprox: true, progress: { ...libraryBooks()[0]!.progress, totalPages: 310 } });
    const save = vi.fn(() => json({ progress: { ...hobbit.progress, status: "reading", currentPage: 42, furthestPage: 42, percent: 14 }, justCompleted: false }));
    mockFetch({
      "GET /api/books/the-hobbit/details": () => json(details(hobbit)),
      "GET /api/books/the-hobbit/bookmarks": () => json({ bookmarks: [] }),
      "GET /api/books/the-hobbit/highlights": () => json({ highlights: [] }),
      "GET /api/books/the-hobbit/notes": () => json({ notes: [] }),
      "PUT /api/books/the-hobbit/progress": save,
    });
    render(<BookDetailsView bookId="the-hobbit" />);
    expect(await screen.findByText(/isn't available to read here/)).toBeInTheDocument();
    await userEvent.type(screen.getByTestId("page-input"), "42");
    await userEvent.click(screen.getByRole("button", { name: "Update page" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(JSON.parse(String((save.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toMatchObject({ page: 42 });
  });
});

describe("Reader", () => {
  const readerRoutes = () => {
    const progressBodies: { page: number }[] = [];
    const routes: Record<string, (u: string, i?: RequestInit) => Response> = {
      "GET /api/books/walden/details": () => json(details(libraryBooks()[1]!)),
      "GET /api/reader/preferences": () => json(DEFAULT_READER_PREFS),
      "GET /api/books/walden/highlights": () => json({ highlights: [] }),
      "GET /api/books/walden/bookmarks": () => json({ bookmarks: [] }),
      "GET /api/books/walden/notes": () => json({ notes: [] }),
      "PUT /api/reader/preferences": (_u, i) => json(JSON.parse(String(i!.body))),
      "PUT /api/books/walden/progress": (_u, i) => {
        const body = JSON.parse(String(i!.body));
        progressBodies.push(body);
        return json({ progress: { ...libraryBooks()[1]!.progress, currentPage: body.page, furthestPage: body.page }, justCompleted: body.page === 10 });
      },
      "POST /api/books/walden/bookmarks": () => json({ id: 1, bookId: "walden", page: 3, label: "Chapter I · page 3", createdAt: "now" }, 201),
      "POST /api/books/walden/highlights": (_u, i) => {
        const b = JSON.parse(String(i!.body));
        return json({ id: 7, bookId: "walden", page: b.page, paragraph: b.paragraph, color: b.color, note: b.note ?? null, excerpt: "x", createdAt: "now", updatedAt: "now" }, 201);
      },
    };
    for (let n = 1; n <= 10; n++) routes[`GET /api/books/walden/pages/${n}`] = () => json(page(n));
    return { routes, progressBodies };
  };

  it("resumes at the saved page, turns pages with buttons and arrow keys, and saves progress", async () => {
    const { routes, progressBodies } = readerRoutes();
    mockFetch(routes);
    render(<Reader bookId="walden" initialPage={null} />);
    expect(await screen.findByTestId("page-label")).toHaveTextContent("Page 3 of 10");
    expect(screen.getByText("Page 3 first paragraph.")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("next-page"));
    expect(await screen.findByText("Page 4 first paragraph.")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowLeft}");
    expect(await screen.findByText("Page 3 first paragraph.")).toBeInTheDocument();
    await waitFor(() => expect(progressBodies.map((b) => b.page)).toEqual(expect.arrayContaining([3, 4])));
  });

  it("changes reading settings and saves them for both clients", async () => {
    const { routes } = readerRoutes();
    const fetchMock = mockFetch(routes);
    render(<Reader bookId="walden" initialPage={1} />);
    await screen.findByTestId("page-label");
    await userEvent.click(screen.getByRole("button", { name: "Reading settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase font size" }));
    await userEvent.click(screen.getByRole("radio", { name: "Sepia" }));
    await waitFor(() => expect(screen.getByTestId("reader")).toHaveAttribute("data-reader-theme", "sepia"));
    expect(screen.getByTestId("page-text")).toHaveStyle({ fontSize: "20px" });
    const saved = fetchMock.mock.calls.filter(([, i]) => i?.method === "PUT" && String(fetchMock.mock.calls[0]).length >= 0).map(([u, i]) => [u, i?.body]);
    expect(saved.some(([u, b]) => String(u).endsWith("/api/reader/preferences") && String(b).includes('"theme":"sepia"'))).toBe(true);
  });

  it("bookmarks the page and highlights a paragraph with a note", async () => {
    const { routes } = readerRoutes();
    mockFetch(routes);
    render(<Reader bookId="walden" initialPage={3} />);
    await screen.findByTestId("page-label");
    await userEvent.click(screen.getByRole("button", { name: "Bookmark page 3" }));
    expect(await screen.findByRole("button", { name: "Remove bookmark on page 3" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByTestId("paragraph-1"));
    const pop = screen.getByTestId("highlight-popover");
    await userEvent.type(within(pop).getByTestId("highlight-note-input"), "Important");
    await userEvent.click(within(pop).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByTestId("paragraph-1")).toHaveAttribute("data-highlight", "yellow"));
  });
});
