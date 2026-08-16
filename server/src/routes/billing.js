import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCheckoutSession, handleWebhook, constructWebhookEvent, getSubscriptionStatus } from '../services/stripe.js';

const router = Router();

// POST /api/billing/create-checkout - create Stripe checkout session
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { priceId } = req.body;

    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const session = await createCheckoutSession(req.user.id, priceId);

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('[Billing] Create checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/webhook - Stripe webhook handler
// Note: This route needs raw body for signature verification.
// The raw body middleware is applied in index.js for this specific route.
router.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const event = constructWebhookEvent(req.body, signature);

    handleWebhook(event);

    res.json({ received: true });
  } catch (err) {
    console.error('[Billing] Webhook error:', err);
    res.status(400).json({ error: `Webhook error: ${err.message}` });
  }
});

// GET /api/billing/status - get subscription status
router.get('/status', requireAuth, (req, res) => {
  try {
    const status = getSubscriptionStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('[Billing] Status error:', err);
    res.status(500).json({ error: 'Failed to get billing status' });
  }
});

export default router;
