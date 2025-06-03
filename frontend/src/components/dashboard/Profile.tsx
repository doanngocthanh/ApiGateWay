
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { buildApiUrl, API_CONFIG } from '@/config/api';
interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  endpoint_stats: Array<{
    endpoint: string;
    count: number;
  }>;
}

export const Profile = () => {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = API_CONFIG.BASE_URL;

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      const [profileResponse, usageResponse] = await Promise.all([
        fetch(`${API_BASE}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE}/api/users/usage?days=30`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
      }

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsageStats(usageData.usage_stats);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const successRate = usageStats ? 
    ((usageStats.successful_requests / usageStats.total_requests) * 100) || 0 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile</h2>
        <p className="text-gray-600">Thông tin chi tiết về tài khoản và thống kê sử dụng</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
            <CardDescription>
              Chi tiết về tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{user?.name}</h3>
                <p className="text-gray-600">{user?.email}</p>
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Quota limit:</span>
                <span>{user?.quota_limit?.toLocaleString()} requests</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Quota đã sử dụng:</span>
                <span>{user?.quota_used?.toLocaleString()} requests</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Số API Keys:</span>
                <span>{profile?.api_key_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thống kê sử dụng (30 ngày)</CardTitle>
            <CardDescription>
              Tổng quan về việc sử dụng API trong 30 ngày qua
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usageStats ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {usageStats.total_requests?.toLocaleString() || 0}
                    </div>
                    <p className="text-sm text-blue-600">Tổng requests</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {successRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-green-600">Tỷ lệ thành công</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Requests thành công:</span>
                    <span className="text-green-600">
                      {usageStats.successful_requests?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Requests thất bại:</span>
                    <span className="text-red-600">
                      {usageStats.failed_requests?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Thời gian phản hồi TB:</span>
                    <span>{usageStats.average_response_time?.toFixed(0) || 0}ms</span>
                  </div>
                </div>

                {usageStats.endpoint_stats && usageStats.endpoint_stats.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3">Top Endpoints</h4>
                      <div className="space-y-2">
                        {usageStats.endpoint_stats.slice(0, 5).map((endpoint, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="truncate flex-1 mr-2">{endpoint.endpoint}</span>
                            <span className="font-medium">{endpoint.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Chưa có dữ liệu thống kê</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
