import express from 'express';
import { query, get, run } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM settings`);
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
});

// POST /api/settings — update multiple settings (Admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await run(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    }
    await logAudit({
      userId: req.user.id, username: req.user.username, action: 'UPDATE_SETTINGS',
      entityType: 'settings', description: 'Updated store configuration', req
    });
    return res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to save settings.' });
  }
});

export default router;
