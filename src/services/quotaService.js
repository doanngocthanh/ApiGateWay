const redis = require('../config/redis');
const pool = require('../config/database');

class QuotaService {
    // Check if API key has remaining quota
    async checkQuota(apiKeyId, requestLimit) {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const key = `quota:${apiKeyId}:${today}`;
            
            const currentCount = await redis.get(key) || 0;
            
            if (parseInt(currentCount) >= requestLimit) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetTime: this.getResetTime()
                };
            }
            
            return {
                allowed: true,
                remaining: requestLimit - parseInt(currentCount),
                resetTime: this.getResetTime()
            };
            
        } catch (error) {
            console.error('Quota check error:', error);
            // Fail open - allow request if Redis is down
            return { allowed: true, remaining: 1, resetTime: this.getResetTime() };
        }
    }
    
    // Increment usage count
    async incrementUsage(apiKeyId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const key = `quota:${apiKeyId}:${today}`;
            
            const pipeline = redis.multi();
            pipeline.incr(key);
            pipeline.expire(key, 86400); // Expire after 24 hours
            await pipeline.exec();
            
        } catch (error) {
            console.error('Increment usage error:', error);
        }
    }
    
    // Get usage statistics
    async getUsageStats(apiKeyId, days = 7) {
        try {
            const stats = [];
            const today = new Date();
            
            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const key = `quota:${apiKeyId}:${dateStr}`;
                
                const count = await redis.get(key) || 0;
                stats.unshift({
                    date: dateStr,
                    requests: parseInt(count)
                });
            }
            
            return stats;
            
        } catch (error) {
            console.error('Get usage stats error:', error);
            return [];
        }
    }
    
    // Reset quota for API key (admin function)
    async resetQuota(apiKeyId, date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const key = `quota:${apiKeyId}:${targetDate}`;
            await redis.del(key);
            return true;
        } catch (error) {
            console.error('Reset quota error:', error);
            return false;
        }
    }
    
    // Get reset time (next midnight UTC)
    getResetTime() {
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    }
    
    // Bulk check for multiple API keys
    async bulkCheckQuota(apiKeyData) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const pipeline = redis.multi();
            
            apiKeyData.forEach(({ apiKeyId }) => {
                pipeline.get(`quota:${apiKeyId}:${today}`);
            });
            
            const results = await pipeline.exec();
            
            return apiKeyData.map((keyData, index) => {
                const currentCount = parseInt(results[index][1]) || 0;
                const remaining = Math.max(0, keyData.requestLimit - currentCount);
                
                return {
                    apiKeyId: keyData.apiKeyId,
                    allowed: currentCount < keyData.requestLimit,
                    remaining,
                    current: currentCount,
                    limit: keyData.requestLimit
                };
            });
            
        } catch (error) {
            console.error('Bulk quota check error:', error);
            return apiKeyData.map(keyData => ({
                apiKeyId: keyData.apiKeyId,
                allowed: true,
                remaining: keyData.requestLimit,
                current: 0,
                limit: keyData.requestLimit
            }));
        }
    }
}

module.exports = new QuotaService();