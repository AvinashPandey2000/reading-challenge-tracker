import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { BooksProvider } from "../src/lib/BooksProvider";
import { OnboardingProvider, useOnboarding } from "../src/lib/OnboardingProvider";

// Keep the native splash up until the theme preference and intro flag are known (no flash).
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 200, fade: true });

function RootStack() {
  const { scheme, colors, ready } = useTheme();
  const { onboarded } = useOnboarding();
  const loaded = ready && onboarded !== null;

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {/* First-time users get the walkthrough on the Challenge tab (see ChallengeScreen). */}
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="book/[id]" />
        <Stack.Screen name="read/[id]" options={{ animation: "slide_from_bottom", gestureEnabled: true }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <OnboardingProvider>
          <BooksProvider>
            <RootStack />
          </BooksProvider>
        </OnboardingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
