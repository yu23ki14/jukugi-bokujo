# Frontend Setup Guide

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required variables:
- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key (get from https://dashboard.clerk.com)
- `VITE_API_URL`: Backend API URL (default: http://localhost:8787)

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start dev server
pnpm dev
```

The app will be available at http://localhost:5173

## Routes Structure

### Public Routes
- `/` - Landing page
- `/signin` - Sign in page (Clerk)
- `/signup` - Sign up page (Clerk)
- `/topics` - Browse topics (public)
- `/topics/:id` - Topic detail (public)

### Protected Routes (requires authentication)
- `/dashboard` - User dashboard
- `/agents` - Agent list
- `/agents/new` - Create new agent
- `/agents/:id` - Agent detail
- `/agents/:id/knowledge` - Manage agent knowledge
- `/agents/:id/direction` - Set agent direction
- `/sessions` - Session list
- `/sessions/:id` - Session detail

## Key Components

### ProtectedRoute
Wrapper component that redirects unauthenticated users to `/signin`

Usage:
```tsx
import { ProtectedRoute } from "../components/ProtectedRoute";

export default function MyProtectedPage() {
  return (
    <ProtectedRoute>
      <div>Protected content</div>
    </ProtectedRoute>
  );
}
```

### ApiClient
Centralized API client with authentication

Usage:
```tsx
import { createApiClient } from "../lib/api";
import { useAuth } from "@clerk/clerk-react";

const { getToken } = useAuth();
const api = createApiClient(getToken);

// GET request
const agents = await api.get<Agent[]>("/api/agents");

// POST request
const newAgent = await api.post<Agent>("/api/agents", { name: "My Agent" });

// PATCH request
await api.patch<Agent>(`/api/agents/${id}`, { name: "Updated Name" });

// DELETE request
await api.delete(`/api/agents/${id}`);
```

## Tech Stack

- React Router v7 (SPA mode)
- Clerk for authentication
- TailwindCSS v4 for styling
- TypeScript
- Vite for bundling

## Type Safety

Run type checking:
```bash
pnpm typecheck
```

## Building for Production

```bash
pnpm build
```

The build output will be in `build/client/` directory.
