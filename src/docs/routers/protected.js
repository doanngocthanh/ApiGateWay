/**
 * @swagger
 * tags:
 *   name: Protected API
 *   description: Protected endpoints requiring API key
 */

/**
 * @swagger
 * /api/protected/test:
 *   get:
 *     summary: Test protected endpoint
 *     tags: [Protected API]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Successful API call
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Hello from protected API!
 *                     user_id:
 *                       type: integer
 *                       example: 1
 *                     api_key_name:
 *                       type: string
 *                       example: Production Key
 *                     remaining_quota:
 *                       type: string
 *                       example: "9999"
 *         headers:
 *           X-RateLimit-Limit:
 *             schema:
 *               type: integer
 *             description: Request limit per day
 *           X-RateLimit-Remaining:
 *             schema:
 *               type: integer
 *             description: Remaining requests
 *           X-RateLimit-Reset:
 *             schema:
 *               type: string
 *               format: date-time
 *             description: Rate limit reset time
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Rate limit exceeded
 *                 data:
 *                   type: object
 *                   properties:
 *                     reset_time:
 *                       type: string
 *                       format: date-time
 */

/**
 * @swagger
 * /api/quota/stats:
 *   get:
 *     summary: Get API usage statistics
 *     tags: [Protected API]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Success
 *                 data:
 *                   type: object
 *                   properties:
 *                     current_usage:
 *                       type: object
 *                       properties:
 *                         remaining:
 *                           type: integer
 *                           example: 9500
 *                         limit:
 *                           type: integer
 *                           example: 10000
 *                         reset_time:
 *                           type: string
 *                           format: date-time
 *                     daily_stats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           requests:
 *                             type: integer
 */
