import { act } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import RootLayout from "../app/_layout";
import TabsLayout from "../app/(tabs)/_layout";
import Challenge from "../app/(tabs)/index";
import Video from "../app/(tabs)/video";
import Rewards from "../app/(tabs)/rewards";
import Library from "../app/(tabs)/library";
import BookRoute from "../app/book/[id]";
import ReadRoute from "../app/read/[id]";

/** Renders the real route tree (expo-router file layout) starting at "/". */
export async function renderApp(initialUrl = "/") {
  await act(async () => {
    renderRouter(
      {
        _layout: RootLayout,
        "(tabs)/_layout": TabsLayout,
        "(tabs)/index": Challenge,
        "(tabs)/video": Video,
        "(tabs)/rewards": Rewards,
        "(tabs)/library": Library,
        "book/[id]": BookRoute,
        "read/[id]": ReadRoute,
      },
      { initialUrl },
    );
  });
}
