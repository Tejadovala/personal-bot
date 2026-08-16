import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from './db/schema.js';
import authRoutes from './routes/auth.js';
import prototypeRoutes from './routes/prototypes.js';
import billingRoutes from './routes/billing.js';
import { shareRoute } from './routes/prototypes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Stripe webhook needs raw body for signature verification
// Must be registered BEFORE the global json parser
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for all other routes
app.use(express.json({ limit: '10mb' }));

// Initialize database on startup
getDb();
console.log('[DB] Database initialized');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/prototypes', prototypeRoutes);
app.use('/api/billing', billingRoutes);

// Public share route (no auth)
app.use('/api', shareRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 pdesign server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'not set (using demo flow)'}`);
  console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? 'configured' : 'not set (using mock responses)'}\n`);
});

export default app;
