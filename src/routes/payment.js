const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const pay2sService = require('../services/pay2sService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ResponseHandler = require('../utils/responseHandler');

const router = express.Router();

// Get available plans
router.get('/plans', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, description, price, request_limit_per_day, 
                   api_key_limit, duration_days
            FROM plans 
            WHERE status = 'active'
            ORDER BY price ASC
        `);
        
        return ResponseHandler.success(res, {
            plans: result.rows
        });
        
    } catch (error) {
        console.error('Get plans error:', error);
        return ResponseHandler.error(res, 'Failed to get plans', 500);
    }
});

// Create payment order
router.post('/create-order', [
    authenticateToken,
    body('plan_id').isInt({ min: 1 }).withMessage('Valid plan ID required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseHandler.error(res, errors.array(), 400);
        }
        
        const { plan_id } = req.body;
        const userId = req.user.id;
        
        // Get plan details
        const planResult = await pool.query(
            'SELECT * FROM plans WHERE id = $1 AND status = $2',
            [plan_id, 'active']
        );
        
        if (planResult.rows.length === 0) {
            return ResponseHandler.error(res, 'Plan not found', 404);
        }
        
        const plan = planResult.rows[0];
        const orderId = `order_${userId}_${Date.now()}_${uuidv4().slice(0, 8)}`;
        
        // Create payment order with Pay2S
        const paymentResult = await pay2sService.createPaymentOrder({
            amount: plan.price,
            currency: 'VND',
            description: `Subscription: ${plan.name}`,
            userId: userId,
            planId: plan.id,
            orderId: orderId
        });
        
        if (!paymentResult.success) {
            return ResponseHandler.error(res, 'Failed to create payment order', 500, {
                details: paymentResult.error
            });
        }
        
        // Save payment order to database
        await pool.query(`
            INSERT INTO payment_orders (order_id, user_id, plan_id, amount, status, transaction_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            orderId,
            userId,
            plan.id,
            plan.price,
            'pending',
            paymentResult.transaction_id
        ]);
        
        return ResponseHandler.success(res, {
            payment_url: paymentResult.payment_url,
            order_id: orderId,
            plan: {
                name: plan.name,
                price: plan.price,
                duration_days: plan.duration_days
            }
        }, 'Payment order created successfully');
        
    } catch (error) {
        console.error('Create payment order error:', error);
        return ResponseHandler.error(res, 'Failed to create payment order', 500);
    }
});

// Pay2S callback endpoint
router.post('/callback', async (req, res) => {
    try {
        console.log('Pay2S callback received:', req.body);
        
        // Verify signature
        if (!pay2sService.verifyCallback(req.body)) {
            console.error('Invalid callback signature');
            return ResponseHandler.error(res, 'Invalid signature', 400);
        }
        
        const {
            order_id,
            transaction_id,
            status,
            amount,
            extra_data
        } = req.body;
        
        // Parse extra data
        const extraData = JSON.parse(extra_data || '{}');
        const { user_id, plan_id } = extraData;
        
        // Update payment order status
        await pool.query(`
            UPDATE payment_orders 
            SET status = $1, paid_at = CURRENT_TIMESTAMP, callback_data = $2
            WHERE order_id = $3
        `, [status, JSON.stringify(req.body), order_id]);
        
        // If payment successful, create subscription
        if (status === 'success' || status === 'completed') {
            await processSuccessfulPayment(user_id, plan_id, order_id, transaction_id);
        }
        
        // Respond to Pay2S
        return ResponseHandler.success(res, { success: true });
        
    } catch (error) {
        console.error('Pay2S callback error:', error);
        return ResponseHandler.error(res, 'Callback processing failed', 500);
    }
});

// Process successful payment
async function processSuccessfulPayment(userId, planId, orderId, transactionId) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get plan details
        const planResult = await client.query(
            'SELECT duration_days FROM plans WHERE id = $1',
            [planId]
        );
        
        if (planResult.rows.length === 0) {
            throw new Error('Plan not found');
        }
        
        const plan = planResult.rows[0];
        
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration_days);
        
        // Deactivate existing subscriptions
        await client.query(`
            UPDATE subscriptions 
            SET status = 'expired' 
            WHERE user_id = $1 AND status = 'active'
        `, [userId]);
        
        // Create new subscription
        await client.query(`
            INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, payment_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [userId, planId, startDate, endDate, 'active', transactionId]);
        
        // Activate user's API keys if they have any
        await client.query(`
            UPDATE api_keys 
            SET status = 'active' 
            WHERE user_id = $1 AND status = 'inactive'
        `, [userId]);
        
        await client.query('COMMIT');
        console.log(`Subscription activated for user ${userId}, plan ${planId}`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Process successful payment error:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT po.order_id, po.amount, po.status, po.created_at, po.paid_at,
                   p.name as plan_name, p.duration_days
            FROM payment_orders po
            JOIN plans p ON po.plan_id = p.id
            WHERE po.user_id = $1
            ORDER BY po.created_at DESC
        `, [req.user.id]);
        
        return ResponseHandler.success(res, {
            payments: result.rows
        });
        
    } catch (error) {
        console.error('Get payment history error:', error);
        return ResponseHandler.error(res, 'Failed to get payment history', 500);
    }
});

// Admin: Get all payments
router.get('/admin/all', [authenticateToken, requireRole(['admin'])], async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        const result = await pool.query(`
            SELECT po.*, u.email, p.name as plan_name
            FROM payment_orders po
            JOIN users u ON po.user_id = u.id
            JOIN plans p ON po.plan_id = p.id
            ORDER BY po.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        
        const countResult = await pool.query('SELECT COUNT(*) FROM payment_orders');
        const totalCount = parseInt(countResult.rows[0].count);
        
        return ResponseHandler.success(res, {
            payments: result.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(totalCount / limit),
                total_count: totalCount,
                per_page: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Admin get payments error:', error);
        return ResponseHandler.error(res, 'Failed to get payments', 500);
    }
});

module.exports = router;