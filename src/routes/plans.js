const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all active plans (public endpoint)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, description, price, request_limit_per_day, 
                   api_key_limit, duration_days, created_at
            FROM plans 
            WHERE status = 'active'
            ORDER BY price ASC
        `);

        const plans = result.rows.map(plan => ({
            ...plan,
            features: [
                `${plan.request_limit_per_day.toLocaleString()} requests per day`,
                `Up to ${plan.api_key_limit} API keys`,
                `${plan.duration_days} days subscription`,
                plan.price === 0 ? 'Basic support' : 'Priority support'
            ]
        }));

        res.json({
            plans: plans
        });

    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

// Get plan details by ID
router.get('/:planId', async (req, res) => {
    try {
        const { planId } = req.params;

        const result = await pool.query(`
            SELECT p.*, COUNT(s.id) as active_subscribers
            FROM plans p
            LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.status = 'active'
            WHERE p.id = $1 AND p.status = 'active'
            GROUP BY p.id
        `, [planId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const plan = result.rows[0];
        
        res.json({
            plan: {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                price: plan.price,
                request_limit_per_day: plan.request_limit_per_day,
                api_key_limit: plan.api_key_limit,
                duration_days: plan.duration_days,
                active_subscribers: parseInt(plan.active_subscribers),
                features: [
                    `${plan.request_limit_per_day.toLocaleString()} requests per day`,
                    `Up to ${plan.api_key_limit} API keys`,
                    `${plan.duration_days} days subscription`,
                    plan.price === 0 ? 'Basic support' : 'Priority support',
                    'API usage analytics',
                    'Rate limiting protection'
                ]
            }
        });

    } catch (error) {
        console.error('Get plan details error:', error);
        res.status(500).json({ error: 'Failed to get plan details' });
    }
});

// Compare plans (helpful for frontend pricing tables)
router.get('/compare/all', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, description, price, request_limit_per_day, 
                   api_key_limit, duration_days
            FROM plans 
            WHERE status = 'active'
            ORDER BY price ASC
        `);

        const comparison = {
            plans: result.rows,
            features: [
                {
                    name: 'Daily Requests',
                    values: result.rows.map(plan => plan.request_limit_per_day.toLocaleString())
                },
                {
                    name: 'API Keys',
                    values: result.rows.map(plan => plan.api_key_limit)
                },
                {
                    name: 'Subscription Period',
                    values: result.rows.map(plan => `${plan.duration_days} days`)
                },
                {
                    name: 'Support Level',
                    values: result.rows.map(plan => plan.price === 0 ? 'Basic' : 'Priority')
                },
                {
                    name: 'Analytics',
                    values: result.rows.map(() => 'Included')
                },
                {
                    name: 'Rate Limiting',
                    values: result.rows.map(() => 'Protected')
                }
            ]
        };

        res.json(comparison);

    } catch (error) {
        console.error('Compare plans error:', error);
        res.status(500).json({ error: 'Failed to compare plans' });
    }
});

// Get user's plan history (requires authentication)
router.get('/user/history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.*, p.name, p.description, p.price, p.request_limit_per_day
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `, [req.user.id]);

        const subscriptions = result.rows.map(sub => ({
            id: sub.id,
            plan: {
                id: sub.plan_id,
                name: sub.name,
                description: sub.description,
                price: sub.price,
                request_limit_per_day: sub.request_limit_per_day
            },
            start_date: sub.start_date,
            end_date: sub.end_date,
            status: sub.status,
            created_at: sub.created_at,
            is_current: sub.status === 'active'
        }));

        res.json({
            subscriptions: subscriptions
        });

    } catch (error) {
        console.error('Get user plan history error:', error);
        res.status(500).json({ error: 'Failed to get plan history' });
    }
});

// Check if user can upgrade/downgrade (requires authentication)
router.get('/user/upgrade-options', authenticateToken, async (req, res) => {
    try {
        // Get user's current plan
        const currentPlanResult = await pool.query(`
            SELECT s.plan_id, p.price, p.name
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1 AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [req.user.id]);

        // Get all available plans
        const allPlansResult = await pool.query(`
            SELECT id, name, description, price, request_limit_per_day, 
                   api_key_limit, duration_days
            FROM plans 
            WHERE status = 'active'
            ORDER BY price ASC
        `);

        const currentPlan = currentPlanResult.rows[0];
        const allPlans = allPlansResult.rows;

        if (!currentPlan) {
            // User has no active subscription, can choose any plan
            return res.json({
                current_plan: null,
                available_upgrades: allPlans,
                available_downgrades: [],
                can_upgrade: true,
                can_downgrade: false
            });
        }

        const upgrades = allPlans.filter(plan => plan.price > currentPlan.price);
        const downgrades = allPlans.filter(plan => plan.price < currentPlan.price);

        res.json({
            current_plan: {
                id: currentPlan.plan_id,
                name: currentPlan.name,
                price: currentPlan.price
            },
            available_upgrades: upgrades,
            available_downgrades: downgrades,
            can_upgrade: upgrades.length > 0,
            can_downgrade: downgrades.length > 0
        });

    } catch (error) {
        console.error('Get upgrade options error:', error);
        res.status(500).json({ error: 'Failed to get upgrade options' });
    }
});

module.exports = router;