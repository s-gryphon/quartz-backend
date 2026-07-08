import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
const app = createApp();
serve({
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
}, (info) => {
    console.log(`Quartz API running at http://localhost:${info.port}/api`);
});
