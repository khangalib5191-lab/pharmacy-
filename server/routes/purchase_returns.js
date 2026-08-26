import express from 'express';
import { query, get, run, transaction } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

async function genReturnNumber() {
  const last = await get(`SELECT return_number FROM purchase_returns ORDER BY id DESC LIMIT 1`);
  const num = last ? parseInt(last.return_number.replace(/\D/g, '').slice(-6)) + 1 : 1;
  return `PR-${String(num).padStart(6, '0')}`;
}

// GET /api/purchase-returns
router.get('/', verifyToken, async (req, res) => {
  try {
    const { supplier_id, start_date, end_date, status } = req.query;
    let sql = `SELECT pr.*, s.name as supplier_name FROM purchase_returns pr LEFT JOIN suppliers s ON pr.supplier_id = s.id WHERE 1=1`;
    const params = [];
    if (supplier_id) { sql += ' AND pr.supplier_id = ?'; params.push(supplier_id); }
    if (start_date) { sql += ' AND date(pr.return_date) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(pr.return_date) <= date(?)'; params.push(end_date); }
    if (status) { sql += ' AND pr.status = ?'; params.push(status); }
    sql += ' ORDER BY pr.created_at DESC LIMIT 200';
    const returns = await query(sql, params);
    return res.json({ success: true, returns });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch supplier returns.' });
  }
});

// GET /api/purchase-returns/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const ret = await get(`SELECT pr.*, s.name as supplier_name FROM purchase_returns pr LEFT JOIN suppliers s ON pr.supplier_id = s.id WHERE pr.id = ?`, [req.params.id]);
    if (!ret) return res.status(404).json({ success: false, message: 'Supplier return not found.' });
    const items = await query(`SELECT pri.*, m.trade_name, m.product_code FROM purchase_return_items pri JOIN medicines m ON pri.medicine_id = m.id WHERE pri.return_id = ?`, [req.params.id]);
    return res.json({ success: true, return: ret, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch return.' });
  }
});

// POST /api/purchase-returns — create supplier return (draft)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { purchase_id, supplier_id, return_date, reason, notes, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Return must have at least one item.' });
    if (!supplier_id) return res.status(400).json({ success: false, message: 'Supplier is required.' });

    // Validate quantities against available stock
    for (const item of items) {
      const med = await get(`SELECT trade_name, stock_quantity FROM medicines WHERE id = ?`, [item.medicine_id]);
      if (!med) return res.status(404).json({ success: false, message: `Product ID ${item.medicine_id} not found.` });
      if (item.quantity > med.stock_quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${item.quantity} units of "${med.trade_name}". Only ${med.stock_quantity} units available in stock.`
        });
      }
    }

    const return_number = await genReturnNumber();
    const total_amount = items.reduce((s, i) => s + i.unit_cost * i.quantity, 0);

    const retResult = await run(
      `INSERT INTO purchase_returns (return_number, purchase_id, supplier_id, return_date, status, total_amount, reason, notes, created_by)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [return_number, purchase_id || null, supplier_id, return_date, total_amount, reason || null, notes || null, req.user.id]
    );

    for (const item of items) {
      await run(
        `INSERT INTO purchase_return_items (return_id, medicine_id, batch_id, batch_number, expiry_date, quantity, unit_cost, total_cost, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [retResult.id, item.medicine_id, item.batch_id || null, item.batch_number || null, item.expiry_date || null,
         item.quantity, item.unit_cost, item.unit_cost * item.quantity, item.reason || reason || 'other']
      );
    }

    return res.status(201).json({ success: true, message: 'Supplier return created (draft).', returnId: retResult.id, return_number });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create supplier return: ' + err.message });
  }
});

// POST /api/purchase-returns/:id/confirm — THE KEY WORKFLOW
router.post('/:id/confirm', verifyToken, requireAdmin, async (req, res) => {
  try {
    const ret = await get(`SELECT * FROM purchase_returns WHERE id = ?`, [req.params.id]);
    if (!ret) return res.status(404).json({ success: false, message: 'Supplier return not found.' });
    if (ret.status === 'confirmed') return res.status(400).json({ success: false, message: 'Return already confirmed.' });
    if (ret.status === 'cancelled') return res.status(400).json({ success: false, message: 'Return is cancelled.' });

    const items = await query(`SELECT * FROM purchase_return_items WHERE return_id = ?`, [ret.id]);

    // Final stock validation before confirming
    for (const item of items) {
      const med = await get(`SELECT trade_name, stock_quantity FROM medicines WHERE id = ?`, [item.medicine_id]);
      if (item.quantity > med.stock_quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot confirm: "${med.trade_name}" only has ${med.stock_quantity} units. Return requires ${item.quantity}.`
        });
      }
    }

    await transaction(async () => {
      // 1. Mark return as confirmed
      await run(
        `UPDATE purchase_returns SET status = 'confirmed', confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [req.user.id, ret.id]
      );

      for (const item of items) {
        const med = await get(`SELECT stock_quantity FROM medicines WHERE id = ?`, [item.medicine_id]);
        const stockBefore = med.stock_quantity;
        const stockAfter = stockBefore - item.quantity;

        // 2. Decrease inventory
        await run(`UPDATE medicines SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.quantity, item.medicine_id]);

        // 3. Decrease batch quantity if batch linked
        if (item.batch_id) {
          await run(`UPDATE batches SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.quantity, item.batch_id]);
        } else if (item.batch_number) {
          await run(`UPDATE batches SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE medicine_id = ? AND batch_number = ?`, [item.quantity, item.medicine_id, item.batch_number]);
        }

        // 4. Record inventory movement
        await run(
          `INSERT INTO inventory_movements (medicine_id, batch_number, movement_type, quantity_out, stock_before, stock_after, reference_type, reference_id, reference_number, unit_cost, notes, created_by)
           VALUES (?, ?, 'supplier_return', ?, ?, ?, 'purchase_return', ?, ?, ?, ?, ?)`,
          [item.medicine_id, item.batch_number, item.quantity, stockBefore, stockAfter,
           ret.id, ret.return_number, item.unit_cost, `Supplier return: ${ret.return_number}`, req.user.id]
        );
      }

      // 5. Adjust supplier ledger (debit — supplier owes us for returned goods)
      if (ret.supplier_id) {
        const lastEntry = await get(`SELECT balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT 1`, [ret.supplier_id]);
        const prevBal = lastEntry ? lastEntry.balance : 0;
        const newBalance = prevBal - ret.total_amount;
        await run(
          `INSERT INTO supplier_ledger (supplier_id, transaction_type, debit, balance, reference_type, reference_id, reference_number, notes, created_by)
           VALUES (?, 'purchase_return', ?, ?, 'purchase_return', ?, ?, ?, ?)`,
          [ret.supplier_id, ret.total_amount, newBalance, ret.id, ret.return_number, `Return ${ret.return_number}`, req.user.id]
        );
      }
    });

    await logAudit({
      userId: req.user.id, username: req.user.username, action: 'CONFIRM_SUPPLIER_RETURN',
      entityType: 'purchase_return', entityId: ret.id,
      description: `Confirmed supplier return ${ret.return_number} — Rs. ${ret.total_amount}`, req
    });

    return res.json({ success: true, message: `Supplier return ${ret.return_number} confirmed. Stock decreased and supplier account adjusted.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to confirm supplier return: ' + err.message });
  }
});

// PUT /api/purchase-returns/:id/cancel
router.put('/:id/cancel', verifyToken, requireAdmin, async (req, res) => {
  try {
    const ret = await get(`SELECT status FROM purchase_returns WHERE id = ?`, [req.params.id]);
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found.' });
    if (ret.status === 'confirmed') return res.status(400).json({ success: false, message: 'Confirmed returns cannot be cancelled.' });
    await run(`UPDATE purchase_returns SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, message: 'Supplier return cancelled.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to cancel return.' });
  }
});

export default router;
