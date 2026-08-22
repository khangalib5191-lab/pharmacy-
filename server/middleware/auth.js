import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pharmaconnect_super_secret_jwt_key_2026';

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
      redirectTo: '/pos'
    });
  }
  next();
}

export function requireEmployee(req, res, next) {
  if (!req.user || (req.user.role !== 'EMPLOYEE' && req.user.role !== 'ADMIN')) {
    return res.status(403).json({ success: false, message: 'Access Denied: Valid staff account required.' });
  }
  next();
}

export { JWT_SECRET };
