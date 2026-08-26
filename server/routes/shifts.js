import express from 'express';
import { query, get, run } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// GET /api/shifts/current — get active shift for logged in cashier
router.get('/current', verifyToken, async (req, res) => {
  try {
    const shift = await get(
      `SELECT * FROM cashier_shifts WHERE cashier_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
      [req.user.id]
    );
    return res.json({ success: true, shift: shift || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active shift.' });
  }
});

// POST /api/shifts/open — open shift with opening cash float
router.post('/open', verifyToken, async (req, res) => {
  try {
    const { opening_cash = 0, notes } = req.body;
    
    // Check if already open
    const existing = await get(
      `SELECT * FROM cashier_shifts WHERE cashier_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
      [req.user.id]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: `You already have open Shift #${existing.id}. Close it before opening a new one.`, shift: existing });
    }

    const result = await run(
      `INSERT INTO cashier_shifts (cashier_id, cashier_name, opening_cash, expected_cash, notes, status, opened_at)
       VALUES (?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)`,
      [req.user.id, req.user.name, parseFloat(opening_cash || 0), parseFloat(opening_cash || 0), notes || null]
    );

    await logAudit({
      userId: req.user.id, username: req.user.username, action: 'OPEN_SHIFT',
      entityType: 'shift', entityId: result.id,
      description: `Shift #${result.id} opened with float: Rs. ${opening_cash}`, req
    });

    const shift = await get(`SELECT * FROM cashier_shifts WHERE id = ?`, [result.id]);
    return res.status(201).json({ success: true, message: `Shift #${result.id} opened successfully with float Rs. ${opening_cash}`, shift });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to open shift.' });
  }
});

// POST /api/shifts/close — close shift with actual counted cash
router.post('/close', verifyToken, async (req, res) => {
  try {
    const { shift_id, actual_cash, notes } = req.body;
    let shift = null;
    if (shift_id) {
      shift = await get(`SELECT * FROM cashier_shifts WHERE id = ? AND status = 'open'`, [shift_id]);
    }
    if (!shift) {
      shift = await get(`SELECT * FROM cashier_shifts WHERE cashier_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`, [req.user.id]);
    }
    if (!shift) {
      return res.status(404).json({ success: false, message: 'No active open shift found for your account.' });
    }

    // Compute expected cash = opening_cash + total_cash_sales
    const expected = parseFloat(shift.opening_cash || 0) + parseFloat(shift.total_cash_sales || 0);
    const actual = parseFloat(actual_cash !== undefined ? actual_cash : expected);
    const difference = actual - expected;

    await run(
      `UPDATE cashier_shifts SET
        expected_cash = ?,
        actual_cash = ?,
        cash_difference = ?,
        notes = CASE WHEN notes IS NULL OR notes = '' THEN ? ELSE notes || ' | ' || ? END,
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [expected, actual, difference, notes || 'Reconciled and closed', notes || 'Reconciled and closed', shift.id]
    );

    await logAudit({
      userId: req.user.id, username: req.user.username, action: 'CLOSE_SHIFT',
      entityType: 'shift', entityId: shift.id,
      description: `Shift #${shift.id} closed. Expected: Rs. ${expected}, Actual: Rs. ${actual}, Difference: Rs. ${difference}`, req
    });

    const updatedShift = await get(`SELECT * FROM cashier_shifts WHERE id = ?`, [shift.id]);

    return res.json({
      success: true,
      message: `Shift #${shift.id} closed and drawer reconciled successfully!`,
      shift: updatedShift,
      reconciliation: {
        shift_id: shift.id,
        opening_cash: shift.opening_cash,
        total_cash_sales: shift.total_cash_sales,
        total_card_sales: shift.total_card_sales,
        total_sales: shift.total_sales,
        transaction_count: shift.transaction_count,
        expected_cash: expected,
        actual_cash: actual,
        cash_difference: difference
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to close shift: ' + err.message });
  }
});

// GET /api/shifts/history — shift logs for admin/reporting
router.get('/history', verifyToken, async (req, res) => {
  try {
    let sql = `SELECT * FROM cashier_shifts WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'ADMIN') {
      sql += ' AND cashier_id = ?';
      params.push(req.user.id);
    }
    sql += ' ORDER BY opened_at DESC LIMIT 100';
    const shifts = await query(sql, params);
    return res.json({ success: true, shifts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch shift history.' });
  }
});

export default router;
