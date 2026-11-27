import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const label = (page: Page) => page.getByTestId("page-label");

test.describe("reading experience", () => {
  test("library: stats, search and status filters @mobile", async ({ page }) => {
    await page.goto("/library");
    const grid = page.getByTestId("library-grid");
    await expect(grid.getByRole("listitem")).toHaveCount(10);
    await expect(page.getByTestId("reading-stats")).toContainText("Total books10");
    await page.getByRole("searchbox", { name: "Search books" }).fill("alice");
    await expect(grid.getByRole("listitem")).toHaveCount(1);
    await expect(grid).toContainText("Alice's Adventures in Wonderland");
    await page.getByRole("searchbox", { name: "Search books" }).fill("");
    await page.getByRole("radio", { name: /Completed/ }).click();
    await expect(page.getByTestId("library-empty")).toContainText("No books match.");
    await page.getByRole("radio", { name: /^All/ }).click();
    await expect(grid.getByRole("listitem")).toHaveCount(10);
  });

  test("read, refresh and resume; status moves to Currently Reading; Continue Reading lists it @mobile", async ({ page }) => {
    await page.goto("/books/the-secret-garden");
    await expect(page.getByTestId("book-details")).toContainText("Not Started");
    await page.getByTestId("start-reading").click();
    await expect(label(page)).toContainText("Page 1 of");
    await expect(page.getByTestId("page-text")).toContainText("Chapter I — There Is No One Left");
    await page.getByTestId("next-page").click();
    await expect(label(page)).toContainText("Page 2 of");
    await page.getByTestId("next-page").click();
    await expect(label(page)).toContainText("Page 3 of");
    await expect(page).toHaveURL(/page=3/);

    await page.goto("/books/the-secret-garden");
    await expect(page.getByTestId("book-details")).toContainText("Currently Reading");
    await page.getByRole("link", { name: /Continue reading · page 3/ }).click();
    await expect(label(page)).toContainText("Page 3 of");
    await page.goto("/library");
    await expect(page.getByTestId("continue-reading")).toContainText("The Secret Garden");
  });

  test("keyboard paging and reading settings persist (shared with the app via the API)", async ({ page, request, api }) => {
    await page.goto("/books/peter-pan/read?page=2");
    await expect(label(page)).toContainText("Page 2 of");
    await page.keyboard.press("ArrowRight");
    await expect(label(page)).toContainText("Page 3 of");
    await page.keyboard.press("ArrowLeft");
    await expect(label(page)).toContainText("Page 2 of");

    await page.getByTestId("settings-toggle").click();
    await page.getByRole("button", { name: "Increase font size" }).click();
    await page.getByText("Sepia", { exact: true }).click();
    await page.getByText("Justify", { exact: true }).click();
    await expect(page.getByTestId("reader")).toHaveAttribute("data-reader-theme", "sepia");
    await expect.poll(async () => (await (await request.get(`${api.url}/api/reader/preferences`)).json()).theme).toBe("sepia");
    await page.reload();
    await expect(page.getByTestId("reader")).toHaveAttribute("data-reader-theme", "sepia");
    await expect(page.getByTestId("page-text")).toHaveCSS("font-size", "20px");
    await expect(page.getByTestId("page-text")).toHaveCSS("text-align", "justify");
  });

  test("bookmark a page, highlight a paragraph with a note; both show on the details page after reload", async ({ page }) => {
    await page.goto("/books/walden/read?page=4");
    await expect(label(page)).toContainText("Page 4 of");
    await page.getByTestId("bookmark-toggle").click();
    await expect(page.getByTestId("bookmark-toggle")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("paragraph-0").click();
    await page.getByRole("button", { name: "Highlight green" }).click();
    await expect(page.getByTestId("paragraph-0")).toHaveAttribute("data-highlight", "green");
    // The popover stays open after choosing a colour, so a note can be added straight away.
    await page.getByTestId("highlight-note-input").fill("Simplify, simplify");
    await page.getByRole("button", { name: "Save" }).click();
    await page.reload();
    await expect(page.getByTestId("paragraph-0")).toHaveAttribute("data-highlight", "green");
    await page.goto("/books/walden");
    await expect(page.getByTestId("bookmark-list")).toContainText("page 4");
    await expect(page.getByTestId("highlight-list")).toContainText("Note: Simplify, simplify");
  });

  test("finishing the last page completes the book and updates the challenge count", async ({ page, request, api }) => {
    const total = (await (await request.get(`${api.url}/api/books/the-secret-garden/details`)).json()).book.progress.totalPages as number;
    await page.goto(`/books/the-secret-garden/read?page=${total - 1}`);
    await expect(label(page)).toContainText(`Page ${total - 1} of ${total}`);
    await page.getByTestId("next-page").click();
    await expect(page.getByTestId("finished-dialog")).toBeVisible();
    await expect(page.getByTestId("finished-dialog")).toContainText("You finished The Secret Garden!");
    await page.goto("/books/the-secret-garden");
    await expect(page.getByTestId("book-details")).toContainText("Completed");
    await page.goto("/");
    await expect(page.getByTestId("count-fiction")).toHaveText("1 of 3 read");
  });

  test("Mark as Read with confirmation, then reset progress @mobile", async ({ page }) => {
    await page.goto("/books/the-hobbit");
    await expect(page.getByTestId("book-details")).toContainText("isn't available to read here");
    await page.getByTestId("page-input").fill("120");
    await page.getByRole("button", { name: "Update page" }).click();
    await expect(page.getByTestId("book-details")).toContainText("Currently Reading");
    await page.getByTestId("mark-read").click();
    const confirm = page.getByRole("dialog", { name: "Mark The Hobbit as read?" });
    await confirm.getByRole("button", { name: "Mark as read" }).click();
    await expect(page.getByTestId("book-details")).toContainText("Completed");
    await page.getByTestId("reset-progress").click();
    await page.getByRole("dialog", { name: "Reset reading progress?" }).getByRole("button", { name: "Reset progress" }).click();
    await expect(page.getByTestId("book-details")).toContainText("Not Started");
  });

  test("progress made through the API (as the Expo app does) appears on the web", async ({ page, request, api }) => {
    const day = new Date().toLocaleDateString("sv-SE");
    expect((await request.put(`${api.url}/api/books/peter-pan/progress`, { data: { page: 7, secondsDelta: 45, day } })).status()).toBe(200);
    await page.goto("/books/peter-pan");
    await expect(page.getByRole("link", { name: /Continue reading · page 7/ })).toBeVisible();
    await page.goto("/library");
    await expect(page.getByTestId("streak")).toContainText("1 day streak");
  });
});
