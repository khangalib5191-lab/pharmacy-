import express from 'express';
import { query, get, run, transaction } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// POST /api/sales — process POS checkout
router.post('/', verifyToken, async (req, res) => {
  try {
    const { items, customer_name, customer_id, discount = 0, payment_method = 'Cash', shift_id, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
    }

    // Pre-validate stock for all items
    for (const item of items) {
      const med = await get('SELECT trade_name, stock_quantity, status, expiry_date FROM medicines WHERE id = ?', [item.id]);
      if (!med) return res.status(404).json({ success: false, message: `Product ID ${item.id} not found.` });
      if (med.status === 'blocked') return res.status(400).json({ success: false, message: `Product "${med.trade_name}" is blocked.` });
      if (med.stock_quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for [${med.trade_name}]. Available: ${med.stock_quantity}` });
      }
      if (med.expiry_date && new Date(med.expiry_date) < new Date()) {
        return res.status(400).json({ success: false, message: `"${med.trade_name}" is expired (${med.expiry_date}). Cannot sell expired products.` });
      }
    }

    // Compute totals
    let subtotal = 0;
    let cost_total = 0;
    for (const item of items) {
      subtotal += (item.selling_price || item.unit_price) * item.quantity;
      cost_total += (item.cost_price || 0) * item.quantity;
    }

    const totalDiscount = parseFloat(discount || 0);
    const total_amount = Math.max(0, subtotal - totalDiscount);
    const gross_profit = total_amount - cost_total;
    const receipt_number = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await transaction(async () => {
      // 1. Create sale record
      const saleResult = await run(
        `INSERT INTO sales (receipt_number, cashier_id, cashier_name, customer_id, customer_name, subtotal, discount, total_amount, cost_total, gross_profit, payment_method, shift_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [receipt_number, req.user.id, req.user.name, customer_id || null,
         customer_name || 'Walk-in Customer', subtotal, totalDiscount, total_amount,
         cost_total, gross_profit, payment_method, shift_id || null, notes || null]
      );
      const sale_id = saleResult.id;

      const processedItems = [];
      for (const item of items) {
        const med = await get('SELECT cost_price, stock_quantity FROM medicines WHERE id = ?', [item.id]);
        const unit_cost = item.cost_price || med.cost_price;
        const itemTotal = (item.selling_price || item.unit_price) * item.quantity;

        // 2. Insert sale item with cost snapshot
        await run(
          `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, cost_price, discount, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [sale_id, item.id, item.trade_name, item.dosage || null, item.quantity,
           item.selling_price || item.unit_price, unit_cost, item.discount || 0, itemTotal]
        );

        // 3. Deduct stock
        const stockBefore = med.stock_quantity;
        await run(`UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE id = ?`, [item.quantity, item.id]);
        const stockAfter = stockBefore - item.quantity;

        // 4. Record inventory movement
        await run(
          `INSERT INTO inventory_movements (medicine_id, movement_type, quantity_out, stock_before, stock_after, reference_type, reference_id, reference_number, unit_cost, created_by)
           VALUES (?, 'sale', ?, ?, ?, 'sale', ?, ?, ?, ?)`,
          [item.id, item.quantity, stockBefore, stockAfter, sale_id, receipt_number, unit_cost, req.user.id]
        );

        processedItems.push({ trade_name: item.trade_name, dosage: item.dosage, quantity: item.quantity, unit_price: item.selling_price || item.unit_price, total_price: itemTotal });
      }

      // 5. Update shift if active
      if (shift_id) {
        await run(
          `UPDATE cashier_shifts SET total_sales = total_sales + ?, transaction_count = transaction_count + 1,
           total_cash_sales = total_cash_sales + CASE WHEN ? = 'Cash' THEN ? ELSE 0 END,
           total_card_sales = total_card_sales + CASE WHEN ? = 'Card' THEN ? ELSE 0 END
           WHERE id = ?`,
          [total_amount, payment_method, total_amount, payment_method, total_amount, shift_id]
        );
      }

      return { sale_id, processedItems };
    });

    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CREATE_SALE', entityType: 'sale', entityId: result.sale_id, description: `Sale ${receipt_number} — Rs. ${total_amount}`, req });

    return res.status(201).json({
      success: true,
      message: 'Sale completed successfully!',
      receipt: {
        id: result.sale_id, receipt_number, cashier_name: req.user.name,
        customer_name: customer_name || 'Walk-in Customer',
        date: new Date().toISOString(), subtotal, discount: totalDiscount,
        total_amount, gross_profit, payment_method, items: result.processedItems
      }
    });
  } catch (error) {
    console.error('Checkout Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process sale: ' + error.message });
  }
});

// GET /api/sales — sales log
router.get('/', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, cashier_id, customer_id, payment_method, limit = 100, offset = 0 } = req.query;
    let sql = 'SELECT * FROM sales WHERE 1=1';
    const params = [];

    if (start_date) { sql += ' AND date(created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(created_at) <= date(?)'; params.push(end_date); }
    if (cashier_id) { sql += ' AND cashier_id = ?'; params.push(cashier_id); }
    if (customer_id) { sql += ' AND customer_id = ?'; params.push(customer_id); }
    if (payment_method) { sql += ' AND payment_method = ?'; params.push(payment_method); }

    // Non-admins can only see their own sales
    if (req.user.role !== 'ADMIN') { sql += ' AND cashier_id = ?'; params.push(req.user.id); }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = await get(countSql, params);

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const sales = await query(sql, params);

    for (const sale of sales) {
      sale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
    }

    return res.json({ success: true, sales, total: totalRow?.total || 0 });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sales.' });
  }
});

// GET /api/sales/:id — single sale with items
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const sale = await get('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });
    if (req.user.role !== 'ADMIN' && sale.cashier_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    sale.items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
    return res.json({ success: true, sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sale.' });
  }
});

// GET /api/sales/export — CSV
router.get('/export/csv', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `SELECT s.receipt_number, s.created_at, s.cashier_name, s.customer_name, s.payment_method,
               s.subtotal, s.discount, s.total_amount, s.cost_total, s.gross_profit,
               i.trade_name, i.dosage, i.quantity, i.unit_price, i.cost_price, i.total_price
               FROM sales s JOIN sale_items i ON s.id = i.sale_id WHERE 1=1`;
    const params = [];
    if (start_date) { sql += ' AND date(s.created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(s.created_at) <= date(?)'; params.push(end_date); }
    sql += ' ORDER BY s.created_at DESC';

    const rows = await query(sql, params);
    let csv = 'Receipt,Date,Cashier,Customer,Payment,Product,Dosage,Qty,Unit Price,Cost,Item Total,Subtotal,Discount,Grand Total,Cost Total,Gross Profit\n';
    rows.forEach(r => {
      csv += `"${r.receipt_number}","${r.created_at}","${r.cashier_name}","${r.customer_name}","${r.payment_method}","${r.trade_name}","${r.dosage}",${r.quantity},${r.unit_price},${r.cost_price},${r.total_price},${r.subtotal},${r.discount},${r.total_amount},${r.cost_total},${r.gross_profit}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export sales.' });
  }
});

// Legacy export route for compatibility
router.get('/export', verifyToken, requireAdmin, async (req, res) => {
  res.redirect('/api/sales/export/csv');
});

export default router;
