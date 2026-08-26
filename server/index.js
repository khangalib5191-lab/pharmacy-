import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { printNetworkBanner } from './utils/network.js';

import authRoutes from './routes/auth.js';
import medicineRoutes from './routes/medicines.js';
import salesRoutes from './routes/sales.js';
import analyticsRoutes from './routes/analytics.js';
import suppliersRoutes from './routes/suppliers.js';
import purchasesRoutes from './routes/purchases.js';
import purchaseReturnsRoutes from './routes/purchase_returns.js';
import salesReturnsRoutes from './routes/sales_returns.js';
import inventoryRoutes from './routes/inventory.js';
import customersRoutes from './routes/customers.js';
import reportsRoutes from './routes/reports.js';
import shiftsRoutes from './routes/shifts.js';
import settingsRoutes from './routes/settings.js';
import backupRoutes from './routes/backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces for local network access

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/purchase-returns', purchaseReturnsRoutes);
app.use('/api/sales-returns', salesReturnsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', system: 'PharmaConnect Local Host Server', timestamp: new Date() });
});

// Serve Static React Frontend Production Build
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for Single Page App Client-Side Routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (req.accepts('html')) {
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.send(`
          <div style="font-family: sans-serif; text-align: center; padding: 3rem;">
            <h1>🏥 PharmaConnect Host Backend Server Active</h1>
            <p>API Server is running successfully on port ${PORT}.</p>
            <p>To view the React frontend UI, run <strong>npm run build</strong> or run Vite dev server via <strong>npm run dev</strong>.</p>
          </div>
        `);
      }
    });
  }
});

// Initialize Database and Start Local Host Server
initDatabase().then(() => {
  app.listen(PORT, HOST, () => {
    printNetworkBanner(PORT);
  });
}).catch(err => {
  console.error('Fatal Database Startup Error:', err);
});
