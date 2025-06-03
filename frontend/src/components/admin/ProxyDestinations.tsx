import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface ProxyDestination {
  id: number;
  name: string;
  description: string;
  base_url: string;
  method_override?: string;
  timeout_ms: number;
  max_retries: number;
  health_check_url?: string;
  health_check_interval_seconds: number;
  auth_type?: string;
  auth_header_name?: string;
  auth_token?: string;
  auth_username?: string;
  auth_password?: string;
  strip_path_prefix?: string;
  add_path_prefix?: string;
  custom_headers?: Record<string, string>;
  transform_request?: string;
  transform_response?: string;
  backend_rate_limit?: number;
  backend_rate_window_ms?: number;
  created_at: string;
  updated_at: string;
  is_healthy?: boolean;
  last_health_check?: string;
  status: string;
  mapped_api_keys?: string;
  total_requests?: string;
  avg_response_time?: number;
}

export const ProxyDestinations = () => {
  const { token } = useAuth();
  const [destinations, setDestinations] = useState<ProxyDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [healthCheckDetails, setHealthCheckDetails] = useState<Record<number, any>>({});
  
  const [newDestination, setNewDestination] = useState({
    name: '',
    description: '',
    base_url: '',
    method_override: '',
    timeout_ms: 30000,
    max_retries: 3,
    health_check_url: '',
    health_check_interval_seconds: 300,
    auth_type: 'none',
    auth_header_name: '',
    auth_token: '',
    auth_username: '',
    auth_password: '',
    strip_path_prefix: '',
    add_path_prefix: '',
    custom_headers: '',
    transform_request: '',
    transform_response: '',
    backend_rate_limit: 100,
    backend_rate_window_ms: 60000,
  });

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PROXY.ADMIN.DESTINATIONS), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Destinations response:', data);
        if (data.success && data.data?.destinations) {
          setDestinations(data.data.destinations);
        } else {
          setDestinations([]);
        }
      } else {
        console.log('Destinations endpoint failed');
        setDestinations([]);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải danh sách destinations',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách destinations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createDestination = async () => {
    if (!newDestination.name || !newDestination.base_url) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên và base URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      
      // Parse custom headers
      let customHeaders = {};
      if (newDestination.custom_headers) {
        try {
          customHeaders = JSON.parse(newDestination.custom_headers);
        } catch (e) {
          toast({
            title: 'Lỗi',
            description: 'Custom headers phải là JSON hợp lệ',
            variant: 'destructive',
          });
          return;
        }
      }

      const payload = {
        ...newDestination,
        custom_headers: customHeaders,
        auth_type: newDestination.auth_type === 'none' ? null : newDestination.auth_type,
      };

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PROXY.ADMIN.DESTINATIONS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchDestinations(); // Refresh the list
        setNewDestination({
          name: '',
          description: '',
          base_url: '',
          method_override: '',
          timeout_ms: 30000,
          max_retries: 3,
          health_check_url: '',
          health_check_interval_seconds: 300,
          auth_type: 'none',
          auth_header_name: '',
          auth_token: '',
          auth_username: '',
          auth_password: '',
          strip_path_prefix: '',
          add_path_prefix: '',
          custom_headers: '',
          transform_request: '',
          transform_response: '',
          backend_rate_limit: 100,
          backend_rate_window_ms: 60000,
        });
        setCreateDialogOpen(false);
        toast({
          title: 'Thành công',
          description: 'Proxy destination đã được tạo thành công',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể tạo destination',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating destination:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo destination',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const performHealthCheck = async (destinationId: number) => {
    try {
      setHealthChecking(destinationId.toString());
      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.PROXY.ADMIN.DESTINATIONS}/${destinationId}/health-check`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const health = data.data?.health_check;
        // Lưu chi tiết health check
        setHealthCheckDetails(prev => ({
          ...prev,
          [destinationId]: health,
        }));

        setDestinations(destinations.map(dest => 
          dest.id === destinationId 
            ? { 
                ...dest, 
                is_healthy: health?.is_healthy || false,
                last_health_check: health?.checked_at || new Date().toISOString()
              }
            : dest
        ));
        
        toast({
          title: 'Health check hoàn thành',
          description: `Destination ${health?.is_healthy ? 'healthy' : 'unhealthy'}`,
          variant: health?.is_healthy ? 'default' : 'destructive',
        });
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể thực hiện health check',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error performing health check:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thực hiện health check',
        variant: 'destructive',
      });
    } finally {
      setHealthChecking(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Proxy Destinations</h2>
            <p className="text-gray-600">Quản lý các destination của proxy</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Proxy Destinations</h2>
          <p className="text-gray-600">Quản lý các destination của proxy</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              Thêm Destination
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thêm Proxy Destination mới</DialogTitle>
              <DialogDescription>
                Cấu hình destination mới cho proxy gateway
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tên *</Label>
                  <Input
                    id="name"
                    placeholder="JSONPlaceholder API"
                    value={newDestination.name}
                    onChange={(e) => setNewDestination({...newDestination, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="baseUrl">Base URL *</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://jsonplaceholder.typicode.com"
                    value={newDestination.base_url}
                    onChange={(e) => setNewDestination({...newDestination, base_url: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả destination này..."
                  value={newDestination.description}
                  onChange={(e) => setNewDestination({...newDestination, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={newDestination.timeout_ms}
                    onChange={(e) => setNewDestination({...newDestination, timeout_ms: parseInt(e.target.value) || 30000})}
                  />
                </div>
                <div>
                  <Label htmlFor="retries">Max Retries</Label>
                  <Input
                    id="retries"
                    type="number"
                    value={newDestination.max_retries}
                    onChange={(e) => setNewDestination({...newDestination, max_retries: parseInt(e.target.value) || 3})}
                  />
                </div>
                <div>
                  <Label htmlFor="healthInterval">Health Check Interval (s)</Label>
                  <Input
                    id="healthInterval"
                    type="number"
                    value={newDestination.health_check_interval_seconds}
                    onChange={(e) => setNewDestination({...newDestination, health_check_interval_seconds: parseInt(e.target.value) || 300})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="healthUrl">Health Check URL</Label>
                <Input
                  id="healthUrl"
                  placeholder="/health hoặc /status"
                  value={newDestination.health_check_url}
                  onChange={(e) => setNewDestination({...newDestination, health_check_url: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="authType">Auth Type</Label>
                  <Select 
                    value={newDestination.auth_type} 
                    onValueChange={(value) => setNewDestination({...newDestination, auth_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại auth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không có</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="authHeader">Auth Header Name</Label>
                  <Input
                    id="authHeader"
                    placeholder="Authorization hoặc X-API-Key"
                    value={newDestination.auth_header_name}
                    onChange={(e) => setNewDestination({...newDestination, auth_header_name: e.target.value})}
                  />
                </div>
              </div>

              {newDestination.auth_type && newDestination.auth_type !== 'none' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(newDestination.auth_type === 'bearer' || newDestination.auth_type === 'api_key') && (
                    <div>
                      <Label htmlFor="authToken">Auth Token</Label>
                      <Input
                        id="authToken"
                        type="password"
                        placeholder="Token hoặc API key"
                        value={newDestination.auth_token}
                        onChange={(e) => setNewDestination({...newDestination, auth_token: e.target.value})}
                      />
                    </div>
                  )}
                  {newDestination.auth_type === 'basic' && (
                    <>
                      <div>
                        <Label htmlFor="authUsername">Username</Label>
                        <Input
                          id="authUsername"
                          value={newDestination.auth_username}
                          onChange={(e) => setNewDestination({...newDestination, auth_username: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="authPassword">Password</Label>
                        <Input
                          id="authPassword"
                          type="password"
                          value={newDestination.auth_password}
                          onChange={(e) => setNewDestination({...newDestination, auth_password: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="customHeaders">Custom Headers (JSON)</Label>
                <Textarea
                  id="customHeaders"
                  placeholder='{"Content-Type": "application/json", "X-Custom": "value"}'
                  value={newDestination.custom_headers}
                  onChange={(e) => setNewDestination({...newDestination, custom_headers: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button onClick={createDestination} disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {destinations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold mb-2">Chưa có Destination nào</h3>
            <p className="text-gray-600 text-center mb-4">
              Thêm destination đầu tiên để bắt đầu proxy
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Thêm Destination đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {destinations.map((destination) => (
            <Card key={destination.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{destination.name}</CardTitle>
                    <CardDescription>
                      {destination.description || 'Không có mô tả'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={destination.is_healthy ? 'default' : 'destructive'}>
                      {destination.is_healthy ? 'Healthy' : 'Unhealthy'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => performHealthCheck(destination.id)}
                      disabled={healthChecking === destination.id.toString()}
                    >
                      {healthChecking === destination.id.toString() ? 'Checking...' : 'Health Check'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Base URL</Label>
                  <p className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                    {destination.base_url}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Timeout</Label>
                    <p className="text-sm text-gray-600">{destination.timeout_ms}ms</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Max Retries</Label>
                    <p className="text-sm text-gray-600">{destination.max_retries}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={destination.status === 'active' ? 'default' : 'secondary'}>
                      {destination.status}
                    </Badge>
                  </div>
                </div>

                {destination.auth_type && destination.auth_type !== 'none' && (
                  <div>
                    <Label className="text-sm font-medium">Authentication</Label>
                    <Badge variant="outline">{destination.auth_type}</Badge>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Mapped API Keys</Label>
                    <p className="text-sm text-gray-600">{destination.mapped_api_keys || '0'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Requests</Label>
                    <p className="text-sm text-gray-600">{destination.total_requests || '0'}</p>
                  </div>
                </div>

                {destination.last_health_check && (
                  <div>
                    <Label className="text-sm font-medium">Last Health Check</Label>
                    <p className="text-sm text-gray-600">
                      {new Date(destination.last_health_check).toLocaleString('vi-VN')}
                    </p>
                  </div>
                )}

                {healthCheckDetails[destination.id] && (
                  <div className="bg-gray-50 rounded p-3 mt-2 border text-xs">
                    <div><b>Status Code:</b> {healthCheckDetails[destination.id].status_code ?? '-'}</div>
                    <div><b>Response Time:</b> {healthCheckDetails[destination.id].response_time_ms ?? '-'} ms</div>
                    <div><b>Error:</b> {healthCheckDetails[destination.id].error_message ?? 'None'}</div>
                    <div><b>Checked At:</b> {healthCheckDetails[destination.id].checked_at ? new Date(healthCheckDetails[destination.id].checked_at).toLocaleString('vi-VN') : '-'}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={fetchDestinations} variant="outline">
          Làm mới
        </Button>
      </div>
    </div>
  );
};
