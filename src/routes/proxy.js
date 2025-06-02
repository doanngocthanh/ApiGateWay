const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ResponseHandler = require('../utils/responseHandler');
const proxyHealthService = require('../services/proxyHealthService');

const router = express.Router();

// =============================================================================
// ADMIN ROUTES - Proxy Destination Management
// =============================================================================

// Get all proxy destinations (Admin only)
router.get('/admin/destinations', [
    authenticateToken,
    requireRole(['admin'])
], async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'all' } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = '1=1';
        const params = [];
        
        if (status !== 'all') {
            whereClause += ' AND status = $1';
            params.push(status);
        }
        
        const query = `
            SELECT pd.*, 
                   COUNT(akpm.id) as mapped_api_keys,
                   COUNT(pl.id) as total_requests,
                   AVG(pl.response_time_ms) as avg_response_time
            FROM proxy_destinations pd
            LEFT JOIN api_key_proxy_mappings akpm ON pd.id = akpm.proxy_destination_id 
                AND akpm.status = 'active'
            LEFT JOIN proxy_logs pl ON pd.id = pl.proxy_destination_id 
                AND pl.started_at >= CURRENT_DATE - INTERVAL '7 days'
            WHERE ${whereClause}
            GROUP BY pd.id
            ORDER BY pd.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        params.push(limit, offset);
        const result = await pool.query(query, params);
        
        // Get total count
        const countQuery = `SELECT COUNT(*) FROM proxy_destinations WHERE ${whereClause}`;
        const countResult = await pool.query(countQuery, params.slice(0, -2));
        
        return ResponseHandler.success(res, {
            destinations: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(countResult.rows[0].count / limit),
                total_count: parseInt(countResult.rows[0].count),
                per_page: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Get proxy destinations error:', error);
        return ResponseHandler.error(res, 'Failed to get proxy destinations', 500);
    }
});

// Create new proxy destination (Admin only)
router.post('/admin/destinations', [
    authenticateToken,
    requireRole(['admin']),
    body('name').notEmpty().withMessage('Name is required'),
    body('base_url').isURL().withMessage('Valid base URL required'),
    body('auth_type').optional().isIn(['none', 'bearer', 'basic', 'api_key']),
    body('timeout_ms').optional().isInt({ min: 1000, max: 300000 }),
    body('max_retries').optional().isInt({ min: 0, max: 10 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const {
            name, description, base_url, method_override, timeout_ms,
            max_retries, health_check_url, health_check_interval_seconds,
            auth_type, auth_header_name, auth_token, auth_username, auth_password,
            strip_path_prefix, add_path_prefix, custom_headers,
            transform_request, transform_response, backend_rate_limit, backend_rate_window_ms
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO proxy_destinations (
                name, description, base_url, method_override, timeout_ms, max_retries,
                health_check_url, health_check_interval_seconds, auth_type, auth_header_name,
                auth_token, auth_username, auth_password, strip_path_prefix, add_path_prefix,
                custom_headers, transform_request, transform_response, backend_rate_limit, backend_rate_window_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `, [
            name, description, base_url, method_override, timeout_ms, max_retries,
            health_check_url, health_check_interval_seconds, auth_type, auth_header_name,
            auth_token, auth_username, auth_password, strip_path_prefix, add_path_prefix,
            JSON.stringify(custom_headers), JSON.stringify(transform_request), 
            JSON.stringify(transform_response), backend_rate_limit, backend_rate_window_ms
        ]);
        
        return ResponseHandler.success(res, {
            destination: result.rows[0]
        }, 'Proxy destination created successfully', 201);
        
    } catch (error) {
        console.error('Create proxy destination error:', error);
        return ResponseHandler.error(res, 'Failed to create proxy destination', 500);
    }
});

// Update proxy destination (Admin only)
router.put('/admin/destinations/:destinationId', [
    authenticateToken,
    requireRole(['admin']),
    param('destinationId').isInt(),
    body('name').optional().notEmpty(),
    body('base_url').optional().isURL(),
    body('auth_type').optional().isIn(['none', 'bearer', 'basic', 'api_key'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const { destinationId } = req.params;
        const updates = req.body;
        
        // Build dynamic update query
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        const values = [destinationId, ...Object.values(updates)];
        
        const result = await pool.query(`
            UPDATE proxy_destinations 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING *
        `, values);
        
        if (result.rows.length === 0) {
            return ResponseHandler.error(res, 'Proxy destination not found', 404);
        }
        
        return ResponseHandler.success(res, {
            destination: result.rows[0]
        }, 'Proxy destination updated successfully');
        
    } catch (error) {
        console.error('Update proxy destination error:', error);
        return ResponseHandler.error(res, 'Failed to update proxy destination', 500);
    }
});

// Delete proxy destination (Admin only)
router.delete('/admin/destinations/:destinationId', [
    authenticateToken,
    requireRole(['admin']),
    param('destinationId').isInt()
], async (req, res) => {
    try {
        const { destinationId } = req.params;
        
        const result = await pool.query(
            'UPDATE proxy_destinations SET status = $1 WHERE id = $2 RETURNING id',
            ['deleted', destinationId]
        );
        
        if (result.rows.length === 0) {
            return ResponseHandler.error(res, 'Proxy destination not found', 404);
        }
        
        return ResponseHandler.success(res, null, 'Proxy destination deleted successfully');
        
    } catch (error) {
        console.error('Delete proxy destination error:', error);
        return ResponseHandler.error(res, 'Failed to delete proxy destination', 500);
    }
});

// Test proxy destination health (Admin only)
router.post('/admin/destinations/:destinationId/health-check', [
    authenticateToken,
    requireRole(['admin']),
    param('destinationId').isInt()
], async (req, res) => {
    try {
        const { destinationId } = req.params;
        
        const destinationResult = await pool.query(
            'SELECT * FROM proxy_destinations WHERE id = $1',
            [destinationId]
        );
        
        if (destinationResult.rows.length === 0) {
            return ResponseHandler.error(res, 'Proxy destination not found', 404);
        }
        
        const destination = destinationResult.rows[0];
        const healthCheck = await proxyHealthService.checkHealth(destination);
        
        return ResponseHandler.success(res, {
            health_check: healthCheck
        }, 'Health check completed');
        
    } catch (error) {
        console.error('Health check error:', error);
        return ResponseHandler.error(res, 'Failed to perform health check', 500);
    }
});

// =============================================================================
// USER ROUTES - API Key Proxy Mappings
// =============================================================================

// Get user's proxy mappings
router.get('/mappings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT akpm.*, pd.name as destination_name, pd.base_url, pd.is_healthy
            FROM api_key_proxy_mappings akpm
            JOIN proxy_destinations pd ON akpm.proxy_destination_id = pd.id
            JOIN api_keys ak ON akpm.api_key_id = ak.id
            WHERE ak.user_id = $1 AND akpm.status = 'active'
            ORDER BY pd.name, akpm.path_pattern
        `, [req.user.id]);
        
        return ResponseHandler.success(res, {
            mappings: result.rows
        });
        
    } catch (error) {
        console.error('Get proxy mappings error:', error);
        return ResponseHandler.error(res, 'Failed to get proxy mappings', 500);
    }
});

// Create proxy mapping for user's API key
router.post('/mappings', [
    authenticateToken,
    body('api_key_id').isInt().withMessage('Valid API key ID required'),
    body('proxy_destination_id').isInt().withMessage('Valid destination ID required'),
    body('path_pattern').optional().isLength({ min: 1, max: 200 }),
    body('allowed_methods').optional().matches(/^[A-Z,]+$/).withMessage('Valid methods required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const {
            api_key_id, proxy_destination_id, path_pattern = '*',
            allowed_methods = 'GET,POST,PUT,DELETE', priority = 100
        } = req.body;
        
        // Verify API key belongs to user
        const keyResult = await pool.query(
            'SELECT id FROM api_keys WHERE id = $1 AND user_id = $2',
            [api_key_id, req.user.id]
        );
        
        if (keyResult.rows.length === 0) {
            return ResponseHandler.error(res, 'API key not found or unauthorized', 404);
        }
        
        // Verify destination exists and is active
        const destResult = await pool.query(
            'SELECT id FROM proxy_destinations WHERE id = $1 AND status = $2',
            [proxy_destination_id, 'active']
        );
        
        if (destResult.rows.length === 0) {
            return ResponseHandler.error(res, 'Proxy destination not found or inactive', 404);
        }
        
        const result = await pool.query(`
            INSERT INTO api_key_proxy_mappings (api_key_id, proxy_destination_id, path_pattern, allowed_methods, priority)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [api_key_id, proxy_destination_id, path_pattern, allowed_methods, priority]);
        
        return ResponseHandler.success(res, {
            mapping: result.rows[0]
        }, 'Proxy mapping created successfully', 201);
        
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return ResponseHandler.error(res, 'Mapping already exists for this API key and destination', 409);
        }
        console.error('Create proxy mapping error:', error);
        return ResponseHandler.error(res, 'Failed to create proxy mapping', 500);
    }
});

// Update proxy mapping
router.put('/mappings/:mappingId', [
    authenticateToken,
    param('mappingId').isInt(),
    body('path_pattern').optional().isLength({ min: 1, max: 200 }),
    body('allowed_methods').optional().matches(/^[A-Z,]+$/)
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const { mappingId } = req.params;
        const updates = req.body;
        
        // Verify mapping belongs to user's API key
        const verifyResult = await pool.query(`
            SELECT akpm.id FROM api_key_proxy_mappings akpm
            JOIN api_keys ak ON akpm.api_key_id = ak.id
            WHERE akpm.id = $1 AND ak.user_id = $2
        `, [mappingId, req.user.id]);
        
        if (verifyResult.rows.length === 0) {
            return ResponseHandler.error(res, 'Proxy mapping not found', 404);
        }
        
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        const values = [mappingId, ...Object.values(updates)];
        
        const result = await pool.query(`
            UPDATE api_key_proxy_mappings 
            SET ${setClause} 
            WHERE id = $1 
            RETURNING *
        `, values);
        
        return ResponseHandler.success(res, {
            mapping: result.rows[0]
        }, 'Proxy mapping updated successfully');
        
    } catch (error) {
        console.error('Update proxy mapping error:', error);
        return ResponseHandler.error(res, 'Failed to update proxy mapping', 500);
    }
});

// Delete proxy mapping
router.delete('/mappings/:mappingId', [
    authenticateToken,
    param('mappingId').isInt()
], async (req, res) => {
    try {
        const { mappingId } = req.params;
        
        // Verify mapping belongs to user's API key
        const result = await pool.query(`
            UPDATE api_key_proxy_mappings 
            SET status = 'deleted' 
            FROM api_keys 
            WHERE api_key_proxy_mappings.id = $1 
                AND api_key_proxy_mappings.api_key_id = api_keys.id 
                AND api_keys.user_id = $2
            RETURNING api_key_proxy_mappings.id
        `, [mappingId, req.user.id]);
        
        if (result.rows.length === 0) {
            return ResponseHandler.error(res, 'Proxy mapping not found', 404);
        }
        
        return ResponseHandler.success(res, null, 'Proxy mapping deleted successfully');
        
    } catch (error) {
        console.error('Delete proxy mapping error:', error);
        return ResponseHandler.error(res, 'Failed to delete proxy mapping', 500);
    }
});

// =============================================================================
// ANALYTICS ROUTES
// =============================================================================

// Get proxy analytics for user
router.get('/analytics', [
    authenticateToken,
    query('days').optional().isInt({ min: 1, max: 90 })
], async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        // Get daily request counts
        const dailyStats = await pool.query(`
            SELECT 
                DATE(pl.started_at) as date,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN pl.response_status < 400 THEN 1 END) as successful_requests,
                AVG(pl.response_time_ms) as avg_response_time,
                COUNT(DISTINCT pl.proxy_destination_id) as destinations_used
            FROM proxy_logs pl
            JOIN api_keys ak ON pl.api_key_id = ak.id
            WHERE ak.user_id = $1 
                AND pl.started_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY DATE(pl.started_at)
            ORDER BY date DESC
        `, [req.user.id]);
        
        // Get top destinations
        const topDestinations = await pool.query(`
            SELECT 
                pd.name,
                COUNT(*) as request_count,
                AVG(pl.response_time_ms) as avg_response_time,
                COUNT(CASE WHEN pl.response_status < 400 THEN 1 END)::float / COUNT(*) * 100 as success_rate
            FROM proxy_logs pl
            JOIN proxy_destinations pd ON pl.proxy_destination_id = pd.id
            JOIN api_keys ak ON pl.api_key_id = ak.id
            WHERE ak.user_id = $1 
                AND pl.started_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY pd.id, pd.name
            ORDER BY request_count DESC
            LIMIT 10
        `, [req.user.id]);
        
        // Get error breakdown
        const errorStats = await pool.query(`
            SELECT 
                CASE 
                    WHEN pl.response_status BETWEEN 400 AND 499 THEN '4xx Client Error'
                    WHEN pl.response_status BETWEEN 500 AND 599 THEN '5xx Server Error'
                    WHEN pl.error_message IS NOT NULL THEN 'Network Error'
                    ELSE 'Success'
                END as error_type,
                COUNT(*) as count
            FROM proxy_logs pl
            JOIN api_keys ak ON pl.api_key_id = ak.id
            WHERE ak.user_id = $1 
                AND pl.started_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY error_type
            ORDER BY count DESC
        `, [req.user.id]);
        
        return ResponseHandler.success(res, {
            period_days: parseInt(days),
            daily_stats: dailyStats.rows,
            top_destinations: topDestinations.rows,
            error_breakdown: errorStats.rows
        });
        
    } catch (error) {
        console.error('Get proxy analytics error:', error);
        return ResponseHandler.error(res, 'Failed to get proxy analytics', 500);
    }
});

// Get available proxy destinations (for users to browse)
router.get('/destinations', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, description, base_url, is_healthy, 
                   health_check_url IS NOT NULL as has_health_check
            FROM proxy_destinations 
            WHERE status = 'active'
            ORDER BY name
        `);
        
        return ResponseHandler.success(res, {
            destinations: result.rows
        });
        
    } catch (error) {
        console.error('Get available destinations error:', error);
        return ResponseHandler.error(res, 'Failed to get available destinations', 500);
    }
});

module.exports = router;