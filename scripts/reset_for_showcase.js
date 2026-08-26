import { initDatabase, query, get, run } from '../server/db/database.js';

async function resetShowcaseData() {
  await initDatabase();
  console.log('--- Cleaning test records for commercial showcase ---');

  // 1. Delete test item 'Himalaya' or any invalid test medicines
  await run("DELETE FROM medicines WHERE trade_name = 'Himalaya' OR trade_name LIKE '%test%'");

  // 2. Clean out old test shifts so shifts start fresh
  await run("DELETE FROM cashier_shifts");

  // 3. Clean test sales and audit logs to make reports start fresh & crisp
  await run("DELETE FROM sales");
  await run("DELETE FROM sale_items");
  await run("DELETE FROM customer_ledger");
  await run("DELETE FROM supplier_ledger");
  await run("DELETE FROM purchases");
  await run("DELETE FROM purchase_items");
  await run("DELETE FROM purchase_returns");
  await run("DELETE FROM purchase_return_items");
  await run("DELETE FROM sales_returns");
  await run("DELETE FROM sales_return_items");
  await run("DELETE FROM inventory_movements");
  await run("DELETE FROM audit_logs");
  await run("DELETE FROM expenses");

  // 4. Ensure top 8 medicines have pristine stock counts
  await run("UPDATE medicines SET stock_quantity = 120 WHERE product_code = 'MED-000001'");
  await run("UPDATE medicines SET stock_quantity = 250 WHERE product_code = 'MED-000002'");
  await run("UPDATE medicines SET stock_quantity = 85 WHERE product_code = 'MED-000005'");
  await run("UPDATE medicines SET stock_quantity = 90 WHERE product_code = 'MED-000006'");
  await run("UPDATE medicines SET stock_quantity = 30 WHERE product_code = 'MED-000007'");
  await run("UPDATE medicines SET stock_quantity = 65 WHERE product_code = 'MED-000008'");
  await run("UPDATE medicines SET stock_quantity = 110 WHERE product_code = 'MED-000009'");
  await run("UPDATE medicines SET stock_quantity = 50 WHERE product_code = 'MED-000010'");

  // 5. Seed clean initial verified sale
  const s1 = await run(
    `INSERT INTO sales (receipt_number, cashier_id, cashier_name, customer_name, subtotal, discount, total_amount, cost_total, gross_profit, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['REC-20260826-001', 2, 'Alex Rivera (Cashier)', 'Walk-in Customer', 35.00, 0, 35.00, 16.50, 18.50, 'Cash']
  );
  await run(
    `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, cost_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [s1.id, 1, 'Amoxicillin', '500mg', 2, 7.50, 4.50, 15.00]
  );
  await run(
    `INSERT INTO sale_items (sale_id, medicine_id, trade_name, dosage, quantity, unit_price, cost_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [s1.id, 2, 'Panadol Extra', '500mg/65mg', 8, 2.50, 1.20, 20.00]
  );

  console.log('✅ ALL TEST DATA RESET FOR BUYER SHOWCASE SUCCESS');
  process.exit(0);
}

resetShowcaseData().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});
