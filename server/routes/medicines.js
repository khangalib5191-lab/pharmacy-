import express from 'express';
import { query, get, run } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/medicines (Search & Filter Medicines)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, form, stock_status } = req.query;

    let sql = 'SELECT * FROM medicines WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      sql += ` AND (trade_name LIKE ? OR generic_name LIKE ? OR manufacturer LIKE ? OR barcode LIKE ? OR dosage LIKE ? OR rack_location LIKE ?)`;
      params.push(q, q, q, q, q, q);
    }

    if (form && form !== 'ALL') {
      sql += ' AND form = ?';
      params.push(form);
    }

    if (stock_status === 'LOW') {
      sql += ' AND stock_quantity > 0 AND stock_quantity <= min_stock_alert';
    } else if (stock_status === 'OUT') {
      sql += ' AND stock_quantity = 0';
    }

    sql += ' ORDER BY trade_name ASC';

    const medicines = await query(sql, params);

    // Attach color status badge tag to each medicine
    const formattedMedicines = medicines.map(med => ({
      ...med,
      stock_status: med.stock_quantity === 0 ? 'OUT_OF_STOCK' : med.stock_quantity <= med.min_stock_alert ? 'LOW_STOCK' : 'IN_STOCK',
      status_color: med.stock_quantity === 0 ? 'red' : med.stock_quantity <= med.min_stock_alert ? 'yellow' : 'green'
    }));

    return res.json({ success: true, medicines: formattedMedicines });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve medicine inventory.' });
  }
});

// GET /api/medicines/barcode/:barcode (Instant Scanner Lookup)
router.get('/barcode/:barcode', verifyToken, async (req, res) => {
  try {
    const { barcode } = req.params;
    const medicine = await get('SELECT * FROM medicines WHERE barcode = ?', [barcode.trim()]);

    if (!medicine) {
      return res.status(404).json({ success: false, message: `No medicine registered with barcode [${barcode}].` });
    }

    return res.json({
      success: true,
      medicine: {
        ...medicine,
        stock_status: medicine.stock_quantity === 0 ? 'OUT_OF_STOCK' : medicine.stock_quantity <= medicine.min_stock_alert ? 'LOW_STOCK' : 'IN_STOCK',
        status_color: medicine.stock_quantity === 0 ? 'red' : medicine.stock_quantity <= medicine.min_stock_alert ? 'yellow' : 'green'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error scanning barcode.' });
  }
});

// POST /api/medicines (Admin Only: Add New Medicine Batch)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      trade_name,
      generic_name,
      dosage,
      form,
      manufacturer,
      barcode,
      cost_price,
      selling_price,
      stock_quantity,
      min_stock_alert,
      batch_number,
      expiry_date,
      rack_location,
    } = req.body;

    if (!trade_name || !generic_name || !dosage || !form || !barcode || cost_price === undefined || selling_price === undefined) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    // Check for duplicate barcode
    const existing = await get('SELECT id FROM medicines WHERE barcode = ?', [barcode.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Barcode [${barcode}] already exists in database.` });
    }

    const result = await run(
      `INSERT INTO medicines (trade_name, generic_name, dosage, form, manufacturer, barcode, cost_price, selling_price, stock_quantity, min_stock_alert, batch_number, expiry_date, rack_location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trade_name.trim(),
        generic_name.trim(),
        dosage.trim(),
        form.trim(),
        manufacturer ? manufacturer.trim() : 'Generic',
        barcode.trim(),
        parseFloat(cost_price),
        parseFloat(selling_price),
        parseInt(stock_quantity || 0),
        parseInt(min_stock_alert || 20),
        batch_number ? batch_number.trim() : 'BATCH-01',
        expiry_date,
        rack_location ? rack_location.trim() : 'Unassigned',
      ]
    );

    return res.status(201).json({ success: true, message: 'New medicine added to stock inventory.', medicineId: result.id });
  } catch (error) {
    console.error('Error adding medicine:', error);
    return res.status(500).json({ success: false, message: 'Failed to create medicine entry.' });
  }
});

// PUT /api/medicines/:id (Admin Only: Edit Medicine / Restock Inventory)
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      trade_name,
      generic_name,
      dosage,
      form,
      manufacturer,
      barcode,
      cost_price,
      selling_price,
      stock_quantity,
      min_stock_alert,
      batch_number,
      expiry_date,
      rack_location,
    } = req.body;

    const existing = await get('SELECT id FROM medicines WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine entry not found.' });
    }

    await run(
      `UPDATE medicines SET
        trade_name = ?,
        generic_name = ?,
        dosage = ?,
        form = ?,
        manufacturer = ?,
        barcode = ?,
        cost_price = ?,
        selling_price = ?,
        stock_quantity = ?,
        min_stock_alert = ?,
        batch_number = ?,
        expiry_date = ?,
        rack_location = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        trade_name,
        generic_name,
        dosage,
        form,
        manufacturer,
        barcode,
        parseFloat(cost_price),
        parseFloat(selling_price),
        parseInt(stock_quantity),
        parseInt(min_stock_alert),
        batch_number,
        expiry_date,
        rack_location,
        id,
      ]
    );

    return res.json({ success: true, message: 'Medicine inventory updated successfully.' });
  } catch (error) {
    console.error('Error updating medicine:', error);
    return res.status(500).json({ success: false, message: 'Failed to update medicine inventory.' });
  }
});

// DELETE /api/medicines/:id (Admin Only: Remove Medicine Item)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await run('DELETE FROM medicines WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Medicine deleted from system database.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete medicine item.' });
  }
});

export default router;
