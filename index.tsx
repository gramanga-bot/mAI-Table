import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

// Clerk's Publishable Key must be passed to the ClerkProvider.
// It can be found in the Clerk Dashboard. For security, we load it from an environment variable.
// VITE_CLERK_PUBLISHABLE_KEY is the standard for Vite-based projects.
// The Vercel integration for Clerk sometimes defaults to the Next.js standard, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
// We check for both to ensure compatibility.
const env = (import.meta as any).env || {};
const PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY || env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || (window as any).process?.env?.CLERK_PUBLISHABLE_KEY;


if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in your environment.");
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