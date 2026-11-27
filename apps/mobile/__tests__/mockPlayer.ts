type Listener = (payload: any) => void;

/** Minimal stand-in for expo-video's VideoPlayer with an event emitter. */
export class MockPlayer {
  status: "idle" | "loading" | "readyToPlay" | "error" = "loading";
  playing = false;
  currentTime = 0;
  duration = 0;
  loop = false;
  timeUpdateEventInterval = 0;
  private listeners = new Map<string, Set<Listener>>();
  addListener(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return { remove: () => this.listeners.get(event)?.delete(fn) };
  }
  emit(event: string, payload: any) {
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }
  becomeReady(duration = 45) {
    this.duration = duration;
    this.status = "readyToPlay";
    this.emit("statusChange", { status: "readyToPlay" });
  }
  play = jest.fn(() => {
    this.playing = true;
    this.emit("playingChange", { isPlaying: true });
  });
  pause = jest.fn(() => {
    this.playing = false;
    this.emit("playingChange", { isPlaying: false });
  });
  replace = jest.fn();
}

export const players: MockPlayer[] = [];
