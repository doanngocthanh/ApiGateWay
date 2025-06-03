const axios = require('axios');
const crypto = require('crypto');

class VietQRService {
    constructor() {
        this.apiUrl = process.env.VIETQR_API_URL || 'https://api.vietqr.io';
        this.clientId = process.env.VIETQR_CLIENT_ID;
        this.apiKey = process.env.VIETQR_API_KEY;
        this.bankId = process.env.VIETQR_BANK_ID; // Mã ngân hàng (VD: 970422 cho MB)
        this.accountNo = process.env.VIETQR_ACCOUNT_NO; // Số tài khoản
        this.accountName = process.env.VIETQR_ACCOUNT_NAME; // Tên tài khoản
        this.callbackUrl = process.env.VIETQR_CALLBACK_URL;
    }
    
    // Tạo mã QR thanh toán
    async createPaymentQR(orderData) {
        try {
            const {
                amount,
                description,
                userId,
                planId,
                orderId,
                template = 'compact' // compact, print, qr_only
            } = orderData;
            
            const qrData = {
                accountNo: this.accountNo,
                accountName: this.accountName,
                acqId: this.bankId,
                amount: amount,
                addInfo: `${orderId} - ${description}`,
                format: 'text',
                template: template
            };
            
            const response = await axios.post(`${this.apiUrl}/v2/generate`, qrData, {
                headers: {
                    'x-client-id': this.clientId,
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.code === '00') {
                return {
                    success: true,
                    qr_code: response.data.data.qrCode,
                    qr_data_url: response.data.data.qrDataURL,
                    order_id: orderId,
                    amount: amount,
                    bank_info: {
                        bank_id: this.bankId,
                        account_no: this.accountNo,
                        account_name: this.accountName
                    },
                    extra_data: {
                        user_id: userId,
                        plan_id: planId
                    }
                };
            } else {
                throw new Error(response.data.desc || 'QR generation failed');
            }
            
        } catch (error) {
            console.error('VietQR create payment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.desc || error.message || 'QR creation failed'
            };
        }
    }
    
    // Tạo liên kết thanh toán nhanh
    async createQuickPayLink(orderData) {
        try {
            const {
                amount,
                description,
                orderId
            } = orderData;
            
            const bankingUrl = `https://api.vietqr.io/image/${this.bankId}-${this.accountNo}-${template}.jpg?amount=${amount}&addInfo=${encodeURIComponent(orderId + ' - ' + description)}`;
            
            return {
                success: true,
                payment_url: bankingUrl,
                order_id: orderId,
                qr_image_url: bankingUrl
            };
            
        } catch (error) {
            console.error('VietQR quick pay link error:', error);
            return {
                success: false,
                error: 'Failed to create quick pay link'
            };
        }
    }
    
    // Xác minh webhook từ ngân hàng (nếu có)
    verifyWebhook(webhookData, signature) {
        try {
            const expectedSignature = this.generateSignature(webhookData);
            return signature === expectedSignature;
        } catch (error) {
            console.error('VietQR webhook verification error:', error);
            return false;
        }
    }
    
    // Tạo chữ ký cho webhook
    generateSignature(data) {
        const sortedKeys = Object.keys(data).sort();
        const queryString = sortedKeys
            .map(key => `${key}=${data[key]}`)
            .join('&');
        
        return crypto
            .createHmac('sha256', this.apiKey)
            .update(queryString)
            .digest('hex');
    }
    
    // Kiểm tra trạng thái giao dịch thông qua bank statement
    async checkTransactionStatus(orderData) {
        try {
            const {
                orderId,
                amount,
                fromDate,
                toDate
            } = orderData;
            
            // Lưu ý: VietQR không cung cấp API kiểm tra trạng thái trực tiếp
            // Cần tích hợp với API banking của từng ngân hàng hoặc sử dụng webhook
            
            const searchParams = {
                accountNo: this.accountNo,
                fromDate: fromDate || new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0],
                toDate: toDate || new Date().toISOString().split('T')[0],
                format: 'json'
            };
            
            // Giả lập API kiểm tra (cần thay thế bằng API thực tế của ngân hàng)
            console.log('Checking transaction status for:', { orderId, amount, searchParams });
            
            return {
                success: true,
                status: 'pending', // pending, completed, failed
                message: 'Manual verification required - VietQR does not provide direct status check API'
            };
            
        } catch (error) {
            console.error('VietQR check status error:', error);
            return {
                success: false,
                error: 'Failed to check transaction status'
            };
        }
    }
    
    // Lấy danh sách ngân hàng hỗ trợ
    async getSupportedBanks() {
        try {
            const response = await axios.get(`${this.apiUrl}/v2/banks`, {
                headers: {
                    'x-client-id': this.clientId,
                    'x-api-key': this.apiKey
                }
            });
            
            return {
                success: true,
                banks: response.data.data
            };
            
        } catch (error) {
            console.error('VietQR get banks error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'Failed to get supported banks'
            };
        }
    }
    
    // Xác thực thông tin tài khoản ngân hàng
    async verifyBankAccount(bankId, accountNo) {
        try {
            const response = await axios.post(`${this.apiUrl}/v2/lookup`, {
                bin: bankId,
                accountNumber: accountNo
            }, {
                headers: {
                    'x-client-id': this.clientId,
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.code === '00') {
                return {
                    success: true,
                    account_name: response.data.data.accountName,
                    account_number: response.data.data.accountNumber
                };
            } else {
                return {
                    success: false,
                    error: response.data.desc || 'Account verification failed'
                };
            }
            
        } catch (error) {
            console.error('VietQR verify account error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'Failed to verify bank account'
            };
        }
    }
    
    // Tạo QR động với thời gian hết hạn
    async createDynamicQR(orderData) {
        try {
            const {
                amount,
                description,
                orderId,
                expiryMinutes = 15
            } = orderData;
            
            const qrData = {
                accountNo: this.accountNo,
                accountName: this.accountName,
                acqId: this.bankId,
                amount: amount,
                addInfo: `${orderId} - ${description} - Expires: ${new Date(Date.now() + expiryMinutes * 60000).toLocaleString('vi-VN')}`,
                format: 'text',
                template: 'compact'
            };
            
            const response = await axios.post(`${this.apiUrl}/v2/generate`, qrData, {
                headers: {
                    'x-client-id': this.clientId,
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.code === '00') {
                return {
                    success: true,
                    qr_code: response.data.data.qrCode,
                    qr_data_url: response.data.data.qrDataURL,
                    order_id: orderId,
                    amount: amount,
                    expires_at: new Date(Date.now() + expiryMinutes * 60000).toISOString(),
                    expires_in_minutes: expiryMinutes
                };
            } else {
                throw new Error(response.data.desc || 'Dynamic QR generation failed');
            }
            
        } catch (error) {
            console.error('VietQR create dynamic QR error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.desc || error.message || 'Dynamic QR creation failed'
            };
        }
    }
}

module.exports = new VietQRService();