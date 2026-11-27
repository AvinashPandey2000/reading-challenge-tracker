import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ChallengeScreen } from "./src/screens/ChallengeScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ChallengeScreen />
    </SafeAreaProvider>
  );
}
