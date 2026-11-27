import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { ChallengeScreen } from "../src/screens/ChallengeScreen";
import { freshLists, json, mockFetch, patchOk, progressRoutes } from "./helpers";
import { MockPlayer, players } from "./mockPlayer";

jest.mock("expo-video", () => {
  const { View } = jest.requireActual("react-native");
  const { MockPlayer, players } = jest.requireActual("./mockPlayer");
  return {
    useVideoPlayer: (_src: string, setup?: (p: unknown) => void) => {
      const React = jest.requireActual("react");
      const ref = React.useRef(null);
      if (!ref.current) {
        ref.current = new MockPlayer();
        setup?.(ref.current);
        players.push(ref.current);
      }
      return ref.current;
    },
    VideoView: (props: object) => <View testID="video-view" {...props} />,
  };
});
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");
  return { SafeAreaView: View, SafeAreaProvider: View };
});

const checkbox = (name: RegExp) => screen.getByRole("checkbox", { name });

beforeEach(() => {
  players.length = 0;
});

describe("ChallengeScreen", () => {
  it("loads both lists from the backend: three unread books each, 0 of 3", async () => {
    let release!: () => void;
    mockFetch({ "GET /api/books": () => new Promise<Response>((r) => (release = () => r(json(freshLists())))), ...progressRoutes() });
    await render(<ChallengeScreen />);
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
    await render(<ChallengeScreen />);
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
    await render(<ChallengeScreen />);
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
    await render(<ChallengeScreen />);
    expect(await screen.findByText("Couldn't load your reading lists. Check your connection and try again.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("count-fiction")).toHaveTextContent("0 of 3 read");
  });
});

describe("WelcomeVideo on mobile", () => {
  const setup = async (saved: number, extra: Record<string, any> = {}) => {
    const fetchMock = mockFetch({ "GET /api/books": () => json(freshLists()), ...progressRoutes(saved), ...extra });
    await render(<ChallengeScreen />);
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
});
