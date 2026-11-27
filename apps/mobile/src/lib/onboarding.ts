import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDED_KEY = "rct.onboarded";

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === "1";
  } catch {
    return true; // storage failure should never trap the reader in the intro
  }
}

export async function setOnboarded(done: boolean): Promise<void> {
  try {
    if (done) await AsyncStorage.setItem(ONBOARDED_KEY, "1");
    else await AsyncStorage.removeItem(ONBOARDED_KEY);
  } catch {
    /* ignore */
  }
}
