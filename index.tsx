import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

// Clerk's Publishable Key must be passed to the ClerkProvider.
// It can be found in the Clerk Dashboard. For security, we load it from an environment variable.
// VITE_CLERK_PUBLISHABLE_KEY is the standard for Vite-based projects.
const PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || (window as any).process?.env?.CLERK_PUBLISHABLE_KEY;


if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your environment.");
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
