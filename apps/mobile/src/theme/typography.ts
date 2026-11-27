import { Platform, type TextStyle } from "react-native";

const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

export const type = {
  display: { fontFamily: serif, fontSize: 32, lineHeight: 38, fontWeight: "700" },
  heading: { fontFamily: serif, fontSize: 22, lineHeight: 28, fontWeight: "700" },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
} satisfies Record<string, TextStyle>;
