/** Public, absolute site URL used for canonical, Open Graph, robots and sitemap URLs. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const LIBRARY_NAME = "Lantern Lane Library";
export const APP_NAME = "Reading Challenge Tracker";
export const SITE_TITLE = `Your reading challenge · ${LIBRARY_NAME}`;
export const SITE_DESCRIPTION =
  "Track the Lantern Lane Library reading challenge: three fiction and three nonfiction books, a quick welcome video, and a free sample to download.";

export const SAMPLE_PDF = {
  href: "/downloads/the-secret-garden-chapter-1.pdf",
  title: "The Secret Garden — Chapter I: There Is No One Left",
  author: "Frances Hodgson Burnett (1911, public domain)",
  /** Size of the committed file; checked by the E2E test. */
  sizeLabel: "PDF · 6 pages · 12 KB",
};

export const VIDEO = {
  sources: [
    { src: "/media/welcome.webm", type: "video/webm" },
    { src: "/media/welcome.mp4", type: "video/mp4" },
  ],
  poster: "/media/welcome-poster.jpg",
  title: "Welcome to the reading challenge",
  credit: "Clip from Big Buck Bunny © Blender Foundation, CC BY 3.0",
};
