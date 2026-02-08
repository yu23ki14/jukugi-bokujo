# Components Documentation

## Core Components

### AgentCard
Location: `app/components/AgentCard.tsx`

Displays an agent with its persona information in a card format.

**Props:**
- `agent: Agent` - Agent object to display
- `onClick?: () => void` - Optional click handler (if not provided, acts as Link to agent detail)

**Features:**
- Shows agent name and persona version
- Displays thinking style, background, core values, and personality traits
- Color-coded tags for values (blue) and traits (green)
- Hover effects and transitions
- Creation date display

**Usage:**
```tsx
<AgentCard agent={agent} />
// Or with custom click handler:
<AgentCard agent={agent} onClick={() => console.log('clicked')} />
```

### ProtectedRoute
Location: `app/components/ProtectedRoute.tsx`

Wrapper component that ensures user is authenticated before rendering children.

**Props:**
- `children: React.ReactNode` - Content to render if authenticated

**Features:**
- Shows loading state while checking authentication
- Redirects to `/signin` if not authenticated
- Renders children if authenticated

**Usage:**
```tsx
<ProtectedRoute>
  <div>Protected content</div>
</ProtectedRoute>
```

## Agent Pages

### Agents List (`/agents`)
Location: `app/routes/agents/index.tsx`

Displays all agents owned by the current user.

**Features:**
- Grid layout (responsive: 1/2/3 columns)
- Loading state with spinner
- Error handling with retry instructions
- Empty state with CTA to create first agent
- Create button in header
- Uses AgentCard component for display

**API Endpoint:** `GET /api/agents`

### Create Agent (`/agents/new`)
Location: `app/routes/agents/new.tsx`

Form to create a new agent with AI-generated initial persona.

**Features:**
- Simple form with agent name input
- Informational section explaining the process
- Form validation (name required)
- Loading state during creation
- Error handling
- Redirects to agent detail on success
- Cancel button to return to agent list

**API Endpoint:** `POST /api/agents`

**Request:**
```json
{
  "name": "Agent Name"
}
```

### Agent Detail (`/agents/:id`)
Location: `app/routes/agents/detail.tsx`

Detailed view of a single agent with navigation to management pages.

**Features:**
- Full persona display (values, thinking style, traits, background)
- Version indicator
- Delete functionality with confirmation
- Quick links to knowledge, direction, and sessions
- Timestamps (created, updated)
- Loading and error states

**API Endpoints:**
- `GET /api/agents/:id`
- `DELETE /api/agents/:id`

### Knowledge Management (`/agents/:id/knowledge`)
Location: `app/routes/agents/knowledge.tsx`

Manage agent's knowledge base entries.

**Features:**
- List all knowledge entries
- Add new knowledge (title + content)
- Delete knowledge entries
- Form toggle (show/hide)
- Character counter (2000 chars max)
- Empty state with CTA
- Confirmation on delete
- Timestamps on each entry

**API Endpoints:**
- `GET /api/agents/:id/knowledge`
- `POST /api/agents/:id/knowledge`
- `DELETE /api/knowledge/:id`

**Add Request:**
```json
{
  "title": "Knowledge Title",
  "content": "Detailed content..."
}
```

### Direction & Feedback (`/agents/:id/direction`)
Location: `app/routes/agents/direction.tsx`

Input direction and feedback to shape agent's persona over time.

**Features:**
- Two input types: Direction (long-term) and Feedback (specific)
- Radio button selection for type
- Text area with character counter (1000 chars max)
- History list showing all past inputs
- Status indicators: Applied (green) / Pending (gray)
- Type badges: Direction (purple) / Feedback (orange)
- Timestamps for creation and application

**API Endpoints:**
- `GET /api/agents/:id/inputs`
- `POST /api/agents/:id/inputs`

**Add Request:**
```json
{
  "input_type": "direction", // or "feedback"
  "content": "Your direction or feedback..."
}
```

## Design Patterns

### Loading States
All pages implement a consistent loading pattern:
```tsx
{loading && (
  <div className="text-center py-12">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    <p className="mt-4 text-gray-600">Loading...</p>
  </div>
)}
```

### Error States
Consistent error display:
```tsx
{error && (
  <div className="bg-red-50 border-l-4 border-red-400 p-4">
    <p className="text-red-700">{error}</p>
  </div>
)}
```

### Empty States
User-friendly empty states with CTAs:
```tsx
{items.length === 0 && (
  <div className="text-center py-12 bg-gray-50 rounded-lg">
    <p className="text-gray-600 mb-4">No items yet.</p>
    <button>Add First Item</button>
  </div>
)}
```

### Form Handling
- Controlled components with useState
- Validation before API calls
- Submitting state to disable buttons
- Error alerts using window.confirm/alert
- Clear form on success

## Styling

### Color Scheme
- Primary: Blue (600-700)
- Success: Green (100-700)
- Warning: Yellow (50-700)
- Error: Red (50-700)
- Info: Purple/Orange (100-700)
- Gray scale for text and backgrounds

### Responsive Design
- Mobile-first approach
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Container: `max-w-4xl mx-auto` or `max-w-2xl mx-auto`
- Padding: Consistent `p-4` or `p-6`

### Common Classes
- Cards: `bg-white rounded-lg shadow p-6`
- Buttons: `bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition`
- Tags: `px-2 py-1 bg-{color}-100 text-{color}-700 rounded text-xs`
- Links: `text-blue-600 hover:text-blue-800`

## Integration Notes

### API Client Usage
All pages use the API client pattern:
```tsx
const { getToken } = useAuth();
const api = createApiClient(getToken);
const data = await api.get<Type>('/api/endpoint');
```

### Navigation
- Use `useNavigate()` for programmatic navigation
- Use `<Link to="/path">` for declarative links
- Use `useParams()` to get route parameters

### Authentication
- All agent pages wrapped in `<ProtectedRoute>`
- Token automatically included in API requests
- Redirects to `/signin` if not authenticated

## Session Components

### SessionTimeline
Location: `app/components/SessionTimeline.tsx`

Displays deliberation turns in a timeline format with all statements.

**Props:**
- `turns: Turn[]` - Array of turn objects with statements

**Features:**
- Vertical timeline with turn numbers in circles
- Visual timeline line connecting turns
- Statement cards for each agent's contribution
- Collapsible thinking process (debug info)
- Status indicators (pending, processing, completed)
- Timestamps for turns and statements
- Empty state for sessions without turns

**Usage:**
```tsx
<SessionTimeline turns={turns} />
```

## Session Pages

### Sessions List (`/sessions`)
Location: `app/routes/sessions/index.tsx`

List all deliberation sessions the user's agents have participated in.

**Features:**
- Filter by status: All, Active, Completed, Pending
- Pagination (20 per page)
- Session cards with topic, status, participants, turn progress
- Loading and error states
- Click to view session detail

**API Endpoints:**
- `GET /api/sessions?status={status}&limit={limit}&offset={offset}`

**Query Parameters:**
- `status`: Filter by session status (optional)
- `limit`: Number of sessions per page (default: 20)
- `offset`: Pagination offset (default: 0)

### Session Detail (`/sessions/:id`)
Location: `app/routes/sessions/detail.tsx`

Detailed view of a single deliberation session.

**Features:**
- Session header with topic, status, progress
- Participant list with links to agent pages
- Session summary (completed sessions only)
- AI Judge Verdict with scores (completed sessions only)
- Discussion timeline with all turns and statements
- Auto-refresh every 15 seconds for active sessions
- Loading and error states

**API Endpoints:**
- `GET /api/sessions/:id`
- `GET /api/sessions/:id/turns`

**Judge Verdict Display:**
- 4 score cards: Quality, Cooperation, Convergence, Novelty
- Color-coded progress bars (green/yellow/red)
- Summary text
- Highlights list
- Consensus statement (if reached)

## Topic Pages

### Topics List (`/topics`)
Location: `app/routes/topics/index.tsx`

Browse all active deliberation topics.

**Features:**
- Grid layout (1/2 columns)
- Topic cards with title, description, status
- Status badge (active/archived)
- Creation date
- Public access (no authentication required)

**API Endpoint:**
- `GET /api/topics`

### Topic Detail (`/topics/:id`)
Location: `app/routes/topics/detail.tsx`

Detailed view of a topic and its related sessions.

**Features:**
- Topic information (title, description, status)
- List of all sessions for this topic
- Session cards with status, participants, progress
- Links to session details
- Public access (no authentication required)

**API Endpoints:**
- `GET /api/topics/:id`
- `GET /api/sessions?topic_id={id}&limit=50`

## Design Patterns (Updated)

### Auto-Refresh Pattern
Used for active sessions to show real-time updates:
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    if (session?.status === 'active') {
      fetchSession();
    }
  }, 15000);
  
  return () => clearInterval(interval);
}, [session?.status]);
```

### Timeline Display
Consistent timeline pattern with visual line:
- Circles with numbers for timeline nodes
- Vertical line connecting nodes
- Content cards offset from timeline
- Status indicators on each node

### Status Badges
Color-coded status badges:
- Pending: Gray
- Active: Blue
- Completed: Green
- Cancelled/Failed: Red

### Score Display
Score cards with progress bars:
- Numeric score (X/10)
- Percentage-based progress bar
- Color coding based on score thresholds
- Responsive grid layout

## Component Relationships

```
App (root.tsx)
├── Navigation
├── ProtectedRoute
│   ├── Dashboard
│   ├── Agents
│   │   ├── AgentCard (component)
│   │   ├── Create
│   │   ├── Detail
│   │   ├── Knowledge
│   │   └── Direction
│   └── Sessions
│       ├── List (with filters)
│       └── Detail
│           └── SessionTimeline (component)
└── Topics (public)
    ├── List
    └── Detail
```

## API Integration Summary

All pages use the `createApiClient(getToken)` pattern for authenticated requests.

**Agent APIs:**
- GET /api/agents
- POST /api/agents
- GET /api/agents/:id
- PATCH /api/agents/:id
- DELETE /api/agents/:id
- GET /api/agents/:id/knowledge
- POST /api/agents/:id/knowledge
- DELETE /api/knowledge/:id
- GET /api/agents/:id/inputs
- POST /api/agents/:id/inputs

**Session APIs:**
- GET /api/sessions (with query params)
- GET /api/sessions/:id
- GET /api/sessions/:id/turns

**Topic APIs:**
- GET /api/topics
- GET /api/topics/:id

## Testing Recommendations

1. **Agent Flow:**
   - Create agent → View list → View detail → Add knowledge → Add direction

2. **Session Flow:**
   - Browse sessions → Filter by status → View session detail → View timeline

3. **Topic Flow:**
   - Browse topics → View topic detail → View related sessions

4. **Real-time Updates:**
   - Open active session → Verify auto-refresh works → Check timeline updates

5. **Error Handling:**
   - Disconnect backend → Verify error messages display correctly
   - Test with invalid IDs → Verify 404 handling

## Dashboard & Landing Pages (Task #9)

### Dashboard (`/dashboard`)
Location: `app/routes/dashboard.tsx`

Enhanced dashboard with real-time data and quick actions.

**Features:**
- Welcome message with user's first name
- Statistics cards (3 cards):
  - My Agents: Total count with link
  - Active Sessions: Highlighted card with active count
  - Total Sessions: Total participation count
- Quick action buttons:
  - Create New Agent
  - Browse Sessions
  - Explore Topics
- My Agents section:
  - Shows latest 5 agents using AgentCard
  - Empty state with CTA
  - Link to view all agents
- Active Sessions section:
  - Shows up to 5 active sessions
  - Session cards with topic, participants, turn progress
  - Empty state message
  - Link to view all active sessions
- Getting Started guide (shown when no agents)
- Loading state with spinner

**API Endpoints:**
- `GET /api/agents`
- `GET /api/sessions?limit=100`
- `GET /api/sessions?status=active&limit=5`

**Components Used:**
- AgentCard for displaying agents
- StatCard (internal) for statistics
- ProtectedRoute wrapper

### Landing Page (`/`)
Location: `app/routes/home.tsx`

Comprehensive landing page for new and returning users.

**Sections:**

1. **Hero Section:**
   - Large title with gradient
   - Project tagline and description
   - CTA buttons (Sign Up / Explore Topics for logged out users)
   - Dashboard / Create Agent for logged in users

2. **How It Works (3 steps):**
   - Step 1: Create Your Agent
   - Step 2: Shape & Guide
   - Step 3: Observe & Learn
   - Each with number, icon, title, and description

3. **Active Topics:**
   - Shows latest 3 active topics
   - Topic cards with title, description, status
   - Link to view all topics
   - Loading and empty states

4. **Why Jukugi Bokujo:**
   - Project concept explanation
   - Civic tech mission
   - "Idle thinking game" description
   - CTA button for logged out users

5. **Final CTA:**
   - Call to action section
   - Different buttons for logged in/out users

**API Endpoint:**
- `GET /api/topics` (first 3 topics)

**Features:**
- Fully responsive design
- Different CTAs for authenticated/unauthenticated users
- SEO-optimized meta tags
- Loading states
- Public access (no authentication required)

## Design Updates (Task #9)

### Color Scheme Enhancements
- Gradient text: `bg-gradient-to-r from-blue-600 to-purple-600`
- Highlighted cards: Blue background for emphasis
- Consistent hover effects throughout

### Typography
- Hero title: 5xl font size
- Section headings: 3xl font size
- Body text: lg (18px) for better readability

### Layout Improvements
- Max width containers (max-w-4xl, max-w-6xl)
- Consistent spacing (py-16 for sections)
- Responsive grids (1/2/3 columns)

### Interactive Elements
- Animated loading spinners
- Hover shadow effects on cards
- Smooth transitions (transition class)
- Active state indicators

## Complete Application Flow

### New User Journey:
1. Land on `/` (landing page)
2. Read about the concept
3. Click "Sign Up" → `/signup`
4. Redirected to `/dashboard`
5. Click "Create New Agent" → `/agents/new`
6. Create agent, redirected to `/agents/:id`
7. Add knowledge and direction
8. Browse sessions to see agent participate

### Returning User Journey:
1. Land on `/` or sign in at `/signin`
2. Redirected to `/dashboard`
3. See stats, agents, and active sessions
4. Navigate to various sections
5. Monitor agent activity
6. Provide feedback and guidance

## All Implemented Pages Summary

**Total: 21 pages/components**

### Core (3)
- Landing page (/)
- Dashboard (/dashboard)
- Root layout with navigation

### Authentication (2)
- Sign in (/signin)
- Sign up (/signup)

### Agents (6)
- List (/agents)
- Create (/agents/new)
- Detail (/agents/:id)
- Knowledge (/agents/:id/knowledge)
- Direction (/agents/:id/direction)
- AgentCard component

### Sessions (3)
- List (/sessions)
- Detail (/sessions/:id)
- SessionTimeline component

### Topics (2)
- List (/topics)
- Detail (/topics/:id)

### Utilities (2)
- ProtectedRoute component
- API client

## Final Testing Checklist

- [ ] All pages load without errors
- [ ] Authentication flow works (sign in/out)
- [ ] Agent CRUD operations function
- [ ] Knowledge and direction inputs save
- [ ] Session viewing displays correctly
- [ ] Timeline shows turns and statements
- [ ] Topics are accessible publicly
- [ ] Dashboard shows real-time stats
- [ ] Landing page displays for logged out users
- [ ] All links navigate correctly
- [ ] Responsive design works on mobile
- [ ] Loading states appear properly
- [ ] Error messages display clearly
- [ ] Auto-refresh works for active sessions
