import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderApp } from "./renderApp";
import { freshLists, json, mockFetch, progressRoutes } from "./helpers";

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes() });
});

it("Skip tour closes it straight away and remembers", async () => {
  await renderApp();
  await fireEvent.press(await screen.findByRole("button", { name: "Skip tour" }));
  await waitFor(() => expect(screen.queryByTestId("walkthrough")).toBeNull());
  await waitFor(async () => expect(await AsyncStorage.getItem("rct.onboarded")).toBe("1"));
});
