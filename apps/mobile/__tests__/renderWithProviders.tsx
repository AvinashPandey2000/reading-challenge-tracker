import { render } from "@testing-library/react-native";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import { OnboardingProvider } from "../src/lib/OnboardingProvider";
import { BooksProvider } from "../src/lib/BooksProvider";

/** Renders screens inside the same providers as app/_layout.tsx. */
export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <OnboardingProvider>
        <BooksProvider>{ui}</BooksProvider>
      </OnboardingProvider>
    </ThemeProvider>,
  );
}
