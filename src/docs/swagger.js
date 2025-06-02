const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Management Service',
            version: '1.0.0',
            description: 'API Management with billing and quota control',
            contact: {
                name: 'Đoàn Ngọc Thành',
                email: 'support@example.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://api.example.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'An error occurred'
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object'
                            }
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Success'
                        },
                        data: {
                            type: 'object'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'user@example.com'
                        },
                        role: {
                            type: 'string',
                            enum: ['customer', 'admin'],
                            example: 'customer'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'suspended', 'banned'],
                            example: 'active'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Plan: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        name: {
                            type: 'string',
                            example: 'Pro'
                        },
                        description: {
                            type: 'string',
                            example: 'Professional plan'
                        },
                        price: {
                            type: 'number',
                            format: 'float',
                            example: 29.99
                        },
                        request_limit_per_day: {
                            type: 'integer',
                            example: 10000
                        },
                        api_key_limit: {
                            type: 'integer',
                            example: 5
                        },
                        duration_days: {
                            type: 'integer',
                            example: 30
                        }
                    }
                },
                ApiKey: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        key: {
                            type: 'string',
                            example: 'ak_live_1234567890abcdef'
                        },
                        name: {
                            type: 'string',
                            example: 'Production API Key'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'inactive', 'revoked', 'suspended'],
                            example: 'active'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        },
                        last_used_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Subscription: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            example: 1
                        },
                        plan: {
                            $ref: '#/components/schemas/Plan'
                        },
                        start_date: {
                            type: 'string',
                            format: 'date'
                        },
                        end_date: {
                            type: 'string',
                            format: 'date'
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'expired', 'cancelled'],
                            example: 'active'
                        }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        current_page: {
                            type: 'integer',
                            example: 1
                        },
                        total_pages: {
                            type: 'integer',
                            example: 5
                        },
                        total_count: {
                            type: 'integer',
                            example: 100
                        },
                        per_page: {
                            type: 'integer',
                            example: 20
                        }
                    }
                }
            }
        }
    },
    apis: ['./src/docs/routes/*.js'] // Path to API documentation files
};

module.exports = swaggerJsdoc(options);
