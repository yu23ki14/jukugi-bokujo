import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),

	route("signin/*", "routes/auth/signin.tsx"),
	route("signup/*", "routes/auth/signup.tsx"),

	route("dashboard", "routes/dashboard.tsx"),

	route("agents", "routes/agents/index.tsx"),
	route("agents/new", "routes/agents/new.tsx"),
	route("agents/:id", "routes/agents/detail.tsx"),
	route("agents/:id/knowledge", "routes/agents/knowledge.tsx"),

	route("sessions", "routes/sessions/index.tsx"),
	route("sessions/:id", "routes/sessions/detail.tsx"),

	route("topics", "routes/topics/index.tsx"),
	route("topics/:id", "routes/topics/detail.tsx"),
] satisfies RouteConfig;
