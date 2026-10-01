// Entry point: the first code that runs. It draws the App component inside
// the <div id="root"> in index.html.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// The ! tells TypeScript we're sure the "root" element exists.
createRoot(document.getElementById('root')!).render(
  // StrictMode runs extra checks during development to catch common mistakes.
  <StrictMode>
    <App />
  </StrictMode>,
)
