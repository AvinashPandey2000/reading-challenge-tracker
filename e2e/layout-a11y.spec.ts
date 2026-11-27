import { expect, openChallenge, test } from "./fixtures";

test.describe("layout and accessibility", () => {
  test("lists sit side by side on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await openChallenge(page);
    const a = await page.getByTestId("list-fiction").boundingBox();
    const b = await page.getByTestId("list-nonfiction").boundingBox();
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
  });

  test("lists stack on a narrow phone, lists come before the video, no horizontal scroll @mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile);
    await openChallenge(page);
    const a = await page.getByTestId("list-fiction").boundingBox();
    const b = await page.getByTestId("list-nonfiction").boundingBox();
    const v = await page.getByTestId("welcome-video").boundingBox();
    expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
    expect(v!.y).toBeGreaterThan(b!.y);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // The fiction list starts within the first screen.
    expect(a!.y).toBeLessThan(page.viewportSize()!.height);
    // Touch targets
    const row = await page.getByTestId("book-matilda").locator("label").boundingBox();
    expect(row!.height).toBeGreaterThanOrEqual(44);
    const play = await page.getByRole("button", { name: "Play welcome video" }).boundingBox();
    expect(play!.height).toBeGreaterThanOrEqual(44);
  });

  test("controls have accessible names and landmarks are labelled @mobile", async ({ page }) => {
    await openChallenge(page);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your reading challenge");
    await expect(page.getByRole("region", { name: "Fiction", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Nonfiction", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Fiction progress", exact: true })).toHaveAttribute("aria-valuetext", "0 of 3 read");
    for (const name of ["The Hobbit", "Matilda", "The Secret Garden", "The Story of My Life", "A Brief History of Time", "The Diary of a Young Girl"]) {
      await expect(page.getByRole("checkbox", { name: new RegExp(name) })).toHaveCount(1);
    }
    await expect(page.getByRole("button", { name: "Play welcome video" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Seek" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Download sample PDF/ })).toBeVisible();
    // Completion is conveyed by text, not only colour.
    await page.getByText("Matilda", { exact: true }).click();
    await expect(page.getByTestId("book-matilda")).toContainText("✓ Read");
  });

  test("respects reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await openChallenge(page);
    const fill = page.getByTestId("list-fiction").locator("[role=progressbar] > div");
    expect(await fill.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0s/);
    await context.close();
  });

  test("uses short, purposeful motion by default (150–220 ms)", async ({ page }) => {
    await openChallenge(page);
    const fill = page.getByTestId("list-fiction").locator("[role=progressbar] > div");
    const d = await fill.evaluate((el) => getComputedStyle(el).transitionDuration);
    const ms = parseFloat(d) * (d.endsWith("ms") ? 1 : 1000);
    expect(ms).toBeGreaterThanOrEqual(150);
    expect(ms).toBeLessThanOrEqual(220);
  });
});
