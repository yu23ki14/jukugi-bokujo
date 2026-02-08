import { SignUp, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";

export function meta() {
	return [{ title: "Sign Up - Jukugi Bokujo" }];
}

export default function SignUpPage() {
	const { isSignedIn } = useAuth();

	// Redirect to dashboard if already signed in
	if (isSignedIn) {
		return <Navigate to="/dashboard" replace />;
	}

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
			<SignUp routing="path" path="/signup" signInUrl="/signin" afterSignUpUrl="/dashboard" />
		</div>
	);
}
