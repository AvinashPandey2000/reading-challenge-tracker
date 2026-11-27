import type { Metadata } from "next";
import { Reader } from "@/components/reading/Reader";

export const metadata: Metadata = {
  title: "Reading · Lantern Lane Library",
  robots: { index: false, follow: false },
};

export default async function ReadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  const { page } = await searchParams;
  const n = page && /^\d+$/.test(page) ? Number(page) : null;
  return <Reader bookId={id} initialPage={n} />;
}
