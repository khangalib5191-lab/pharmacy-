import express from 'express';
import { query, get } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to fill zero-gaps for time series
function fillTimeSeries(data, keys, key) {
  return data.reduce((acc, row) => { acc[row[key]] = row; return acc; }, {});
}

// GET /api/analytics/dashboard — KPIs + quick charts
router.get('/dashboard', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Today's metrics
    const todaySales = await get(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(cost_total),0) as cost, COALESCE(SUM(gross_profit),0) as profit FROM sales WHERE date(created_at)=date('now','localtime') AND sale_status != 'cancelled'`);
    const todayPurchases = await get(`SELECT COALESCE(SUM(total_amount),0) as total FROM purchases WHERE date(purchase_date)=date('now','localtime') AND status='confirmed'`);
    const totalMedicines = await get(`SELECT COUNT(*) as count FROM medicines WHERE status='active'`);
    const lowStock = await get(`SELECT COUNT(*) as count FROM medicines WHERE stock_quantity<=min_stock_alert AND status='active'`);
    const outOfStock = await get(`SELECT COUNT(*) as count FROM medicines WHERE stock_quantity=0 AND status='active'`);
    const expiredCount = await get(`SELECT COUNT(*) as count FROM medicines WHERE status='active' AND expiry_date IS NOT NULL AND date(expiry_date)<date('now')`);
    const expiringSoon = await get(`SELECT COUNT(*) as count FROM medicines WHERE status='active' AND expiry_date IS NOT NULL AND date(expiry_date) BETWEEN date('now') AND date('now','+90 days')`);
    const supplierPayables = await get(`SELECT COALESCE(SUM(balance),0) as total FROM (SELECT sl.supplier_id, MAX(sl.balance) as balance FROM supplier_ledger sl GROUP BY sl.supplier_id)`);

    // Hourly chart today (8am-10pm)
    const hourlyRaw = await query(`SELECT strftime('%H',created_at) as hour, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(gross_profit),0) as profit, COUNT(*) as orders FROM sales WHERE date(created_at)=date('now','localtime') AND sale_status!='cancelled' GROUP BY hour ORDER BY hour`);
    const hourMap = hourlyRaw.reduce((a, r) => { a[r.hour] = r; return a; }, {});
    const hourly = [];
    for (let h = 8; h <= 21; h++) {
      const hStr = h < 10 ? `0${h}` : `${h}`;
      hourly.push({ hour: `${hStr}:00`, revenue: hourMap[hStr]?.revenue || 0, profit: hourMap[hStr]?.profit || 0, orders: hourMap[hStr]?.orders || 0 });
    }

    // Monthly chart (last 6 months)
    const monthly = await query(`SELECT strftime('%Y-%m',created_at) as month, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(gross_profit),0) as profit, COUNT(*) as sales_count FROM sales WHERE sale_status!='cancelled' GROUP BY month ORDER BY month DESC LIMIT 6`);

    // Top 5 products
    const topMoving = await query(`SELECT si.trade_name, SUM(si.quantity) as total_qty_sold, SUM(si.total_price) as total_revenue FROM sale_items si JOIN sales s ON si.sale_id=s.id WHERE s.sale_status!='cancelled' GROUP BY si.medicine_id ORDER BY total_qty_sold DESC LIMIT 5`);

    // Alerts
    const lowStockList = await query(`SELECT id,trade_name,product_code,generic_name,form,stock_quantity,min_stock_alert,rack_location FROM medicines WHERE stock_quantity<=min_stock_alert AND status='active' ORDER BY stock_quantity ASC LIMIT 10`);
    const expiryList = await query(`SELECT id,trade_name,product_code,form,batch_number,expiry_date,stock_quantity FROM medicines WHERE status='active' AND expiry_date IS NOT NULL AND date(expiry_date)<=date('now','+90 days') ORDER BY expiry_date ASC LIMIT 10`);

    return res.json({
      success: true,
      metrics: {
        today_revenue: parseFloat(todaySales.revenue || 0),
        today_profit: parseFloat(todaySales.profit || 0),
        today_cost: parseFloat(todaySales.cost || 0),
        today_purchases: parseFloat(todayPurchases.total || 0),
        today_transactions: todaySales.count || 0,
        total_medicines: totalMedicines.count || 0,
        low_stock_count: lowStock.count || 0,
        out_of_stock_count: outOfStock.count || 0,
        expired_count: expiredCount.count || 0,
        expiring_soon_count: expiringSoon.count || 0,
        supplier_payables: parseFloat(supplierPayables.total || 0),
      },
      charts: { hourly_sales: hourly, monthly_sales: monthly.reverse(), top_moving: topMoving },
      alerts: { low_stock: lowStockList, expiring_soon: expiryList }
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate analytics.' });
  }
});

// GET /api/analytics/graph?view=day|week|month|year|custom&date=&start=&end=
router.get('/graph', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { view = 'month', date, start, end } = req.query;
    let sql, params = [];
    let labels = [];

    if (view === 'day') {
      // Hourly for a specific day
      const d = date || new Date().toISOString().split('T')[0];
      sql = `SELECT strftime('%H',created_at) as period, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(cost_total),0) as cost, COALESCE(SUM(gross_profit),0) as profit, COUNT(*) as count FROM sales WHERE date(created_at)=? AND sale_status!='cancelled' GROUP BY period`;
      params = [d];
      const raw = await query(sql, params);
      const map = raw.reduce((a, r) => { a[r.period] = r; return a; }, {});
      for (let h = 0; h <= 23; h++) {
        const k = h < 10 ? `0${h}` : `${h}`;
        labels.push({ label: `${k}:00`, ...mapRow(map[k]) });
      }
    } else if (view === 'week') {
      const d = date || new Date().toISOString().split('T')[0];
      // Get Monday of the week
      const dt = new Date(d);
      const day = dt.getDay() || 7;
      dt.setDate(dt.getDate() - day + 1);
      for (let i = 0; i < 7; i++) {
        const dd = new Date(dt); dd.setDate(dt.getDate() + i);
        const ds = dd.toISOString().split('T')[0];
        const row = await get(`SELECT COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(cost_total),0) as cost, COALESCE(SUM(gross_profit),0) as profit, COUNT(*) as count FROM sales WHERE date(created_at)=? AND sale_status!='cancelled'`, [ds]);
        labels.push({ label: ds, ...mapRow(row) });
      }
    } else if (view === 'month') {
      const d = date ? date.substring(0, 7) : new Date().toISOString().substring(0, 7);
      const [yr, mo] = d.split('-');
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const raw = await query(`SELECT strftime('%d',created_at) as period, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(cost_total),0) as cost, COALESCE(SUM(gross_profit),0) as profit, COUNT(*) as count FROM sales WHERE strftime('%Y-%m',created_at)=? AND sale_status!='cancelled' GROUP BY period`, [d]);
      const map = raw.reduce((a, r) => { a[r.period] = r; return a; }, {});
      for (let i = 1; i <= daysInMonth; i++) {
        const k = i < 10 ? `0${i}` : `${i}`;
        labels.push({ label: `${d}-${k}`, ...mapRow(map[k]) });
      }
    } else if (view === 'year') {
      const yr = date ? date.substring(0, 4) : new Date().getFullYear().toString();
      const raw = await query(`SELECT strftime('%m',created_at) as period, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(cost_total),0) as cost, COALESCE(SUM(gross_profit),0) as profit, COUNT(*) as count FROM sales WHERE strftime('%Y',created_at)=? AND sale_status!='cancelled' GROUP BY period`, [yr]);
      const map = raw.reduce((a, r) => { a[r.period] = r; return a; }, {});
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let i = 1; i <= 12; i++) {
        const k = i < 10 ? `0${i}` : `${i}`;
        labels.push({ label: months[i - 1], ...mapRow(map[k]) });
      }
    } else if (view === 'custom' && start && end) {
      const raw = await query(`SELECT date(created_at) as period, COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(cost_total),0) as cost, COALESCE(SUM(gross_profit),0) as profit, COUNT(*) as count FROM sales WHERE date(created_at) BETWEEN ? AND ? AND sale_status!='cancelled' GROUP BY period ORDER BY period`, [start, end]);
      labels = raw.map(r => ({ label: r.period, ...mapRow(r) }));
    }

    return res.json({ success: true, data: labels });
  } catch (err) {
    console.error('Graph error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate graph data.' });
  }
});

function mapRow(row) {
  if (!row) return { revenue: 0, cost: 0, profit: 0, count: 0 };
  return {
    revenue: parseFloat(row.revenue || 0),
    cost: parseFloat(row.cost || 0),
    profit: parseFloat(row.profit || 0),
    count: parseInt(row.count || 0),
  };
}

export default router;
