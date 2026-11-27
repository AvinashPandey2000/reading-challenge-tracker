import type { Page } from "@playwright/test";
import { count, expect, openChallenge, test } from "./fixtures";

const video = (page: Page) => page.getByTestId("video-element");
const currentTime = (page: Page) => video(page).evaluate((v: HTMLVideoElement) => v.currentTime);
const isPaused = (page: Page) => video(page).evaluate((v: HTMLVideoElement) => v.paused);

async function waitForPlayerReady(page: Page) {
  await expect.poll(() => video(page).evaluate((v: HTMLVideoElement) => v.readyState >= 1 && v.duration > 0)).toBe(true);
}

/** Seek with the accessible seek slider, like a reader dragging it. */
async function seekTo(page: Page, seconds: number) {
  const slider = page.getByRole("slider", { name: "Seek" });
  await slider.fill(String(seconds));
  await expect.poll(() => currentTime(page)).toBeCloseTo(seconds, 0);
}

async function savedPosition(page: Page) {
  const res = await page.request.get("/api/video-progress");
  return (await res.json()).positionSeconds as number;
}

test.describe("welcome video", () => {
  test("play, seek to ~12 s, pause, refresh, press Play: resumes near 12 s without autoplay @mobile", async ({ page }) => {
    await openChallenge(page);
    await waitForPlayerReady(page);
    await page.getByRole("button", { name: "Play welcome video" }).click();
    await expect.poll(() => isPaused(page)).toBe(false);
    await seekTo(page, 12);
    await page.getByRole("button", { name: "Pause welcome video" }).click();
    await expect(page.getByTestId("video-saved")).toContainText("Saved your place at 0:1");
    const saved = await savedPosition(page);
    expect(saved).toBeGreaterThan(11.5);
    expect(saved).toBeLessThan(14);

    await page.reload();
    await expect(page.getByTestId("resume-hint")).toContainText("Press Play to pick up at 0:1");
    await waitForPlayerReady(page);
    expect(await isPaused(page)).toBe(true); // no autoplay
    // Initialisation never wrote 0 back.
    expect(await savedPosition(page)).toBeCloseTo(saved, 2);

    await page.getByRole("button", { name: "Play welcome video" }).click();
    await expect.poll(() => isPaused(page)).toBe(false);
    const t = await currentTime(page);
    expect(t).toBeGreaterThanOrEqual(saved - 0.5);
    expect(t).toBeLessThan(saved + 3);
  });

  test("seeking backward then pausing saves the earlier position", async ({ page }) => {
    await openChallenge(page);
    await waitForPlayerReady(page);
    await page.getByRole("button", { name: "Play welcome video" }).click();
    await seekTo(page, 30);
    await page.getByRole("button", { name: "Pause welcome video" }).click();
    await expect.poll(() => savedPosition(page)).toBeGreaterThan(29);

    await page.getByRole("button", { name: "Play welcome video" }).click();
    await seekTo(page, 8);
    await page.getByRole("button", { name: "Pause welcome video" }).click();
    await expect.poll(() => savedPosition(page)).toBeLessThan(10);

    await page.reload();
    await waitForPlayerReady(page);
    await page.getByRole("button", { name: "Play welcome video" }).click();
    await expect.poll(() => isPaused(page)).toBe(false);
    const t = await currentTime(page);
    expect(t).toBeGreaterThan(7.5);
    expect(t).toBeLessThan(11);
  });

  test("video load failure shows an actionable message and the lists still work", async ({ page }) => {
    await page.route("**/media/welcome.*", (route) => route.fulfill({ status: 404, body: "missing" }));
    await openChallenge(page);
    await expect(page.getByTestId("welcome-video").getByRole("alert")).toContainText("The welcome video couldn't load.");
    await expect(page.getByRole("button", { name: "Play welcome video" })).toBeDisabled();
    await page.getByText("Matilda", { exact: true }).click();
    await expect(count(page, "fiction")).toHaveText("1 of 3 read");
  });

  test("playback failure after loading shows a distinct message", async ({ page }) => {
    await openChallenge(page);
    await waitForPlayerReady(page);
    // Simulate the browser refusing to play (e.g. decode failure).
    await video(page).evaluate((v: HTMLVideoElement) => {
      v.play = () => Promise.reject(new DOMException("decode failed", "NotSupportedError"));
    });
    await page.getByRole("button", { name: "Play welcome video" }).click();
    await expect(page.getByTestId("welcome-video").getByRole("alert")).toContainText("Playback stopped unexpectedly.");
  });

  test("progress-save failure is reported and Try again saves it", async ({ page }) => {
    let fail = true;
    await page.route("**/api/video-progress", (route) =>
      route.request().method() === "PUT" && fail
        ? route.fulfill({ status: 500, json: { error: { code: "INTERNAL_ERROR", message: "x" } } })
        : route.continue(),
    );
    await openChallenge(page);
    await waitForPlayerReady(page);
    await page.getByRole("button", { name: "Play welcome video" }).click();
    await seekTo(page, 5);
    await page.getByRole("button", { name: "Pause welcome video" }).click();
    await expect(page.getByTestId("video-save-error")).toContainText("Couldn't save your place at 0:0");
    expect(await savedPosition(page)).toBe(0);
    fail = false;
    await page.getByTestId("video-save-error").getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("video-saved")).toBeVisible();
    expect(await savedPosition(page)).toBeGreaterThan(4);
  });
});
