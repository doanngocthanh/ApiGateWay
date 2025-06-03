import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  currency?: string;
  request_limit_per_day: number;
  api_key_limit: number;
  duration_days: number;
  features: string[];
  is_popular?: boolean;
}

export const Plans = () => {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PLANS.LIST));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Plans API response:', data);
        
        // Parse theo đúng structure của API response
        if (data.success && data.data && data.data.plans) {
          setPlans(data.data.plans);
        } else {
          console.error('Unexpected API response structure:', data);
          setPlans([]);
        }
      } else {
        console.error('Failed to fetch plans:', response.status);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải danh sách gói dịch vụ',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách gói dịch vụ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const purchasePlan = async (planId: string) => {
    try {
      setPurchasing(planId);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PAYMENT.CREATE_ORDER), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.payment_url) {
          // Open payment URL in new tab
          window.open(data.payment_url, '_blank');
          toast({
            title: 'Chuyển hướng thanh toán',
            description: 'Cửa sổ thanh toán đã được mở trong tab mới',
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể tạo đơn hàng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error purchasing plan:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thực hiện thanh toán',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Gói dịch vụ</h2>
          <p className="text-gray-600">Chọn gói dịch vụ phù hợp với nhu cầu của bạn</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Gói dịch vụ</h2>
        <p className="text-gray-600">Chọn gói dịch vụ phù hợp với nhu cầu của bạn</p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-xl font-semibold mb-2">Chưa có gói dịch vụ nào</h3>
            <p className="text-gray-600 text-center">
              Hiện tại chưa có gói dịch vụ nào được cung cấp
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative hover:shadow-xl transition-all duration-300 ${
                plan.is_popular 
                  ? 'ring-2 ring-blue-500 transform scale-105' 
                  : 'hover:transform hover:scale-105'
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1">
                    Phổ biến
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="min-h-[3rem]">
                  {plan.description}
                </CardDescription>
                <div className="py-4">
                  <div className="text-4xl font-bold text-gray-900">
                    {parseFloat(plan.price).toLocaleString()}
                    <span className="text-lg font-medium text-gray-500 ml-1">
                      {plan.currency || 'USD'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.request_limit_per_day.toLocaleString()} requests/ngày
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Tính năng cơ bản của API Gateway
                    </div>
                  )}
                </div>
                
                <Button
                  className={`w-full ${
                    plan.is_popular
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                      : ''
                  }`}
                  variant={plan.is_popular ? 'default' : 'outline'}
                  onClick={() => purchasePlan(plan.id.toString())}
                  disabled={purchasing === plan.id.toString()}
                >
                  {purchasing === plan.id.toString() ? 'Đang xử lý...' : 'Chọn gói này'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
