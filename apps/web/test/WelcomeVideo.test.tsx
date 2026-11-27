import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WelcomeVideo } from "@/components/WelcomeVideo";
import { deferred, json, mockFetch } from "./fetchMock";

afterEach(() => vi.unstubAllGlobals());

function setMedia(video: HTMLVideoElement, props: Partial<Record<"duration" | "currentTime" | "readyState", number>>) {
  for (const [k, v] of Object.entries(props)) {
    Object.defineProperty(video, k, { configurable: true, writable: true, value: v });
  }
}

const puts = (fn: ReturnType<typeof mockFetch>) =>
  fn.mock.calls.filter(([, init]) => init?.method === "PUT").map(([, init]) => JSON.parse(String(init!.body)).positionSeconds);

describe("WelcomeVideo", () => {
  it("applies the saved position only after metadata AND fetch are ready, without saving 0", async () => {
    const progress = deferred<Response>();
    const fetchMock = mockFetch({
      "GET /api/video-progress": () => progress.promise,
      "PUT /api/video-progress": (_u, init) => json({ positionSeconds: JSON.parse(String(init!.body)).positionSeconds, updatedAt: "now" }),
    });
    render(<WelcomeVideo />);
    const video = screen.getByTestId("video-element") as HTMLVideoElement;

    // Player becomes ready first; an initialisation pause must not save 0.
    setMedia(video, { duration: 45, currentTime: 0, readyState: 1 });
    fireEvent.loadedMetadata(video);
    fireEvent.pause(video);
    expect(puts(fetchMock)).toEqual([]);

    await act(async () => progress.resolve(json({ positionSeconds: 12.4, updatedAt: "x" })));
    await waitFor(() => expect(video.currentTime).toBe(12.4));
    expect(await screen.findByTestId("resume-hint")).toHaveTextContent("Press Play to pick up at 0:12.");
    expect(video.paused).not.toBe(false); // no autoplay
    expect(puts(fetchMock)).toEqual([]);
  });

  it("saves the actual position on pause, including after seeking backward", async () => {
    const fetchMock = mockFetch({
      "GET /api/video-progress": () => json({ positionSeconds: 0, updatedAt: null }),
      "PUT /api/video-progress": (_u, init) => json({ positionSeconds: JSON.parse(String(init!.body)).positionSeconds, updatedAt: "now" }),
    });
    render(<WelcomeVideo />);
    const video = screen.getByTestId("video-element") as HTMLVideoElement;
    setMedia(video, { duration: 45, currentTime: 0, readyState: 1 });
    fireEvent.loadedMetadata(video);
    await waitFor(() => expect(screen.queryByText("Checking where you left off…")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Play welcome video" }));
    setMedia(video, { currentTime: 30 });
    await userEvent.click(screen.getByRole("button", { name: "Pause welcome video" }));
    await waitFor(() => expect(puts(fetchMock)).toEqual([30]));

    await userEvent.click(screen.getByRole("button", { name: "Play welcome video" }));
    setMedia(video, { currentTime: 8.2 }); // reader seeks back
    await userEvent.click(screen.getByRole("button", { name: "Pause welcome video" }));
    await waitFor(() => expect(puts(fetchMock)).toEqual([30, 8.2]));
    expect(await screen.findByTestId("video-saved")).toHaveTextContent("Saved your place at 0:08.");
  });

  it("shows a distinct message when saving the position fails, and retries", async () => {
    let attempts = 0;
    mockFetch({
      "GET /api/video-progress": () => json({ positionSeconds: 0, updatedAt: null }),
      "PUT /api/video-progress": (_u, init) =>
        ++attempts === 1
          ? json({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500)
          : json({ positionSeconds: JSON.parse(String(init!.body)).positionSeconds, updatedAt: "now" }),
    });
    render(<WelcomeVideo />);
    const video = screen.getByTestId("video-element") as HTMLVideoElement;
    setMedia(video, { duration: 45, currentTime: 0, readyState: 1 });
    fireEvent.loadedMetadata(video);
    await userEvent.click(await screen.findByRole("button", { name: "Play welcome video" }));
    setMedia(video, { currentTime: 14 });
    await userEvent.click(screen.getByRole("button", { name: "Pause welcome video" }));
    expect(await screen.findByTestId("video-save-error")).toHaveTextContent("Couldn't save your place at 0:14.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("video-saved")).toHaveTextContent("Saved your place at 0:14.");
  });

  it("distinguishes a load failure from a playback failure", async () => {
    mockFetch({ "GET /api/video-progress": () => json({ positionSeconds: 0, updatedAt: null }) });
    const { unmount } = render(<WelcomeVideo />);
    fireEvent.error(screen.getByTestId("video-element"));
    expect(await screen.findByRole("alert")).toHaveTextContent("The welcome video couldn't load.");
    expect(screen.getByRole("button", { name: "Play welcome video" })).toBeDisabled();
    unmount();

    render(<WelcomeVideo />);
    const video = screen.getByTestId("video-element") as HTMLVideoElement;
    setMedia(video, { duration: 45, currentTime: 0, readyState: 1 });
    fireEvent.loadedMetadata(video);
    fireEvent.error(video);
    expect(await screen.findByRole("alert")).toHaveTextContent("Playback stopped unexpectedly.");
  });

  it("reports a failed play() call as a playback problem", async () => {
    mockFetch({ "GET /api/video-progress": () => json({ positionSeconds: 0, updatedAt: null }) });
    render(<WelcomeVideo />);
    const video = screen.getByTestId("video-element") as HTMLVideoElement;
    setMedia(video, { duration: 45, currentTime: 0, readyState: 1 });
    fireEvent.loadedMetadata(video);
    video.play = () => Promise.reject(new DOMException("decode", "NotSupportedError"));
    await userEvent.click(await screen.findByRole("button", { name: "Play welcome video" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Playback stopped unexpectedly.");
  });
  it("skips ±10 s, mutes, and shows Replay after the end; shortcuts work inside the player", async () => {
    mockFetch({
      "GET /api/video-progress": () => json({ positionSeconds: 0, updatedAt: null }),
      "PUT /api/video-progress": (_u, init) => json({ positionSeconds: JSON.parse(String(init!.body)).positionSeconds, updatedAt: "now" }),
    });
    render(<WelcomeVideo />);
    const video = screen.getByTestId("video-element") as HTMLVideoElement;
    setMedia(video, { duration: 45, currentTime: 0, readyState: 1 });
    fireEvent.loadedMetadata(video);

    await userEvent.click(await screen.findByRole("button", { name: "Forward 10 seconds" }));
    expect(video.currentTime).toBe(10);
    await userEvent.click(screen.getByRole("button", { name: "Rewind 10 seconds" }));
    expect(video.currentTime).toBe(0);

    const mute = screen.getByRole("button", { name: "Mute" });
    await userEvent.click(mute);
    expect(video.muted).toBe(true);
    fireEvent.volumeChange(video);
    expect(mute).toHaveAttribute("aria-pressed", "true");

    // "L" on a focused player control skips forward.
    screen.getByRole("button", { name: "Play welcome video" }).focus();
    await userEvent.keyboard("l");
    expect(video.currentTime).toBe(10);

    fireEvent.ended(video);
    expect(await screen.findByRole("button", { name: "Play welcome video" })).toHaveTextContent("Replay");
  });
});
