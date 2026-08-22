import express from 'express';
import { query, get } from '../db/database.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/dashboard (Admin Dashboard Overview Charts & Key Metrics)
router.get('/dashboard', verifyToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Key Metric Counters
    const todaySalesSummary = await get(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_revenue
      FROM sales
      WHERE date(created_at) = date('now', 'localtime')
    `);

    const totalMedicinesCount = await get(`SELECT COUNT(*) as count FROM medicines`);

    const lowStockCount = await get(`
      SELECT COUNT(*) as count FROM medicines WHERE stock_quantity <= min_stock_alert
    `);

    const expiringSoonCount = await get(`
      SELECT COUNT(*) as count FROM medicines WHERE date(expiry_date) <= date('now', '+60 days')
    `);

    // Calculate Estimated Profit Today (Selling Price - Cost Price for items sold today)
    const profitToday = await get(`
      SELECT COALESCE(SUM((si.unit_price - m.cost_price) * si.quantity), 0) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN medicines m ON si.medicine_id = m.id
      WHERE date(s.created_at) = date('now', 'localtime')
    `);

    // 2. Hourly Sales Chart Today (00:00 to 23:00)
    const hourlyData = await query(`
      SELECT strftime('%H:00', created_at) as hour, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders
      FROM sales
      WHERE date(created_at) = date('now', 'localtime')
      GROUP BY hour
      ORDER BY hour ASC
    `);

    // Format 24-hour structure for Recharts
    const formattedHourly = [];
    for (let h = 8; h <= 21; h++) {
      const hourStr = `${h < 10 ? '0' + h : h}:00`;
      const match = hourlyData.find(d => d.hour === hourStr);
      formattedHourly.push({
        hour: hourStr,
        revenue: match ? parseFloat(match.revenue) : 0,
        orders: match ? match.orders : 0
      });
    }

    // 3. Monthly Sales Chart (Last 6 Months)
    const monthlyData = await query(`
      SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as sales_count
      FROM sales
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `);

    // 4. Top 5 Fast Moving / Best Selling Medicines
    const topMoving = await query(`
      SELECT si.trade_name, si.dosage, SUM(si.quantity) as total_qty_sold, SUM(si.total_price) as total_revenue
      FROM sale_items si
      GROUP BY si.medicine_id
      ORDER BY total_qty_sold DESC
      LIMIT 5
    `);

    // 5. Critical Low Stock Items Alert List
    const lowStockAlerts = await query(`
      SELECT id, trade_name, generic_name, dosage, form, stock_quantity, min_stock_alert, rack_location
      FROM medicines
      WHERE stock_quantity <= min_stock_alert
      ORDER BY stock_quantity ASC
    `);

    // 6. Near Expiry Warning List (Expiring within 90 days)
    const expiryAlerts = await query(`
      SELECT id, trade_name, generic_name, dosage, batch_number, expiry_date, stock_quantity, rack_location
      FROM medicines
      WHERE date(expiry_date) <= date('now', '+90 days')
      ORDER BY expiry_date ASC
    `);

    return res.json({
      success: true,
      metrics: {
        today_revenue: parseFloat(todaySalesSummary.total_revenue || 0),
        today_profit: parseFloat(profitToday.profit || 0),
        today_transactions: todaySalesSummary.count || 0,
        total_medicines: totalMedicinesCount.count || 0,
        low_stock_count: lowStockCount.count || 0,
        expiring_soon_count: expiringSoonCount.count || 0
      },
      charts: {
        hourly_sales: formattedHourly,
        monthly_sales: monthlyData.reverse(),
        top_moving: topMoving
      },
      alerts: {
        low_stock: lowStockAlerts,
        expiring_soon: expiryAlerts
      }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate analytics dashboard data.' });
  }
});

export default router;
