import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderApp } from "./renderApp";
import { mockFetch } from "./helpers";
import { readingRoutes, stats } from "./readingFixtures";
import { json } from "./helpers";

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem("rct.onboarded", "1");
});

it("My Library shows stats, goal, Continue Reading, and filters and searches books", async () => {
  const { routes } = readingRoutes();
  mockFetch({ ...routes, [`GET /api/reading/stats?today=${new Date().toLocaleDateString("sv-SE")}`]: () => json(stats()) });
  await renderApp("/library");
  expect(await screen.findByTestId("library-grid")).toBeOnTheScreen();
  expect(screen.getByLabelText("Pages read: 313")).toBeOnTheScreen();
  expect(screen.getByTestId("streak")).toHaveTextContent("🔥 2 days streak");
  expect(within(screen.getByTestId("continue-reading")).getByLabelText(/Walden\. Page 3 of 10/)).toBeOnTheScreen();

  const cards = () => within(screen.getByTestId("library-grid")).queryAllByTestId(/^library-book-/).map((n) => n.props.testID);
  expect(cards()).toEqual(["library-book-alice", "library-book-walden", "library-book-the-hobbit"]);
  await fireEvent.press(screen.getByRole("radio", { name: "Currently Reading, 1" }));
  expect(cards()).toEqual(["library-book-walden"]);
  await fireEvent.press(screen.getByRole("radio", { name: "All, 3" }));
  await fireEvent.changeText(screen.getByTestId("library-search"), "carroll");
  await waitFor(() => expect(cards()).toEqual(["library-book-alice"]));
  await fireEvent.changeText(screen.getByTestId("library-search"), "zzz");
  expect(await screen.findByText("No books match.")).toBeOnTheScreen();
});
