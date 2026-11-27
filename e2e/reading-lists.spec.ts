import { count, expect, openChallenge, test } from "./fixtures";

test.describe("reading lists", () => {
  test("fresh database: two lists, three unread books each, both 0 of 3 @mobile", async ({ page }) => {
    await openChallenge(page);
    await expect(page.getByRole("heading", { level: 1, name: "Your reading challenge" })).toBeVisible();
    for (const list of ["fiction", "nonfiction"] as const) {
      await expect(count(page, list)).toHaveText("0 of 3 read");
      const boxes = page.getByTestId(`list-${list}`).getByRole("checkbox");
      await expect(boxes).toHaveCount(3);
      for (const box of await boxes.all()) await expect(box).not.toBeChecked();
    }
    await expect(page.getByTestId("list-fiction")).toContainText("The Hobbit");
    await expect(page.getByTestId("list-fiction")).toContainText("Matilda");
    await expect(page.getByTestId("list-fiction")).toContainText("The Secret Garden");
    await expect(page.getByTestId("list-nonfiction")).toContainText("The Story of My Life");
    await expect(page.getByTestId("list-nonfiction")).toContainText("A Brief History of Time");
    await expect(page.getByTestId("list-nonfiction")).toContainText("The Diary of a Young Girl");
  });

  test("mark Matilda read, refresh, then unread; counts stay independent @mobile", async ({ page }) => {
    await openChallenge(page);
    const matilda = page.getByRole("checkbox", { name: /Matilda/ });
    await page.getByText("Matilda", { exact: true }).click();
    await expect(matilda).toBeChecked();
    await expect(count(page, "fiction")).toHaveText("1 of 3 read");
    await expect(page.getByRole("status").filter({ hasText: "Matilda marked as read" })).toHaveCount(1);

    await page.reload();
    await expect(count(page, "fiction")).toHaveText("1 of 3 read");
    await expect(count(page, "nonfiction")).toHaveText("0 of 3 read");
    await expect(page.getByRole("checkbox", { name: /Matilda/ })).toBeChecked();
    await expect(page.getByTestId("book-matilda")).toContainText("✓ Read");

    await page.getByText("Matilda", { exact: true }).click();
    await expect(page.getByRole("checkbox", { name: /Matilda/ })).not.toBeChecked();
    await expect(count(page, "fiction")).toHaveText("0 of 3 read");
  });

  test("keyboard only: Tab to a book and press Space", async ({ page }) => {
    await openChallenge(page);
    const hobbit = page.getByRole("checkbox", { name: /The Hobbit/ });
    // Tab from the top of the page until the first book has focus.
    for (let i = 0; i < 10 && !(await hobbit.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(hobbit).toBeFocused();
    const outline = await page
      .getByTestId("book-the-hobbit")
      .locator("label span[aria-hidden]")
      .first()
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid"); // visible focus indicator on the custom box
    await page.keyboard.press("Space");
    await expect(hobbit).toBeChecked();
    await expect(count(page, "fiction")).toHaveText("1 of 3 read");
  });

  test("failed save keeps the confirmed value and count; Retry succeeds; other books stay usable", async ({ page }) => {
    await openChallenge(page);
    let fail = true;
    await page.route("**/api/books/matilda", async (route) => {
      if (fail) {
        await new Promise((r) => setTimeout(r, 300));
        return route.fulfill({ status: 500, json: { error: { code: "INTERNAL_ERROR", message: "Simulated" } } });
      }
      return route.continue();
    });

    await page.getByText("Matilda", { exact: true }).click();
    await expect(page.getByTestId("book-matilda")).toContainText("Saving…");
    await expect(count(page, "fiction")).toHaveText("0 of 3 read");

    // Another book can be saved while Matilda is in flight / failed.
    await page.getByText("The Hobbit", { exact: true }).click();
    await expect(page.getByRole("checkbox", { name: /The Hobbit/ })).toBeChecked();

    const alert = page.getByTestId("book-matilda").getByRole("alert");
    await expect(alert).toHaveText(/Couldn't save Matilda\. Try again\./);
    await expect(page.getByRole("checkbox", { name: /Matilda/ })).not.toBeChecked();
    await expect(count(page, "fiction")).toHaveText("1 of 3 read"); // only The Hobbit

    fail = false;
    await page.getByRole("button", { name: "Retry saving Matilda" }).click();
    await expect(page.getByRole("checkbox", { name: /Matilda/ })).toBeChecked();
    await expect(count(page, "fiction")).toHaveText("2 of 3 read");
    await expect(alert).toHaveCount(0);
  });

  test("initial load failure shows an error and recovers", async ({ page }) => {
    let fail = true;
    await page.route("**/api/books", (route) =>
      fail ? route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR", message: "down" } } }) : route.continue(),
    );
    await page.goto("/");
    await expect(page.getByTestId("lists-error")).toContainText("Couldn't load your reading lists.");
    // The video still loads independently.
    await expect(page.getByRole("button", { name: "Play welcome video" })).toBeEnabled();
    fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(count(page, "fiction")).toHaveText("0 of 3 read");
  });

  test("changes survive an actual API server restart", async ({ page, api }) => {
    await openChallenge(page);
    await page.getByText("The Diary of a Young Girl", { exact: true }).click();
    await expect(count(page, "nonfiction")).toHaveText("1 of 3 read");
    await api.restart();
    await page.reload();
    await expect(count(page, "nonfiction")).toHaveText("1 of 3 read");
    await expect(count(page, "fiction")).toHaveText("0 of 3 read");
  });

  test("another client (as the Expo app does) updates the same reader; a fresh web fetch reflects it", async ({ page, request, api }) => {
    await openChallenge(page);
    // Expo calls the same backend directly.
    const res = await request.patch(`${api.url}/api/books/a-brief-history-of-time`, { data: { read: true } });
    expect(res.status()).toBe(200);
    await page.reload();
    await expect(count(page, "nonfiction")).toHaveText("1 of 3 read");
    await expect(page.getByRole("checkbox", { name: /A Brief History of Time/ })).toBeChecked();
  });
});
