// Settings for ESLint, the linter that checks code for mistakes (npm run lint).

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),  // skip the built output folder
  {
    files: ['**/*.{ts,tsx}'],  // check all TypeScript files
    extends: [
      js.configs.recommended,             // general JavaScript rules
      tseslint.configs.recommended,       // TypeScript rules
      reactHooks.configs.flat.recommended, // catches mistakes with useState, useEffect, etc.
      reactRefresh.configs.vite,          // keeps hot reloading working
    ],
    languageOptions: {
      globals: globals.browser,  // allow browser built-ins like document and window
    },
  },
])
