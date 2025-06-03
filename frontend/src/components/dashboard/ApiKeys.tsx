
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface ApiKey {
  id: number; // API returns number, not string
  name: string;
  key: string;
  status: string;
  created_at: string;
  last_used_at?: string; // API field name is last_used_at, not last_used
  quota_used?: number; // Optional fields
  quota_limit?: number;
}

export const ApiKeys = () => {
  const { token } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.KEYS.LIST), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('API Keys response:', data);
        
        if (data.success && data.data && data.data.api_keys) {
          setApiKeys(data.data.api_keys);
        } else {
          console.error('Unexpected API response structure:', data);
          setApiKeys([]);
        }
      } else {
        console.error('Failed to fetch API keys:', response.status);
        setApiKeys([]);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách API keys',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên cho API key',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.KEYS.CREATE), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.api_key) {
          setApiKeys([...apiKeys, data.data.api_key]);
          setNewKeyName('');
          setCreateDialogOpen(false);
          toast({
            title: 'Thành công',
            description: 'API key đã được tạo thành công',
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể tạo API key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo API key',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (keyId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa API key này?')) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.KEYS.DELETE}/${keyId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
        toast({
          title: 'Thành công',
          description: 'API key đã được xóa',
        });
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa API key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa API key',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Đã sao chép',
      description: 'API key đã được sao chép vào clipboard',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">API Keys</h2>
            <p className="text-gray-600">Quản lý các API key của bạn</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
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
          <h2 className="text-3xl font-bold text-gray-900">API Keys</h2>
          <p className="text-gray-600">Quản lý các API key của bạn</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              Tạo API Key mới
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo API Key mới</DialogTitle>
              <DialogDescription>
                Nhập tên cho API key để dễ dàng quản lý
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">Tên API Key</Label>
                <Input
                  id="keyName"
                  placeholder="Ví dụ: My App API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button onClick={createApiKey} disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🔑</div>
            <h3 className="text-xl font-semibold mb-2">Chưa có API Key nào</h3>
            <p className="text-gray-600 text-center mb-4">
              Tạo API key đầu tiên để bắt đầu sử dụng dịch vụ
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Tạo API Key đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {apiKeys.map((apiKey) => {
            const usagePercentage = apiKey.quota_limit ? ((apiKey.quota_used || 0) / apiKey.quota_limit) * 100 : 0;
            
            return (
              <Card key={apiKey.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                      <CardDescription>
                        Tạo ngày {new Date(apiKey.created_at).toLocaleDateString('vi-VN')}
                        {apiKey.last_used_at && (
                          <span className="ml-2">
                            • Sử dụng lần cuối: {new Date(apiKey.last_used_at).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={apiKey.status === 'active' ? 'default' : 'secondary'}>
                        {apiKey.status}
                      </Badge>
                      {apiKey.quota_limit && (
                        <Badge variant={usagePercentage > 80 ? 'destructive' : 'default'}>
                          {usagePercentage.toFixed(1)}% sử dụng
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">API Key</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono">
                        {apiKey.key}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(apiKey.key)}
                      >
                        Sao chép
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {apiKey.quota_limit && (
                      <div>
                        <Label className="text-sm font-medium">Quota sử dụng</Label>
                        <p className="text-lg font-semibold">
                          {apiKey.quota_used || 0} / {apiKey.quota_limit}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteApiKey(apiKey.id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
