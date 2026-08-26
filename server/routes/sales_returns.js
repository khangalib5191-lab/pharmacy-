import express from 'express';
import { query, get, run, transaction } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

async function genSRNumber() {
  const last = await get(`SELECT return_number FROM sales_returns ORDER BY id DESC LIMIT 1`);
  const num = last ? parseInt(last.return_number.replace(/\D/g, '').slice(-6)) + 1 : 1;
  return `SR-${String(num).padStart(6, '0')}`;
}

// GET /api/sales-returns
router.get('/', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    let sql = `SELECT sr.*, s.receipt_number as original_receipt FROM sales_returns sr LEFT JOIN sales s ON sr.sale_id = s.id WHERE 1=1`;
    const params = [];
    if (start_date) { sql += ' AND date(sr.return_date) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(sr.return_date) <= date(?)'; params.push(end_date); }
    if (status) { sql += ' AND sr.status = ?'; params.push(status); }
    sql += ' ORDER BY sr.created_at DESC LIMIT 200';
    const returns = await query(sql, params);
    return res.json({ success: true, returns });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sales returns.' });
  }
});

// GET /api/sales-returns/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const ret = await get(`SELECT * FROM sales_returns WHERE id = ?`, [req.params.id]);
    if (!ret) return res.status(404).json({ success: false, message: 'Sales return not found.' });
    const items = await query(`SELECT * FROM sales_return_items WHERE return_id = ?`, [req.params.id]);
    return res.json({ success: true, return: ret, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch return.' });
  }
});

// POST /api/sales-returns — create customer return (draft)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { sale_id, customer_id, customer_name, return_date, reason, notes, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Return must have at least one item.' });

    const return_number = await genSRNumber();
    const total_amount = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    const retResult = await run(
      `INSERT INTO sales_returns (return_number, sale_id, customer_id, customer_name, return_date, status, total_amount, reason, notes, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [return_number, sale_id || null, customer_id || null, customer_name || 'Walk-in Customer',
       return_date, total_amount, reason || null, notes || null, req.user.id]
    );

    for (const item of items) {
      await run(
        `INSERT INTO sales_return_items (return_id, medicine_id, batch_number, trade_name, quantity, unit_price, total_price, stock_disposition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [retResult.id, item.medicine_id, item.batch_number || null, item.trade_name,
         item.quantity, item.unit_price, item.unit_price * item.quantity, item.stock_disposition || 'sellable']
      );
    }

    return res.status(201).json({ success: true, message: 'Sales return created (draft).', returnId: retResult.id, return_number });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create sales return: ' + err.message });
  }
});

// POST /api/sales-returns/:id/confirm
router.post('/:id/confirm', verifyToken, requireAdmin, async (req, res) => {
  try {
    const ret = await get(`SELECT * FROM sales_returns WHERE id = ?`, [req.params.id]);
    if (!ret) return res.status(404).json({ success: false, message: 'Sales return not found.' });
    if (ret.status !== 'draft') return res.status(400).json({ success: false, message: `Cannot confirm a ${ret.status} return.` });

    const items = await query(`SELECT * FROM sales_return_items WHERE return_id = ?`, [ret.id]);

    await transaction(async () => {
      await run(
        `UPDATE sales_returns SET status = 'confirmed', confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [req.user.id, ret.id]
      );

      for (const item of items) {
        const med = await get(`SELECT stock_quantity FROM medicines WHERE id = ?`, [item.medicine_id]);
        const stockBefore = med.stock_quantity;

        // Only add back to sellable stock if disposition is 'sellable'
        const addBack = item.stock_disposition === 'sellable' ? item.quantity : 0;
        const stockAfter = stockBefore + addBack;

        if (addBack > 0) {
          await run(`UPDATE medicines SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [addBack, item.medicine_id]);
        }

        await run(
          `INSERT INTO inventory_movements (medicine_id, batch_number, movement_type, quantity_in, stock_before, stock_after, reference_type, reference_id, reference_number, notes, created_by)
           VALUES (?, ?, 'customer_return', ?, ?, ?, 'sales_return', ?, ?, ?, ?)`,
          [item.medicine_id, item.batch_number, addBack, stockBefore, stockAfter,
           ret.id, ret.return_number, `Customer return (${item.stock_disposition}): ${ret.return_number}`, req.user.id]
        );
      }

      // Mark original sale status
      if (ret.sale_id) {
        await run(`UPDATE sales SET sale_status = 'partially_returned' WHERE id = ?`, [ret.sale_id]);
      }
    });

    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CONFIRM_SALES_RETURN', entityType: 'sales_return', entityId: ret.id, description: `Confirmed customer return ${ret.return_number}`, req });
    return res.json({ success: true, message: `Sales return ${ret.return_number} confirmed.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to confirm sales return: ' + err.message });
  }
});

export default router;
