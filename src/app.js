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

const { globalLimiter, getQuotaStats } = require('./middleware/rateLimit');
const { validateApiKey } = require('./middleware/apiKeyValidator');
const { quotaMiddleware } = require('./middleware/rateLimit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

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

// Example protected API endpoint with quota
app.get('/api/protected/test', validateApiKey, quotaMiddleware, (req, res) => {
    res.json({
        message: 'Hello from protected API!',
        user_id: req.apiKey.user_id,
        api_key_name: req.apiKey.name,
        remaining_quota: res.get('X-RateLimit-Remaining')
    });
});
// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Quota stats endpoint
app.get('/api/quota/stats', validateApiKey, getQuotaStats);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

module.exports = app;