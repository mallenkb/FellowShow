import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["build", "dist", "node_modules", "src-tauri/target"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tauri-apps/api/core",
              importNames: ["invoke"],
              message:
                "Import the typed invoke wrapper from @/lib/ipc instead.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["data/**/*.ts", "scripts/**/*.ts", "sdk/**/*.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: [
      "src/components/settings-dialog.tsx",
      "src/components/broadcast/broadcast-settings.tsx",
      "src/components/broadcast/design-canvas.tsx",
    ],
    rules: {
      // These synchronization effects are removed as the mega-components are
      // split later in this quality pass.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/lib/ipc.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
])
