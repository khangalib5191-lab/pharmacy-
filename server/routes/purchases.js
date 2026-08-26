import express from 'express';
import { query, get, run, transaction } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// Helper: generate purchase number
async function genPurchaseNumber() {
  const last = await get(`SELECT purchase_number FROM purchases ORDER BY id DESC LIMIT 1`);
  const num = last ? parseInt(last.purchase_number.replace(/\D/g, '').slice(-6)) + 1 : 1;
  return `PUR-${String(num).padStart(6, '0')}`;
}
async function genGRNNumber() {
  const last = await get(`SELECT grn_number FROM goods_receipts ORDER BY id DESC LIMIT 1`);
  const num = last ? parseInt(last.grn_number.replace(/\D/g, '').slice(-6)) + 1 : 1;
  return `GRN-${String(num).padStart(6, '0')}`;
}
async function genPONumber() {
  const last = await get(`SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1`);
  const num = last ? parseInt(last.po_number.replace(/\D/g, '').slice(-6)) + 1 : 1;
  return `PO-${String(num).padStart(6, '0')}`;
}

// ── Purchase Orders ─────────────────────────────────────────────────────────

// GET /api/purchases/orders
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    let sql = `SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND po.status = ?'; params.push(status); }
    if (supplier_id) { sql += ' AND po.supplier_id = ?'; params.push(supplier_id); }
    sql += ' ORDER BY po.created_at DESC';
    const orders = await query(sql, params);
    return res.json({ success: true, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch purchase orders.' });
  }
});

// POST /api/purchases/orders
router.post('/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { supplier_id, order_date, expected_date, notes, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Order must have at least one item.' });
    const po_number = await genPONumber();
    const total = items.reduce((s, i) => s + (i.unit_cost || 0) * i.quantity, 0);
    const poResult = await run(
      `INSERT INTO purchase_orders (po_number, supplier_id, order_date, expected_date, status, notes, created_by, total_amount)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [po_number, supplier_id || null, order_date, expected_date || null, notes || null, req.user.id, total]
    );
    for (const item of items) {
      await run(
        `INSERT INTO purchase_order_items (po_id, medicine_id, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?)`,
        [poResult.id, item.medicine_id, item.quantity, item.unit_cost || 0, (item.unit_cost || 0) * item.quantity]
      );
    }
    return res.status(201).json({ success: true, message: 'Purchase order created.', orderId: poResult.id, po_number });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create purchase order.' });
  }
});

// GET /api/purchases/orders/:id
router.get('/orders/:id', verifyToken, async (req, res) => {
  try {
    const po = await get(`SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`, [req.params.id]);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    const items = await query(`SELECT poi.*, m.trade_name, m.product_code, m.form FROM purchase_order_items poi JOIN medicines m ON poi.medicine_id = m.id WHERE poi.po_id = ?`, [req.params.id]);
    return res.json({ success: true, po, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
});

// PUT /api/purchases/orders/:id/cancel
router.put('/orders/:id/cancel', verifyToken, requireAdmin, async (req, res) => {
  try {
    await run(`UPDATE purchase_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, message: 'Purchase order cancelled.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
});

// ── Goods Receipts ──────────────────────────────────────────────────────────

// GET /api/purchases/grn
router.get('/grn', verifyToken, async (req, res) => {
  try {
    const rows = await query(`SELECT gr.*, s.name as supplier_name FROM goods_receipts gr LEFT JOIN suppliers s ON gr.supplier_id = s.id ORDER BY gr.created_at DESC LIMIT 100`);
    return res.json({ success: true, receipts: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch GRNs.' });
  }
});

// POST /api/purchases/grn
router.post('/grn', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { po_id, supplier_id, supplier_invoice, receipt_date, notes, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'GRN must have at least one item.' });
    const grn_number = await genGRNNumber();
    const total = items.reduce((s, i) => s + i.unit_cost * i.received_qty, 0);
    const grnResult = await run(
      `INSERT INTO goods_receipts (grn_number, po_id, supplier_id, supplier_invoice, receipt_date, status, notes, total_amount, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [grn_number, po_id || null, supplier_id || null, supplier_invoice || null, receipt_date, notes || null, total, req.user.id]
    );
    for (const item of items) {
      await run(
        `INSERT INTO goods_receipt_items (grn_id, medicine_id, batch_number, expiry_date, mfg_date, ordered_qty, received_qty, damaged_qty, unit_cost, selling_price, total_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [grnResult.id, item.medicine_id, item.batch_number || null, item.expiry_date || null, item.mfg_date || null,
         item.ordered_qty || 0, item.received_qty, item.damaged_qty || 0,
         item.unit_cost, item.selling_price || 0, item.unit_cost * item.received_qty]
      );
    }
    return res.status(201).json({ success: true, message: 'GRN created as draft.', grnId: grnResult.id, grn_number });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create GRN.' });
  }
});

// GET /api/purchases/grn/:id
router.get('/grn/:id', verifyToken, async (req, res) => {
  try {
    const grn = await get(`SELECT gr.*, s.name as supplier_name FROM goods_receipts gr LEFT JOIN suppliers s ON gr.supplier_id = s.id WHERE gr.id = ?`, [req.params.id]);
    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found.' });
    const items = await query(`SELECT gi.*, m.trade_name, m.product_code FROM goods_receipt_items gi JOIN medicines m ON gi.medicine_id = m.id WHERE gi.grn_id = ?`, [req.params.id]);
    return res.json({ success: true, grn, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch GRN.' });
  }
});

// POST /api/purchases/grn/:id/confirm — confirms GRN and updates stock
router.post('/grn/:id/confirm', verifyToken, requireAdmin, async (req, res) => {
  try {
    const grn = await get(`SELECT * FROM goods_receipts WHERE id = ?`, [req.params.id]);
    if (!grn) return res.status(404).json({ success: false, message: 'GRN not found.' });
    if (grn.status === 'confirmed') return res.status(400).json({ success: false, message: 'GRN already confirmed.' });
    const items = await query(`SELECT * FROM goods_receipt_items WHERE grn_id = ?`, [grn.id]);

    await transaction(async () => {
      // 1. Confirm GRN
      await run(`UPDATE goods_receipts SET status = 'confirmed', confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.user.id, grn.id]);

      for (const item of items) {
        const med = await get(`SELECT stock_quantity, selling_price FROM medicines WHERE id = ?`, [item.medicine_id]);
        const stockBefore = med.stock_quantity;
        const stockAfter = stockBefore + item.received_qty;

        // 2. Update main stock quantity
        await run(`UPDATE medicines SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.received_qty, item.medicine_id]);

        // 3. Update cost price if selling_price provided
        if (item.selling_price && item.selling_price > 0) {
          await run(`UPDATE medicines SET cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.unit_cost, item.medicine_id]);
        }

        // 4. Create/update batch
        const existingBatch = await get(`SELECT id, quantity FROM batches WHERE medicine_id = ? AND batch_number = ?`, [item.medicine_id, item.batch_number]);
        if (existingBatch) {
          await run(`UPDATE batches SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.received_qty, existingBatch.id]);
        } else if (item.batch_number) {
          await run(
            `INSERT INTO batches (medicine_id, batch_number, expiry_date, mfg_date, quantity, cost_price, selling_price, supplier_id, grn_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.medicine_id, item.batch_number, item.expiry_date || null, item.mfg_date || null,
             item.received_qty, item.unit_cost, item.selling_price || med.selling_price,
             grn.supplier_id || null, grn.id]
          );
        }

        // 5. Inventory movement
        await run(
          `INSERT INTO inventory_movements (medicine_id, batch_number, movement_type, quantity_in, stock_before, stock_after, reference_type, reference_id, reference_number, unit_cost, created_by)
           VALUES (?, ?, 'purchase', ?, ?, ?, 'grn', ?, ?, ?, ?)`,
          [item.medicine_id, item.batch_number, item.received_qty, stockBefore, stockAfter, grn.id, grn.grn_number, item.unit_cost, req.user.id]
        );
      }

      // 6. Update PO status if linked
      if (grn.po_id) {
        await run(`UPDATE purchase_orders SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [grn.po_id]);
      }
    });

    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CONFIRM_GRN', entityType: 'grn', entityId: grn.id, description: `Confirmed GRN: ${grn.grn_number}`, req });
    return res.json({ success: true, message: `GRN ${grn.grn_number} confirmed. Stock updated.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to confirm GRN: ' + err.message });
  }
});

// ── Direct Purchases ────────────────────────────────────────────────────────

// GET /api/purchases
router.get('/', verifyToken, async (req, res) => {
  try {
    const { supplier_id, start_date, end_date, status } = req.query;
    let sql = `SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE 1=1`;
    const params = [];
    if (supplier_id) { sql += ' AND p.supplier_id = ?'; params.push(supplier_id); }
    if (start_date) { sql += ' AND date(p.purchase_date) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(p.purchase_date) <= date(?)'; params.push(end_date); }
    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    sql += ' ORDER BY p.created_at DESC LIMIT 200';
    const purchases = await query(sql, params);
    return res.json({ success: true, purchases });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch purchases.' });
  }
});

// POST /api/purchases — direct purchase (updates stock immediately)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { supplier_id, supplier_invoice, purchase_date, discount, tax_amount, paid_amount, payment_method, notes, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Purchase must have at least one item.' });

    const purchase_number = await genPurchaseNumber();
    const subtotal = items.reduce((s, i) => s + i.unit_cost * i.quantity, 0);
    const total_amount = subtotal - parseFloat(discount || 0) + parseFloat(tax_amount || 0);

    const result = await transaction(async () => {
      const purchResult = await run(
        `INSERT INTO purchases (purchase_number, supplier_id, supplier_invoice, purchase_date, subtotal, discount, tax_amount, total_amount, paid_amount, payment_method, notes, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
        [purchase_number, supplier_id || null, supplier_invoice || null, purchase_date,
         subtotal, parseFloat(discount || 0), parseFloat(tax_amount || 0), total_amount,
         parseFloat(paid_amount || 0), payment_method || 'Cash', notes || null, req.user.id]
      );
      const purchase_id = purchResult.id;

      for (const item of items) {
        const med = await get(`SELECT stock_quantity FROM medicines WHERE id = ?`, [item.medicine_id]);
        const stockBefore = med.stock_quantity;
        const stockAfter = stockBefore + item.quantity;

        // Save purchase item
        const batchResult = await run(
          `INSERT OR IGNORE INTO batches (medicine_id, batch_number, expiry_date, quantity, cost_price, supplier_id, purchase_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [item.medicine_id, item.batch_number || `BATCH-${Date.now()}`, item.expiry_date || null,
           item.quantity, item.unit_cost, supplier_id || null, purchase_id]
        );

        await run(
          `INSERT INTO purchase_items (purchase_id, medicine_id, batch_id, batch_number, expiry_date, quantity, unit_cost, discount, total_cost)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [purchase_id, item.medicine_id, batchResult.id || null, item.batch_number || null,
           item.expiry_date || null, item.quantity, item.unit_cost, item.discount || 0, item.unit_cost * item.quantity]
        );

        // Update stock
        await run(`UPDATE medicines SET stock_quantity = stock_quantity + ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [item.quantity, item.unit_cost, item.medicine_id]);

        // Inventory movement
        await run(
          `INSERT INTO inventory_movements (medicine_id, batch_number, movement_type, quantity_in, stock_before, stock_after, reference_type, reference_id, reference_number, unit_cost, created_by)
           VALUES (?, ?, 'purchase', ?, ?, ?, 'purchase', ?, ?, ?, ?)`,
          [item.medicine_id, item.batch_number, item.quantity, stockBefore, stockAfter, purchase_id, purchase_number, item.unit_cost, req.user.id]
        );
      }

      // Supplier ledger entry (credit — amount owed to supplier)
      if (supplier_id) {
        const lastEntry = await get(`SELECT balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT 1`, [supplier_id]);
        const prevBal = lastEntry ? lastEntry.balance : 0;
        await run(
          `INSERT INTO supplier_ledger (supplier_id, transaction_type, credit, balance, reference_type, reference_id, reference_number, notes, created_by)
           VALUES (?, 'purchase', ?, ?, 'purchase', ?, ?, ?, ?)`,
          [supplier_id, total_amount, prevBal + total_amount, purchase_id, purchase_number, `Purchase ${purchase_number}`, req.user.id]
        );
        // Payment entry if paid now
        if (parseFloat(paid_amount || 0) > 0) {
          const bal2 = prevBal + total_amount - parseFloat(paid_amount);
          await run(
            `INSERT INTO supplier_ledger (supplier_id, transaction_type, debit, balance, reference_type, reference_id, reference_number, notes, created_by)
             VALUES (?, 'payment', ?, ?, 'purchase', ?, ?, ?, ?)`,
            [supplier_id, parseFloat(paid_amount), bal2, purchase_id, purchase_number, `Payment for ${purchase_number}`, req.user.id]
          );
        }
      }

      return purchResult.id;
    });

    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CREATE_PURCHASE', entityType: 'purchase', entityId: result, description: `Purchase ${purchase_number} — Rs. ${total_amount}`, req });
    return res.status(201).json({ success: true, message: 'Purchase recorded and stock updated.', purchaseId: result, purchase_number });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to record purchase: ' + err.message });
  }
});

// GET /api/purchases/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const purchase = await get(`SELECT p.*, s.name as supplier_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?`, [req.params.id]);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });
    const items = await query(`SELECT pi.*, m.trade_name, m.product_code FROM purchase_items pi JOIN medicines m ON pi.medicine_id = m.id WHERE pi.purchase_id = ?`, [req.params.id]);
    return res.json({ success: true, purchase, items });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch purchase.' });
  }
});

export default router;
