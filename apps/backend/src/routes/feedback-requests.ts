/**
 * Feedback Requests Routes
 * Provides pending feedback opportunities for the authenticated user's agents
 */

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { clerkAuth, getAuthUserId } from "../middleware/clerk-auth";
import { ErrorResponseSchema } from "../schemas/common";
import { ListFeedbackRequestsResponseSchema } from "../schemas/feedback-requests";
import type { Bindings } from "../types/bindings";
import { handleDatabaseError } from "../utils/errors";
import { getCurrentTimestamp } from "../utils/timestamp";

const feedbackRequests = new OpenAPIHono<{ Bindings: Bindings }>();

feedbackRequests.use("/*", clerkAuth);

const FEEDBACK_WINDOW_HOURS = 12;

const listFeedbackRequestsRoute = createRoute({
	method: "get",
	path: "/feedback-requests",
	tags: ["Feedbacks"],
	summary: "List pending feedback requests",
	description:
		"Get sessions completed within the last 12 hours where the user's agents have not yet provided feedback.",
	security: [{ bearerAuth: [] }],
	responses: {
		200: {
			description: "List of pending feedback requests",
			content: {
				"application/json": {
					schema: ListFeedbackRequestsResponseSchema,
				},
			},
		},
		401: {
			description: "Unauthorized",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: "Internal server error",
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
});

feedbackRequests.openapi(listFeedbackRequestsRoute, async (c) => {
	const userId = getAuthUserId(c);

	try {
		const now = getCurrentTimestamp();
		const windowStart = now - FEEDBACK_WINDOW_HOURS * 60 * 60;

		const result = await c.env.DB.prepare(
			`SELECT DISTINCT a.id as agent_id, a.name as agent_name,
              s.id as session_id, t.title as topic_title, s.completed_at,
              ar.id as reflection_id, ar.question as reflection_question,
              ar.context_summary as reflection_context
       FROM sessions s
       JOIN session_participants sp ON s.id = sp.session_id
       JOIN agents a ON sp.agent_id = a.id
       JOIN topics t ON s.topic_id = t.id
       LEFT JOIN feedbacks f ON f.agent_id = a.id AND f.session_id = s.id
       LEFT JOIN agent_reflections ar ON ar.agent_id = a.id AND ar.session_id = s.id
       WHERE a.user_id = ?
         AND s.status = 'completed'
         AND s.completed_at >= ?
         AND f.id IS NULL
       ORDER BY s.completed_at DESC`,
		)
			.bind(userId, windowStart)
			.all<{
				agent_id: string;
				agent_name: string;
				session_id: string;
				topic_title: string;
				completed_at: number;
				reflection_id: string | null;
				reflection_question: string | null;
				reflection_context: string | null;
			}>();

		return c.json(
			{
				feedback_requests: result.results,
			},
			200,
		);
	} catch (error) {
		return handleDatabaseError(c, error);
	}
});

export { feedbackRequests as feedbackRequestsRouter };
