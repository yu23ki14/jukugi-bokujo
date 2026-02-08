import { SignedIn, SignedOut } from "@clerk/clerk-react";

export function meta() {
	return [
		{ title: "Jukugi Bokujo - Home" },
		{ name: "description", content: "Welcome to Jukugi Bokujo!" },
	];
}

export default function Home() {
	const hasClerk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

	return (
		<div className="text-center">
			<h1 className="text-4xl font-bold mb-4">Welcome to Jukugi Bokujo</h1>
			{hasClerk ? (
				<>
					<SignedOut>
						<p className="text-gray-600">Please sign in to access the dashboard.</p>
					</SignedOut>
					<SignedIn>
						<p className="text-gray-600">You are signed in! Visit the dashboard.</p>
					</SignedIn>
				</>
			) : (
				<p className="text-gray-600">Welcome! (Authentication not configured)</p>
			)}
		</div>
	);
}
