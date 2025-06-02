class ResponseHandler {
    /**
     * Standard success response
     * @param {Object} res - Express response object
     * @param {Object} data - Response data
     * @param {String} message - Success message
     * @param {Number} statusCode - HTTP status code
     */
    static success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Standard error response
     * @param {Object} res - Express response object
     * @param {String} message - Error message
     * @param {Number} statusCode - HTTP status code
     * @param {Object} errors - Validation errors or additional error details
     */
    static error(res, message = 'An error occurred', statusCode = 400, errors = null) {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString()
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Validation error response
     * @param {Object} res - Express response object
     * @param {Array} errors - Validation errors from express-validator
     */
    static validationError(res, errors) {
        return this.error(res, 'Validation failed', 422, errors);
    }

    /**
     * Not found response
     * @param {Object} res - Express response object
     * @param {String} resource - Resource name
     */
    static notFound(res, resource = 'Resource') {
        return this.error(res, `${resource} not found`, 404);
    }

    /**
     * Unauthorized response
     * @param {Object} res - Express response object
     * @param {String} message - Custom message
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    }

    /**
     * Forbidden response
     * @param {Object} res - Express response object
     * @param {String} message - Custom message
     */
    static forbidden(res, message = 'Access forbidden') {
        return this.error(res, message, 403);
    }

    /**
     * Rate limit response
     * @param {Object} res - Express response object
     * @param {Object} details - Rate limit details
     */
    static rateLimitExceeded(res, details = {}) {
        return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded',
            data: details,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Paginated response
     * @param {Object} res - Express response object
     * @param {Array} items - Array of items
     * @param {Object} pagination - Pagination metadata
     * @param {String} message - Success message
     */
    static paginated(res, items, pagination, message = 'Success') {
        return res.status(200).json({
            success: true,
            message,
            data: {
                items,
                pagination
            },
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = ResponseHandler;