import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, query, run } from '../db/database.js';
import { JWT_SECRET, verifyToken, requireAdmin, logAudit } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, pin } = req.body;
    let user = null;

    if (pin) {
      user = await get('SELECT * FROM users WHERE pin = ? AND status = ?', [pin.trim(), 'active']);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid PIN or account disabled.' });
    } else if (username && password) {
      user = await get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
      if (!user) return res.status(401).json({ success: false, message: 'User not found.' });
      if (user.status === 'inactive') return res.status(401).json({ success: false, message: 'Account is disabled. Contact administrator.' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password.' });
    } else {
      return res.status(400).json({ success: false, message: 'Provide username/password or PIN.' });
    }

    // Update last login
    await run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit({ userId: user.id, username: user.username, action: 'LOGIN', entityType: 'user', entityId: user.id, description: `User ${user.username} logged in`, req });

    return res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await get('SELECT id, username, name, role, pin, status, last_login, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// GET /api/auth/users — Admin: list all users
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await query('SELECT id, username, name, role, pin, status, last_login, created_at FROM users ORDER BY id ASC');
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// POST /api/auth/users — Admin: create user
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, name, role, pin } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ success: false, message: 'Username, password, name, and role are required.' });
    }
    const existing = await get('SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (existing) return res.status(400).json({ success: false, message: `Username "${username}" already exists.` });

    const hashed = await bcrypt.hash(password, 10);
    const result = await run(
      `INSERT INTO users (username, password, name, role, pin, status, created_by) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [username.trim().toLowerCase(), hashed, name.trim(), role, pin ? pin.trim() : null, req.user.id]
    );
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CREATE_USER', entityType: 'user', entityId: result.id, description: `Created user: ${username} (${role})`, req });
    return res.status(201).json({ success: true, message: 'User created successfully.', userId: result.id });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PUT /api/auth/users/:id — Admin: edit user
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, pin } = req.body;
    const user = await get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await run(
      `UPDATE users SET name = ?, role = ?, pin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, role, pin || null, id]
    );
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'EDIT_USER', entityType: 'user', entityId: id, description: `Updated user ID ${id}`, req });
    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// PUT /api/auth/users/:id/status — Admin: enable/disable user
router.put('/users/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    if (parseInt(id) === req.user.id) return res.status(400).json({ success: false, message: 'Cannot change your own account status.' });
    await run(`UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);
    await logAudit({ userId: req.user.id, username: req.user.username, action: status === 'active' ? 'ENABLE_USER' : 'DISABLE_USER', entityType: 'user', entityId: id, description: `Set user ${id} status to ${status}`, req });
    return res.json({ success: true, message: `User ${status === 'active' ? 'enabled' : 'disabled'} successfully.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

// POST /api/auth/change-password — change own password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    if (new_password.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(new_password, 10);
    await run(`UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [hashed, req.user.id]);
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CHANGE_PASSWORD', entityType: 'user', entityId: req.user.id, description: 'User changed their password', req });
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

// POST /api/auth/change-pin — change own 4-digit PIN
router.post('/change-pin', verifyToken, async (req, res) => {
  try {
    const { current_password_or_pin, new_pin } = req.body;
    if (!current_password_or_pin || !new_pin) {
      return res.status(400).json({ success: false, message: 'Current password/PIN and new 4-digit PIN are required.' });
    }
    if (!/^\d{4}$/.test(new_pin)) {
      return res.status(400).json({ success: false, message: 'New PIN must be exactly 4 numeric digits (e.g. 1234).' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const isPassMatch = await bcrypt.compare(current_password_or_pin, user.password);
    const isPinMatch = user.pin && user.pin === current_password_or_pin;

    if (!isPassMatch && !isPinMatch) {
      return res.status(401).json({ success: false, message: 'Current password or PIN verification failed.' });
    }

    await run(`UPDATE users SET pin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [new_pin, req.user.id]);
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'CHANGE_PIN', entityType: 'user', entityId: req.user.id, description: 'User changed their 4-digit PIN', req });
    return res.json({ success: true, message: '4-Digit Login PIN updated successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update PIN.' });
  }
});

// POST /api/auth/reset-password/:id — Admin resets another user's password
router.post('/reset-password/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const user = await get('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const hashed = await bcrypt.hash(new_password, 10);
    await run(`UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [hashed, id]);
    await logAudit({ userId: req.user.id, username: req.user.username, action: 'RESET_PASSWORD', entityType: 'user', entityId: id, description: `Admin reset password for user: ${user.username}`, req });
    return res.json({ success: true, message: `Password reset for ${user.username} successfully.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

export default router;
