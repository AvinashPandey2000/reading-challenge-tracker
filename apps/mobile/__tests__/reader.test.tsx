import { Alert } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderApp } from "./renderApp";
import { mockFetch } from "./helpers";
import { readingRoutes } from "./readingFixtures";

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem("rct.onboarded", "1");
});

it("details: Mark as read asks first, then completes the book", async () => {
  const { routes, calls } = readingRoutes();
  mockFetch(routes);
  const alert = jest.spyOn(Alert, "alert");
  await renderApp("/book/walden");
  expect(await screen.findByText("Continue reading · page 3")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("mark-read"));
  expect(alert).toHaveBeenCalledWith("Mark Walden as read?", expect.stringContaining("count toward"), expect.any(Array));
  expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(0);
  const buttons = alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === "Mark as read")!.onPress!();
  await waitFor(() => expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(1));
  expect(await screen.findByText("✓ Completed")).toBeOnTheScreen();
});

it("reader: resumes on the saved page, turns pages, saves progress, changes settings and highlights", async () => {
  const { routes, calls } = readingRoutes();
  mockFetch(routes);
  await renderApp("/read/walden");
  expect(await screen.findByText("Page 3 first paragraph.")).toBeOnTheScreen();
  expect(screen.getByTestId("page-label")).toHaveTextContent("Page 3 of 10 · 30%");

  await fireEvent.press(screen.getByTestId("next-page"));
  expect(await screen.findByText("Page 4 first paragraph.")).toBeOnTheScreen();
  await waitFor(() => expect(calls.filter((c) => c.path.endsWith("/progress")).map((c) => (c.body as { page: number }).page)).toEqual(expect.arrayContaining([3, 4])));

  await fireEvent.press(screen.getByTestId("settings-toggle"));
  await fireEvent.press(screen.getByRole("radio", { name: "Theme: Sepia" }));
  await fireEvent.press(screen.getByRole("button", { name: "Increase font size" }));
  await waitFor(() => expect(calls.some((c) => c.path.endsWith("/preferences") && (c.body as { theme: string }).theme === "sepia")).toBe(true));
  expect(screen.getByTestId("font-size")).toHaveTextContent("20px");
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));

  await fireEvent(screen.getByTestId("paragraph-1"), "longPress");
  await fireEvent.press(await screen.findByRole("button", { name: "Highlight blue" }));
  await waitFor(() => expect(calls.some((c) => c.method === "POST" && (c.body as { color: string; paragraph: number }).color === "blue" && (c.body as { paragraph: number }).paragraph === 1)).toBe(true));
});
