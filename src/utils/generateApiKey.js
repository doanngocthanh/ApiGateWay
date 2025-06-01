const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const generateApiKey = () => {
    // Format: ak_live_xxxxxxxxxxxxxxxxxxxxx (32 chars after prefix)
    const prefix = 'ak_live_';
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return prefix + randomBytes;
};

const generateSecretKey = () => {
    // Format: sk_xxxxxxxxxxxxxxxxxxxxx (32 chars)
    return 'sk_' + crypto.randomBytes(16).toString('hex');
};

module.exports = { generateApiKey, generateSecretKey };