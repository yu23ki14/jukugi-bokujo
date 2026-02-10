import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	isRouteErrorResponse,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ClerkAuthProvider } from "./components/ClerkAuthProvider";

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
			retry: 1,
		},
	},
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
	console.warn("Missing Clerk Publishable Key - authentication will not work");
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
		href: "https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap",
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
				<QueryClientProvider client={queryClient}>
					{PUBLISHABLE_KEY ? (
						<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
							<ClerkAuthProvider>{children}</ClerkAuthProvider>
						</ClerkProvider>
					) : (
						children
					)}
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
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
					<div className="flex gap-6 items-center">
						<Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-800">
							熟議牧場
						</Link>
						{PUBLISHABLE_KEY && (
							<>
								<SignedIn>
									<Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
										Dashboard
									</Link>
									<Link to="/agents" className="text-gray-700 hover:text-blue-600">
										Agents
									</Link>
									<Link to="/sessions" className="text-gray-700 hover:text-blue-600">
										Sessions
									</Link>
								</SignedIn>
								<Link to="/topics" className="text-gray-700 hover:text-blue-600">
									Topics
								</Link>
							</>
						)}
					</div>
					<div>
						{PUBLISHABLE_KEY ? (
							<>
								<SignedOut>
									<div className="flex gap-2">
										<Link to="/signin">
											<button
												type="button"
												className="text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
											>
												Sign In
											</button>
										</Link>
										<Link to="/signup">
											<button
												type="button"
												className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
											>
												Sign Up
											</button>
										</Link>
									</div>
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
			error.status === 404 ? "The requested page could not be found." : error.statusText || details;
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
