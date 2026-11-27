import { useState } from "react";
import { Pressable } from "react-native";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { ChallengeScreen } from "../src/screens/ChallengeScreen";
import { VideoScreen } from "../src/screens/VideoScreen";
import { RewardsScreen } from "../src/screens/RewardsScreen";
import { renderWithProviders } from "./renderWithProviders";
import { freshLists, json, mockFetch, patchOk, progressRoutes } from "./helpers";
import { MockPlayer, players } from "./mockPlayer";

const checkbox = (name: RegExp) => screen.getByRole("checkbox", { name });

beforeEach(() => {
  players.length = 0;
});

describe("ChallengeScreen", () => {
  it("loads both lists from the backend: three unread books each, 0 of 3", async () => {
    let release!: () => void;
    mockFetch({ "GET /api/books": () => new Promise<Response>((r) => (release = () => r(json(freshLists())))), ...progressRoutes() });
    await renderWithProviders(<ChallengeScreen />);
    expect(screen.getByText("Loading your reading lists…")).toBeOnTheScreen();
    await act(async () => release());
    expect(await screen.findByTestId("count-fiction")).toHaveTextContent("0 of 3 read");
    expect(screen.getByTestId("count-nonfiction")).toHaveTextContent("0 of 3 read");
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(checkbox(/Matilda by Roald Dahl/)).not.toBeChecked();
    expect(screen.getByRole("header", { name: "Your reading challenge" })).toBeOnTheScreen();
  });

  it("marks a book read; the row and only its list count update together", async () => {
    const lists = freshLists();
    mockFetch({ "GET /api/books": () => json(lists), "PATCH /api/books/matilda": patchOk(lists, 1), ...progressRoutes() });
    await renderWithProviders(<ChallengeScreen />);
    await fireEvent.press(await screen.findByTestId("toggle-matilda"));
    await waitFor(() => expect(checkbox(/Matilda/)).toBeChecked());
    expect(screen.getByTestId("count-fiction")).toHaveTextContent("1 of 3 read");
    expect(screen.getByTestId("count-nonfiction")).toHaveTextContent("0 of 3 read");
    expect(within(screen.getByTestId("book-matilda")).getByText("✓ Read")).toBeOnTheScreen();
  });

  it("keeps the saved state while saving, blocks duplicate taps, and offers Retry on failure", async () => {
    const lists = freshLists();
    let attempts = 0;
    let release!: () => void;
    const fetchMock = mockFetch({
      "GET /api/books": () => json(lists),
      "PATCH /api/books/matilda": (p, init) => {
        attempts += 1;
        if (attempts === 1) return new Promise<Response>((r) => (release = () => r(json({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500))));
        return patchOk(lists, 1)(p, init);
      },
      ...progressRoutes(),
    });
    await renderWithProviders(<ChallengeScreen />);
    await fireEvent.press(await screen.findByTestId("toggle-matilda"));
    expect(checkbox(/Matilda/)).not.toBeChecked();
    expect(checkbox(/Matilda/)).toBeBusy();
    expect(within(screen.getByTestId("book-matilda")).getByText("Saving…")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("toggle-matilda"));
    expect(fetchMock.mock.calls.filter(([u]) => String(u).endsWith("/matilda"))).toHaveLength(1);

    await act(async () => release());
    expect(await screen.findByText("Couldn't save Matilda. Try again.")).toBeOnTheScreen();
    expect(checkbox(/Matilda/)).not.toBeChecked();
    expect(screen.getByTestId("count-fiction")).toHaveTextContent("0 of 3 read");

    await fireEvent.press(screen.getByRole("button", { name: "Retry saving Matilda" }));
    await waitFor(() => expect(checkbox(/Matilda/)).toBeChecked());
    expect(screen.getByTestId("count-fiction")).toHaveTextContent("1 of 3 read");
    expect(screen.queryByText("Couldn't save Matilda. Try again.")).toBeNull();
  });

  it("shows a load error and recovers", async () => {
    let calls = 0;
    mockFetch({ "GET /api/books": () => (++calls === 1 ? json({ error: { code: "X", message: "x" } }, 503) : json(freshLists())), ...progressRoutes() });
    await renderWithProviders(<ChallengeScreen />);
    expect(await screen.findByText("Couldn't load your reading lists. Check your connection and try again.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("count-fiction")).toHaveTextContent("0 of 3 read");
  });
});

describe("WelcomeVideo on mobile", () => {
  const setup = async (saved: number, extra: Record<string, any> = {}) => {
    const fetchMock = mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes(saved), ...extra });
    const lists = await renderWithProviders(
      <>
        <ChallengeScreen />
        <VideoScreen />
      </>,
    );
    void lists;
    await screen.findByTestId("count-fiction");
    const player = players[0] as MockPlayer;
    return { player, fetchMock, puts: () => fetchMock.mock.calls.filter(([, i]) => i?.method === "PUT").map(([, i]) => JSON.parse(String(i!.body)).positionSeconds) };
  };

  it("resumes at the saved position without autoplay and never saves 0 during start-up", async () => {
    const { player, puts } = await setup(12.4);
    await act(() => player.emit("playingChange", { isPlaying: false })); // initialisation noise
    await act(() => player.becomeReady());
    expect(player.currentTime).toBe(12.4);
    expect(player.play).not.toHaveBeenCalled();
    expect(await screen.findByText("Press Play to pick up at 0:12.")).toBeOnTheScreen();
    expect(puts()).toEqual([]);

    await fireEvent.press(screen.getByRole("button", { name: "Play welcome video" }));
    await waitFor(() => expect(player.play).toHaveBeenCalled());
    expect(player.currentTime).toBe(12.4);
  });

  it("saves the actual position on pause, including after rewinding", async () => {
    const { player, puts } = await setup(0);
    await act(() => player.becomeReady());
    await fireEvent.press(screen.getByRole("button", { name: "Play welcome video" }));
    await waitFor(() => expect(player.play).toHaveBeenCalled());
    player.currentTime = 30;
    await fireEvent.press(screen.getByRole("button", { name: "Pause welcome video" }));
    await waitFor(() => expect(puts()).toEqual([30]));

    await fireEvent.press(screen.getByRole("button", { name: "Rewind 10 seconds" })); // paused → saves 20
    await waitFor(() => expect(puts()).toEqual([30, 20]));
    expect(await screen.findByText("Saved your place at 0:20.")).toBeOnTheScreen();
  });

  it("reports progress-save and video-load failures distinctly", async () => {
    const { player } = await setup(0, {
      "PUT /api/video-progress": () => json({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500),
    });
    await act(() => player.becomeReady());
    await fireEvent.press(screen.getByRole("button", { name: "Play welcome video" }));
    await waitFor(() => expect(player.play).toHaveBeenCalled());
    player.currentTime = 14;
    await fireEvent.press(screen.getByRole("button", { name: "Pause welcome video" }));
    expect(await screen.findByText("Couldn't save your place at 0:14.")).toBeOnTheScreen();

    await act(() => player.emit("statusChange", { status: "error", error: { message: "boom" } }));
    expect(await screen.findByText(/Playback stopped unexpectedly/)).toBeOnTheScreen();
  });

  it("a video that never loads leaves the lists usable", async () => {
    const lists = freshLists();
    const { player } = await setup(0, { "PATCH /api/books/the-hobbit": patchOk(lists, 1) });
    await act(() => player.emit("statusChange", { status: "error", error: { message: "404" } }));
    expect(await screen.findByText(/The welcome video couldn't load/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Play welcome video" })).toBeDisabled();
    await fireEvent.press(screen.getByTestId("toggle-the-hobbit"));
    await waitFor(() => expect(screen.getByTestId("count-fiction")).toHaveTextContent("1 of 3 read"));
  });

  it("seeks from the seek bar (screen-reader adjust), mutes, and replays from the start after the end", async () => {
    const { player, puts } = await setup(0);
    await act(() => player.becomeReady());
    const seek = screen.getByRole("adjustable", { name: "Seek" });
    await fireEvent(seek, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(player.currentTime).toBe(10);
    await waitFor(() => expect(puts()).toEqual([10])); // paused seek = new saved place

    await fireEvent.press(screen.getByRole("button", { name: "Mute" }));
    expect(player.muted).toBe(true);
    expect(screen.getByRole("button", { name: "Mute" })).toBeSelected();

    await fireEvent.press(screen.getByRole("button", { name: "Play welcome video" }));
    await waitFor(() => expect(player.play).toHaveBeenCalledTimes(1));
    player.currentTime = 45;
    await act(() => {
      player.emit("playToEnd", undefined);
      player.pause();
    });
    expect(await screen.findByText("Replay")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Play welcome video" }));
    await waitFor(() => expect(player.play).toHaveBeenCalledTimes(2));
    expect(player.currentTime).toBe(0);
  });

  it("pauses when the Video tab is left", async () => {
    mockFetch({ ...progressRoutes(0) });
    function Host() {
      const [active, setActive] = useState(true);
      return (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel="Leave tab" onPress={() => setActive(false)} />
          <VideoScreen active={active} />
        </>
      );
    }
    await renderWithProviders(<Host />);
    const player = players[0] as MockPlayer;
    await act(() => player.becomeReady());
    await fireEvent.press(screen.getByRole("button", { name: "Play welcome video" }));
    await waitFor(() => expect(player.playing).toBe(true));
    await fireEvent.press(screen.getByRole("button", { name: "Leave tab" }));
    expect(player.pause).toHaveBeenCalled();
    expect(player.playing).toBe(false);
  });
});

describe("Rewards tab", () => {
  it("unlocks the Fiction bookmark when the last fiction book is saved, and announces it", async () => {
    const lists = freshLists();
    lists.lists[0]!.readCount = 2;
    lists.lists[0]!.books[0]!.read = true;
    lists.lists[0]!.books[1]!.read = true;
    mockFetch({ "GET /api/books": () => json(lists), "PATCH /api/books/the-secret-garden": patchOk(lists, 3), ...progressRoutes() });
    const { AccessibilityInfo } = jest.requireActual("react-native");
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    await renderWithProviders(
      <>
        <ChallengeScreen />
        <RewardsScreen />
      </>,
    );
    expect(await screen.findByLabelText(/Fiction bookmark\. Locked\. 2 of 3 read/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("toggle-the-secret-garden"));
    expect(await screen.findByLabelText(/Fiction bookmark\. Unlocked\. 3 of 3 read/)).toBeOnTheScreen();
    expect(announce).toHaveBeenLastCalledWith("The Secret Garden marked as read. Fiction: 3 of 3 read. Reward unlocked: Fiction bookmark.");
    expect(screen.getByLabelText(/Lantern Lane tote bag\. Locked/)).toBeOnTheScreen();
  });

  it("shows the offer banner with the shared deadline copy", async () => {
    mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes() });
    await renderWithProviders(<RewardsScreen />);
    expect(screen.getByText("Finish both lists by 31 January 2027 and your late fees are waived.")).toBeOnTheScreen();
    expect(screen.getByText("Demo offer — Lantern Lane is a fictional library.")).toBeOnTheScreen();
  });

  it("switches appearance and remembers the choice", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes() });
    await renderWithProviders(<RewardsScreen />);
    await fireEvent.press(screen.getByRole("radio", { name: "Dark appearance" }));
    expect(screen.getByRole("radio", { name: "Dark appearance" })).toBeSelected();
    await waitFor(async () => expect(await AsyncStorage.getItem("rct.theme")).toBe("dark"));
    await fireEvent.press(screen.getByRole("radio", { name: "System appearance" }));
    await waitFor(async () => expect(await AsyncStorage.getItem("rct.theme")).toBeNull());
  });
});
