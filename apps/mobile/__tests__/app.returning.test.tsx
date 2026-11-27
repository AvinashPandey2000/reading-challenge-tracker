import { screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderApp } from "./renderApp";
import { freshLists, json, mockFetch, progressRoutes } from "./helpers";

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes() });
});

it("does not show the intro again once it has been seen", async () => {
  await AsyncStorage.setItem("rct.onboarded", "1");
  await renderApp();
  expect(await screen.findByText("Your reading challenge")).toBeOnTheScreen();
  expect(screen.queryByText("Track two reading lists")).toBeNull();
});
