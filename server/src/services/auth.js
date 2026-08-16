import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { getDb } from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pdesign-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const MAGIC_LINK_EXPIRES_MINUTES = 15;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function generateMagicLink(email) {
  const db = getDb();
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRES_MINUTES * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO magic_links (token, email, expires_at, used) VALUES (?, ?, ?, 0)'
  ).run(token, email.toLowerCase(), expiresAt);

  const magicLinkUrl = `${CLIENT_URL}/auth/verify?token=${token}`;

  // For MVP: log to console instead of sending email
  console.log('\n========================================');
  console.log('  MAGIC LINK (dev mode)');
  console.log(`  Email: ${email}`);
  console.log(`  Link:  ${magicLinkUrl}`);
  console.log(`  Token: ${token}`);
  console.log('========================================\n');

  return { token, magicLinkUrl };
}

export function verifyMagicLink(token) {
  const db = getDb();

  const link = db.prepare(
    'SELECT token, email, expires_at, used FROM magic_links WHERE token = ?'
  ).get(token);

  if (!link) {
    throw new Error('Invalid magic link');
  }

  if (link.used) {
    throw new Error('Magic link already used');
  }

  if (new Date(link.expires_at) < new Date()) {
    throw new Error('Magic link expired');
  }

  // Mark as used
  db.prepare('UPDATE magic_links SET used = 1 WHERE token = ?').run(token);

  const email = link.email;

  // Find or create user
  let user = db.prepare('SELECT id, email, plan, stripe_customer_id, created_at FROM users WHERE email = ?').get(email);

  if (!user) {
    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO users (id, email, plan) VALUES (?, ?, ?)'
    ).run(id, email, 'free');

    user = db.prepare('SELECT id, email, plan, stripe_customer_id, created_at FROM users WHERE id = ?').get(id);
  }

  const jwt_token = generateToken(user);

  return { token: jwt_token, user };
}
