import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Self-hosted fonts (replaces the Google Fonts CDN link in index.html).
// Latin subsets keep the bundle small; add latin-ext/other subsets if needed.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/inter/latin-800.css'
import '@fontsource/inter/latin-900.css'
import '@fontsource/boldonse/latin-400.css'
import '@fontsource/unbounded/latin-400.css'
import '@fontsource/unbounded/latin-500.css'
import '@fontsource/unbounded/latin-600.css'
import '@fontsource/unbounded/latin-700.css'
import '@fontsource/dm-mono/latin-300.css'
import '@fontsource/dm-mono/latin-400.css'
import '@fontsource/dm-mono/latin-500.css'

createRoot(document.getElementById("root")!).render(<App />);
