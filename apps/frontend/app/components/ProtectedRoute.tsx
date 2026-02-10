import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

/**
 * ProtectedRoute component
 * Redirects to signin if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isLoaded, isSignedIn } = useAuth();

	// Show loading state while auth is loading
	if (!isLoaded) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	// Redirect to signin if not authenticated
	if (!isSignedIn) {
		return <Navigate to="/signin" replace />;
	}

	return <>{children}</>;
}
