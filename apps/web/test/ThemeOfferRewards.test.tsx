import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OfferBanner } from "@/components/OfferBanner";
import { ReadingChallenge } from "@/components/ReadingChallenge";
import { freshLists, json, mockFetch, patchOk } from "./fetchMock";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.dataset.theme = "system";
});

describe("ThemeToggle", () => {
  it("is a radio group defaulting to System; choosing Dark sets data-theme and remembers it", async () => {
    document.documentElement.dataset.theme = "system";
    render(<ThemeToggle />);
    const group = screen.getByRole("group", { name: "Colour theme" });
    expect(within(group).getByRole("radio", { name: "System" })).toBeChecked();

    await userEvent.click(within(group).getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("rct-theme")).toBe("dark");
    expect(within(group).getByRole("radio", { name: "Dark" })).toBeChecked();

    await userEvent.click(within(group).getByRole("radio", { name: "System" }));
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(localStorage.getItem("rct-theme")).toBeNull();
  });

  it("supports arrow keys like any radio group", async () => {
    render(<ThemeToggle />);
    screen.getByRole("radio", { name: "System" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("OfferBanner", () => {
  it("shows the deadline, days left and the demo note", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-27T10:00:00Z"));
    render(<OfferBanner />);
    expect(screen.getByRole("heading", { name: "Finish both lists by 31 January 2027 and your late fees are waived." })).toBeInTheDocument();
    expect(screen.getByText("66 days left")).toBeInTheDocument();
    expect(screen.getByText("Demo offer — Lantern Lane is a fictional library.")).toBeInTheDocument();
  });

  it("says when the offer has ended", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-02-02T10:00:00Z"));
    render(<OfferBanner />);
    expect(screen.getByRole("heading", { name: "This offer ended on 31 January 2027." })).toBeInTheDocument();
  });
});

describe("Rewards", () => {
  it("unlocks the Fiction bookmark when the last fiction book is saved and announces it", async () => {
    const lists = freshLists();
    lists.lists[0]!.readCount = 2;
    lists.lists[0]!.books[0]!.read = true;
    lists.lists[0]!.books[1]!.read = true;
    mockFetch({ "GET /api/books": () => json(lists), "PATCH /api/books/the-secret-garden": patchOk(lists, 3) });
    render(<ReadingChallenge />);
    const card = await screen.findByTestId("reward-fiction-bookmark");
    expect(card).toHaveTextContent("🔒 Locked");
    expect(card).toHaveTextContent("2 of 3 read");

    await userEvent.click(screen.getByRole("checkbox", { name: /The Secret Garden/ }));
    await waitFor(() => expect(card).toHaveTextContent("✓ Unlocked"));
    expect(screen.getByTestId("announcer")).toHaveTextContent(
      "The Secret Garden marked as read. Fiction: 3 of 3 read. Reward unlocked: Fiction bookmark.",
    );
    expect(screen.getByTestId("reward-challenge-tote")).toHaveTextContent("🔒 Locked");
    expect(screen.queryByTestId("claim-code")).toBeNull();
  });
});
