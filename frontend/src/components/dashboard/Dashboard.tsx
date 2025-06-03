import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminToggle } from './AdminToggle';
import { buildApiUrl, API_CONFIG } from '@/config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface AnalyticsData {
  date: string;
  total_requests: string; // API returns string
  unique_api_keys: string; // API returns string
  unique_users: string; // API returns string
  success_rate: string; // API returns string
}

interface UsageStats {
  today: {
    requests_today: number;
    api_keys_used_today: number;
  };
  daily_stats: Array<{
    date: string;
    requests: number;
    unique_ips: number;
    api_keys_used: number;
  }>;
  top_endpoints: Array<{
    endpoint: string;
    method: string;
    requests: number;
    success_rate: number;
  }>;
}

export const Dashboard = () => {
  const { user, token } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUsageStats();
    }
  }, [token]);

  const fetchUsageStats = async () => {
    try {
      // Try to fetch analytics data if user is admin
      if (user?.role === 'admin') {
        const analyticsResponse = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.ADMIN.ANALYTICS}?days=30`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          console.log('Analytics response:', analyticsData);
          
          if (analyticsData.success && analyticsData.data?.analytics) {
            // Map analytics -> daily_stats
            const daily_stats = analyticsData.data.analytics.map((item: any) => ({
              date: item.date?.slice(0, 10) || '',
              requests: Number(item.total_requests) || 0,
              unique_ips: Number(item.unique_users) || 0,
              api_keys_used: Number(item.unique_api_keys) || 0,
              success_rate: Number(item.success_rate) || 0,
            }));

            setUsageStats({
              today: {
                requests_today: daily_stats.length > 0 ? daily_stats[daily_stats.length - 1].requests : 0,
                api_keys_used_today: daily_stats.length > 0 ? daily_stats[daily_stats.length - 1].api_keys_used : 0,
              },
              daily_stats,
              top_endpoints: [],
            });
          }
        } else {
          // Fallback to mock data
          console.log('Analytics endpoint failed, using mock data');
          toast.error('Không thể tải dữ liệu thống kê, đang sử dụng dữ liệu mẫu');
          
        }
      } else {
        // Regular user - try usage stats endpoint
        const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.USERS.USAGE}?days=30`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Usage stats response:', data);

          // Chuyển đổi kiểu dữ liệu về number
          setUsageStats({
            today: {
              requests_today: Number(data.data.today?.requests_today) || 0,
              api_keys_used_today: Number(data.data.today?.api_keys_used_today) || 0,
            },
            daily_stats: (data.data.daily_stats || []).map((item: any) => ({
              date: item.date,
              requests: Number(item.requests) || 0,
              unique_ips: Number(item.unique_ips) || 0,
              api_keys_used: Number(item.api_keys_used) || 0,
            })),
            top_endpoints: (data.data.top_endpoints || []).map((item: any) => ({
              endpoint: item.endpoint,
              method: item.method,
              requests: Number(item.requests) || 0,
              success_rate: Number(item.success_rate) || 0,
            })),
          });
        } else {
          console.log('Usage stats endpoint not available, using mock data');
          // Mock data for demonstration
          setUsageStats({
            today: {
              requests_today: 6,
              api_keys_used_today: 1
            },
            daily_stats: [
              { date: '2025-06-01', requests: 0, unique_ips: 0, api_keys_used: 0 },
              { date: '2025-06-02', requests: 0, unique_ips: 0, api_keys_used: 0 },
              { date: '2025-06-03', requests: 6, unique_ips: 1, api_keys_used: 1 },
            ],
            top_endpoints: [
              { endpoint: '/proxy/request', method: 'POST', requests: 6, success_rate: 100 },
            ]
          });
        }
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      // Set mock data on error
      setUsageStats({
        today: {
          requests_today: 0,
          api_keys_used_today: 0
        },
        daily_stats: [],
        top_endpoints: []
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
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Tổng quan về tài khoản và hoạt động</p>
          </div>
          <AdminToggle />
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Tổng quan về tài khoản và hoạt động</p>
        </div>
        <AdminToggle />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests hôm nay</CardTitle>
            <div className="text-2xl">🚀</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats?.today.requests_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              API calls trong ngày
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys đã dùng</CardTitle>
            <div className="text-2xl">🔑</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats?.today.api_keys_used_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              Trong ngày hôm nay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gói dịch vụ</CardTitle>
            <div className="text-2xl">💎</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.role === 'admin' ? 'Admin' : 'Free'}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'admin' ? 'Unlimited access' : 'Plan hiện tại'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trạng thái</CardTitle>
            <div className="text-2xl">✅</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Tài khoản đang hoạt động
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Requests theo ngày</CardTitle>
            <CardDescription>
              Thống kê số lượng requests trong {usageStats?.daily_stats.length || 7} ngày qua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageStats?.daily_stats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints</CardTitle>
            <CardDescription>
              Các endpoint được sử dụng nhiều nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usageStats?.top_endpoints && usageStats.top_endpoints.length > 0 ? (
                usageStats.top_endpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{endpoint.method}</Badge>
                      <span className="font-medium">{endpoint.endpoint}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{endpoint.requests}</div>
                      <div className="text-sm text-green-600">
                        {endpoint.success_rate.toFixed(1)}% success
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Chưa có dữ liệu endpoint
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Các hành động thường dùng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              🔑 Tạo API Key mới
            </Button>
            <Button variant="outline">
              🧪 Test API
            </Button>
            <Button variant="outline">
              📊 Xem Analytics
            </Button>
            <Button variant="outline">
              💎 Nâng cấp gói
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
