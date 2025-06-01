const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { generateApiKey } = require('../utils/generateApiKey');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's API keys
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, key_value, name, status, created_at, last_used_at
            FROM api_keys 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [req.user.id]);

        res.json({
            api_keys: result.rows.map(key => ({
                id: key.id,
                key: key.key_value,
                name: key.name,
                status: key.status,
                created_at: key.created_at,
                last_used_at: key.last_used_at
            }))
        });

    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Failed to retrieve API keys' });
    }
});

// Create new API key
router.post('/', [
    authenticateToken,
    body('name').optional().isLength({ max: 100 }).withMessage('Name too long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name } = req.body;
        const userId = req.user.id;

        // Check user's subscription and API key limit
        const subscriptionResult = await pool.query(`
            SELECT s.plan_id, p.api_key_limit, 
                   COUNT(ak.id) as current_keys
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            LEFT JOIN api_keys ak ON ak.user_id = s.user_id AND ak.status = 'active'
            WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date > CURRENT_DATE
            GROUP BY s.plan_id, p.api_key_limit
        `, [userId]);

        if (subscriptionResult.rows.length === 0) {
            return res.status(403).json({ error: 'No active subscription found' });
        }

        const { api_key_limit, current_keys } = subscriptionResult.rows[0];

        if (current_keys >= api_key_limit) {
            return res.status(403).json({ 
                error: `API key limit reached. Maximum ${api_key_limit} keys allowed for your plan.`
            });
        }

        // Generate new API key
        const keyValue = generateApiKey();

        // Insert API key
        const result = await pool.query(`
            INSERT INTO api_keys (user_id, key_value, name) 
            VALUES ($1, $2, $3) 
            RETURNING id, key_value, name, status, created_at
        `, [userId, keyValue, name || 'Unnamed Key']);

        const newKey = result.rows[0];

        res.status(201).json({
            message: 'API key created successfully',
            api_key: {
                id: newKey.id,
                key: newKey.key_value,
                name: newKey.name,
                status: newKey.status,
                created_at: newKey.created_at
            }
        });

    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

// Update API key (rename)
router.put('/:keyId', [
    authenticateToken,
    body('name').isLength({ min: 1, max: 100 }).withMessage('Name required and must be under 100 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { keyId } = req.params;
        const { name } = req.body;
        const userId = req.user.id;

        const result = await pool.query(`
            UPDATE api_keys 
            SET name = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 AND user_id = $3 
            RETURNING id, key_value, name, status
        `, [name, keyId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({
            message: 'API key updated successfully',
            api_key: result.rows[0]
        });

    } catch (error) {
        console.error('Update API key error:', error);
        res.status(500).json({ error: 'Failed to update API key' });
    }
});

// Revoke API key
router.delete('/:keyId', authenticateToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(`
            UPDATE api_keys 
            SET status = 'revoked', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND user_id = $2 
            RETURNING id
        `, [keyId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ message: 'API key revoked successfully' });

    } catch (error) {
        console.error('Revoke API key error:', error);
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
});

// Get API key usage stats
router.get('/:keyId/stats', authenticateToken, async (req, res) => {
    try {
        const { keyId } = req.params;
        const userId = req.user.id;

        // Verify key ownership
        const keyResult = await pool.query(
            'SELECT id FROM api_keys WHERE id = $1 AND user_id = $2',
            [keyId, userId]
        );

        if (keyResult.rows.length === 0) {
            return res.status(404).json({ error: 'API key not found' });
        }

        // Get usage stats
        const stats = await pool.query(`
            SELECT 
                DATE(request_time) as date,
                COUNT(*) as requests,
                COUNT(DISTINCT ip_address) as unique_ips,
                AVG(CASE WHEN response_status < 400 THEN 1 ELSE 0 END) * 100 as success_rate
            FROM api_logs 
            WHERE api_key_id = $1 
                AND request_time >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(request_time)
            ORDER BY date DESC
        `, [keyId]);

        const todayStats = await pool.query(`
            SELECT 
                COUNT(*) as today_requests,
                COUNT(DISTINCT ip_address) as today_unique_ips
            FROM api_logs 
            WHERE api_key_id = $1 
                AND DATE(request_time) = CURRENT_DATE
        `, [keyId]);

        res.json({
            daily_stats: stats.rows,
            today: todayStats.rows[0] || { today_requests: 0, today_unique_ips: 0 }
        });

    } catch (error) {
        console.error('Get API key stats error:', error);
        res.status(500).json({ error: 'Failed to get API key statistics' });
    }
});

module.exports = router;