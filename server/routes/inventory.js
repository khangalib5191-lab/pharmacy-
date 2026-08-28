import express from 'express';
import { query, get, run, transaction } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// GET /api/inventory/alerts — unified real-time alert center
router.get('/alerts', verifyToken, async (req, res) => {
  try {
    const expired = await query(`
      SELECT id, trade_name, generic_name, product_code, form, dosage, batch_number, expiry_date, stock_quantity, min_stock_alert, rack_location, cost_price, selling_price,
      CAST((julianday(date('now')) - julianday(expiry_date)) AS INTEGER) as days_overdue
      FROM medicines
      WHERE status != 'inactive' AND expiry_date IS NOT NULL AND date(expiry_date) < date('now')
      ORDER BY expiry_date ASC
    `);

    const expiringSoon = await query(`
      SELECT id, trade_name, generic_name, product_code, form, dosage, batch_number, expiry_date, stock_quantity, min_stock_alert, rack_location, cost_price, selling_price,
      CAST((julianday(expiry_date) - julianday(date('now'))) AS INTEGER) as days_remaining
      FROM medicines
      WHERE status != 'inactive' AND expiry_date IS NOT NULL AND date(expiry_date) >= date('now') AND date(expiry_date) <= date('now', '+90 days')
      ORDER BY expiry_date ASC
    `);

    const outOfStock = await query(`
      SELECT id, trade_name, generic_name, product_code, form, dosage, batch_number, expiry_date, stock_quantity, min_stock_alert, rack_location, cost_price, selling_price
      FROM medicines
      WHERE status != 'inactive' AND stock_quantity <= 0
      ORDER BY trade_name ASC
    `);

    const lowStock = await query(`
      SELECT id, trade_name, generic_name, product_code, form, dosage, batch_number, expiry_date, stock_quantity, min_stock_alert, rack_location, cost_price, selling_price,
      (min_stock_alert - stock_quantity) as units_deficit
      FROM medicines
      WHERE status != 'inactive' AND stock_quantity > 0 AND stock_quantity <= min_stock_alert
      ORDER BY stock_quantity ASC
    `);

    const summary = {
      expired_count: expired.length,
      expiring_soon_count: expiringSoon.length,
      out_of_stock_count: outOfStock.length,
      low_stock_count: lowStock.length,
      total_expiry_alerts: expired.length + expiringSoon.length,
      total_stock_alerts: outOfStock.length + lowStock.length,
      total_alerts: expired.length + expiringSoon.length + outOfStock.length + lowStock.length
    };

    return res.json({
      success: true,
      summary,
      alerts: {
        expired,
        expiring_soon: expiringSoon,
        out_of_stock: outOfStock,
        low_stock: lowStock
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory alerts: ' + err.message });
  }
});

// GET /api/inventory/movements
router.get('/movements', verifyToken, async (req, res) => {
  try {
    const { medicine_id, movement_type, start_date, end_date, limit = 100, offset = 0 } = req.query;
    let sql = `SELECT im.*, m.trade_name, m.product_code FROM inventory_movements im JOIN medicines m ON im.medicine_id = m.id WHERE 1=1`;
    const params = [];
    if (medicine_id) { sql += ' AND im.medicine_id = ?'; params.push(medicine_id); }
    if (movement_type) { sql += ' AND im.movement_type = ?'; params.push(movement_type); }
    if (start_date) { sql += ' AND date(im.created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(im.created_at) <= date(?)'; params.push(end_date); }
    sql += ' ORDER BY im.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const movements = await query(sql, params);
    return res.json({ success: true, movements });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory movements.' });
  }
});

// GET /api/inventory/batches
router.get('/batches', verifyToken, async (req, res) => {
  try {
    const { medicine_id, expiry_status } = req.query;
    let sql = `SELECT b.*, m.trade_name, m.product_code, m.form FROM batches b JOIN medicines m ON b.medicine_id = m.id WHERE 1=1`;
    const params = [];
    if (medicine_id) { sql += ' AND b.medicine_id = ?'; params.push(medicine_id); }
    if (expiry_status === 'expired') sql += ` AND date(b.expiry_date) < date('now')`;
    else if (expiry_status === 'expiring_soon') sql += ` AND date(b.expiry_date) BETWEEN date('now') AND date('now', '+90 days')`;
    sql += ' ORDER BY b.expiry_date ASC';
    const batches = await query(sql, params);
    return res.json({ success: true, batches });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch batches.' });
  }
});

// GET /api/inventory/stock — current stock overview
router.get('/stock', verifyToken, async (req, res) => {
  try {
    const { stock_status, category, search } = req.query;
    let sql = `SELECT m.*, 
      (SELECT SUM(b.quantity) FROM batches b WHERE b.medicine_id = m.id AND b.status = 'active') as batch_stock
      FROM medicines m WHERE m.status != 'inactive'`;
    const params = [];
    if (search && search.trim()) {
      sql += ` AND (m.trade_name LIKE ? OR m.product_code LIKE ? OR m.generic_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) { sql += ' AND m.category = ?'; params.push(category); }
    if (stock_status === 'low') sql += ' AND m.stock_quantity > 0 AND m.stock_quantity <= m.min_stock_alert';
    else if (stock_status === 'out') sql += ' AND m.stock_quantity = 0';
    else if (stock_status === 'expiring') sql += ` AND date(m.expiry_date) BETWEEN date('now') AND date('now', '+90 days')`;
    else if (stock_status === 'expired') sql += ` AND date(m.expiry_date) < date('now')`;
    sql += ' ORDER BY m.trade_name ASC';
    const medicines = await query(sql, params);
    return res.json({ success: true, medicines });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stock.' });
  }
});

// POST /api/inventory/adjust — stock adjustment
router.post('/adjust', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { medicine_id, adjustment_type, quantity, reason, batch_number, notes } = req.body;
    if (!medicine_id || !quantity || !adjustment_type) {
      return res.status(400).json({ success: false, message: 'Medicine, quantity, and type are required.' });
    }

    const med = await get(`SELECT trade_name, stock_quantity FROM medicines WHERE id = ?`, [medicine_id]);
    if (!med) return res.status(404).json({ success: false, message: 'Product not found.' });

    const qty = parseInt(quantity);
    const stockBefore = med.stock_quantity;
    let stockAfter, qty_in = 0, qty_out = 0;

    if (adjustment_type === 'add') {
      stockAfter = stockBefore + qty;
      qty_in = qty;
    } else if (adjustment_type === 'remove') {
      if (qty > stockBefore) return res.status(400).json({ success: false, message: `Cannot remove ${qty} units. Only ${stockBefore} available.` });
      stockAfter = stockBefore - qty;
      qty_out = qty;
    } else if (adjustment_type === 'set') {
      stockAfter = qty;
      if (qty > stockBefore) qty_in = qty - stockBefore;
      else qty_out = stockBefore - qty;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid adjustment type.' });
    }

    await transaction(async () => {
      await run(`UPDATE medicines SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [stockAfter, medicine_id]);
      await run(
        `INSERT INTO inventory_movements (medicine_id, batch_number, movement_type, quantity_in, quantity_out, stock_before, stock_after, reference_type, notes, created_by)
         VALUES (?, ?, 'stock_adjustment', ?, ?, ?, ?, 'adjustment', ?, ?)`,
        [medicine_id, batch_number || null, qty_in, qty_out, stockBefore, stockAfter, notes || reason || 'Manual adjustment', req.user.id]
      );
    });

    await logAudit({ userId: req.user.id, username: req.user.username, action: 'STOCK_ADJUSTMENT', entityType: 'medicine', entityId: medicine_id, description: `Stock adjusted for ${med.trade_name}: ${stockBefore} → ${stockAfter} (${adjustment_type} ${qty})`, req });
    return res.json({ success: true, message: `Stock adjusted. ${med.trade_name}: ${stockBefore} → ${stockAfter}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to adjust stock: ' + err.message });
  }
});

// GET /api/inventory/expiry-dashboard
router.get('/expiry-dashboard', verifyToken, async (req, res) => {
  try {
    const expired = await query(`SELECT id, trade_name, product_code, form, batch_number, expiry_date, stock_quantity, rack_location FROM medicines WHERE status != 'inactive' AND expiry_date IS NOT NULL AND date(expiry_date) < date('now') ORDER BY expiry_date ASC`);
    const today = await query(`SELECT id, trade_name, product_code, form, batch_number, expiry_date, stock_quantity FROM medicines WHERE status != 'inactive' AND date(expiry_date) = date('now')`);
    const d7 = await query(`SELECT id, trade_name, product_code, form, batch_number, expiry_date, stock_quantity FROM medicines WHERE status != 'inactive' AND date(expiry_date) BETWEEN date('now', '+1 days') AND date('now', '+7 days') ORDER BY expiry_date ASC`);
    const d30 = await query(`SELECT id, trade_name, product_code, form, batch_number, expiry_date, stock_quantity FROM medicines WHERE status != 'inactive' AND date(expiry_date) BETWEEN date('now', '+8 days') AND date('now', '+30 days') ORDER BY expiry_date ASC`);
    const d90 = await query(`SELECT id, trade_name, product_code, form, batch_number, expiry_date, stock_quantity FROM medicines WHERE status != 'inactive' AND date(expiry_date) BETWEEN date('now', '+31 days') AND date('now', '+90 days') ORDER BY expiry_date ASC`);
    return res.json({ success: true, expired, expiring_today: today, expiring_7: d7, expiring_30: d30, expiring_90: d90 });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expiry data.' });
  }
});

export default router;
