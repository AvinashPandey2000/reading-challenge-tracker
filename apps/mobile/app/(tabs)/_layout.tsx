import { NativeTabs } from "expo-router/native-tabs";
import { useTheme } from "../../src/theme/ThemeProvider";

/**
 * System tab bar: on iOS 26 it is rendered with Apple's Liquid Glass material automatically;
 * on Android it is a Material 3 bottom navigation bar.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <NativeTabs tintColor={colors.mangoStrong} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "checklist", selected: "checklist" }} md="checklist" />
        <NativeTabs.Trigger.Label>Challenge</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon sf={{ default: "books.vertical", selected: "books.vertical.fill" }} md="menu_book" />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="video">
        <NativeTabs.Trigger.Icon sf={{ default: "play.rectangle", selected: "play.rectangle.fill" }} md="smart_display" />
        <NativeTabs.Trigger.Label>Video</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rewards">
        <NativeTabs.Trigger.Icon sf={{ default: "gift", selected: "gift.fill" }} md="redeem" />
        <NativeTabs.Trigger.Label>Rewards</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
