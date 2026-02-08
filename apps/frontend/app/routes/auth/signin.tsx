import { SignIn, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";

export function meta() {
	return [{ title: "Sign In - Jukugi Bokujo" }];
}

export default function SignInPage() {
	const { isSignedIn } = useAuth();

	// Redirect to dashboard if already signed in
	if (isSignedIn) {
		return <Navigate to="/dashboard" replace />;
	}

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
			<SignIn routing="path" path="/signin" signUpUrl="/signup" afterSignInUrl="/dashboard" />
		</div>
	);
}
