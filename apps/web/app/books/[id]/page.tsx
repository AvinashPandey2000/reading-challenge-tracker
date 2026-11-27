import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { BookDetailsView } from "@/components/reading/BookDetailsView";
import styles from "../../page.module.css";

export const metadata: Metadata = {
  title: "Book details · Lantern Lane Library",
  robots: { index: false, follow: true },
};

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <SiteHeader current="library" />
      <main className={styles.main}>
        <Link href="/library" className={styles.backLink}>
          ← My Library
        </Link>
        <BookDetailsView bookId={id} />
      </main>
    </>
  );
}
