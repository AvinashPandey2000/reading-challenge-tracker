/* Native modules that have no JS implementation under Jest. */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-glass-effect", () => {
  const { View } = jest.requireActual("react-native");
  return { GlassView: View, GlassContainer: View, isLiquidGlassAvailable: () => false, isGlassEffectAPIAvailable: () => false };
});
jest.mock("expo-blur", () => {
  const { View } = jest.requireActual("react-native");
  return { BlurView: View };
});
jest.mock("expo-linear-gradient", () => {
  const { View } = jest.requireActual("react-native");
  return { LinearGradient: View };
});
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
  hide: jest.fn(),
  setOptions: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("expo-video", () => {
  const { View } = jest.requireActual("react-native");
  const { MockPlayer, players } = jest.requireActual("./__tests__/mockPlayer");
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

// Native tab bar has no JS implementation in Jest: use expo-router's JS tabs with the same routes.
jest.mock("expo-router/native-tabs", () => {
  const { Tabs } = jest.requireActual("expo-router");
  const { Children } = jest.requireActual("react");
  const NativeTabs = ({ children }: { children: React.ReactNode }) => (
    <Tabs screenOptions={{ headerShown: false }}>
      {Children.map(children, (c: any) => <Tabs.Screen key={c.props.name} name={c.props.name} />)}
    </Tabs>
  );
  const Trigger = () => null;
  Trigger.Label = () => null;
  Trigger.Icon = () => null;
  NativeTabs.Trigger = Trigger;
  return { NativeTabs };
});

