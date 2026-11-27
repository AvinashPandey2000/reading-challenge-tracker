import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// jsdom does not implement media playback.
Object.defineProperty(HTMLMediaElement.prototype, "load", { configurable: true, value() {} });
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value(this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: true });
    this.dispatchEvent(new Event("pause"));
  },
});
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value(this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: false });
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  },
});
