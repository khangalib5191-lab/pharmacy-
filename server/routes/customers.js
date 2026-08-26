import express from 'express';
import { query, get, run, transaction } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// GET /api/customers
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `SELECT c.*, 
      COALESCE((SELECT SUM(s.total_amount) FROM sales s WHERE s.customer_id = c.id AND s.sale_status != 'cancelled'), 0) as total_sales,
      COALESCE((SELECT SUM(sr.total_amount) FROM sales_returns sr WHERE sr.customer_id = c.id AND sr.status = 'confirmed'), 0) as total_returns,
      COALESCE((SELECT SUM(cl.credit - cl.debit) FROM customer_ledger cl WHERE cl.customer_id = c.id), 0) + c.opening_balance as balance
      FROM customers c WHERE 1=1`;
    const params = [];
    if (search && search.trim()) {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }
    if (status && status !== 'ALL') { sql += ' AND c.status = ?'; params.push(status); }
    sql += ' ORDER BY c.name ASC';
    const customers = await query(sql, params);
    return res.json({ success: true, customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
});

// GET /api/customers/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const customer = await get(`SELECT * FROM customers WHERE id = ?`, [req.params.id]);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });
    const sales = await query(`SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20`, [req.params.id]);
    const returns = await query(`SELECT * FROM sales_returns WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20`, [req.params.id]);
    const ledger = await query(`SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`, [req.params.id]);
    return res.json({ success: true, customer, sales, returns, ledger });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer details.' });
  }
});

// POST /api/customers
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, phone, email, address, tax_number, opening_balance, credit_limit, payment_terms, status, notes } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Customer name is required.' });
    
    const result = await run(
      `INSERT INTO customers (name, phone, email, address, tax_number, opening_balance, credit_limit, payment_terms, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), phone?.trim() || null, email?.trim() || null, address?.trim() || null, tax_number?.trim() || null,
       parseFloat(opening_balance || 0), parseFloat(credit_limit || 0), payment_terms || 'Net 30', status || 'active', notes?.trim() || null]
    );

    // Record opening balance in ledger if greater than 0
    if (parseFloat(opening_balance || 0) > 0) {
      await run(
        `INSERT INTO customer_ledger (customer_id, transaction_type, debit, balance, notes, created_by) VALUES (?, 'opening_balance', ?, ?, 'Opening Credit Balance', ?)`,
        [result.id, parseFloat(opening_balance), parseFloat(opening_balance), req.user?.id || 1]
      );
    }
    
    await logAudit({ userId: req.user?.id || 1, username: req.user?.username || 'Staff', action: 'CREATE_CUSTOMER', entityType: 'customer', entityId: result.id, description: `Created customer ${name}`, req });
    return res.status(201).json({ success: true, message: 'Customer created successfully.', customerId: result.id, customer: { id: result.id, name: name.trim(), phone: phone?.trim(), credit_limit: parseFloat(credit_limit || 0), balance: parseFloat(opening_balance || 0) } });
  } catch (err) {
    console.error('Customer Creation Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create customer profile: ' + (err.message || 'Database error') });
  }
});

// PUT /api/customers/:id
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, tax_number, credit_limit, payment_terms, status, notes } = req.body;
    await run(
      `UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, tax_number = ?, credit_limit = ?, payment_terms = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, phone, email, address, tax_number, parseFloat(credit_limit || 0), payment_terms, status, notes, id]
    );
    return res.json({ success: true, message: 'Customer updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
});

// POST /api/customers/:id/payment — record receipt from customer
router.post('/:id/payment', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { amount, notes, reference } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ success: false, message: 'Valid amount required.' });
    const last = await get(`SELECT balance FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 1`, [req.params.id]);
    const prevBal = last ? last.balance : 0;
    const newBal = prevBal - parseFloat(amount);
    await run(
      `INSERT INTO customer_ledger (customer_id, transaction_type, debit, balance, reference_number, notes, created_by) VALUES (?, 'payment', ?, ?, ?, ?, ?)`,
      [req.params.id, parseFloat(amount), newBal, reference || null, notes || 'Customer payment', req.user.id]
    );
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CUSTOMER_PAYMENT', entityType: 'customer', entityId: req.params.id, description: `Payment of ${amount} recorded`, req });
    return res.json({ success: true, message: 'Payment recorded.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

export default router;
