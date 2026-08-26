import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../pharmacy.db');
const sqlite = sqlite3.verbose();

export const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✅ SQLite Database connected at:', dbPath);
  }
});

// Enable WAL mode for better concurrent performance
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

// ─── Helper wrappers ────────────────────────────────────────────────────────

export function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Run inside a serialized transaction
export function transaction(fn) {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await run('BEGIN TRANSACTION');
        const result = await fn();
        await run('COMMIT');
        resolve(result);
      } catch (err) {
        await run('ROLLBACK').catch(() => {});
        reject(err);
      }
    });
  });
}

// Check if a column exists in a table
async function columnExists(table, column) {
  const cols = await query(`PRAGMA table_info(${table})`);
  return cols.some(c => c.name === column);
}

// Check if a table exists
async function tableExists(tableName) {
  const row = await get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
  return !!row;
}

// ─── Main init ──────────────────────────────────────────────────────────────

export async function initDatabase() {
  try {
    // ── 1. Settings ────────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 2. Categories ──────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 3. Suppliers ───────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        tax_number TEXT,
        opening_balance REAL DEFAULT 0,
        payment_terms TEXT DEFAULT 'Net 30',
        credit_limit REAL DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 4. Customers ───────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        customer_code TEXT UNIQUE,
        customer_type TEXT DEFAULT 'cash' CHECK(customer_type IN ('cash','registered','credit')),
        credit_limit REAL DEFAULT 0,
        opening_balance REAL DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 5. Medicines (product master) ──────────────────────────────────────
    // SQLite cannot ALTER COLUMN; migrate if barcode is still NOT NULL
    const medicinesExists = await tableExists('medicines');
    if (medicinesExists) {
      const medInfo = await query('PRAGMA table_info(medicines)');
      const barcodeCol = medInfo.find(c => c.name === 'barcode');
      // If barcode is NOT NULL we need to migrate
      if (barcodeCol && barcodeCol.notnull === 1) {
        console.log('🔄 Migrating medicines table to allow nullable barcode...');
        await run(`ALTER TABLE medicines RENAME TO medicines_old`);
        await run(`
          CREATE TABLE medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_code TEXT UNIQUE,
            trade_name TEXT NOT NULL,
            generic_name TEXT,
            brand TEXT,
            dosage TEXT,
            strength TEXT,
            form TEXT,
            pack_size TEXT,
            unit TEXT DEFAULT 'Pcs',
            manufacturer TEXT,
            category TEXT,
            barcode TEXT UNIQUE,
            cost_price REAL NOT NULL DEFAULT 0,
            selling_price REAL NOT NULL DEFAULT 0,
            wholesale_price REAL DEFAULT 0,
            min_selling_price REAL DEFAULT 0,
            tax_percent REAL DEFAULT 0,
            stock_quantity INTEGER NOT NULL DEFAULT 0,
            min_stock_alert INTEGER NOT NULL DEFAULT 20,
            batch_number TEXT,
            expiry_date DATE,
            mfg_date DATE,
            rack_location TEXT,
            supplier_id INTEGER REFERENCES suppliers(id),
            status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','discontinued','blocked')),
            prescription_required INTEGER DEFAULT 0,
            storage_notes TEXT,
            product_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        // Copy existing data
        await run(`
          INSERT INTO medicines (
            id, trade_name, generic_name, dosage, form, manufacturer, barcode,
            cost_price, selling_price, stock_quantity, min_stock_alert,
            batch_number, expiry_date, rack_location, created_at, updated_at
          )
          SELECT
            id, trade_name, generic_name, dosage, form, manufacturer, barcode,
            cost_price, selling_price, stock_quantity, min_stock_alert,
            batch_number, expiry_date, rack_location, created_at, updated_at
          FROM medicines_old
        `);
        await run(`DROP TABLE medicines_old`);
        console.log('✅ Medicines migration complete');
      } else {
        // Table exists and barcode is already nullable — add any missing columns
        const cols = medInfo.map(c => c.name);
        const addIfMissing = async (col, def) => {
          if (!cols.includes(col)) await run(`ALTER TABLE medicines ADD COLUMN ${col} ${def}`);
        };
        await addIfMissing('product_code', 'TEXT UNIQUE');
        await addIfMissing('brand', 'TEXT');
        await addIfMissing('strength', 'TEXT');
        await addIfMissing('pack_size', 'TEXT');
        await addIfMissing('unit', "TEXT DEFAULT 'Pcs'");
        await addIfMissing('category', 'TEXT');
        await addIfMissing('wholesale_price', 'REAL DEFAULT 0');
        await addIfMissing('min_selling_price', 'REAL DEFAULT 0');
        await addIfMissing('tax_percent', 'REAL DEFAULT 0');
        await addIfMissing('mfg_date', 'DATE');
        await addIfMissing('supplier_id', 'INTEGER REFERENCES suppliers(id)');
        await addIfMissing('status', "TEXT DEFAULT 'active'");
        await addIfMissing('prescription_required', 'INTEGER DEFAULT 0');
        await addIfMissing('storage_notes', 'TEXT');
        await addIfMissing('product_notes', 'TEXT');
        await addIfMissing('generic_name', 'TEXT');
      }
    } else {
      await run(`
        CREATE TABLE medicines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_code TEXT UNIQUE,
          trade_name TEXT NOT NULL,
          generic_name TEXT,
          brand TEXT,
          dosage TEXT,
          strength TEXT,
          form TEXT,
          pack_size TEXT,
          unit TEXT DEFAULT 'Pcs',
          manufacturer TEXT,
          category TEXT,
          barcode TEXT UNIQUE,
          cost_price REAL NOT NULL DEFAULT 0,
          selling_price REAL NOT NULL DEFAULT 0,
          wholesale_price REAL DEFAULT 0,
          min_selling_price REAL DEFAULT 0,
          tax_percent REAL DEFAULT 0,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          min_stock_alert INTEGER NOT NULL DEFAULT 20,
          batch_number TEXT,
          expiry_date DATE,
          mfg_date DATE,
          rack_location TEXT,
          supplier_id INTEGER REFERENCES suppliers(id),
          status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','discontinued','blocked')),
          prescription_required INTEGER DEFAULT 0,
          storage_notes TEXT,
          product_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // ── 6. Product alternate barcodes ──────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS product_barcodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
        barcode TEXT UNIQUE NOT NULL,
        barcode_type TEXT DEFAULT 'EAN13',
        is_primary INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 7. Users ───────────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('ADMIN','CASHIER','EMPLOYEE','PHARMACIST','MANAGER','INVENTORY_MANAGER','PURCHASE_MANAGER','ACCOUNTANT')),
        pin TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
        created_by INTEGER REFERENCES users(id),
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing users: EMPLOYEE → CASHIER role
    await run(`UPDATE users SET role = 'CASHIER' WHERE role = 'EMPLOYEE'`);

    // Add missing columns to users if upgrading
    const userInfo = await query('PRAGMA table_info(users)');
    const userCols = userInfo.map(c => c.name);
    if (!userCols.includes('status')) await run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
    if (!userCols.includes('last_login')) await run(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
    if (!userCols.includes('created_by')) await run(`ALTER TABLE users ADD COLUMN created_by INTEGER`);

    // ── 8. Batches ─────────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        batch_number TEXT NOT NULL,
        expiry_date DATE,
        mfg_date DATE,
        quantity INTEGER NOT NULL DEFAULT 0,
        cost_price REAL NOT NULL DEFAULT 0,
        selling_price REAL DEFAULT 0,
        supplier_id INTEGER REFERENCES suppliers(id),
        purchase_id INTEGER,
        grn_id INTEGER,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','expired','recalled','quarantine')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(medicine_id, batch_number)
      )
    `);

    // ── 9. Purchase Orders ─────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT UNIQUE NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id),
        order_date DATE NOT NULL,
        expected_date DATE,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending','partially_received','received','cancelled')),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        total_amount REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        quantity INTEGER NOT NULL,
        unit_cost REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        received_qty INTEGER DEFAULT 0
      )
    `);

    // ── 10. Goods Receipt Notes ────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grn_number TEXT UNIQUE NOT NULL,
        po_id INTEGER REFERENCES purchase_orders(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_invoice TEXT,
        receipt_date DATE NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','cancelled')),
        notes TEXT,
        total_amount REAL DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        confirmed_by INTEGER REFERENCES users(id),
        confirmed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS goods_receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grn_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        batch_number TEXT,
        expiry_date DATE,
        mfg_date DATE,
        ordered_qty INTEGER DEFAULT 0,
        received_qty INTEGER NOT NULL DEFAULT 0,
        damaged_qty INTEGER DEFAULT 0,
        unit_cost REAL NOT NULL DEFAULT 0,
        selling_price REAL DEFAULT 0,
        total_cost REAL DEFAULT 0
      )
    `);

    // ── 11. Purchases ──────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_number TEXT UNIQUE NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id),
        grn_id INTEGER REFERENCES goods_receipts(id),
        supplier_invoice TEXT,
        purchase_date DATE NOT NULL,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'Cash',
        payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid')),
        notes TEXT,
        status TEXT DEFAULT 'confirmed' CHECK(status IN ('draft','confirmed','cancelled')),
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        batch_id INTEGER REFERENCES batches(id),
        batch_number TEXT,
        expiry_date DATE,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax_percent REAL DEFAULT 0,
        total_cost REAL NOT NULL
      )
    `);

    // ── 12. Purchase Returns (Supplier Returns) ────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT UNIQUE NOT NULL,
        purchase_id INTEGER REFERENCES purchases(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        return_date DATE NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','cancelled')),
        total_amount REAL DEFAULT 0,
        notes TEXT,
        reason TEXT,
        created_by INTEGER REFERENCES users(id),
        confirmed_by INTEGER REFERENCES users(id),
        confirmed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        batch_id INTEGER REFERENCES batches(id),
        batch_number TEXT,
        expiry_date DATE,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        reason TEXT CHECK(reason IN ('damaged','expired','wrong_product','wrong_quantity','supplier_recall','quality_issue','overstock','other'))
      )
    `);

    // ── 13. Sales ──────────────────────────────────────────────────────────
    const salesInfo = await query('PRAGMA table_info(sales)');
    const salesCols = salesInfo.map(c => c.name);
    if (!salesCols.includes('customer_id')) await run(`ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id)`);
    if (!salesCols.includes('tax_amount')) await run(`ALTER TABLE sales ADD COLUMN tax_amount REAL DEFAULT 0`);
    if (!salesCols.includes('cost_total')) await run(`ALTER TABLE sales ADD COLUMN cost_total REAL DEFAULT 0`);
    if (!salesCols.includes('gross_profit')) await run(`ALTER TABLE sales ADD COLUMN gross_profit REAL DEFAULT 0`);
    if (!salesCols.includes('sale_status')) await run(`ALTER TABLE sales ADD COLUMN sale_status TEXT DEFAULT 'completed'`);
    if (!salesCols.includes('shift_id')) await run(`ALTER TABLE sales ADD COLUMN shift_id INTEGER`);
    if (!salesCols.includes('notes')) await run(`ALTER TABLE sales ADD COLUMN notes TEXT`);

    // Ensure sales table exists with full schema
    await run(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT UNIQUE NOT NULL,
        cashier_id INTEGER NOT NULL REFERENCES users(id),
        cashier_name TEXT NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        customer_name TEXT DEFAULT 'Walk-in Customer',
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        cost_total REAL DEFAULT 0,
        gross_profit REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'Cash',
        sale_status TEXT DEFAULT 'completed',
        shift_id INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add cost_price to sale_items
    const siInfo = await query('PRAGMA table_info(sale_items)');
    const siCols = siInfo.map(c => c.name);
    if (!siCols.includes('cost_price')) await run(`ALTER TABLE sale_items ADD COLUMN cost_price REAL DEFAULT 0`);
    if (!siCols.includes('batch_id')) await run(`ALTER TABLE sale_items ADD COLUMN batch_id INTEGER REFERENCES batches(id)`);
    if (!siCols.includes('batch_number')) await run(`ALTER TABLE sale_items ADD COLUMN batch_number TEXT`);
    if (!siCols.includes('discount')) await run(`ALTER TABLE sale_items ADD COLUMN discount REAL DEFAULT 0`);

    await run(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        batch_id INTEGER REFERENCES batches(id),
        batch_number TEXT,
        trade_name TEXT NOT NULL,
        dosage TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total_price REAL NOT NULL
      )
    `);

    // ── 14. Sales Returns ──────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT UNIQUE NOT NULL,
        sale_id INTEGER REFERENCES sales(id),
        customer_id INTEGER REFERENCES customers(id),
        customer_name TEXT,
        return_date DATE NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','confirmed','cancelled')),
        total_amount REAL DEFAULT 0,
        reason TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        confirmed_by INTEGER REFERENCES users(id),
        confirmed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        batch_id INTEGER REFERENCES batches(id),
        batch_number TEXT,
        trade_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        stock_disposition TEXT DEFAULT 'sellable' CHECK(stock_disposition IN ('sellable','quarantine','damaged','expired','return_to_supplier'))
      )
    `);

    // ── 15. Inventory Movements ────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_id INTEGER NOT NULL REFERENCES medicines(id),
        batch_id INTEGER REFERENCES batches(id),
        batch_number TEXT,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('purchase','sale','customer_return','supplier_return','stock_adjustment','damaged','expired','transfer','opening_stock')),
        quantity_in INTEGER DEFAULT 0,
        quantity_out INTEGER DEFAULT 0,
        stock_before INTEGER DEFAULT 0,
        stock_after INTEGER DEFAULT 0,
        reference_type TEXT,
        reference_id INTEGER,
        reference_number TEXT,
        unit_cost REAL DEFAULT 0,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 16. Supplier Ledger ────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS supplier_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase','purchase_return','payment','adjustment','opening_balance')),
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        reference_type TEXT,
        reference_id INTEGER,
        reference_number TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 17. Customer Ledger ────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('sale','sales_return','payment','adjustment','opening_balance')),
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        reference_type TEXT,
        reference_id INTEGER,
        reference_number TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 18. Cashier Shifts ─────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS cashier_shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cashier_id INTEGER NOT NULL REFERENCES users(id),
        cashier_name TEXT NOT NULL,
        opening_cash REAL DEFAULT 0,
        expected_cash REAL DEFAULT 0,
        actual_cash REAL,
        cash_difference REAL,
        total_sales REAL DEFAULT 0,
        total_returns REAL DEFAULT 0,
        total_cash_sales REAL DEFAULT 0,
        total_card_sales REAL DEFAULT 0,
        total_other_sales REAL DEFAULT 0,
        transaction_count INTEGER DEFAULT 0,
        notes TEXT,
        status TEXT DEFAULT 'open' CHECK(status IN ('open','closed')),
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
      )
    `);

    // ── 19. Audit Logs ─────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        username TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        description TEXT,
        before_value TEXT,
        after_value TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── 20. Expenses ───────────────────────────────────────────────────────
    await run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_date DATE NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'Cash',
        shift_id INTEGER REFERENCES cashier_shifts(id),
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Indexes ────────────────────────────────────────────────────────────
    await run(`CREATE INDEX IF NOT EXISTS idx_medicines_barcode ON medicines(barcode)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_medicines_product_code ON medicines(product_code)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_medicines_trade_name ON medicines(trade_name)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_medicines_generic_name ON medicines(generic_name)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_sale_items_medicine ON sale_items(medicine_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_inv_movements_medicine ON inventory_movements(medicine_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_batches_medicine ON batches(medicine_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date)`);

    // ── Seed: Default settings ─────────────────────────────────────────────
    const settingsCount = await get(`SELECT COUNT(*) as c FROM settings`);
    if (settingsCount.c === 0) {
      const defaults = [
        ['pharmacy_name', 'PharmaConnect Pharmacy'],
        ['pharmacy_address', '123 Main Street, City'],
        ['pharmacy_phone', '+92-300-0000000'],
        ['pharmacy_email', 'pharmacy@example.com'],
        ['currency_symbol', 'Rs.'],
        ['currency_code', 'PKR'],
        ['tax_percent', '0'],
        ['low_stock_days', '30'],
        ['expiry_warning_days', '90'],
        ['invoice_prefix', 'REC'],
        ['po_prefix', 'PO'],
        ['grn_prefix', 'GRN'],
        ['pr_prefix', 'PR'],
        ['sr_prefix', 'SR'],
        ['max_cashier_discount', '10'],
        ['fefo_enabled', '1'],
        ['prescription_check', '0'],
      ];
      for (const [key, value] of defaults) {
        await run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
      }
    }

    // ── Seed: Default categories ───────────────────────────────────────────
    const catCount = await get(`SELECT COUNT(*) as c FROM categories`);
    if (catCount.c === 0) {
      const cats = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Inhaler', 'Drops', 'Ointment', 'Powder', 'Solution', 'Suppository', 'Patch', 'Lotion', 'Spray', 'Gel', 'Vitamins', 'Surgical', 'Equipment', 'Other'];
      for (const cat of cats) {
        await run(`INSERT OR IGNORE INTO categories (name) VALUES (?)`, [cat]);
      }
    }

    // ── Seed: Default Users ────────────────────────────────────────────────
    const userCount = await get(`SELECT COUNT(*) as count FROM users`);
    if (userCount.count === 0) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      const cashierPassword = await bcrypt.hash('cashier123', 10);
      await run(
        `INSERT INTO users (username, password, name, role, pin, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin', adminPassword, 'Dr. Sarah Jenkins (Manager)', 'ADMIN', '1234', 'active']
      );
      await run(
        `INSERT INTO users (username, password, name, role, pin, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['cashier', cashierPassword, 'Alex Rivera (Cashier)', 'CASHIER', '5678', 'active']
      );
      console.log('🌱 Seeded default users: admin / admin123 (PIN: 1234), cashier / cashier123 (PIN: 5678)');
    }

    // ── Seed: Sample Medicines (only if empty) ────────────────────────────
    const medCount = await get(`SELECT COUNT(*) as count FROM medicines`);
    if (medCount.count === 0) {
      let skuCounter = 1;
      const genSku = () => `MED-${String(skuCounter++).padStart(6, '0')}`;
      const sampleMedicines = [
        { product_code: genSku(), trade_name: 'Amoxicillin', generic_name: 'Amoxicillin Trihydrate', dosage: '500mg', form: 'Capsule', manufacturer: 'GSK Pharma', category: 'Capsule', barcode: '8901234567890', cost_price: 4.50, selling_price: 7.50, stock_quantity: 120, min_stock_alert: 20, batch_number: 'AMX-2026-A', expiry_date: '2027-11-30', rack_location: 'Rack A-01' },
        { product_code: genSku(), trade_name: 'Panadol Extra', generic_name: 'Paracetamol / Caffeine', dosage: '500mg/65mg', form: 'Tablet', manufacturer: 'Haleon Healthcare', category: 'Tablet', barcode: '8901234567891', cost_price: 1.20, selling_price: 2.50, stock_quantity: 250, min_stock_alert: 30, batch_number: 'PAN-9941', expiry_date: '2028-04-15', rack_location: 'Rack A-02' },
        { product_code: genSku(), trade_name: 'Augmentin', generic_name: 'Amoxicillin / Clavulanate', dosage: '625mg', form: 'Tablet', manufacturer: 'GSK', category: 'Tablet', barcode: '8901234567892', cost_price: 12.00, selling_price: 18.50, stock_quantity: 15, min_stock_alert: 20, batch_number: 'AUG-7721', expiry_date: '2026-10-10', rack_location: 'Rack A-03' },
        { product_code: genSku(), trade_name: 'Brufen', generic_name: 'Ibuprofen', dosage: '400mg', form: 'Tablet', manufacturer: 'Abbott Labs', category: 'Tablet', barcode: '8901234567893', cost_price: 2.00, selling_price: 3.80, stock_quantity: 85, min_stock_alert: 25, batch_number: 'BRF-4412', expiry_date: '2027-08-20', rack_location: 'Rack B-01' },
        { product_code: genSku(), trade_name: 'Ciprobay', generic_name: 'Ciprofloxacin', dosage: '500mg', form: 'Tablet', manufacturer: 'Bayer', category: 'Tablet', barcode: '8901234567894', cost_price: 8.00, selling_price: 13.00, stock_quantity: 42, min_stock_alert: 15, batch_number: 'CIP-1190', expiry_date: '2027-01-15', rack_location: 'Rack B-02' },
        { product_code: genSku(), trade_name: 'Zantac', generic_name: 'Ranitidine', dosage: '150mg', form: 'Tablet', manufacturer: 'Sanofi', category: 'Tablet', barcode: '8901234567895', cost_price: 3.00, selling_price: 5.50, stock_quantity: 5, min_stock_alert: 20, batch_number: 'ZAN-3301', expiry_date: '2026-09-01', rack_location: 'Rack B-03' },
        { product_code: genSku(), trade_name: 'Ventolin Evohaler', generic_name: 'Salbutamol', dosage: '100mcg', form: 'Inhaler', manufacturer: 'GlaxoSmithKline', category: 'Inhaler', barcode: '8901234567896', cost_price: 15.00, selling_price: 24.00, stock_quantity: 30, min_stock_alert: 10, batch_number: 'VEN-8820', expiry_date: '2027-12-31', rack_location: 'Rack C-01' },
        { product_code: genSku(), trade_name: 'Omeprazole', generic_name: 'Omeprazole Sodium', dosage: '20mg', form: 'Capsule', manufacturer: 'AstraZeneca', category: 'Capsule', barcode: '8901234567898', cost_price: 5.00, selling_price: 9.00, stock_quantity: 110, min_stock_alert: 20, batch_number: 'OMP-5521', expiry_date: '2028-02-28', rack_location: 'Rack D-01' },
      ];
      for (const m of sampleMedicines) {
        await run(
          `INSERT INTO medicines (product_code, trade_name, generic_name, dosage, form, manufacturer, category, barcode, cost_price, selling_price, stock_quantity, min_stock_alert, batch_number, expiry_date, rack_location)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.product_code, m.trade_name, m.generic_name, m.dosage, m.form, m.manufacturer, m.category, m.barcode, m.cost_price, m.selling_price, m.stock_quantity, m.min_stock_alert, m.batch_number, m.expiry_date, m.rack_location]
        );
      }
      console.log('🌱 Seeded sample medicines with SKU codes');
    } else {
      // Auto-assign product_code to existing medicines that don't have one
      const noCode = await query(`SELECT id FROM medicines WHERE product_code IS NULL ORDER BY id ASC`);
      for (const med of noCode) {
        const code = `MED-${String(med.id).padStart(6, '0')}`;
        await run(`UPDATE medicines SET product_code = ? WHERE id = ?`, [code, med.id]);
      }
    }

    // ── Seed: Sample sales history (only if empty) ────────────────────────
    const salesCount = await get(`SELECT COUNT(*) as count FROM sales`);
    if (salesCount.count === 0) {
      const s1 = await run(
        `INSERT INTO sales (receipt_number, cashier_id, cashier_name, customer_name, subtotal, discount, total_amount, cost_total, gross_profit, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`REC-${Date.now()}-01`, 2, 'Alex Rivera (Cashier)', 'Walk-in Customer', 25.00, 0, 25.00, 11.40, 13.60, 'Cash']
      );
      await run(
        `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, cost_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s1.id, 1, 'Amoxicillin', '500mg', 2, 7.50, 4.50, 15.00]
      );
      await run(
        `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, cost_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s1.id, 2, 'Panadol Extra', '500mg/65mg', 4, 2.50, 1.20, 10.00]
      );
      console.log('🌱 Seeded sample sales history');
    }

    console.log('✅ Database fully initialized and migrated');
  } catch (error) {
    console.error('❌ Database Initialization Error:', error);
    throw error;
  }
}
