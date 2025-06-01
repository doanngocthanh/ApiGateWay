const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');
const quotaService = require('../services/quotaService');
const pool = require('../config/database');

// Global rate limiter (for all requests)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// API key quota middleware
const quotaMiddleware = async (req, res, next) => {
    try {
        if (!req.apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }

        const { id: apiKeyId, request_limit: requestLimit } = req.apiKey;
        
        // Check quota
        const quotaCheck = await quotaService.checkQuota(apiKeyId, requestLimit);
        
        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': requestLimit,
            'X-RateLimit-Remaining': quotaCheck.remaining,
            'X-RateLimit-Reset': quotaCheck.resetTime
        });
        
        if (!quotaCheck.allowed) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: `Daily quota of ${requestLimit} requests exceeded`,
                reset_time: quotaCheck.resetTime
            });
        }
        
        // Increment usage count
        await quotaService.incrementUsage(apiKeyId);
        
        // Log the request
        await logApiRequest(req, res);
        
        next();
        
    } catch (error) {
        console.error('Quota middleware error:', error);
        // Fail open - allow request if quota service fails
        next();
    }
};

// Log API request
const logApiRequest = async (req, res) => {
    try {
        const apiKeyId = req.apiKey?.id;
        if (!apiKeyId) return;
        
        const logData = {
            api_key_id: apiKeyId,
            endpoint: req.path,
            method: req.method,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent') || 'Unknown',
            response_status: res.statusCode || 200
        };
        
        // Insert asynchronously to avoid blocking the response
        setImmediate(async () => {
            try {
                await pool.query(`
                    INSERT INTO api_logs (api_key_id, endpoint, method, ip_address, user_agent, response_status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    logData.api_key_id,
                    logData.endpoint,
                    logData.method,
                    logData.ip_address,
                    logData.user_agent,
                    logData.response_status
                ]);
            } catch (error) {
                console.error('API logging error:', error);
            }
        });
        
    } catch (error) {
        console.error('Log API request error:', error);
    }
};

// Custom rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: {
        error: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

// Usage statistics endpoint
const getQuotaStats = async (req, res) => {
    try {
        if (!req.apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }
        
        const stats = await quotaService.getUsageStats(req.apiKey.id, 30);
        const quotaCheck = await quotaService.checkQuota(req.apiKey.id, req.apiKey.request_limit);
        
        res.json({
            current_usage: {
                remaining: quotaCheck.remaining,
                limit: req.apiKey.request_limit,
                reset_time: quotaCheck.resetTime
            },
            daily_stats: stats
        });
        
    } catch (error) {
        console.error('Get quota stats error:', error);
        res.status(500).json({ error: 'Failed to get quota statistics' });
    }
};

module.exports = {
    globalLimiter,
    quotaMiddleware,
    loginLimiter,
    getQuotaStats,
    logApiRequest
};