import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderApp } from "./renderApp";
import { freshLists, json, mockFetch, progressRoutes } from "./helpers";

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes() });
});

it("first launch: the walkthrough explains each part step by step and Finish remembers it", async () => {
  await renderApp();
  expect(await screen.findByText("Welcome to Lantern Lane Library 👋")).toBeOnTheScreen();
  expect(screen.getByText("STEP 1 OF 6")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByText("Your reading lists")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(await screen.findByText("Welcome to Lantern Lane Library 👋")).toBeOnTheScreen();

  for (const title of ["Your reading lists", "Mark a book as read", "Challenge offer", "Tabs at the bottom", "You're all set!"]) {
    await fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText(title)).toBeOnTheScreen();
  }
  expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Finish" }));
  await waitFor(() => expect(screen.queryByTestId("walkthrough")).toBeNull());
  await waitFor(async () => expect(await AsyncStorage.getItem("rct.onboarded")).toBe("1"));
  expect(screen.getByTestId("count-fiction")).toHaveTextContent("0 of 3 read");
});
