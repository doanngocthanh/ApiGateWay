const axios = require('axios');
const pool = require('../config/database');
const { performance } = require('perf_hooks');

class ProxyHealthService {
    constructor() {
        this.healthCheckIntervals = new Map();
        this.isRunning = false;
    }

    // Start health check service
    async start() {
        if (this.isRunning) return;
        
        console.log('🏥 Starting Proxy Health Check Service...');
        this.isRunning = true;
        
        // Get all active destinations with health checks
        const destinations = await this.getDestinationsWithHealthChecks();
        
        // Start health check intervals for each destination
        destinations.forEach(destination => {
            this.startHealthCheckInterval(destination);
        });
        
        console.log(`✅ Health check service started for ${destinations.length} destinations`);
    }

    // Stop health check service
    stop() {
        console.log('🛑 Stopping Proxy Health Check Service...');
        this.isRunning = false;
        
        // Clear all intervals
        this.healthCheckIntervals.forEach(interval => {
            clearInterval(interval);
        });
        this.healthCheckIntervals.clear();
        
        console.log('✅ Health check service stopped');
    }

    // Get destinations that have health check configuration
    async getDestinationsWithHealthChecks() {
        try {
            const result = await pool.query(`
                SELECT id, name, base_url, health_check_url, health_check_interval_seconds,
                       timeout_ms, auth_type, auth_header_name, auth_token, auth_username, auth_password
                FROM proxy_destinations 
                WHERE status = 'active' 
                    AND health_check_url IS NOT NULL 
                    AND health_check_url != ''
            `);
            
            return result.rows;
        } catch (error) {
            console.error('Failed to get destinations with health checks:', error);
            return [];
        }
    }

    // Start health check interval for a destination
    startHealthCheckInterval(destination) {
        const intervalMs = (destination.health_check_interval_seconds || 300) * 1000;
        
        // Perform initial health check
        this.checkHealth(destination);
        
        // Set up recurring health checks
        const interval = setInterval(() => {
            this.checkHealth(destination);
        }, intervalMs);
        
        this.healthCheckIntervals.set(destination.id, interval);
        
        console.log(`⏰ Health check interval started for "${destination.name}" (every ${destination.health_check_interval_seconds || 300}s)`);
    }

    // Add new destination to health monitoring
    async addDestination(destination) {
        if (!this.isRunning) return;
        
        if (destination.health_check_url) {
            this.startHealthCheckInterval(destination);
        }
    }

    // Remove destination from health monitoring
    removeDestination(destinationId) {
        const interval = this.healthCheckIntervals.get(destinationId);
        if (interval) {
            clearInterval(interval);
            this.healthCheckIntervals.delete(destinationId);
            console.log(`🗑️ Health check stopped for destination ${destinationId}`);
        }
    }

    // Perform health check for a destination
    async checkHealth(destination) {
        const startTime = performance.now();
        let healthResult;
        
        try {
            console.log(`🏥 Checking health for "${destination.name}"...`);
            
            // Build health check request
            const healthCheckUrl = destination.health_check_url || destination.base_url;
            const options = {
                method: 'GET',
                url: healthCheckUrl,
                timeout: destination.timeout_ms || 30000,
                validateStatus: (status) => status < 500 // Consider 4xx as healthy
            };
            
            // Add authentication if configured
            this.addAuthToRequest(options, destination);
            
            // Perform health check
            const response = await axios(options);
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            const isHealthy = response.status < 400;
            
            healthResult = {
                destination_id: destination.id,
                is_healthy: isHealthy,
                response_time_ms: responseTime,
                status_code: response.status,
                error_message: null,
                checked_at: new Date()
            };
            
            console.log(`${isHealthy ? '✅' : '❌'} Health check for "${destination.name}": ${response.status} (${responseTime}ms)`);
            
        } catch (error) {
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            healthResult = {
                destination_id: destination.id,
                is_healthy: false,
                response_time_ms: responseTime,
                status_code: null,
                error_message: error.message,
                checked_at: new Date()
            };
            
            console.log(`❌ Health check failed for "${destination.name}": ${error.message}`);
        }
        
        // Save health check result
        await this.saveHealthCheckResult(healthResult);
        
        // Update destination health status
        await this.updateDestinationHealth(destination.id, healthResult.is_healthy);
        
        return healthResult;
    }

    // Add authentication to health check request
    addAuthToRequest(options, destination) {
        switch (destination.auth_type) {
            case 'bearer':
                if (destination.auth_token) {
                    options.headers = options.headers || {};
                    options.headers.Authorization = `Bearer ${destination.auth_token}`;
                }
                break;
                
            case 'api_key':
                if (destination.auth_header_name && destination.auth_token) {
                    options.headers = options.headers || {};
                    options.headers[destination.auth_header_name] = destination.auth_token;
                }
                break;
                
            case 'basic':
                if (destination.auth_username && destination.auth_password) {
                    options.auth = {
                        username: destination.auth_username,
                        password: destination.auth_password
                    };
                }
                break;
        }
    }

    // Save health check result to database
    async saveHealthCheckResult(healthResult) {
        try {
            await pool.query(`
                INSERT INTO proxy_health_checks (
                    proxy_destination_id, is_healthy, response_time_ms, 
                    status_code, error_message, checked_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                healthResult.destination_id,
                healthResult.is_healthy,
                healthResult.response_time_ms,
                healthResult.status_code,
                healthResult.error_message,
                healthResult.checked_at
            ]);
        } catch (error) {
            console.error('Failed to save health check result:', error);
        }
    }

    // Update destination health status
    async updateDestinationHealth(destinationId, isHealthy) {
        try {
            await pool.query(`
                UPDATE proxy_destinations 
                SET is_healthy = $1, last_health_check = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [isHealthy, destinationId]);
        } catch (error) {
            console.error('Failed to update destination health:', error);
        }
    }

    // Get health history for a destination
    async getHealthHistory(destinationId, hours = 24) {
        try {
            const result = await pool.query(`
                SELECT is_healthy, response_time_ms, status_code, error_message, checked_at
                FROM proxy_health_checks 
                WHERE proxy_destination_id = $1 
                    AND checked_at >= NOW() - INTERVAL '${hours} hours'
                ORDER BY checked_at DESC
                LIMIT 100
            `, [destinationId]);
            
            return result.rows;
        } catch (error) {
            console.error('Failed to get health history:', error);
            return [];
        }
    }

    // Get health summary for all destinations
    async getHealthSummary() {
        try {
            const result = await pool.query(`
                SELECT 
                    pd.id, pd.name, pd.base_url, pd.is_healthy, pd.last_health_check,
                    phc.response_time_ms, phc.status_code, phc.error_message,
                    COUNT(phc_24h.id) as checks_last_24h,
                    COUNT(CASE WHEN phc_24h.is_healthy = true THEN 1 END) as healthy_checks_24h,
                    AVG(phc_24h.response_time_ms) as avg_response_time_24h
                FROM proxy_destinations pd
                LEFT JOIN proxy_health_checks phc ON pd.id = phc.proxy_destination_id 
                    AND phc.checked_at = pd.last_health_check
                LEFT JOIN proxy_health_checks phc_24h ON pd.id = phc_24h.proxy_destination_id 
                    AND phc_24h.checked_at >= NOW() - INTERVAL '24 hours'
                WHERE pd.status = 'active'
                GROUP BY pd.id, pd.name, pd.base_url, pd.is_healthy, pd.last_health_check,
                         phc.response_time_ms, phc.status_code, phc.error_message
                ORDER BY pd.name
            `);
            
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                base_url: row.base_url,
                is_healthy: row.is_healthy,
                last_health_check: row.last_health_check,
                latest_response_time: row.response_time_ms,
                latest_status_code: row.status_code,
                latest_error: row.error_message,
                uptime_24h: row.checks_last_24h > 0 ? 
                    (row.healthy_checks_24h / row.checks_last_24h * 100).toFixed(2) : null,
                avg_response_time_24h: row.avg_response_time_24h ? 
                    Math.round(row.avg_response_time_24h) : null,
                checks_count_24h: parseInt(row.checks_last_24h)
            }));
        } catch (error) {
            console.error('Failed to get health summary:', error);
            return [];
        }
    }

    // Cleanup old health check records
    async cleanupOldRecords(daysToKeep = 30) {
        try {
            const result = await pool.query(`
                DELETE FROM proxy_health_checks 
                WHERE checked_at < NOW() - INTERVAL '${daysToKeep} days'
            `);
            
            console.log(`🧹 Cleaned up ${result.rowCount} old health check records`);
            return result.rowCount;
        } catch (error) {
            console.error('Failed to cleanup old health check records:', error);
            return 0;
        }
    }

    // Get unhealthy destinations
    async getUnhealthyDestinations() {
        try {
            const result = await pool.query(`
                SELECT id, name, base_url, last_health_check
                FROM proxy_destinations 
                WHERE status = 'active' AND is_healthy = false
                ORDER BY last_health_check DESC
            `);
            
            return result.rows;
        } catch (error) {
            console.error('Failed to get unhealthy destinations:', error);
            return [];
        }
    }

    // Manual health check for a specific destination (for admin use)
    async performManualHealthCheck(destinationId) {
        try {
            const result = await pool.query(`
                SELECT id, name, base_url, health_check_url, health_check_interval_seconds,
                       timeout_ms, auth_type, auth_header_name, auth_token, auth_username, auth_password
                FROM proxy_destinations 
                WHERE id = $1 AND status = 'active'
            `, [destinationId]);
            
            if (result.rows.length === 0) {
                throw new Error('Destination not found or inactive');
            }
            
            const destination = result.rows[0];
            return await this.checkHealth(destination);
            
        } catch (error) {
            console.error('Manual health check failed:', error);
            throw error;
        }
    }
}

// Create singleton instance
const proxyHealthService = new ProxyHealthService();

// Graceful shutdown handling
process.on('SIGTERM', () => {
    proxyHealthService.stop();
});

process.on('SIGINT', () => {
    proxyHealthService.stop();
});

module.exports = proxyHealthService;