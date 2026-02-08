import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use('/*', cors());

// Health check
app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono on Cloudflare Workers!' });
});

// Example D1 query
app.get('/api/test-db', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as test').first();
    return c.json({ success: true, result });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Cron handler
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());
    // Add your scheduled task logic here
    // Example: Clean up old data, send notifications, etc.
  },
};
