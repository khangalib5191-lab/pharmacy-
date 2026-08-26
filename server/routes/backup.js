import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { get, query } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../pharmacy.db');

// GET /api/backup/info
router.get('/info', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
    const medicineCount = await get(`SELECT COUNT(*) as count FROM medicines`);
    const salesCount = await get(`SELECT COUNT(*) as count FROM sales`);
    const purchasesCount = await get(`SELECT COUNT(*) as count FROM purchases`);
    const auditCount = await get(`SELECT COUNT(*) as count FROM audit_logs`);

    return res.json({
      success: true,
      database: {
        path: dbPath,
        size_bytes: stats?.size || 0,
        size_mb: stats ? (stats.size / (1024 * 1024)).toFixed(2) : '0.00',
        last_modified: stats?.mtime || null,
        medicines: medicineCount?.count || 0,
        sales: salesCount?.count || 0,
        purchases: purchasesCount?.count || 0,
        audit_records: auditCount?.count || 0,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve database information.' });
  }
});

// GET /api/backup/download — direct file download of pharmacy.db
router.get('/download', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'Database file not found.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pharmacy_backup_${timestamp}.db`;

    await logAudit({
      userId: req.user.id, username: req.user.username, action: 'BACKUP_DATABASE',
      entityType: 'database', description: 'Admin downloaded database backup file', req
    });

    res.download(dbPath, filename, (err) => {
      if (err) console.error('Download backup error:', err);
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to download database backup.' });
  }
});

// GET /api/backup/audit-logs
router.get('/audit-logs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0, action } = req.query;
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const logs = await query(sql, params);
    const total = await get(`SELECT COUNT(*) as count FROM audit_logs`);
    return res.json({ success: true, logs, total: total?.count || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

export default router;
