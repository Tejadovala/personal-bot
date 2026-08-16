import { Router } from 'express';
import { generateMagicLink, verifyMagicLink } from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup - request magic link for signup
router.post('/signup', (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = generateMagicLink(email);

    res.json({
      message: 'Magic link sent! Check your email (or console in dev mode).',
      // Include token in dev mode for easier testing
      ...(process.env.NODE_ENV !== 'production' && { token: result.token }),
    });
  } catch (err) {
    console.error('[Auth] Signup error:', err);
    res.status(500).json({ error: 'Failed to create magic link' });
  }
});

// POST /api/auth/login - request magic link for login (same as signup)
router.post('/login', (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = generateMagicLink(email);

    res.json({
      message: 'Magic link sent! Check your email (or console in dev mode).',
      ...(process.env.NODE_ENV !== 'production' && { token: result.token }),
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Failed to create magic link' });
  }
});

// POST /api/auth/verify - verify magic link token and return JWT
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = verifyMagicLink(token);

    res.json({
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    console.error('[Auth] Verify error:', err);

    if (err.message === 'Invalid magic link' || err.message === 'Magic link already used' || err.message === 'Magic link expired') {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to verify magic link' });
  }
});

// GET /api/auth/me - get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
