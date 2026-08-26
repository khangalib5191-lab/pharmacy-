import express from 'express';
import { query, get } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/sales-summary
router.get('/sales-summary', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, cashier_id, payment_method } = req.query;
    let sql = `SELECT s.*, 
               (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count
               FROM sales s WHERE s.sale_status != 'cancelled'`;
    const params = [];

    if (start_date) { sql += ' AND date(s.created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(s.created_at) <= date(?)'; params.push(end_date); }
    if (cashier_id) { sql += ' AND s.cashier_id = ?'; params.push(cashier_id); }
    if (payment_method) { sql += ' AND s.payment_method = ?'; params.push(payment_method); }

    sql += ' ORDER BY s.created_at DESC';
    const sales = await query(sql, params);

    const totals = sales.reduce((acc, s) => ({
      total_sales: acc.total_sales + parseFloat(s.total_amount || 0),
      total_cost: acc.total_cost + parseFloat(s.cost_total || 0),
      total_profit: acc.total_profit + parseFloat(s.gross_profit || 0),
      total_discount: acc.total_discount + parseFloat(s.discount || 0),
      count: acc.count + 1
    }), { total_sales: 0, total_cost: 0, total_profit: 0, total_discount: 0, count: 0 });

    return res.json({ success: true, sales, totals });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate sales report.' });
  }
});

// GET /api/reports/product-sales
router.get('/product-sales', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date, limit = 50 } = req.query;
    let sql = `SELECT si.medicine_id, 
               COALESCE(si.trade_name, m.trade_name, 'Medicine #' || si.medicine_id) as trade_name, 
               COALESCE(si.dosage, m.dosage, '') as dosage,
               SUM(si.quantity) as total_qty_sold,
               SUM(si.total_price) as total_revenue,
               SUM(COALESCE(si.cost_price, m.cost_price, 0) * si.quantity) as total_cogs,
               SUM(si.total_price - (COALESCE(si.cost_price, m.cost_price, 0) * si.quantity)) as total_profit,
               COUNT(DISTINCT si.sale_id) as transaction_count
               FROM sale_items si
               JOIN sales s ON si.sale_id = s.id
               LEFT JOIN medicines m ON si.medicine_id = m.id
               WHERE s.sale_status != 'cancelled'`;
    const params = [];
    if (start_date) { sql += ' AND date(s.created_at) >= date(?)'; params.push(start_date); }
    if (end_date) { sql += ' AND date(s.created_at) <= date(?)'; params.push(end_date); }
    sql += ' GROUP BY si.medicine_id ORDER BY total_revenue DESC LIMIT ?';
    params.push(parseInt(limit));

    const rows = await query(sql, params);
    return res.json({ success: true, products: rows });
  } catch (err) {
    console.error('Product Sales Report Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate product sales report.' });
  }
});

// GET /api/reports/stock-valuation
router.get('/stock-valuation', verifyToken, requireAdmin, async (req, res) => {
  try {
    const rows = await query(`
      SELECT m.id, m.product_code, m.trade_name, m.generic_name, m.category, m.form,
             m.stock_quantity, m.cost_price, m.selling_price,
             (m.stock_quantity * m.cost_price) as stock_cost_value,
             (m.stock_quantity * m.selling_price) as stock_retail_value,
             ((m.stock_quantity * m.selling_price) - (m.stock_quantity * m.cost_price)) as potential_profit
      FROM medicines m WHERE m.status != 'inactive' ORDER BY stock_cost_value DESC
    `);

    const summary = rows.reduce((acc, r) => ({
      total_items: acc.total_items + 1,
      total_units: acc.total_units + parseFloat(r.stock_quantity || 0),
      total_cost_valuation: acc.total_cost_valuation + parseFloat(r.stock_cost_value || 0),
      total_retail_valuation: acc.total_retail_valuation + parseFloat(r.stock_retail_value || 0),
      potential_profit: acc.potential_profit + parseFloat(r.potential_profit || 0),
    }), { total_items: 0, total_units: 0, total_cost_valuation: 0, total_retail_valuation: 0, potential_profit: 0 });

    return res.json({ success: true, stock: rows, summary });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate stock valuation.' });
  }
});

// GET /api/reports/profit-loss
router.get('/profit-loss', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sSql = `SELECT COALESCE(SUM(total_amount), 0) as gross_sales,
                       COALESCE(SUM(discount), 0) as total_discounts,
                       COALESCE(SUM(cost_total), 0) as total_cogs,
                       COALESCE(SUM(gross_profit), 0) as gross_profit,
                       COUNT(*) as sales_count
                FROM sales WHERE sale_status != 'cancelled'`;
    let eSql = `SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as exp_count FROM expenses WHERE 1=1`;
    let rSql = `SELECT COALESCE(SUM(total_amount), 0) as total_sales_returns FROM sales_returns WHERE status = 'confirmed'`;
    let prSql = `SELECT COALESCE(SUM(total_amount), 0) as total_purchase_returns FROM purchase_returns WHERE status = 'confirmed'`;
    
    const params = [];
    if (start_date && end_date) {
      sSql += ' AND date(created_at) BETWEEN date(?) AND date(?)';
      eSql += ' AND date(expense_date) BETWEEN date(?) AND date(?)';
      rSql += ' AND date(return_date) BETWEEN date(?) AND date(?)';
      prSql += ' AND date(return_date) BETWEEN date(?) AND date(?)';
      params.push(start_date, end_date);
    }

    const salesSummary = await get(sSql, params);
    const expensesSummary = await get(eSql, params);
    const salesReturns = await get(rSql, params);
    const purchaseReturns = await get(prSql, params);

    const netSales = (salesSummary?.gross_sales || 0) - (salesReturns?.total_sales_returns || 0);
    const grossProfit = (salesSummary?.gross_profit || 0);
    const totalExpenses = (expensesSummary?.total_expenses || 0);
    const netProfit = grossProfit - totalExpenses;

    return res.json({
      success: true,
      data: {
        gross_sales: salesSummary?.gross_sales || 0,
        sales_returns: salesReturns?.total_sales_returns || 0,
        net_sales: netSales,
        cogs: salesSummary?.total_cogs || 0,
        gross_profit: grossProfit,
        gross_margin_percent: netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(2) : 0,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        net_margin_percent: netSales > 0 ? ((netProfit / netSales) * 100).toFixed(2) : 0,
        purchase_returns: purchaseReturns?.total_purchase_returns || 0,
        sales_count: salesSummary?.sales_count || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate profit and loss statement.' });
  }
});

export default router;
