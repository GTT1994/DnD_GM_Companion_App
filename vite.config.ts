// Settings for Vite, which runs the dev server (npm run dev) and builds the app (npm run build).

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],  // adds React/JSX support
})
