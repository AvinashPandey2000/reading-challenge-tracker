import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { Library } from "@/components/reading/Library";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "My Library · Lantern Lane Library",
  description: "Your books, reading progress, goals and streak at the Lantern Lane Library.",
  alternates: { canonical: "/library" },
};

export default function LibraryPage() {
  return (
    <>
      <SiteHeader current="library" />
      <main className={styles.main}>
        <div>
          <h1 className={styles.title}>My Library</h1>
          <p className={styles.lede}>Pick up where you left off, find a book, and keep your streak going.</p>
        </div>
        <Library />
      </main>
    </>
  );
}
