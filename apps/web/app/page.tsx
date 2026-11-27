import { ReadingChallenge } from "@/components/ReadingChallenge";
import { WelcomeVideo } from "@/components/WelcomeVideo";
import { SamplePdf } from "@/components/SamplePdf";
import { HeroImage } from "@/components/HeroImage";
import { LIBRARY_NAME } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { OfferBanner } from "@/components/OfferBanner";
import styles from "./page.module.css";

/**
 * The page shell is static. Reader progress is fetched in the browser with `cache: "no-store"`,
 * so it never ends up in static HTML, shared caches, or search/social metadata.
 */
export default function Home() {
  return (
    <>
      <a href="#lists" className="skip-link">
        Skip to reading lists
      </a>
      <SiteHeader current="challenge" />

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="page-title">
          <div className={styles.heroText}>
            <h1 id="page-title" className={styles.title}>
              Your reading challenge
            </h1>
            <p className={styles.lede}>
              Read three fiction and three nonfiction books. Tick each one off when you finish it — your progress is
              saved as you go.
            </p>
          </div>
          <HeroImage />
        </section>

        <OfferBanner />

        <div id="lists" tabIndex={-1} className={styles.listsAnchor}>
          <ReadingChallenge />
        </div>

        <div className={styles.secondary}>
          <WelcomeVideo />
          <SamplePdf />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <p>
            {LIBRARY_NAME} is a fictional library made for a coding exercise. One demo reader; no sign-in.
          </p>
          <p>
            Photo: Wikimedia Commons (see credits in the project&apos;s ASSETS.md). Video: Big Buck Bunny © Blender
            Foundation, CC BY 3.0.
          </p>
        </div>
      </footer>
    </>
  );
}
