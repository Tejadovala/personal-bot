import { Router } from 'express';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';
import { generateFlow, editScreen } from '../services/llm.js';

const router = Router();

// GET /api/prototypes - list user's prototypes
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const prototypes = db.prepare(
      'SELECT id, name, prompt, flow_json, share_id, share_enabled, created_at, updated_at FROM prototypes WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(req.user.id);

    res.json({ prototypes });
  } catch (err) {
    console.error('[Prototypes] List error:', err);
    res.status(500).json({ error: 'Failed to list prototypes' });
  }
});

// POST /api/prototypes - create new prototype via LLM
router.post('/', requireAuth, async (req, res) => {
  try {
    const { prompt, name } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Free tier limit: max 2 prototypes
    const db = getDb();
    const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(req.user.id);
    if (user && user.plan !== 'pro') {
      const count = db.prepare('SELECT COUNT(*) as count FROM prototypes WHERE user_id = ?').get(req.user.id);
      if (count.count >= 2) {
        return res.status(403).json({
          error: 'Free plan limit reached. Upgrade to Pro for unlimited prototypes.',
          upgrade: true,
        });
      }
    }

    const flow = await generateFlow(prompt);

    const id = crypto.randomUUID();
    const prototypeName = name || flow.name || 'Untitled Prototype';

    db.prepare(
      'INSERT INTO prototypes (id, user_id, name, prompt, flow_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))'
    ).run(id, req.user.id, prototypeName, prompt, JSON.stringify(flow));

    const prototype = db.prepare(
      'SELECT id, user_id, name, prompt, flow_json, share_id, share_enabled, created_at, updated_at FROM prototypes WHERE id = ?'
    ).get(id);

    res.status(201).json({
      prototype: {
        ...prototype,
        flow_json: JSON.parse(prototype.flow_json),
      },
    });
  } catch (err) {
    console.error('[Prototypes] Create error:', err);
    res.status(500).json({ error: 'Failed to create prototype' });
  }
});

// GET /api/prototypes/:id - get a single prototype
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const prototype = db.prepare(
      'SELECT id, user_id, name, prompt, flow_json, share_id, share_enabled, created_at, updated_at FROM prototypes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!prototype) {
      return res.status(404).json({ error: 'Prototype not found' });
    }

    res.json({
      prototype: {
        ...prototype,
        flow_json: prototype.flow_json ? JSON.parse(prototype.flow_json) : null,
      },
    });
  } catch (err) {
    console.error('[Prototypes] Get error:', err);
    res.status(500).json({ error: 'Failed to get prototype' });
  }
});

// PUT /api/prototypes/:id - update a prototype
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare(
      'SELECT id FROM prototypes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Prototype not found' });
    }

    const { name, flow_json, prompt } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (flow_json !== undefined) {
      updates.push('flow_json = ?');
      values.push(typeof flow_json === 'string' ? flow_json : JSON.stringify(flow_json));
    }
    if (prompt !== undefined) {
      updates.push('prompt = ?');
      values.push(prompt);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(req.params.id, req.user.id);

    db.prepare(
      `UPDATE prototypes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...values);

    const prototype = db.prepare(
      'SELECT id, user_id, name, prompt, flow_json, share_id, share_enabled, created_at, updated_at FROM prototypes WHERE id = ?'
    ).get(req.params.id);

    res.json({
      prototype: {
        ...prototype,
        flow_json: prototype.flow_json ? JSON.parse(prototype.flow_json) : null,
      },
    });
  } catch (err) {
    console.error('[Prototypes] Update error:', err);
    res.status(500).json({ error: 'Failed to update prototype' });
  }
});

// DELETE /api/prototypes/:id - delete a prototype
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare(
      'DELETE FROM prototypes WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Prototype not found' });
    }

    res.json({ message: 'Prototype deleted' });
  } catch (err) {
    console.error('[Prototypes] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete prototype' });
  }
});

// POST /api/prototypes/:id/edit-screen - edit a single screen via LLM
router.post('/:id/edit-screen', requireAuth, async (req, res) => {
  try {
    const { screenId, editPrompt } = req.body;

    if (!screenId || typeof screenId !== 'string') {
      return res.status(400).json({ error: 'screenId is required' });
    }
    if (!editPrompt || typeof editPrompt !== 'string') {
      return res.status(400).json({ error: 'editPrompt is required' });
    }

    const db = getDb();
    const prototype = db.prepare(
      'SELECT id, flow_json FROM prototypes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!prototype) {
      return res.status(404).json({ error: 'Prototype not found' });
    }

    const flow = JSON.parse(prototype.flow_json);
    const editedScreen = await editScreen(flow, screenId, editPrompt);

    // Replace the screen in the flow
    const screenIndex = flow.screens.findIndex((s) => s.screen_id === screenId);
    if (screenIndex === -1) {
      return res.status(404).json({ error: 'Screen not found in flow' });
    }

    flow.screens[screenIndex] = editedScreen;

    // Save updated flow
    db.prepare(
      "UPDATE prototypes SET flow_json = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(JSON.stringify(flow), req.params.id);

    res.json({
      screen: editedScreen,
      flow,
    });
  } catch (err) {
    console.error('[Prototypes] Edit screen error:', err);
    res.status(500).json({ error: 'Failed to edit screen' });
  }
});

// POST /api/prototypes/:id/share - generate or toggle share link
router.post('/:id/share', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const prototype = db.prepare(
      'SELECT id, share_id, share_enabled FROM prototypes WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!prototype) {
      return res.status(404).json({ error: 'Prototype not found' });
    }

    const { enabled } = req.body;

    // If toggling share off/on
    if (typeof enabled === 'boolean') {
      // Generate share_id if it doesn't exist yet
      if (!prototype.share_id && enabled) {
        const shareId = nanoid(10);
        db.prepare(
          "UPDATE prototypes SET share_id = ?, share_enabled = 1, updated_at = datetime('now') WHERE id = ?"
        ).run(shareId, req.params.id);

        return res.json({ share_id: shareId, share_enabled: true });
      }

      db.prepare(
        "UPDATE prototypes SET share_enabled = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(enabled ? 1 : 0, req.params.id);

      return res.json({ share_id: prototype.share_id, share_enabled: enabled });
    }

    // Default: generate new share link
    const shareId = nanoid(10);
    db.prepare(
      "UPDATE prototypes SET share_id = ?, share_enabled = 1, updated_at = datetime('now') WHERE id = ?"
    ).run(shareId, req.params.id);

    res.json({ share_id: shareId, share_enabled: true });
  } catch (err) {
    console.error('[Prototypes] Share error:', err);
    res.status(500).json({ error: 'Failed to update share settings' });
  }
});

// Public share router (mounted separately at /api)
const shareRouter = Router();

// GET /api/share/:shareId - PUBLIC route, get shared prototype
shareRouter.get('/share/:shareId', (req, res) => {
  try {
    const db = getDb();
    const prototype = db.prepare(
      `SELECT p.id, p.name, p.flow_json, p.share_id, u.plan as user_plan
       FROM prototypes p
       JOIN users u ON p.user_id = u.id
       WHERE p.share_id = ? AND p.share_enabled = 1`
    ).get(req.params.shareId);

    if (!prototype) {
      return res.status(404).json({ error: 'Shared prototype not found' });
    }

    res.json({
      prototype: {
        id: prototype.id,
        name: prototype.name,
        share_id: prototype.share_id,
        user_plan: prototype.user_plan,
        flow_json: prototype.flow_json ? JSON.parse(prototype.flow_json) : null,
      },
    });
  } catch (err) {
    console.error('[Prototypes] Share get error:', err);
    res.status(500).json({ error: 'Failed to get shared prototype' });
  }
});

export { shareRouter as shareRoute };
export default router;
