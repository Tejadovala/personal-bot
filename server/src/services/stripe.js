import Stripe from 'stripe';
import { getDb } from '../db/schema.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

let stripe = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export async function createCheckoutSession(userId, priceId) {
  const stripeClient = getStripe();
  const db = getDb();
  const user = db.prepare('SELECT id, email, stripe_customer_id FROM users WHERE id = ?').get(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (!stripeClient) {
    console.log('[Stripe] No STRIPE_SECRET_KEY set, returning mock checkout session');
    return {
      id: 'mock_session_' + Date.now(),
      url: `${CLIENT_URL}/billing/success?mock=true`,
    };
  }

  // Create or retrieve Stripe customer
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripeClient.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, userId);
  }

  const session = await stripeClient.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${CLIENT_URL}/billing/cancel`,
    metadata: { userId: user.id },
  });

  return { id: session.id, url: session.url };
}

export async function handleWebhook(event) {
  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId) {
        db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('pro', userId);
        console.log(`[Stripe] User ${userId} upgraded to pro`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const user = db.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').get(customerId);
      if (user) {
        db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('free', user.id);
        console.log(`[Stripe] User ${user.id} downgraded to free`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const user = db.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').get(customerId);
      if (user) {
        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        const plan = isActive ? 'pro' : 'free';
        db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, user.id);
        console.log(`[Stripe] User ${user.id} subscription updated to ${plan}`);
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

export function constructWebhookEvent(rawBody, signature) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    throw new Error('Stripe is not configured');
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  return stripeClient.webhooks.constructEvent(rawBody, signature, endpointSecret);
}

export function getSubscriptionStatus(userId) {
  const db = getDb();
  const user = db.prepare('SELECT id, plan, stripe_customer_id FROM users WHERE id = ?').get(userId);

  if (!user) {
    throw new Error('User not found');
  }

  return {
    plan: user.plan,
    isActive: user.plan === 'pro',
    stripeCustomerId: user.stripe_customer_id,
  };
}
