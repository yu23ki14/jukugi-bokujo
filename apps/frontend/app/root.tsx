import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from "react-router";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

import type { Route } from "./+types/root";
import "./app.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key - authentication will not work');
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {PUBLISHABLE_KEY ? (
          <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
            {children}
          </ClerkProvider>
        ) : (
          <>{children}</>
        )}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex gap-4">
            <Link to="/" className="text-blue-600 hover:text-blue-800">
              Home
            </Link>
            {PUBLISHABLE_KEY && (
              <SignedIn>
                <Link to="/dashboard" className="text-blue-600 hover:text-blue-800">
                  Dashboard
                </Link>
              </SignedIn>
            )}
          </div>
          <div>
            {PUBLISHABLE_KEY ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </>
            ) : (
              <div className="text-gray-500 text-sm">Auth not configured</div>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
