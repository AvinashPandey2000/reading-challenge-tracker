import { fireEvent, screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderApp } from "./renderApp";
import { freshLists, json, mockFetch, progressRoutes } from "./helpers";

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes() });
});

it("Next steps through all three slides and Get started opens the tabs", async () => {
  await renderApp();
  await screen.findByText("Track two reading lists");
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  expect(screen.queryByRole("button", { name: "Skip the intro" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Get started" }));
  expect(await screen.findByText("Your reading challenge")).toBeOnTheScreen();
});
