import express from 'express';
import { query, get, run } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// GET /api/suppliers
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `SELECT s.*,
      COALESCE((SELECT SUM(p.total_amount) FROM purchases p WHERE p.supplier_id = s.id AND p.status = 'confirmed'), 0) as total_purchases,
      COALESCE((SELECT SUM(pr.total_amount) FROM purchase_returns pr WHERE pr.supplier_id = s.id AND pr.status = 'confirmed'), 0) as total_returns,
      COALESCE((SELECT SUM(sl.credit - sl.debit) FROM supplier_ledger sl WHERE sl.supplier_id = s.id), 0) + s.opening_balance as balance
      FROM suppliers s WHERE 1=1`;
    const params = [];
    if (search && search.trim()) {
      sql += ` AND (s.name LIKE ? OR s.company LIKE ? OR s.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status && status !== 'ALL') { sql += ' AND s.status = ?'; params.push(status); }
    sql += ' ORDER BY s.name ASC';
    const suppliers = await query(sql, params);
    return res.json({ success: true, suppliers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch suppliers.' });
  }
});

// GET /api/suppliers/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const supplier = await get(`SELECT * FROM suppliers WHERE id = ?`, [req.params.id]);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    const purchases = await query(`SELECT * FROM purchases WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 20`, [req.params.id]);
    const returns = await query(`SELECT * FROM purchase_returns WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 20`, [req.params.id]);
    const ledger = await query(`SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 50`, [req.params.id]);
    return res.json({ success: true, supplier, purchases, returns, ledger });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch supplier.' });
  }
});

// POST /api/suppliers
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, company, phone, email, address, tax_number, opening_balance, payment_terms, credit_limit, status, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    const result = await run(
      `INSERT INTO suppliers (name, company, phone, email, address, tax_number, opening_balance, payment_terms, credit_limit, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), company || null, phone || null, email || null, address || null, tax_number || null,
       parseFloat(opening_balance || 0), payment_terms || 'Net 30', parseFloat(credit_limit || 0), status || 'active', notes || null]
    );
    // Record opening balance in ledger
    if (parseFloat(opening_balance || 0) > 0) {
      await run(
        `INSERT INTO supplier_ledger (supplier_id, transaction_type, credit, balance, notes, created_by) VALUES (?, 'opening_balance', ?, ?, 'Opening Balance', ?)`,
        [result.id, parseFloat(opening_balance), parseFloat(opening_balance), req.user.id]
      );
    }
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CREATE_SUPPLIER', entityType: 'supplier', entityId: result.id, description: `Created supplier: ${name}`, req });
    return res.status(201).json({ success: true, message: 'Supplier created.', supplierId: result.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to create supplier.' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, phone, email, address, tax_number, payment_terms, credit_limit, status, notes } = req.body;
    await run(
      `UPDATE suppliers SET name=?, company=?, phone=?, email=?, address=?, tax_number=?, payment_terms=?, credit_limit=?, status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [name, company || null, phone || null, email || null, address || null, tax_number || null, payment_terms || 'Net 30', parseFloat(credit_limit || 0), status || 'active', notes || null, id]
    );
    return res.json({ success: true, message: 'Supplier updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update supplier.' });
  }
});

// GET /api/suppliers/:id/ledger
router.get('/:id/ledger', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `SELECT * FROM supplier_ledger WHERE supplier_id = ?`;
    const params = [req.params.id];
    if (start_date) { sql += ' AND date(created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(created_at) <= date(?)'; params.push(end_date); }
    sql += ' ORDER BY created_at ASC';
    const ledger = await query(sql, params);
    const supplier = await get(`SELECT name, opening_balance FROM suppliers WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, ledger, supplier });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch ledger.' });
  }
});

// POST /api/suppliers/:id/payment
router.post('/:id/payment', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { amount, notes, reference } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ success: false, message: 'Valid amount required.' });
    const lastEntry = await get(`SELECT balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT 1`, [req.params.id]);
    const prevBal = lastEntry ? lastEntry.balance : 0;
    const newBalance = prevBal - parseFloat(amount);
    await run(
      `INSERT INTO supplier_ledger (supplier_id, transaction_type, debit, balance, reference_number, notes, created_by) VALUES (?, 'payment', ?, ?, ?, ?, ?)`,
      [req.params.id, parseFloat(amount), newBalance, reference || null, notes || 'Supplier Payment', req.user.id]
    );
    return res.json({ success: true, message: 'Payment recorded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

export default router;
