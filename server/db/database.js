import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../pharmacy.db');

// Enable verbose SQLite logging in dev
const sqlite = sqlite3.verbose();

export const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✅ SQLite Database connected at:', dbPath);
  }
});

// Helper wrapper for async database operations
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

// Initialize tables and pre-seed initial data
export async function initDatabase() {
  try {
    // 1. Users Table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('ADMIN', 'EMPLOYEE')),
        pin TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Medicines Table
    await run(`
      CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_name TEXT NOT NULL,
        generic_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        form TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        barcode TEXT UNIQUE NOT NULL,
        cost_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        min_stock_alert INTEGER NOT NULL DEFAULT 20,
        batch_number TEXT NOT NULL,
        expiry_date DATE NOT NULL,
        rack_location TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Sales Table
    await run(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT UNIQUE NOT NULL,
        cashier_id INTEGER NOT NULL,
        cashier_name TEXT NOT NULL,
        customer_name TEXT DEFAULT 'Walk-in Customer',
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'Cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Sale Items Table
    await run(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        trade_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY(medicine_id) REFERENCES medicines(id)
      )
    `);

    // Seed Default Users if empty
    const userCount = await get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      const cashierPassword = await bcrypt.hash('cashier123', 10);

      await run(
        `INSERT INTO users (username, password, name, role, pin) VALUES (?, ?, ?, ?, ?)`,
        ['admin', adminPassword, 'Dr. Sarah Jenkins (Manager)', 'ADMIN', '1234']
      );

      await run(
        `INSERT INTO users (username, password, name, role, pin) VALUES (?, ?, ?, ?, ?)`,
        ['cashier', cashierPassword, 'Alex Rivera (Cashier)', 'EMPLOYEE', '5678']
      );

      console.log('🌱 Seeded default users: admin (PIN: 1234), cashier (PIN: 5678)');
    }

    // Seed Medicines if empty
    const medCount = await get('SELECT COUNT(*) as count FROM medicines');
    if (medCount.count === 0) {
      const sampleMedicines = [
        ['Amoxicillin', 'Amoxicillin Trihydrate', '500mg', 'Capsule', 'GSK Pharma', '8901234567890', 4.50, 7.50, 120, 20, 'AMX-2026-A', '2027-11-30', 'Rack A-01'],
        ['Panadol Extra', 'Paracetamol / Caffeine', '500mg/65mg', 'Tablet', 'Haleon Healthcare', '8901234567891', 1.20, 2.50, 250, 30, 'PAN-9941', '2028-04-15', 'Rack A-02'],
        ['Augmentin', 'Amoxicillin / Clavulanate', '625mg', 'Tablet', 'GSK', '8901234567892', 12.00, 18.50, 15, 20, 'AUG-7721', '2026-10-10', 'Rack A-03'], // Low stock warning
        ['Brufen', 'Ibuprofen', '400mg', 'Tablet', 'Abbott Labs', '8901234567893', 2.00, 3.80, 85, 25, 'BRF-4412', '2027-08-20', 'Rack B-01'],
        ['Ciprobay', 'Ciprofloxacin', '500mg', 'Tablet', 'Bayer', '8901234567894', 8.00, 13.00, 42, 15, 'CIP-1190', '2027-01-15', 'Rack B-02'],
        ['Zantac', 'Ranitidine', '150mg', 'Tablet', 'Sanofi', '8901234567895', 3.00, 5.50, 5, 20, 'ZAN-3301', '2026-09-01', 'Rack B-03'], // Low stock
        ['Ventolin Evohaler', 'Salbutamol', '100mcg', 'Inhaler', 'GlaxoSmithKline', '8901234567896', 15.00, 24.00, 30, 10, 'VEN-8820', '2027-12-31', 'Rack C-01'],
        ['Corex DX', 'Dextromethorphan', '100ml', 'Syrup', 'Pfizer', '8901234567897', 3.50, 6.00, 65, 20, 'CRX-0012', '2026-11-15', 'Rack C-02'],
        ['Omeprazole', 'Omeprazole Sodium', '20mg', 'Capsule', 'AstraZeneca', '8901234567898', 5.00, 9.00, 110, 20, 'OMP-5521', '2028-02-28', 'Rack D-01'],
        ['Zyrtec', 'Cetirizine HCl', '10mg', 'Tablet', 'UCB Pharma', '8901234567899', 2.50, 4.50, 0, 20, 'ZYR-9901', '2027-06-30', 'Rack D-02'], // Out of stock
        ['Clexane Injection', 'Enoxaparin Sodium', '40mg/0.4ml', 'Injection', 'Sanofi', '8909876543210', 25.00, 38.00, 18, 10, 'CLX-4019', '2026-08-25', 'Fridge-01'], // Near expiry
        ['Betnovate-N', 'Betamethasone / Neomycin', '20g', 'Cream', 'GSK', '8909876543211', 4.00, 7.00, 50, 15, 'BET-2201', '2027-05-10', 'Rack E-01']
      ];

      for (const med of sampleMedicines) {
        await run(
          `INSERT INTO medicines (trade_name, generic_name, dosage, form, manufacturer, barcode, cost_price, selling_price, stock_quantity, min_stock_alert, batch_number, expiry_date, rack_location)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          med
        );
      }

      console.log('🌱 Seeded 12 real-world pharmacy medicines with barcodes and shelf locations');
    }

    // Seed Sample Sales History for Analytics if empty
    const salesCount = await get('SELECT COUNT(*) as count FROM sales');
    if (salesCount.count === 0) {
      const today = new Date().toISOString().split('T')[0];
      
      // Sample Sale 1
      const sale1 = await run(
        `INSERT INTO sales (receipt_number, cashier_id, cashier_name, customer_name, subtotal, discount, total_amount, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`REC-${Date.now()}-01`, 2, 'Alex Rivera (Cashier)', 'John Doe', 25.00, 2.00, 23.00, 'Cash']
      );

      await run(
        `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sale1.id, 1, 'Amoxicillin', '500mg', 2, 7.50, 15.00]
      );
      await run(
        `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sale1.id, 2, 'Panadol Extra', '500mg/65mg', 4, 2.50, 10.00]
      );

      // Sample Sale 2
      const sale2 = await run(
        `INSERT INTO sales (receipt_number, cashier_id, cashier_name, customer_name, subtotal, discount, total_amount, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [`REC-${Date.now()}-02`, 2, 'Alex Rivera (Cashier)', 'Sarah Connor', 37.00, 0.00, 37.00, 'Card']
      );

      await run(
        `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sale2.id, 3, 'Augmentin', '625mg', 2, 18.50, 37.00]
      );

      console.log('🌱 Seeded sample sales history for dashboard graphs');
    }

  } catch (error) {
    console.error('❌ Database Initialization Error:', error);
  }
}
