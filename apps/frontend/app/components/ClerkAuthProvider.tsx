/**
 * ClerkAuthProvider - Sets up Clerk authentication for Axios
 * This component must be inside ClerkProvider
 */

import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { setClerkGetToken } from "../lib/orval-custom";

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
	const { getToken } = useAuth();

	useEffect(() => {
		// Set up Clerk authentication for axios
		setClerkGetToken(getToken);
	}, [getToken]);

	return <>{children}</>;
}
