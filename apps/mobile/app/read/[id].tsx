import { useLocalSearchParams } from "expo-router";
import { ReaderScreen } from "../../src/screens/ReaderScreen";

export default function ReadRoute() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>();
  const n = page && /^\d+$/.test(page) ? Number(page) : null;
  // The page param updates as the reader turns pages; only its first value is used to open the book.
  return <ReaderScreen key={String(id)} bookId={String(id)} initialPage={n} />;
}
