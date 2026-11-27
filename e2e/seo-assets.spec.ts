import { expect, test } from "./fixtures";

const SITE = "https://reading.example.org";

test.describe("SEO and assets", () => {
  test("renders metadata in the server HTML with absolute URLs and no reader progress", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain("<title>Your reading challenge · Lantern Lane Library</title>");
    expect(html).toMatch(/<meta name="description" content="Track the Lantern Lane Library reading challenge/);
    expect(html).toContain(`<link rel="canonical" href="${SITE}"`);
    expect(html).toContain(`<meta property="og:title" content="Your reading challenge · Lantern Lane Library"`);
    expect(html).toContain(`<meta property="og:image" content="${SITE}/og-image.png"`);
    expect(html).toContain(`<meta name="twitter:card" content="summary_large_image"`);
    expect(html).toContain(`<meta name="twitter:image" content="${SITE}/og-image.png"`);
    expect(html).toContain('<link rel="icon" href="/icon.svg" type="image/svg+xml"');
    expect(html).not.toMatch(/\d of 3 read/); // progress is client-fetched only
  });

  test("social preview image and favicon resolve", async ({ request }) => {
    const og = await request.get("/og-image.png");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toBe("image/png");
    const buf = await og.body();
    expect(buf.subarray(1, 4).toString()).toBe("PNG");
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
    expect((await request.get("/icon.svg")).status()).toBe(200);
  });

  test("robots.txt and sitemap.xml list only the public page", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`<loc>${SITE}/</loc>`);
    expect(sitemap).not.toContain("/api");
  });

  test("API responses are never cacheable", async ({ request }) => {
    const res = await request.get("/api/books");
    expect(res.headers()["cache-control"]).toBe("no-store");
  });

  test("Download sample PDF delivers a real PDF @mobile", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /Download sample PDF/ });
    await expect(link).toContainText("The Secret Garden");
    await expect(link).toContainText("PDF · 6 pages · 12 KB");
    const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
    expect(download.suggestedFilename()).toBe("the-secret-garden-chapter-1.pdf");
    const res = await page.request.get(await link.getAttribute("href") as string);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    const body = await res.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(Math.round(body.length / 1024)).toBe(12);
  });
});
