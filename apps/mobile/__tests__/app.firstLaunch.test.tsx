import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderApp } from "./renderApp";
import { freshLists, json, mockFetch, progressRoutes } from "./helpers";

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes() });
});

it("shows the intro on first launch; Skip saves the flag and opens the Challenge tab", async () => {
  await renderApp();
  expect(await screen.findByText("Track two reading lists")).toBeOnTheScreen();
  expect(screen.getAllByLabelText(/^Slide 1 of 3/).length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByRole("button", { name: "Skip the intro" }));
  expect(await screen.findByText("Your reading challenge")).toBeOnTheScreen();
  await waitFor(async () => expect(await AsyncStorage.getItem("rct.onboarded")).toBe("1"));
  expect(await screen.findByTestId("count-fiction")).toHaveTextContent("0 of 3 read");
});
