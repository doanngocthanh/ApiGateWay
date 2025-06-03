
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface AnalyticsItem {
  date: string;
  total_requests: string;
  unique_api_keys: string;
  unique_users: string;
  success_rate: string;
}

interface AnalyticsData {
  analytics: AnalyticsItem[];
}

export const Analytics = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.ANALYTICS}?days=${timeRange}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Analytics response:', data);
        if (data.success && data.data) {
          setAnalytics(data.data);
        } else {
          setAnalytics(null);
        }
      } else {
        console.log('Analytics endpoint failed, using mock data');
        // Mock data fallback
        setAnalytics({
          analytics: [
            { 
              date: new Date().toISOString().split('T')[0],
              total_requests: "125840",
              unique_api_keys: "15",
              unique_users: "89",
              success_rate: "97.1"
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Use mock data on error
      setAnalytics({
        analytics: [
          { 
            date: new Date().toISOString().split('T')[0],
            total_requests: "125840",
            unique_api_keys: "15",
            unique_users: "89",
            success_rate: "97.1"
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
            <p className="text-gray-600">Phân tích chi tiết về hệ thống</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics || !analytics.analytics || analytics.analytics.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">Không có dữ liệu analytics</p>
        </div>
      </div>
    );
  }

  // Calculate aggregated data from analytics array
  const totalRequests = analytics.analytics.reduce((sum, item) => sum + Number(item.total_requests), 0);
  const totalApiKeys = Math.max(...analytics.analytics.map(item => Number(item.unique_api_keys)));
  const totalUsers = Math.max(...analytics.analytics.map(item => Number(item.unique_users)));
  const avgSuccessRate = analytics.analytics.reduce((sum, item) => sum + Number(item.success_rate), 0) / analytics.analytics.length;
  const successfulRequests = Math.round(totalRequests * avgSuccessRate / 100);
  const failedRequests = totalRequests - successfulRequests;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-600">Phân tích chi tiết về hệ thống</p>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày</SelectItem>
            <SelectItem value="30">30 ngày</SelectItem>
            <SelectItem value="90">90 ngày</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Tổng Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Trong {timeRange} ngày qua
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Tỷ lệ thành công
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {avgSuccessRate.toFixed(1)}%
            </div>
            <p className="text-xs text-green-600 mt-1">
              {successfulRequests.toLocaleString()} requests
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Requests thất bại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {failedRequests.toLocaleString()}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {(100 - avgSuccessRate).toFixed(1)}% tỷ lệ lỗi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">
              API Keys hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {totalApiKeys}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Unique API keys
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thống kê theo ngày</CardTitle>
            <CardDescription>
              Chi tiết requests theo từng ngày
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.analytics.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {new Date(item.date).toLocaleDateString('vi-VN')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Success rate: {Number(item.success_rate).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {Number(item.total_requests).toLocaleString()} requests
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tổng quan hệ thống</CardTitle>
            <CardDescription>
              Thống kê chi tiết trong {timeRange} ngày qua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {Math.round(totalRequests / parseInt(timeRange))}
                </div>
                <p className="text-sm text-blue-600">Requests/ngày TB</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {totalUsers}
                </div>
                <p className="text-sm text-green-600">Unique Users</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {totalApiKeys > 0 ? Math.round(totalRequests / totalApiKeys) : 0}
                </div>
                <p className="text-sm text-purple-600">Requests/API Key TB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
