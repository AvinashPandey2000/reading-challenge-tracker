import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      "apps/mobile/babel.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.tsx", "apps/web/lib/**/*.ts", "apps/mobile/src/**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["apps/web/**/*.tsx"],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ["apps/web/**/*.tsx"],
    // Book titles sit three levels deep inside the <label>.
    rules: { "jsx-a11y/label-has-associated-control": ["error", { assert: "either", depth: 4 }] },
  },
  {
    files: ["apps/mobile/__tests__/**", "apps/mobile/jest.setup.tsx", "e2e/**"],
    languageOptions: { globals: { ...globals.jest } },
    rules: { "@typescript-eslint/no-require-imports": "off", "no-empty-pattern": "off", "react-hooks/rules-of-hooks": "off" },
  },
);
