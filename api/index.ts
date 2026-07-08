import { handle } from 'hono/vercel'
import { createApp } from '../src/app.js'

const app = createApp()

export default handle(app)
