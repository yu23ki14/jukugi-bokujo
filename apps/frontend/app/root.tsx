import { ClerkProvider, SignedIn, SignedOut, useAuth, UserButton } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MenuIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
	isRouteErrorResponse,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ClerkAuthProvider } from "./components/ClerkAuthProvider";
import { Button } from "./components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "./components/ui/sheet";

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
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	// Close menu on navigation
	useEffect(() => {
		setMobileMenuOpen(false);
	}, []);

	const {isSignedIn} = useAuth();

	return (
		<div className="min-h-screen bg-background">
			<nav className="bg-card shadow border-b border-border">
				<div className="container mx-auto px-4 py-4 flex justify-between items-center">
					<div className="flex gap-2 items-center">
						<Link to={isSignedIn ? "/dashboard" : "/"} className="text-xl font-bold text-primary hover:text-primary/80">
							熟議牧場
						</Link>
						{/* Desktop nav links */}
						{PUBLISHABLE_KEY && (
							<div className="hidden md:flex gap-1 items-center">
								<SignedIn>
									<Button variant="ghost" size="sm" asChild>
										<Link to="/dashboard">Dashboard</Link>
									</Button>
									<Button variant="ghost" size="sm" asChild>
										<Link to="/agents">Agents</Link>
									</Button>
									<Button variant="ghost" size="sm" asChild>
										<Link to="/sessions">Sessions</Link>
									</Button>
								</SignedIn>
								<Button variant="ghost" size="sm" asChild>
									<Link to="/topics">Topics</Link>
								</Button>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2">
						{/* Desktop auth */}
						<div className="hidden md:flex items-center">
							{PUBLISHABLE_KEY ? (
								<>
									<SignedOut>
										<div className="flex gap-2">
											<Button variant="ghost" asChild>
												<Link to="/signin">Sign In</Link>
											</Button>
											<Button asChild>
												<Link to="/signup">Sign Up</Link>
											</Button>
										</div>
									</SignedOut>
									<SignedIn>
										<UserButton />
									</SignedIn>
								</>
							) : (
								<div className="text-muted-foreground text-sm">Auth not configured</div>
							)}
						</div>
						{/* Mobile: UserButton + hamburger */}
						<div className="flex md:hidden items-center gap-2">
							{PUBLISHABLE_KEY && (
								<SignedIn>
									<UserButton />
								</SignedIn>
							)}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setMobileMenuOpen(true)}
								aria-label="メニューを開く"
							>
								<MenuIcon className="size-5" />
							</Button>
						</div>
					</div>
				</div>
			</nav>

			{/* Mobile menu sheet */}
			<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
				<SheetContent side="right" className="w-64">
					<SheetHeader>
						<SheetTitle>メニュー</SheetTitle>
					</SheetHeader>
					<nav className="flex flex-col gap-1 px-4">
						{PUBLISHABLE_KEY && (
							<>
								<SignedIn>
									<SheetClose asChild>
										<Button variant="ghost" className="justify-start" asChild>
											<Link to="/dashboard">Dashboard</Link>
										</Button>
									</SheetClose>
									<SheetClose asChild>
										<Button variant="ghost" className="justify-start" asChild>
											<Link to="/agents">Agents</Link>
										</Button>
									</SheetClose>
									<SheetClose asChild>
										<Button variant="ghost" className="justify-start" asChild>
											<Link to="/sessions">Sessions</Link>
										</Button>
									</SheetClose>
								</SignedIn>
								<SheetClose asChild>
									<Button variant="ghost" className="justify-start" asChild>
										<Link to="/topics">Topics</Link>
									</Button>
								</SheetClose>
							</>
						)}
					</nav>
					{PUBLISHABLE_KEY && (
						<SignedOut>
							<div className="flex flex-col gap-2 px-4 mt-4 border-t border-border pt-4">
								<SheetClose asChild>
									<Button variant="ghost" className="justify-start" asChild>
										<Link to="/signin">Sign In</Link>
									</Button>
								</SheetClose>
								<SheetClose asChild>
									<Button className="justify-start" asChild>
										<Link to="/signup">Sign Up</Link>
									</Button>
								</SheetClose>
							</div>
						</SignedOut>
					)}
				</SheetContent>
			</Sheet>

			<main className="container max-w-xl mx-auto px-4 py-8">
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
