import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TakeTourButton, Walkthrough } from "@/components/Walkthrough";

const steps = [
  { id: "a", target: null, title: "Welcome", body: "Intro" },
  { id: "b", target: "thing", title: "The thing", body: "This is the thing." },
  { id: "c", target: null, title: "Done", body: "Bye" },
];

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => vi.useRealTimers());

const openFirstVisit = async () => {
  render(
    <>
      <div data-tour="thing">Thing</div>
      <Walkthrough steps={steps} />
      <TakeTourButton />
    </>,
  );
  await act(async () => vi.advanceTimersByTime(700));
};

describe("Walkthrough", () => {
  it("opens on the first visit and steps with Next, Back and Finish", async () => {
    await openFirstVisit();
    expect(screen.getByRole("dialog", { name: "Welcome" })).toHaveTextContent("Step 1 of 3");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "The thing" })).toBeInTheDocument();
    expect(document.querySelector('[class*="spotlight"]')).not.toBeNull(); // highlights the target
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "Welcome" })).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("rct-walkthrough-done")).toBe("1");
  });

  it("doesn't open again once seen, but Take the tour replays it; Esc closes", async () => {
    localStorage.setItem("rct-walkthrough-done", "1");
    await openFirstVisit();
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Take the tour" }));
    expect(screen.getByRole("dialog", { name: "Welcome" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Skip tour closes and remembers", async () => {
    await openFirstVisit();
    await userEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(localStorage.getItem("rct-walkthrough-done")).toBe("1");
  });
});
