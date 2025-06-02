const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { generateToken } = require('../config/jwt');
const { authenticateToken } = require('../middleware/auth');
const ResponseHandler = require('../utils/responseHandler');

const router = express.Router();

// Register
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['customer', 'admin']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }

        const { email, password, role = 'customer' } = req.body;

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return ResponseHandler.error(res, 'Email already registered', 409);
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
            [email, passwordHash, role]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = generateToken({
            user_id: user.id,
            email: user.email,
            role: user.role
        });

        return ResponseHandler.success(res, {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            },
            token
        }, 'User created successfully', 201);

    } catch (error) {
        console.error('Registration error:', error);
        return ResponseHandler.error(res, 'Failed to create user', 500);
    }
});

// Login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }

        const { email, password } = req.body;

        // Find user
        const userResult = await pool.query(
            'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return ResponseHandler.error(res, 'Invalid credentials', 401);
        }

        const user = userResult.rows[0];

        if (user.status !== 'active') {
            return ResponseHandler.error(res, 'Account deactivated', 401);
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            return ResponseHandler.error(res, 'Invalid credentials', 401);
        }

        // Generate JWT token
        const token = generateToken({
            user_id: user.id,
            email: user.email,
            role: user.role
        });

        return ResponseHandler.success(res, {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            token
        }, 'Login successful');

    } catch (error) {
        console.error('Login error:', error);
        return ResponseHandler.error(res, 'Login failed', 500);
    }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT u.id, u.email, u.role, u.status, u.created_at,
                   s.plan_id, p.name as plan_name, s.end_date as subscription_end_date
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE u.id = $1
        `, [req.user.id]);

        if (userResult.rows.length === 0) {
            return ResponseHandler.error(res, 'User not found', 404);
        }

        const user = userResult.rows[0];
        return ResponseHandler.success(res, {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                status: user.status,
                created_at: user.created_at,
                subscription: user.plan_id ? {
                    plan_id: user.plan_id,
                    plan_name: user.plan_name,
                    end_date: user.subscription_end_date
                } : null
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        return ResponseHandler.error(res, 'Failed to get user profile', 500);
    }
});

// Change password
router.post('/change-password', [
    authenticateToken,
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Get current password hash
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        const user = userResult.rows[0];

        // Verify current password
        const isValidPassword = await comparePassword(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return ResponseHandler.error(res, 'Current password is incorrect', 401);
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, userId]
        );

        return ResponseHandler.success(res, null, 'Password changed successfully');

    } catch (error) {
        console.error('Change password error:', error);
        return ResponseHandler.error(res, 'Failed to change password', 500);
    }
});

module.exports = router;