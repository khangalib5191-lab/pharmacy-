import express from 'express';
import { query, get, run, db } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/sales (Process POS Cart Checkout & Deduct Inventory Stock)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { items, customer_name, discount = 0, payment_method = 'Cash' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sale cart cannot be empty.' });
    }

    // 1. Validate Stock Availability for all items before initiating transaction
    for (const item of items) {
      const med = await get('SELECT trade_name, stock_quantity FROM medicines WHERE id = ?', [item.id]);
      if (!med) {
        return res.status(404).json({ success: false, message: `Medicine item ID ${item.id} not found.` });
      }
      if (med.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for [${med.trade_name}]. Requested: ${item.quantity}, Available: ${med.stock_quantity}`
        });
      }
    }

    // 2. Compute Totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.selling_price * item.quantity;
    }

    const totalDiscount = parseFloat(discount || 0);
    const total_amount = Math.max(0, subtotal - totalDiscount);
    const receipt_number = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Save Sale Record
    const saleResult = await run(
      `INSERT INTO sales (receipt_number, cashier_id, cashier_name, customer_name, subtotal, discount, total_amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receipt_number,
        req.user.id,
        req.user.name,
        customer_name ? customer_name.trim() : 'Walk-in Customer',
        subtotal,
        totalDiscount,
        total_amount,
        payment_method
      ]
    );

    const sale_id = saleResult.id;

    // 4. Save Sale Items & Deduct Stock Quantity
    const processedItems = [];
    for (const item of items) {
      const itemTotalPrice = item.selling_price * item.quantity;

      await run(
        `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sale_id, item.id, item.trade_name, item.dosage, item.quantity, item.selling_price, itemTotalPrice]
      );

      // Deduct stock from medicines database
      await run(
        `UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE id = ?`,
        [item.quantity, item.id]
      );

      processedItems.push({
        trade_name: item.trade_name,
        dosage: item.dosage,
        quantity: item.quantity,
        unit_price: item.selling_price,
        total_price: itemTotalPrice
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Sale completed successfully! Stock updated.',
      receipt: {
        id: sale_id,
        receipt_number,
        cashier_name: req.user.name,
        customer_name: customer_name || 'Walk-in Customer',
        date: new Date().toISOString(),
        subtotal,
        discount: totalDiscount,
        total_amount,
        payment_method,
        items: processedItems
      }
    });
  } catch (error) {
    console.error('Checkout Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process sale checkout transaction.' });
  }
});

// GET /api/sales (Audit Trail & Sales Log History)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, cashier_id } = req.query;

    let sql = 'SELECT * FROM sales WHERE 1=1';
    const params = [];

    if (start_date) {
      sql += ' AND date(created_at) >= date(?)';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND date(created_at) <= date(?)';
      params.push(end_date);
    }
    if (cashier_id) {
      sql += ' AND cashier_id = ?';
      params.push(cashier_id);
    }

    sql += ' ORDER BY created_at DESC';

    const sales = await query(sql, params);

    // Fetch items for each sale
    for (const sale of sales) {
      const items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
      sale.items = items;
    }

    return res.json({ success: true, sales });
  } catch (error) {
    console.error('Error fetching sales history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sales log.' });
  }
});

// GET /api/sales/export (CSV Report Export)
router.get('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const sales = await query(`
      SELECT s.receipt_number, s.created_at, s.cashier_name, s.customer_name, s.payment_method,
             s.subtotal, s.discount, s.total_amount,
             i.trade_name, i.dosage, i.quantity, i.unit_price, i.total_price
      FROM sales s
      JOIN sale_items i ON s.id = i.sale_id
      ORDER BY s.created_at DESC
    `);

    let csvContent = 'Receipt Number,Date & Time,Cashier,Customer,Payment Method,Medicine Name,Dosage,Qty Sold,Unit Price,Item Total,Bill Subtotal,Bill Discount,Bill Grand Total\n';

    sales.forEach(row => {
      csvContent += `"${row.receipt_number}","${row.created_at}","${row.cashier_name}","${row.customer_name}","${row.payment_method}","${row.trade_name}","${row.dosage}",${row.quantity},${row.unit_price},${row.total_price},${row.subtotal},${row.discount},${row.total_amount}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=pharmacy_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csvContent);
  } catch (error) {
    console.error('CSV Export Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate CSV sales report.' });
  }
});

export default router;
