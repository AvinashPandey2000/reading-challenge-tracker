import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadingChallenge } from "@/components/ReadingChallenge";
import { deferred, freshLists, json, mockFetch, patchOk } from "./fetchMock";

afterEach(() => vi.unstubAllGlobals());

const fictionCount = () => screen.getByTestId("count-fiction");
const nonfictionCount = () => screen.getByTestId("count-nonfiction");

describe("ReadingChallenge", () => {
  it("shows a loading state, then both lists at 0 of 3 with accessible checkboxes", async () => {
    const gate = deferred<Response>();
    mockFetch({ "GET /api/books": () => gate.promise });
    render(<ReadingChallenge />);
    expect(screen.getByText("Loading your reading lists…")).toBeInTheDocument();

    gate.resolve(json(freshLists()));
    expect(await screen.findByRole("heading", { level: 2, name: "Fiction" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Nonfiction" })).toBeInTheDocument();
    expect(fictionCount()).toHaveTextContent("0 of 3 read");
    expect(nonfictionCount()).toHaveTextContent("0 of 3 read");
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(6);
    expect(screen.getByRole("checkbox", { name: /Matilda/ })).not.toBeChecked();
  });

  it("recovers from an initial load failure with Try again", async () => {
    let calls = 0;
    mockFetch({
      "GET /api/books": () => (++calls === 1 ? json({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500) : json(freshLists())),
    });
    render(<ReadingChallenge />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load your reading lists. Check your connection and try again.");
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("count-fiction")).toHaveTextContent("0 of 3 read");
  });

  it("keeps the confirmed value while saving, then updates row and count together", async () => {
    const lists = freshLists();
    const gate = deferred<Response>();
    const fetchMock = mockFetch({
      "GET /api/books": () => json(lists),
      "PATCH /api/books/matilda": () => gate.promise,
      "PATCH /api/books/the-hobbit": patchOk(lists, 2),
    });
    render(<ReadingChallenge />);
    const matilda = await screen.findByRole("checkbox", { name: /Matilda/ });
    await userEvent.click(matilda);

    // Pending: last confirmed status and count still shown, "Saving…" visible.
    expect(matilda).not.toBeChecked();
    expect(matilda).toHaveAttribute("aria-busy", "true");
    expect(within(screen.getByTestId("book-matilda")).getByText("Saving…")).toBeInTheDocument();
    expect(fictionCount()).toHaveTextContent("0 of 3 read");

    // Duplicate click while in flight is ignored.
    await userEvent.click(matilda);
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/matilda"))).toHaveLength(1);

    // Another book remains usable.
    expect(screen.getByRole("checkbox", { name: /The Hobbit/ })).not.toHaveAttribute("aria-disabled");

    gate.resolve(patchOk(lists, 1)("/api/books/matilda", { body: JSON.stringify({ read: true }) }) as Response);
    await waitFor(() => expect(matilda).toBeChecked());
    expect(fictionCount()).toHaveTextContent("1 of 3 read");
    expect(nonfictionCount()).toHaveTextContent("0 of 3 read");
    expect(within(screen.getByTestId("book-matilda")).getByText("✓ Read")).toBeInTheDocument();
    expect(screen.getByTestId("announcer")).toHaveTextContent("Matilda marked as read. Fiction: 1 of 3 read.");
  });

  it("on failure keeps the saved state, explains, and Retry succeeds", async () => {
    const lists = freshLists();
    let attempts = 0;
    mockFetch({
      "GET /api/books": () => json(lists),
      "PATCH /api/books/matilda": (url, init) =>
        ++attempts === 1 ? json({ error: { code: "INTERNAL_ERROR", message: "boom" } }, 500) : patchOk(lists, 1)(url, init),
    });
    render(<ReadingChallenge />);
    const matilda = await screen.findByRole("checkbox", { name: /Matilda/ });
    await userEvent.click(matilda);

    const row = screen.getByTestId("book-matilda");
    expect(await within(row).findByRole("alert")).toHaveTextContent("Couldn't save Matilda. Try again.");
    expect(matilda).not.toBeChecked();
    expect(fictionCount()).toHaveTextContent("0 of 3 read");

    await userEvent.click(within(row).getByRole("button", { name: "Retry saving Matilda" }));
    await waitFor(() => expect(matilda).toBeChecked());
    expect(fictionCount()).toHaveTextContent("1 of 3 read");
    expect(within(row).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("toggles with the keyboard (Space)", async () => {
    const lists = freshLists();
    mockFetch({ "GET /api/books": () => json(lists), "PATCH /api/books/the-hobbit": patchOk(lists, 1) });
    render(<ReadingChallenge />);
    const hobbit = await screen.findByRole("checkbox", { name: /The Hobbit/ });
    hobbit.focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(hobbit).toBeChecked());
  });
});
