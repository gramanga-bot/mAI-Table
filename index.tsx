import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

// Support both Vite's `import.meta.env` and AI Studio's `process.env` for the key.
// This robust check works in Vercel/Vite (import.meta.env) and AI Studio (process.env).
const PUBLISHABLE_KEY = 
    (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || 
    (typeof process !== 'undefined' && process.env?.VITE_CLERK_PUBLISHABLE_KEY);


if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your Vercel project and AI Studio environment variables.");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
    </ClerkProvider>
  </React.StrictMode>
);
