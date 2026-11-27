import { count, expect, openChallenge, test, SKIP_WALKTHROUGH } from "./fixtures";

const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const LIGHT_BG = "rgb(251, 246, 236)";
const DARK_BG = "rgb(21, 19, 15)";

test.describe("theme", () => {
  test("follows the system dark preference by default @mobile", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    await context.addInitScript(SKIP_WALKTHROUGH);
    const page = await context.newPage();
    await openChallenge(page);
    expect(await bg(page)).toBe(DARK_BG);
    await expect(page.getByRole("radio", { name: "System" })).toBeChecked();
    await context.close();
  });

  test("manual choice overrides the system and survives a reload, without a flash", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    await context.addInitScript(SKIP_WALKTHROUGH);
    const page = await context.newPage();
    await openChallenge(page);
    await page.getByRole("radio", { name: "Light" }).check({ force: true });
    expect(await bg(page)).toBe(LIGHT_BG);
    expect(await page.evaluate(() => localStorage.getItem("rct-theme"))).toBe("light");

    // The inline head script applies the saved theme before React loads.
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
    expect(await bg(page)).toBe(LIGHT_BG);
    await context.close();
  });
});

test.describe("glass surfaces", () => {
  test("header and cards use a backdrop blur; reduced transparency is respected by CSS", async ({ page }) => {
    await openChallenge(page);
    for (const loc of [page.locator("header > div").first(), page.getByTestId("list-fiction"), page.getByTestId("offer-banner")]) {
      const filter = await loc.evaluate((el) => getComputedStyle(el).backdropFilter || (getComputedStyle(el) as any).webkitBackdropFilter);
      expect(filter).toContain("blur");
    }
    // The sticky glass header stays at the top while scrolling.
    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.locator("header > div").first().evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeLessThan(20);
  });
});

test.describe("offer and rewards", () => {
  test("shows the offer banner with the shared deadline @mobile", async ({ page }) => {
    await openChallenge(page);
    const banner = page.getByTestId("offer-banner");
    await expect(banner).toContainText("Finish both lists by 31 January 2027 and your late fees are waived.");
    await expect(banner).toContainText(/\d+ days? left|ended/);
    await expect(banner).toContainText("Demo offer — Lantern Lane is a fictional library.");
  });

  test("finishing Fiction in the UI unlocks the bookmark and announces it", async ({ page }) => {
    await openChallenge(page);
    for (const [id, title] of [["the-hobbit", "The Hobbit"], ["matilda", "Matilda"], ["the-secret-garden", "The Secret Garden"]]) {
      await page.getByTestId(`book-${id}`).getByText(title, { exact: true }).click();
      await expect(page.getByRole("checkbox", { name: new RegExp(title) })).toBeChecked();
    }
    await expect(count(page, "fiction")).toHaveText(/3 of 3 read/);
    await expect(page.getByTestId("reward-fiction-bookmark")).toContainText("✓ Unlocked");
    await expect(page.getByTestId("reward-challenge-tote")).toContainText("🔒 Locked");
    await expect(page.getByTestId("announcer")).toContainText("Reward unlocked: Fiction bookmark.");
  });

  test("all six books unlock the tote; the claim code matches GET /api/rewards", async ({ page, request, api }) => {
    for (const id of ["the-hobbit", "matilda", "the-secret-garden", "the-story-of-my-life", "a-brief-history-of-time", "the-diary-of-a-young-girl"]) {
      expect((await request.patch(`${api.url}/api/books/${id}`, { data: { read: true } })).status()).toBe(200);
    }
    const apiRewards = await (await request.get(`${api.url}/api/rewards`)).json();
    const tote = apiRewards.rewards.find((r: { id: string }) => r.id === "challenge-tote");
    expect(tote.claimCode).toMatch(/^LANTERN-[A-Z2-9]{4}$/);

    await openChallenge(page);
    await expect(page.getByTestId("reward-challenge-tote")).toContainText("✓ Unlocked");
    await expect(page.getByTestId("claim-code")).toContainText(tote.claimCode);
  });
});
