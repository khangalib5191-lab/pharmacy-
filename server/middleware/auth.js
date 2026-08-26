import jwt from 'jsonwebtoken';
import { run } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'pharmaconnect_super_secret_jwt_key_2026';

export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Authorization token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Admin privileges required for this action.',
    });
  }
  next();
}

// Accept ADMIN or specified roles
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    const allowed = ['ADMIN', ...roles];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
}

// Log audit event (non-blocking)
export async function logAudit({ userId, username, action, entityType, entityId, description, beforeValue, afterValue, req }) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    await run(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, description, before_value, after_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, username || null, action, entityType || null, entityId || null, description || null,
       beforeValue ? JSON.stringify(beforeValue) : null,
       afterValue ? JSON.stringify(afterValue) : null,
       ip]
    );
  } catch (err) {
    // Audit failure should never crash the main operation
    console.error('Audit log error:', err.message);
  }
}
