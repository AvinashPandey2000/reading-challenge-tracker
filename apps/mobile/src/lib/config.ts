import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Base URL of the backend's public entry point (the Next.js server, which also proxies /api).
 *
 * Order of precedence:
 *  1. EXPO_PUBLIC_API_URL, e.g. http://192.168.1.20:3000 (physical phone) or http://10.0.2.2:3000 (Android emulator)
 *  2. The dev machine's LAN address that Expo already uses to serve the JS bundle (hostUri)
 *  3. localhost (iOS simulator) / 10.0.2.2 (Android emulator)
 *
 * A phone can't use "localhost": on the phone, localhost is the phone itself, not your computer.
 */
export function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") return `http://${host}:3000`;
  return Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
}

export const BASE_URL = resolveBaseUrl();
export const VIDEO_URL = `${BASE_URL}/media/welcome.mp4`;
export const SAMPLE_PDF_URL = `${BASE_URL}/downloads/the-secret-garden-chapter-1.pdf`;
