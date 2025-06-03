const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const quotaService = require('../services/quotaService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ResponseHandler = require('../utils/responseHandler');

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        // Get various statistics
        const [
            userStats,
            subscriptionStats,
            revenueStats,
            apiUsageStats,
            topUsers
        ] = await Promise.all([
            getUserStats(),
            getSubscriptionStats(),
            getRevenueStats(),
            getApiUsageStats(),
            getTopUsers()
        ]);
        
        return ResponseHandler.success(res, {
            users: userStats,
            subscriptions: subscriptionStats,
            revenue: revenueStats,
            api_usage: apiUsageStats,
            top_users: topUsers
        });
        
    } catch (error) {
        console.error('Admin dashboard error:', error);
        return ResponseHandler.error(res, 'Failed to get dashboard data', 500);
    }
});

// Get all users with pagination
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', role = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = '1=1';
        const params = [];
        let paramCount = 0;
        
        if (search) {
            paramCount++;
            whereClause += ` AND email ILIKE $${paramCount}`;
            params.push(`%${search}%`);
        }
        
        if (role) {
            paramCount++;
            whereClause += ` AND role = $${paramCount}`;
            params.push(role);
        }
        
        const query = `
            SELECT u.id, u.email, u.role, u.status, u.created_at,
                   s.plan_id, p.name as plan_name, s.end_date,
                   COUNT(ak.id) as api_key_count
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            LEFT JOIN api_keys ak ON u.id = ak.user_id AND ak.status = 'active'
            WHERE ${whereClause}
            GROUP BY u.id, s.plan_id, p.name, s.end_date
            ORDER BY u.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        const countQuery = `SELECT COUNT(*) FROM users WHERE ${whereClause}`;
        const countResult = await pool.query(countQuery, params.slice(0, paramCount));
        const totalCount = parseInt(countResult.rows[0].count);
        
        return ResponseHandler.success(res, {
            users: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(totalCount / limit),
                total_count: totalCount,
                per_page: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Admin get users error:', error);
        return ResponseHandler.error(res, 'Failed to get users', 500);
    }
});

// Update user status
router.put('/users/:userId/status', [
    body('status').isIn(['active', 'suspended', 'banned']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const { userId } = req.params;
        const { status } = req.body;
        
        const result = await pool.query(`
            UPDATE users 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING id, email, status
        `, [status, userId]);
        
        if (result.rows.length === 0) {
            return ResponseHandler.error(res, 'User not found', 404);
        }
        
        // If user is suspended/banned, deactivate their API keys
        if (status !== 'active') {
            await pool.query(`
                UPDATE api_keys 
                SET status = 'suspended' 
                WHERE user_id = $1 AND status = 'active'
            `, [userId]);
        }
        
        return ResponseHandler.success(res, {
            user: result.rows[0]
        }, 'User status updated successfully');
        
    } catch (error) {
        console.error('Update user status error:', error);
        return ResponseHandler.error(res, 'Failed to update user status', 500);
    }
});

// Get user details with API keys and usage
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get user info
        const userResult = await pool.query(`
            SELECT u.*, s.plan_id, p.name as plan_name, s.start_date, s.end_date
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE u.id = $1
        `, [userId]);
        
        if (userResult.rows.length === 0) {
            return ResponseHandler.error(res, 'User not found', 404);
        }
        
        // Get API keys
        const apiKeysResult = await pool.query(`
            SELECT id, key_value, name, status, created_at, last_used_at
            FROM api_keys
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);
        
        // Get recent API usage
        const usageResult = await pool.query(`
            SELECT DATE(request_time) as date, COUNT(*) as requests
            FROM api_logs al
            JOIN api_keys ak ON al.api_key_id = ak.id
            WHERE ak.user_id = $1 AND request_time >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(request_time)
            ORDER BY date DESC
        `, [userId]);
        
        return ResponseHandler.success(res, {
            user: userResult.rows[0],
            api_keys: apiKeysResult.rows,
            usage_stats: usageResult.rows
        });
        
    } catch (error) {
        console.error('Get user details error:', error);
        return ResponseHandler.error(res, 'Failed to get user details', 500);
    }
});

// Manage plans
router.get('/plans', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, COUNT(s.id) as active_subscriptions
            FROM plans p
            LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.status = 'active'
            GROUP BY p.id
            ORDER BY p.price ASC
        `);
        
        return ResponseHandler.success(res, { plans: result.rows });
        
    } catch (error) {
        console.error('Get plans error:', error);
        return ResponseHandler.error(res, 'Failed to get plans', 500);
    }
});

// Create new plan
router.post('/plans', [
    body('name').notEmpty().withMessage('Plan name required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
    body('request_limit_per_day').isInt({ min: 1 }).withMessage('Valid request limit required'),
    body('api_key_limit').isInt({ min: 1 }).withMessage('Valid API key limit required'),
    body('duration_days').isInt({ min: 1 }).withMessage('Valid duration required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const { name, description, price, request_limit_per_day, api_key_limit, duration_days } = req.body;
        
        const result = await pool.query(`
            INSERT INTO plans (name, description, price, request_limit_per_day, api_key_limit, duration_days)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, description, price, request_limit_per_day, api_key_limit, duration_days]);
        
        return ResponseHandler.success(res, {
            plan: result.rows[0]
        }, 'Plan created successfully', 201);
        
    } catch (error) {
        console.error('Create plan error:', error);
        return ResponseHandler.error(res, 'Failed to create plan', 500);
    }
});

// Update plan
router.put('/plans/:planId', [
    body('name').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('request_limit_per_day').optional().isInt({ min: 1 }),
    body('api_key_limit').optional().isInt({ min: 1 }),
    body('duration_days').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const { planId } = req.params;
        const updates = req.body;
        
        const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [planId, ...Object.values(updates)];
        
        const result = await pool.query(`
            UPDATE plans 
            SET ${fields}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING *
        `, values);
        
        if (result.rows.length === 0) {
            return ResponseHandler.error(res, 'Plan not found', 404);
        }
        
        return ResponseHandler.success(res, {
            plan: result.rows[0]
        }, 'Plan updated successfully');
        
    } catch (error) {
        console.error('Update plan error:', error);
        return ResponseHandler.error(res, 'Failed to update plan', 500);
    }
});

// API usage analytics
router.get('/analytics/usage', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const result = await pool.query(`
            SELECT 
                DATE(request_time) as date,
                COUNT(*) as total_requests,
                COUNT(DISTINCT al.api_key_id) as unique_api_keys,
                COUNT(DISTINCT ak.user_id) as unique_users,
                AVG(CASE WHEN response_status < 400 THEN 1 ELSE 0 END) * 100 as success_rate
            FROM api_logs al
            JOIN api_keys ak ON al.api_key_id = ak.id
            WHERE request_time >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY DATE(request_time)
            ORDER BY date DESC
        `);
        
        return ResponseHandler.success(res, { analytics: result.rows });
        
    } catch (error) {
        console.error('Get usage analytics error:', error);
        return ResponseHandler.error(res, 'Failed to get usage analytics', 500);
    }
});
//API get all users with pagination
router.get('/getListUsers/all', async (req, res) => {
    try {
        let { page = '1', limit = '50' } = req.query;

        // Convert page and limit to int if possible, otherwise handle 'all'
        if (typeof limit === 'string' && limit.toLowerCase() === 'all') {
            limit = 'all';
        } else if (!isNaN(limit)) {
            limit = parseInt(limit, 10);
        } else {
            limit = 50;
        }

        if (!isNaN(page)) {
            page = parseInt(page, 10);
        } else {
            page = 1;
        }

        let offset = 0;
        let queryText = `
            SELECT 
                u.id, 
                u.email, 
                u.role, 
                u.status, 
                u.created_at,
                COUNT(ak.id) AS api_key_count,
                p.name AS plan_name,
                s.end_date,
                COALESCE(SUM(al_count.total_requests), 0) AS total_requests
            FROM users u
            LEFT JOIN api_keys ak ON u.id = ak.user_id AND ak.status = 'active'
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            LEFT JOIN (
                SELECT ak.user_id, COUNT(al.id) AS total_requests
                FROM api_logs al
                JOIN api_keys ak ON al.api_key_id = ak.id
                GROUP BY ak.user_id
            ) al_count ON u.id = al_count.user_id
            GROUP BY u.id, p.name, s.end_date
            ORDER BY u.created_at DESC
        `;
        let queryParams = [];
        let pagination = {};
        let result;
        let totalCount;

        if (limit === 'all') {
            // No pagination, return all users
            result = await pool.query(queryText);
            totalCount = result.rows.length;
            pagination = {
                current_page: 1,
                total_pages: 1,
                total_count: totalCount,
                per_page: totalCount
            };
        } else {
            offset = (page - 1) * limit;
            queryText += ' LIMIT $1 OFFSET $2';
            queryParams = [limit, offset];
            result = await pool.query(queryText, queryParams);

            // Get total count
            const countResult = await pool.query('SELECT COUNT(*) FROM users');
            totalCount = parseInt(countResult.rows[0].count, 10);
            pagination = {
                current_page: page,
                total_pages: Math.ceil(totalCount / limit),
                total_count: totalCount,
                per_page: limit
            };
        }

        // Map result to match the required structure
        result.rows.forEach(row => {
            row.api_key_count = parseInt(row.api_key_count, 10);
            row.total_requests = parseInt(row.total_requests, 10);
            row.subscription = {
                plan_name: row.plan_name,
                end_date: row.end_date
            };
            delete row.plan_name;
            delete row.end_date;
        });

        return ResponseHandler.success(res, {
            users: result.rows,
            pagination
        });

    } catch (error) {
        console.error('Admin get all users error:', error);
        return ResponseHandler.error(res, 'Failed to get all users', 500);
    }
});

// Helper functions
async function getUserStats() {
    const result = await pool.query(`
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30d,
            COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
        FROM users
    `);
    return result.rows[0];
}

async function getSubscriptionStats() {
    const result = await pool.query(`
        SELECT 
            COUNT(*) as total_subscriptions,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
            COUNT(CASE WHEN end_date < CURRENT_DATE THEN 1 END) as expired_subscriptions
        FROM subscriptions
    `);
    return result.rows[0];
}

async function getRevenueStats() {
    const result = await pool.query(`
        SELECT 
            SUM(CASE WHEN po.status = 'success' THEN po.amount ELSE 0 END) as total_revenue,
            SUM(CASE WHEN po.status = 'success' AND po.paid_at >= CURRENT_DATE - INTERVAL '30 days' THEN po.amount ELSE 0 END) as revenue_30d,
            COUNT(CASE WHEN po.status = 'success' THEN 1 END) as successful_payments
        FROM payment_orders po
    `);
    return result.rows[0];
}

async function getApiUsageStats() {
    const result = await pool.query(`
        SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN request_time >= CURRENT_DATE THEN 1 END) as requests_today,
            COUNT(CASE WHEN request_time >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as requests_7d,
            COUNT(DISTINCT api_key_id) as active_api_keys
        FROM api_logs
        WHERE request_time >= CURRENT_DATE - INTERVAL '30 days'
    `);
    return result.rows[0];
}

async function getTopUsers() {
    const result = await pool.query(`
        SELECT 
            u.id, u.email, p.name as plan_name,
            COUNT(al.id) as request_count
        FROM users u
        JOIN api_keys ak ON u.id = ak.user_id
        JOIN api_logs al ON ak.id = al.api_key_id
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE al.request_time >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.email, p.name
        ORDER BY request_count DESC
        LIMIT 10
    `);
    return result.rows;
}

module.exports = router;