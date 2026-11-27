import { Stack, useLocalSearchParams } from "expo-router";
import { BookDetailsScreen } from "../../src/screens/BookDetailsScreen";

export default function BookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "", headerBackTitle: "Library", headerTransparent: true }} />
      <BookDetailsScreen bookId={String(id)} />
    </>
  );
}
