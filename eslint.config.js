// Flat config, ESLint 9
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["dist", "node_modules", "coverage"] },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // enforce module decoupling
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // features may not import each other
              group: [
                "@features/gateway/*",
                "@features/oauth/*",
                "@features/mcp/*",
              ],
              message:
                "Features must not import other features. Move shared code to @shared or @core.",
            },
          ],
        },
      ],
    },
  },
  // Allow each feature to import from itself by overriding the restriction
  ...["gateway", "oauth", "mcp"].map((mod) => ({
    files: [`src/features/${mod}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@features/gateway/*", "@features/oauth/*", "@features/mcp/*"].filter(
                (p) => !p.startsWith(`@features/${mod}`),
              ),
              message:
                "Features must not import other features. Move shared code to @shared or @core.",
            },
          ],
        },
      ],
    },
  })),
  // core may not import from features
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@features/*"],
              message:
                "core/* must not import from features. Reverse the dependency.",
            },
          ],
        },
      ],
    },
  },
  // shared may not import from core or features
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@core/*", "@features/*"],
              message: "shared/* must stay framework-agnostic.",
            },
          ],
        },
      ],
    },
  },
  prettier,
];
