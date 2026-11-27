import { expect, test as withApi } from "./fixtures";

// Uses the API fixture but a fresh page WITHOUT the "seen" flag, like a first-time visitor.
withApi.describe("first-visit walkthrough", () => {
  withApi("shows on the first visit, steps with Next/Back, highlights each part, and doesn't come back after Finish @mobile", async ({ browser, api }) => {
    void api;
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: /Welcome to Lantern Lane Library/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Step 1 of 11");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("dialog", { name: "Challenge and My Library" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("dialog", { name: /Welcome/ })).toBeVisible();

    // Walk to the reading lists step and check the highlight surrounds them.
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("dialog", { name: "Your reading lists" })).toBeVisible();
    await expect
      .poll(async () => {
        const spot = await page.locator('[data-testid="walkthrough"] [class*="spotlight"]').boundingBox();
        const lists = await page.locator('[data-tour="lists"]').boundingBox();
        return !!spot && !!lists && spot.y <= lists.y && spot.y + spot.height >= lists.y + lists.height - 1;
      })
      .toBe(true);
    // The card stays fully on screen.
    const card = (await page.getByRole("dialog", { name: "Your reading lists" }).boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.y + card.height).toBeLessThanOrEqual(vh);

    // Arrow keys work too; finish the tour.
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog", { name: "You're all set!" })).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByTestId("walkthrough")).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("count-fiction")).toBeVisible();
    await page.waitForTimeout(900);
    await expect(page.getByTestId("walkthrough")).toHaveCount(0);

    // Replay from the footer.
    await page.getByRole("button", { name: "Take the tour" }).click();
    await expect(page.getByRole("dialog", { name: /Welcome/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("walkthrough")).toHaveCount(0);
    await context.close();
  });

  withApi("Skip tour closes it and remembers", async ({ browser, api }) => {
    void api;
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: "Skip tour" }).click();
    await expect(page.getByTestId("walkthrough")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("rct-walkthrough-done"))).toBe("1");
    await context.close();
  });
});
