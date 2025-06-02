const axios = require('axios');
const pool = require('../config/database');
const { performance } = require('perf_hooks');

class ProxyMiddleware {
    constructor() {
        this.axios = axios.create({
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: () => true // Don't throw on any status
        });
    }

    // Main proxy middleware
    async proxyRequest(req, res, next) {
        try {
            if (!req.apiKey) {
                return res.status(401).json({ error: 'API key required for proxy' });
            }

            // Find matching proxy destination
            const proxyConfig = await this.findProxyDestination(req.apiKey.id, req.path, req.method);
            
            if (!proxyConfig) {
                return res.status(404).json({ 
                    error: 'No proxy destination configured for this path',
                    path: req.path,
                    method: req.method 
                });
            }

            // Check if destination is healthy
            if (!proxyConfig.is_healthy) {
                return res.status(503).json({ 
                    error: 'Backend service temporarily unavailable' 
                });
            }

            const startTime = performance.now();
            
            // Build backend request
            const backendRequest = await this.buildBackendRequest(req, proxyConfig);
            
            // Execute proxy request with retries
            const response = await this.executeProxyRequest(backendRequest, proxyConfig);
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            // Log the proxy request
            await this.logProxyRequest(req, proxyConfig, backendRequest, response, responseTime);

            // Transform response if needed
            const transformedResponse = await this.transformResponse(response, proxyConfig);

            // Send response back to client
            this.sendProxyResponse(res, transformedResponse);

        } catch (error) {
            console.error('Proxy middleware error:', error);
            
            // Log the error
            if (req.apiKey) {
                await this.logProxyError(req, error);
            }
            
            res.status(502).json({ 
                error: 'Bad Gateway',
                message: 'Failed to proxy request to backend service'
            });
        }
    }

    // Find the appropriate proxy destination for the request
    async findProxyDestination(apiKeyId, path, method) {
        const query = `
            SELECT pd.*, akpm.path_pattern, akpm.allowed_methods, 
                   akpm.custom_timeout_ms, akpm.custom_headers, akpm.priority
            FROM proxy_destinations pd
            JOIN api_key_proxy_mappings akpm ON pd.id = akpm.proxy_destination_id
            WHERE akpm.api_key_id = $1 
                AND pd.status = 'active' 
                AND akpm.status = 'active'
                AND ($2 ~ akpm.path_pattern OR akpm.path_pattern = '*')
                AND ($3 = ANY(string_to_array(akpm.allowed_methods, ',')))
            ORDER BY akpm.priority ASC, LENGTH(akpm.path_pattern) DESC
            LIMIT 1
        `;
        
        const result = await pool.query(query, [apiKeyId, path, method]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    // Build the backend request
    async buildBackendRequest(req, proxyConfig) {
        let backendPath = req.path;
        
        // Transform path if needed
        if (proxyConfig.strip_path_prefix) {
            backendPath = backendPath.replace(new RegExp(`^${proxyConfig.strip_path_prefix}`), '');
        }
        
        if (proxyConfig.add_path_prefix) {
            backendPath = proxyConfig.add_path_prefix + backendPath;
        }

        // Build full backend URL
        const backendUrl = `${proxyConfig.base_url}${backendPath}`;
        
        // Prepare headers
        const headers = { ...req.headers };
        
        // Remove hop-by-hop headers
        delete headers.host;
        delete headers.connection;
        delete headers['proxy-authorization'];
        delete headers['x-api-key']; // Remove our API key
        
        // Add custom headers from config
        if (proxyConfig.custom_headers) {
            Object.assign(headers, proxyConfig.custom_headers);
        }
        
        // Add authentication headers for backend
        this.addAuthHeaders(headers, proxyConfig);
        
        return {
            method: proxyConfig.method_override || req.method,
            url: backendUrl,
            headers,
            data: req.body,
            params: req.query,
            timeout: proxyConfig.custom_timeout_ms || proxyConfig.timeout_ms || 30000
        };
    }

    // Add authentication headers for backend service
    addAuthHeaders(headers, proxyConfig) {
        switch (proxyConfig.auth_type) {
            case 'bearer':
                if (proxyConfig.auth_token) {
                    headers.Authorization = `Bearer ${proxyConfig.auth_token}`;
                }
                break;
                
            case 'api_key':
                if (proxyConfig.auth_header_name && proxyConfig.auth_token) {
                    headers[proxyConfig.auth_header_name] = proxyConfig.auth_token;
                }
                break;
                
            case 'basic':
                if (proxyConfig.auth_username && proxyConfig.auth_password) {
                    const credentials = Buffer.from(
                        `${proxyConfig.auth_username}:${proxyConfig.auth_password}`
                    ).toString('base64');
                    headers.Authorization = `Basic ${credentials}`;
                }
                break;
        }
    }

    // Execute proxy request with retry logic
    async executeProxyRequest(backendRequest, proxyConfig, retryCount = 0) {
        try {
            const response = await this.axios(backendRequest);
            return response;
        } catch (error) {
            const maxRetries = proxyConfig.max_retries || 3;
            
            if (retryCount < maxRetries && this.shouldRetry(error)) {
                console.log(`Retrying proxy request (attempt ${retryCount + 1}/${maxRetries})`);
                await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
                return this.executeProxyRequest(backendRequest, proxyConfig, retryCount + 1);
            }
            
            throw error;
        }
    }

    // Determine if request should be retried
    shouldRetry(error) {
        if (error.code === 'ECONNABORTED') return true; // Timeout
        if (error.code === 'ECONNRESET') return true;   // Connection reset
        if (error.code === 'ENOTFOUND') return false;   // DNS error - don't retry
        
        const status = error.response?.status;
        if (status >= 500 && status < 600) return true; // Server errors
        if (status === 429) return true;                // Rate limited
        
        return false;
    }

    // Transform response based on config
    async transformResponse(response, proxyConfig) {
        let transformedData = response.data;
        
        if (proxyConfig.transform_response) {
            // Apply response transformations
            // This is a placeholder - implement based on your needs
            transformedData = this.applyTransformations(transformedData, proxyConfig.transform_response);
        }
        
        return {
            ...response,
            data: transformedData
        };
    }

    // Apply transformation rules (placeholder implementation)
    applyTransformations(data, transformRules) {
        // Implement your transformation logic here
        // Examples: field mapping, data filtering, format conversion
        if (transformRules.exclude_fields) {
            transformRules.exclude_fields.forEach(field => {
                delete data[field];
            });
        }
        
        if (transformRules.field_mapping) {
            Object.entries(transformRules.field_mapping).forEach(([oldKey, newKey]) => {
                if (data[oldKey] !== undefined) {
                    data[newKey] = data[oldKey];
                    delete data[oldKey];
                }
            });
        }
        
        return data;
    }

    // Send proxy response back to client
    sendProxyResponse(res, response) {
        // Set response headers (excluding hop-by-hop headers)
        if (response.headers) {
            Object.entries(response.headers).forEach(([key, value]) => {
                if (!this.isHopByHopHeader(key)) {
                    res.set(key, value);
                }
            });
        }
        
        res.status(response.status).send(response.data);
    }

    // Check if header is hop-by-hop
    isHopByHopHeader(header) {
        const hopByHopHeaders = [
            'connection', 'keep-alive', 'proxy-authenticate',
            'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade'
        ];
        return hopByHopHeaders.includes(header.toLowerCase());
    }

    // Log proxy request
    async logProxyRequest(req, proxyConfig, backendRequest, response, responseTime) {
        try {
            await pool.query(`
                INSERT INTO proxy_logs (
                    api_key_id, proxy_destination_id, request_method, request_path,
                    request_query, request_headers, request_body_size,
                    backend_url, backend_method, backend_headers,
                    response_status, response_headers, response_body_size,
                    response_time_ms, client_ip, user_agent, completed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            `, [
                req.apiKey.id,
                proxyConfig.id,
                req.method,
                req.path,
                JSON.stringify(req.query),
                JSON.stringify(req.headers),
                JSON.stringify(req.body).length,
                backendRequest.url,
                backendRequest.method,
                JSON.stringify(backendRequest.headers),
                response.status,
                JSON.stringify(response.headers),
                JSON.stringify(response.data).length,
                responseTime,
                req.ip,
                req.get('User-Agent'),
                new Date()
            ]);
        } catch (error) {
            console.error('Failed to log proxy request:', error);
        }
    }

    // Log proxy error
    async logProxyError(req, error) {
        try {
            await pool.query(`
                INSERT INTO proxy_logs (
                    api_key_id, request_method, request_path, request_query,
                    request_headers, error_message, client_ip, user_agent, completed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                req.apiKey.id,
                req.method,
                req.path,
                JSON.stringify(req.query),
                JSON.stringify(req.headers),
                error.message,
                req.ip,
                req.get('User-Agent'),
                new Date()
            ]);
        } catch (logError) {
            console.error('Failed to log proxy error:', logError);
        }
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new ProxyMiddleware();