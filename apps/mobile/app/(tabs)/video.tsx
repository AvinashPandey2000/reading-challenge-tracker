import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { VideoScreen } from "../../src/screens/VideoScreen";

/** Pauses the welcome video when the reader switches to another tab. */
export default function VideoTab() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return <VideoScreen active={focused} />;
}
