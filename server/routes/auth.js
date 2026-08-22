import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, query, run } from '../db/database.js';
import { JWT_SECRET, verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login (Supports Username/Password & PIN authentication)
router.post('/login', async (req, res) => {
  try {
    const { username, password, pin } = req.body;

    let user = null;

    // PIN Authentication
    if (pin) {
      user = await get('SELECT * FROM users WHERE pin = ?', [pin.trim()]);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid Staff PIN entered.' });
      }
    } else if (username && password) {
      // Username + Password Authentication
      user = await get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found with provided username.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password entered.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Please provide either Username/Password or Staff PIN.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// GET /api/auth/me (Get Current User Profile)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await get('SELECT id, username, name, role, pin, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// GET /api/auth/users (Admin Only - List Users)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await query('SELECT id, username, name, role, pin, created_at FROM users ORDER BY id ASC');
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user list.' });
  }
});

export default router;
