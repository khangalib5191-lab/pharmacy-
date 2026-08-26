import express from 'express';
import { query, get, run } from '../db/database.js';
import { verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// Generate next product code
async function generateProductCode() {
  const row = await get(`SELECT product_code FROM medicines WHERE product_code IS NOT NULL ORDER BY id DESC LIMIT 1`);
  if (!row || !row.product_code) return 'MED-000001';
  const num = parseInt(row.product_code.replace('MED-', '')) + 1;
  return `MED-${String(num).padStart(6, '0')}`;
}

// GET /api/medicines — search & filter
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, form, category, stock_status, status } = req.query;
    let sql = `SELECT m.*, 
      (SELECT GROUP_CONCAT(pb.barcode, ',') FROM product_barcodes pb WHERE pb.medicine_id = m.id) as alt_barcodes
      FROM medicines m WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (m.trade_name LIKE ? OR m.generic_name LIKE ? OR m.manufacturer LIKE ? OR m.barcode LIKE ? OR m.product_code LIKE ? OR m.brand LIKE ?)`;
      params.push(q, q, q, q, q, q);
    }
    if (form && form !== 'ALL') { sql += ' AND m.form = ?'; params.push(form); }
    if (category && category !== 'ALL') { sql += ' AND m.category = ?'; params.push(category); }
    if (status && status !== 'ALL') { sql += ' AND m.status = ?'; params.push(status); }
    if (stock_status === 'LOW') sql += ' AND m.stock_quantity > 0 AND m.stock_quantity <= m.min_stock_alert';
    else if (stock_status === 'OUT') sql += ' AND m.stock_quantity = 0';
    else if (stock_status === 'EXPIRING') sql += ` AND date(m.expiry_date) <= date('now', '+90 days') AND date(m.expiry_date) >= date('now')`;
    else if (stock_status === 'EXPIRED') sql += ` AND date(m.expiry_date) < date('now')`;

    sql += ' ORDER BY m.trade_name ASC';

    const medicines = await query(sql, params);
    const formatted = medicines.map(med => ({
      ...med,
      stock_status: med.stock_quantity === 0 ? 'OUT_OF_STOCK' : med.stock_quantity <= med.min_stock_alert ? 'LOW_STOCK' : 'IN_STOCK',
      is_expired: med.expiry_date && new Date(med.expiry_date) < new Date(),
      is_expiring_soon: med.expiry_date && new Date(med.expiry_date) <= new Date(Date.now() + 90 * 86400000) && new Date(med.expiry_date) >= new Date(),
    }));

    return res.json({ success: true, medicines: formatted });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve medicines.' });
  }
});

// GET /api/medicines/barcode/:barcode — barcode lookup (primary + alternate)
router.get('/barcode/:barcode', verifyToken, async (req, res) => {
  try {
    const { barcode } = req.params;
    // Check primary barcode
    let medicine = await get(`SELECT * FROM medicines WHERE barcode = ?`, [barcode.trim()]);
    // Check alternate barcodes
    if (!medicine) {
      const altRow = await get(`SELECT medicine_id FROM product_barcodes WHERE barcode = ?`, [barcode.trim()]);
      if (altRow) medicine = await get(`SELECT * FROM medicines WHERE id = ?`, [altRow.medicine_id]);
    }
    if (!medicine) return res.status(404).json({ success: false, message: `No product found with barcode [${barcode}].` });
    if (medicine.status === 'blocked') return res.status(400).json({ success: false, message: `Product "${medicine.trade_name}" is blocked and cannot be sold.` });
    return res.json({ success: true, medicine: { ...medicine, stock_status: medicine.stock_quantity === 0 ? 'OUT_OF_STOCK' : 'IN_STOCK' } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error looking up barcode.' });
  }
});

// GET /api/medicines/code/:code — product code lookup
router.get('/code/:code', verifyToken, async (req, res) => {
  try {
    const medicine = await get(`SELECT * FROM medicines WHERE product_code = ?`, [req.params.code.trim()]);
    if (!medicine) return res.status(404).json({ success: false, message: `No product found with code [${req.params.code}].` });
    if (medicine.status === 'blocked') return res.status(400).json({ success: false, message: `Product "${medicine.trade_name}" is blocked.` });
    return res.json({ success: true, medicine });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error looking up product code.' });
  }
});

// GET /api/medicines/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const medicine = await get(`SELECT * FROM medicines WHERE id = ?`, [req.params.id]);
    if (!medicine) return res.status(404).json({ success: false, message: 'Product not found.' });
    const altBarcodes = await query(`SELECT * FROM product_barcodes WHERE medicine_id = ?`, [req.params.id]);
    const batches = await query(`SELECT * FROM batches WHERE medicine_id = ? ORDER BY expiry_date ASC`, [req.params.id]);
    return res.json({ success: true, medicine, alt_barcodes: altBarcodes, batches });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
});

// POST /api/medicines — create product
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      trade_name, generic_name, brand, dosage, strength, form, pack_size, unit,
      manufacturer, category, barcode, cost_price, selling_price, wholesale_price,
      min_selling_price, tax_percent, stock_quantity, min_stock_alert,
      batch_number, expiry_date, mfg_date, rack_location, supplier_id,
      status, prescription_required, storage_notes, product_notes
    } = req.body;

    if (!trade_name) return res.status(400).json({ success: false, message: 'Product name is required.' });
    if (cost_price === undefined || selling_price === undefined) return res.status(400).json({ success: false, message: 'Cost and selling price are required.' });

    // Check barcode uniqueness if provided
    if (barcode && barcode.trim()) {
      const bc = await get(`SELECT id FROM medicines WHERE barcode = ?`, [barcode.trim()]);
      if (bc) return res.status(400).json({ success: false, message: `Barcode [${barcode}] already exists.` });
    }

    const product_code = await generateProductCode();

    const result = await run(
      `INSERT INTO medicines (product_code, trade_name, generic_name, brand, dosage, strength, form, pack_size, unit, manufacturer, category, barcode, cost_price, selling_price, wholesale_price, min_selling_price, tax_percent, stock_quantity, min_stock_alert, batch_number, expiry_date, mfg_date, rack_location, supplier_id, status, prescription_required, storage_notes, product_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [product_code, trade_name.trim(), generic_name || null, brand || null, dosage || null, strength || null,
       form || null, pack_size || null, unit || 'Pcs', manufacturer || null, category || null,
       barcode && barcode.trim() ? barcode.trim() : null,
       parseFloat(cost_price), parseFloat(selling_price), parseFloat(wholesale_price || 0),
       parseFloat(min_selling_price || 0), parseFloat(tax_percent || 0),
       parseInt(stock_quantity || 0), parseInt(min_stock_alert || 20),
       batch_number || null, expiry_date || null, mfg_date || null,
       rack_location || null, supplier_id || null, status || 'active',
       prescription_required ? 1 : 0, storage_notes || null, product_notes || null]
    );

    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CREATE_PRODUCT', entityType: 'medicine', entityId: result.id, description: `Created product: ${trade_name} (${product_code})`, req });
    return res.status(201).json({ success: true, message: 'Product created.', medicineId: result.id, product_code });
  } catch (error) {
    console.error('Error adding medicine:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// PUT /api/medicines/:id — update product
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await get(`SELECT * FROM medicines WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found.' });

    const {
      trade_name, generic_name, brand, dosage, strength, form, pack_size, unit,
      manufacturer, category, barcode, cost_price, selling_price, wholesale_price,
      min_selling_price, tax_percent, stock_quantity, min_stock_alert,
      batch_number, expiry_date, mfg_date, rack_location, supplier_id,
      status, prescription_required, storage_notes, product_notes
    } = req.body;

    // Barcode uniqueness check (excluding self)
    if (barcode && barcode.trim()) {
      const bc = await get(`SELECT id FROM medicines WHERE barcode = ? AND id != ?`, [barcode.trim(), id]);
      if (bc) return res.status(400).json({ success: false, message: `Barcode [${barcode}] already assigned to another product.` });
    }

    await run(
      `UPDATE medicines SET
        trade_name=?, generic_name=?, brand=?, dosage=?, strength=?, form=?, pack_size=?, unit=?,
        manufacturer=?, category=?, barcode=?, cost_price=?, selling_price=?, wholesale_price=?,
        min_selling_price=?, tax_percent=?, stock_quantity=?, min_stock_alert=?,
        batch_number=?, expiry_date=?, mfg_date=?, rack_location=?, supplier_id=?,
        status=?, prescription_required=?, storage_notes=?, product_notes=?,
        updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [trade_name, generic_name || null, brand || null, dosage || null, strength || null,
       form || null, pack_size || null, unit || 'Pcs', manufacturer || null, category || null,
       barcode && barcode.trim() ? barcode.trim() : null,
       parseFloat(cost_price), parseFloat(selling_price), parseFloat(wholesale_price || 0),
       parseFloat(min_selling_price || 0), parseFloat(tax_percent || 0),
       parseInt(stock_quantity), parseInt(min_stock_alert || 20),
       batch_number || null, expiry_date || null, mfg_date || null,
       rack_location || null, supplier_id || null, status || 'active',
       prescription_required ? 1 : 0, storage_notes || null, product_notes || null, id]
    );

    await logAudit({ userId: req.user.id, username: req.user.username, action: 'UPDATE_PRODUCT', entityType: 'medicine', entityId: id, description: `Updated product ID ${id}`, beforeValue: { cost_price: existing.cost_price, selling_price: existing.selling_price }, afterValue: { cost_price, selling_price }, req });
    return res.json({ success: true, message: 'Product updated successfully.' });
  } catch (error) {
    console.error('Error updating medicine:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE /api/medicines/:id — soft delete (set inactive)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const med = await get(`SELECT trade_name FROM medicines WHERE id = ?`, [id]);
    if (!med) return res.status(404).json({ success: false, message: 'Product not found.' });
    await run(`UPDATE medicines SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'DELETE_PRODUCT', entityType: 'medicine', entityId: id, description: `Deactivated product: ${med.trade_name}`, req });
    return res.json({ success: true, message: 'Product deactivated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to deactivate product.' });
  }
});

// POST /api/medicines/:id/barcodes — add alternate barcode
router.post('/:id/barcodes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { barcode, barcode_type } = req.body;
    if (!barcode || !barcode.trim()) return res.status(400).json({ success: false, message: 'Barcode is required.' });
    // Check uniqueness
    const existing = await get(`SELECT id FROM product_barcodes WHERE barcode = ?`, [barcode.trim()]);
    if (existing) return res.status(400).json({ success: false, message: 'This barcode already exists.' });
    const mainExists = await get(`SELECT id FROM medicines WHERE barcode = ?`, [barcode.trim()]);
    if (mainExists) return res.status(400).json({ success: false, message: 'This barcode is assigned to another product as its primary barcode.' });
    await run(`INSERT INTO product_barcodes (medicine_id, barcode, barcode_type) VALUES (?, ?, ?)`, [req.params.id, barcode.trim(), barcode_type || 'EAN13']);
    return res.json({ success: true, message: 'Alternate barcode added.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add barcode.' });
  }
});

// DELETE /api/medicines/barcodes/:barcodeId
router.delete('/barcodes/:barcodeId', verifyToken, requireAdmin, async (req, res) => {
  try {
    await run(`DELETE FROM product_barcodes WHERE id = ?`, [req.params.barcodeId]);
    return res.json({ success: true, message: 'Barcode removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove barcode.' });
  }
});

// GET /api/medicines/export — CSV export
router.get('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const medicines = await query(`SELECT * FROM medicines ORDER BY trade_name ASC`);
    let csv = 'Product Code,Trade Name,Generic Name,Brand,Dosage,Form,Manufacturer,Category,Barcode,Cost Price,Selling Price,Stock,Min Stock,Batch,Expiry,Rack,Status\n';
    medicines.forEach(m => {
      csv += `"${m.product_code || ''}","${m.trade_name}","${m.generic_name || ''}","${m.brand || ''}","${m.dosage || ''}","${m.form || ''}","${m.manufacturer || ''}","${m.category || ''}","${m.barcode || ''}",${m.cost_price},${m.selling_price},${m.stock_quantity},${m.min_stock_alert},"${m.batch_number || ''}","${m.expiry_date || ''}","${m.rack_location || ''}","${m.status}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products_${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export products.' });
  }
});

export default router;
