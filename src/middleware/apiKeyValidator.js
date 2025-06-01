const pool = require('../config/database');
const redis = require('../config/redis');

const validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }

        // Check if API key exists and is active
        const keyResult = await pool.query(`
            SELECT ak.id, ak.user_id, ak.status, ak.name,
                   u.email, u.status as user_status,
                   s.plan_id, s.end_date, s.status as subscription_status,
                   p.request_limit_per_day
            FROM api_keys ak
            JOIN users u ON ak.user_id = u.id
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE ak.key_value = $1
        `, [apiKey]);

        if (keyResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const keyData = keyResult.rows[0];

        // Check API key status
        if (keyData.status !== 'active') {
            return res.status(401).json({ error: 'API key deactivated' });
        }

        // Check user status
        if (keyData.user_status !== 'active') {
            return res.status(401).json({ error: 'User account deactivated' });
        }

        // Check subscription
        if (!keyData.plan_id || keyData.subscription_status !== 'active') {
            return res.status(403).json({ error: 'No active subscription' });
        }

        // Check subscription expiry
        if (new Date(keyData.end_date) < new Date()) {
            return res.status(403).json({ error: 'Subscription expired' });
        }

        // Attach data to request
        req.apiKey = {
            id: keyData.id,
            value: apiKey,
            user_id: keyData.user_id,
            plan_id: keyData.plan_id,
            request_limit: keyData.request_limit_per_day,
            name: keyData.name
        };

        // Update last used timestamp
        await pool.query(
            'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
            [keyData.id]
        );

        next();

    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({ error: 'API key validation failed' });
    }
};

module.exports = { validateApiKey };