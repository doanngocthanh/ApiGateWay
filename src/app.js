const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const planRoutes = require('./routes/plans');
const apiKeyRoutes = require('./routes/apikeys');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const proxyRoutes = require('./routes/proxy'); // New proxy management routes

const { globalLimiter, getQuotaStats } = require('./middleware/rateLimit');
const { validateApiKey } = require('./middleware/apiKeyValidator');
const { quotaMiddleware } = require('./middleware/rateLimit');
const proxyMiddleware = require('./middleware/proxyMiddleware'); // New proxy middleware

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

// Import and start health check service
const proxyHealthService = require('./services/proxyHealthService');

const app = express();

// Security and rate limiting
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/proxy', proxyRoutes); // New proxy management routes

// Example protected API endpoint with quota
app.get('/api/protected/test', validateApiKey, quotaMiddleware, (req, res) => {
    res.json({
        message: 'Hello from protected API!',
        user_id: req.apiKey.user_id,
        api_key_name: req.apiKey.name,
        remaining_quota: res.get('X-RateLimit-Remaining')
    });
});

// =============================================================================
// PROXY ENDPOINTS - These handle the actual API proxying
// =============================================================================

// Catch-all proxy route for API requests
// This should be placed after all other specific routes
app.use('/proxy/*', validateApiKey, quotaMiddleware, async (req, res) => {
    // Remove '/proxy' prefix from the path for backend routing
    req.path = req.path.replace('/proxy', '');
    req.url = req.url.replace('/proxy', '');
    
    await proxyMiddleware.proxyRequest(req, res);
});

// Alternative proxy route pattern (you can choose one approach)
// This allows more flexibility in URL patterns
app.use('/api/proxy-request/*', validateApiKey, quotaMiddleware, async (req, res) => {
    // Remove '/api/proxy-request' prefix from the path for backend routing
    req.path = req.path.replace('/api/proxy-request', '');
    req.url = req.url.replace('/api/proxy-request', '');
    
    await proxyMiddleware.proxyRequest(req, res);
});

// =============================================================================
// DOCUMENTATION AND UTILITIES
// =============================================================================

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Quota stats endpoint
app.get('/api/quota/stats', validateApiKey, getQuotaStats);

// Proxy health dashboard (Admin only)
app.get('/api/admin/proxy/health', async (req, res) => {
    try {
        const healthSummary = await proxyHealthService.getHealthSummary();
        res.json({
            success: true,
            data: {
                destinations: healthSummary,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Health dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get health summary'
        });
    }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Enhanced error response with more details for development
    const errorResponse = {
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        timestamp: new Date().toISOString()
    };
    
    // Add request context in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.request = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body
        };
    }
    
    res.status(500).json(errorResponse);
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// =============================================================================
// STARTUP INITIALIZATION
// =============================================================================

// Initialize services when app starts
const initializeServices = async () => {
    try {
        // Start proxy health check service
        await proxyHealthService.start();
        
        // Schedule cleanup of old health check records (run daily)
        setInterval(async () => {
            await proxyHealthService.cleanupOldRecords(30); // Keep 30 days
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        console.log('✅ All services initialized successfully');
    } catch (error) {
        console.error('❌ Service initialization error:', error);
    }
};

// Call initialization when module is loaded
if (process.env.NODE_ENV !== 'test') {
    initializeServices();
}

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('🔄 Graceful shutdown initiated...');
    
    // Stop health check service
    proxyHealthService.stop();
    
    // Close database connections, etc.
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;