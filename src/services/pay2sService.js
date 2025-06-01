const axios = require('axios');
const crypto = require('crypto');

class Pay2SService {
    constructor() {
        this.apiUrl = process.env.PAY2S_API_URL;
        this.merchantId = process.env.PAY2S_MERCHANT_ID;
        this.secretKey = process.env.PAY2S_SECRET_KEY;
        this.callbackUrl = process.env.PAY2S_CALLBACK_URL;
    }
    
    // Create payment order
    async createPaymentOrder(orderData) {
        try {
            const {
                amount,
                currency = 'VND',
                description,
                userId,
                planId,
                orderId
            } = orderData;
            
            const paymentData = {
                merchant_id: this.merchantId,
                order_id: orderId,
                amount: amount,
                currency: currency,
                description: description,
                return_url: `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                callback_url: this.callbackUrl,
                extra_data: JSON.stringify({
                    user_id: userId,
                    plan_id: planId
                })
            };
            
            // Generate signature
            paymentData.signature = this.generateSignature(paymentData);
            
            const response = await axios.post(`${this.apiUrl}/payment/create`, paymentData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.secretKey}`
                }
            });
            
            return {
                success: true,
                payment_url: response.data.payment_url,
                order_id: response.data.order_id,
                transaction_id: response.data.transaction_id
            };
            
        } catch (error) {
            console.error('Pay2S create payment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Payment creation failed'
            };
        }
    }
    
    // Verify callback signature
    verifyCallback(callbackData) {
        try {
            const { signature, ...dataToVerify } = callbackData;
            const expectedSignature = this.generateSignature(dataToVerify);
            
            return signature === expectedSignature;
        } catch (error) {
            console.error('Pay2S signature verification error:', error);
            return false;
        }
    }
    
    // Generate signature for Pay2S
    generateSignature(data) {
        // Sort keys alphabetically
        const sortedKeys = Object.keys(data).sort();
        const queryString = sortedKeys
            .map(key => `${key}=${data[key]}`)
            .join('&');
        
        return crypto
            .createHmac('sha256', this.secretKey)
            .update(queryString)
            .digest('hex');
    }
    
    // Check payment status
    async checkPaymentStatus(transactionId) {
        try {
            const response = await axios.get(`${this.apiUrl}/payment/status/${transactionId}`, {
                headers: {
                    'Authorization': `Bearer ${this.secretKey}`
                }
            });
            
            return {
                success: true,
                status: response.data.status,
                amount: response.data.amount,
                currency: response.data.currency,
                paid_at: response.data.paid_at
            };
            
        } catch (error) {
            console.error('Pay2S check status error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'Failed to check payment status'
            };
        }
    }
    
    // Process refund
    async processRefund(transactionId, amount, reason) {
        try {
            const refundData = {
                transaction_id: transactionId,
                amount: amount,
                reason: reason,
                merchant_id: this.merchantId
            };
            
            refundData.signature = this.generateSignature(refundData);
            
            const response = await axios.post(`${this.apiUrl}/payment/refund`, refundData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.secretKey}`
                }
            });
            
            return {
                success: true,
                refund_id: response.data.refund_id,
                status: response.data.status
            };
            
        } catch (error) {
            console.error('Pay2S refund error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Refund failed'
            };
        }
    }
}

module.exports = new Pay2SService();