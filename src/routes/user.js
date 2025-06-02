const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const ResponseHandler = require('../utils/responseHandler');

const router = express.Router();

// Get current user profile (already in auth.js as /me, nhưng duplicate ở đây cho users endpoint)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT u.id, u.email, u.role, u.status, u.created_at,
                   s.plan_id, p.name as plan_name, s.start_date, s.end_date,
                   COUNT(ak.id) as api_key_count
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            LEFT JOIN api_keys ak ON u.id = ak.user_id AND ak.status = 'active'
            WHERE u.id = $1
            GROUP BY u.id, s.plan_id, p.name, s.start_date, s.end_date
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
                api_key_count: parseInt(user.api_key_count),
                subscription: user.plan_id ? {
                    plan_id: user.plan_id,
                    plan_name: user.plan_name,
                    start_date: user.start_date,
                    end_date: user.end_date
                } : null
            }
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        return ResponseHandler.error(res, 'Failed to get user profile', 500);
    }
});

// Update user profile
router.put('/profile', [
    authenticateToken,
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }

        const { email } = req.body;
        const userId = req.user.id;

        if (email) {
            // Check if email is already taken by another user
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );

            if (existingUser.rows.length > 0) {
                return ResponseHandler.error(res, 'Email already in use', 409);
            }
        }

        const result = await pool.query(`
            UPDATE users 
            SET email = COALESCE($1, email), updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING id, email, role, status, created_at
        `, [email, userId]);

        return ResponseHandler.success(res, {
            user: result.rows[0]
        }, 'Profile updated successfully');

    } catch (error) {
        console.error('Update profile error:', error);
        return ResponseHandler.error(res, 'Failed to update profile', 500);
    }
});

// Get user's subscription details
router.get('/subscription', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, p.name, p.description, p.price, p.request_limit_per_day, 
                   p.api_key_limit, p.duration_days
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1 AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [req.user.id]);

        if (result.rows.length === 0) {
            return ResponseHandler.success(res, { subscription: null });
        }

        const subscription = result.rows[0];
        return ResponseHandler.success(res, {
            subscription: {
                id: subscription.id,
                plan: {
                    id: subscription.plan_id,
                    name: subscription.name,
                    description: subscription.description,
                    price: subscription.price,
                    request_limit_per_day: subscription.request_limit_per_day,
                    api_key_limit: subscription.api_key_limit,
                    duration_days: subscription.duration_days
                },
                start_date: subscription.start_date,
                end_date: subscription.end_date,
                status: subscription.status,
                days_remaining: Math.max(0, Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
            }
        });

    } catch (error) {
        console.error('Get subscription error:', error);
        return ResponseHandler.error(res, 'Failed to get subscription details', 500);
    }
});

// Get user's usage statistics
router.get('/usage-stats', authenticateToken, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        // Get daily usage stats
        const dailyStats = await pool.query(`
            SELECT 
                DATE(al.request_time) as date,
                COUNT(*) as requests,
                COUNT(DISTINCT al.ip_address) as unique_ips,
                COUNT(DISTINCT al.api_key_id) as api_keys_used
            FROM api_logs al
            JOIN api_keys ak ON al.api_key_id = ak.id
            WHERE ak.user_id = $1 
                AND al.request_time >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY DATE(al.request_time)
            ORDER BY date DESC
        `, [req.user.id]);

        // Get endpoint usage
        const endpointStats = await pool.query(`
            SELECT 
                al.endpoint,
                al.method,
                COUNT(*) as requests,
                AVG(CASE WHEN al.response_status < 400 THEN 1 ELSE 0 END) * 100 as success_rate
            FROM api_logs al
            JOIN api_keys ak ON al.api_key_id = ak.id
            WHERE ak.user_id = $1 
                AND al.request_time >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY al.endpoint, al.method
            ORDER BY requests DESC
            LIMIT 10
        `, [req.user.id]);

        // Get current usage today
        const todayUsage = await pool.query(`
            SELECT 
                COUNT(*) as requests_today,
                COUNT(DISTINCT al.api_key_id) as api_keys_used_today
            FROM api_logs al
            JOIN api_keys ak ON al.api_key_id = ak.id
            WHERE ak.user_id = $1 
                AND DATE(al.request_time) = CURRENT_DATE
        `, [req.user.id]);

        return ResponseHandler.success(res, {
            today: todayUsage.rows[0] || { requests_today: 0, api_keys_used_today: 0 },
            daily_stats: dailyStats.rows,
            top_endpoints: endpointStats.rows
        });

    } catch (error) {
        console.error('Get usage stats error:', error);
        return ResponseHandler.error(res, 'Failed to get usage statistics', 500);
    }
});

// Delete user account (self-deletion)
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Don't allow admin to delete themselves
        if (req.user.role === 'admin') {
            return ResponseHandler.error(res, 'Admin accounts cannot be self-deleted', 403);
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete in order due to foreign key constraints
            await client.query('DELETE FROM api_logs WHERE api_key_id IN (SELECT id FROM api_keys WHERE user_id = $1)', [userId]);
            await client.query('DELETE FROM api_keys WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM payment_orders WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
            
            await client.query('COMMIT');
            
            return ResponseHandler.success(res, null, 'Account deleted successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Delete account error:', error);
        return ResponseHandler.error(res, 'Failed to delete account', 500);
    }
});

module.exports = router;