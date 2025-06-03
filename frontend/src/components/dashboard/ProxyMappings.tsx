
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface ProxyMapping {
  id: string;
  api_key_id: string;
  proxy_destination_id: string;
  path_pattern: string;
  allowed_methods: string | string[];
  priority: number;
  created_at: string;
  destination_name?: string;
  api_key_name?: string;
}

interface ApiKey {
  id: number; // Updated to match API response
  name: string;
  key: string;
  status: string;
  created_at: string;
}

interface ProxyDestination {
  id: number; // Updated to match API response
  name: string;
  base_url: string;
  description?: string;
  status: string;
}

export const ProxyMappings = () => {
  const { token } = useAuth();
  const [mappings, setMappings] = useState<ProxyMapping[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [destinations, setDestinations] = useState<ProxyDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newMapping, setNewMapping] = useState({
    api_key_id: '',
    proxy_destination_id: '',
    path_pattern: '',
    allowed_methods: ['GET'],
    priority: 1,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [mappingsResponse, apiKeysResponse, destinationsResponse] = await Promise.all([
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PROXY.MAPPINGS), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.KEYS.LIST), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PROXY.ADMIN.DESTINATIONS), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (mappingsResponse.ok) {
        const mappingsData = await mappingsResponse.json();
        console.log('Mappings response:', mappingsData);
        if (mappingsData.success && mappingsData.data && mappingsData.data.mappings) {
          setMappings(mappingsData.data.mappings);
        } else {
          setMappings([]);
        }
      }

      if (apiKeysResponse.ok) {
        const apiKeysData = await apiKeysResponse.json();
        console.log('API Keys response:', apiKeysData);
        if (apiKeysData.success && apiKeysData.data && apiKeysData.data.api_keys) {
          setApiKeys(apiKeysData.data.api_keys);
        } else {
          setApiKeys([]);
        }
      }

      if (destinationsResponse.ok) {
        const destinationsData = await destinationsResponse.json();
        console.log('Destinations response:', destinationsData);
        if (destinationsData.success && destinationsData.data && destinationsData.data.destinations) {
          setDestinations(destinationsData.data.destinations);
        } else {
          setDestinations([]);
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải dữ liệu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to parse allowed_methods
  const parseAllowedMethods = (methods: string | string[]): string[] => {
    if (Array.isArray(methods)) {
      return methods;
    }
    if (typeof methods === 'string') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(methods);
        return Array.isArray(parsed) ? parsed : [methods];
      } catch {
        // If not JSON, treat as single method
        return [methods];
      }
    }
    return [];
  };

  const createMapping = async () => {
    if (!newMapping.api_key_id || !newMapping.proxy_destination_id) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn API key và destination',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PROXY.MAPPINGS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMapping),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.mapping) {
          setMappings([...mappings, data.data.mapping]);
          setNewMapping({
            api_key_id: '',
            proxy_destination_id: '',
            path_pattern: '',
            allowed_methods: ['GET'],
            priority: 1,
          });
          setCreateDialogOpen(false);
          toast({
            title: 'Thành công',
            description: 'Proxy mapping đã được tạo thành công',
          });
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể tạo proxy mapping',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo proxy mapping',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteMapping = async (mappingId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa proxy mapping này?')) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.PROXY.MAPPINGS}/${mappingId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setMappings(mappings.filter(mapping => mapping.id !== mappingId));
        toast({
          title: 'Thành công',
          description: 'Proxy mapping đã được xóa',
        });
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa proxy mapping',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa proxy mapping',
        variant: 'destructive',
      });
    }
  };

  const toggleMethod = (method: string) => {
    const currentMethods = newMapping.allowed_methods;
    if (currentMethods.includes(method)) {
      setNewMapping({
        ...newMapping,
        allowed_methods: currentMethods.filter(m => m !== method)
      });
    } else {
      setNewMapping({
        ...newMapping,
        allowed_methods: [...currentMethods, method]
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Proxy Mappings</h2>
            <p className="text-gray-600">Quản lý ánh xạ proxy cho API keys</p>
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
          <h2 className="text-3xl font-bold text-gray-900">Proxy Mappings</h2>
          <p className="text-gray-600">Quản lý ánh xạ proxy cho API keys</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              Tạo Mapping mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tạo Proxy Mapping mới</DialogTitle>
              <DialogDescription>
                Tạo ánh xạ giữa API key và proxy destination
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Select value={newMapping.api_key_id} onValueChange={(value) => 
                  setNewMapping({...newMapping, api_key_id: value})
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn API Key" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiKeys.map((key) => (
                      <SelectItem key={key.id} value={key.id.toString()}>
                        {key.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="destination">Proxy Destination</Label>
                <Select value={newMapping.proxy_destination_id} onValueChange={(value) =>
                  setNewMapping({...newMapping, proxy_destination_id: value})
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id.toString()}>
                        {dest.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pathPattern">Path Pattern (tùy chọn)</Label>
                <Input
                  id="pathPattern"
                  placeholder="/api/*"
                  value={newMapping.path_pattern}
                  onChange={(e) => setNewMapping({...newMapping, path_pattern: e.target.value})}
                />
              </div>

              <div>
                <Label>HTTP Methods</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => (
                    <Button
                      key={method}
                      type="button"
                      size="sm"
                      variant={newMapping.allowed_methods.includes(method) ? 'default' : 'outline'}
                      onClick={() => toggleMethod(method)}
                    >
                      {method}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  value={newMapping.priority}
                  onChange={(e) => setNewMapping({...newMapping, priority: parseInt(e.target.value) || 1})}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button onClick={createMapping} disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {mappings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold mb-2">Chưa có Proxy Mapping nào</h3>
            <p className="text-gray-600 text-center mb-4">
              Tạo proxy mapping để kết nối API key với các destination
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Tạo Mapping đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {mappings.map((mapping) => {
            const apiKey = apiKeys.find(key => key.id.toString() === mapping.api_key_id.toString());
            const destination = destinations.find(dest => dest.id.toString() === mapping.proxy_destination_id.toString());
            const allowedMethods = parseAllowedMethods(mapping.allowed_methods);
            
            return (
              <Card key={mapping.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {apiKey?.name || 'Unknown API Key'} → {destination?.name || mapping.destination_name || 'Unknown Destination'}
                      </CardTitle>
                      <CardDescription>
                        Tạo ngày {new Date(mapping.created_at).toLocaleDateString('vi-VN')}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Priority: {mapping.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">API Key</Label>
                      <p className="text-sm text-gray-600">{apiKey?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Destination</Label>
                      <p className="text-sm text-gray-600">{destination?.name || mapping.destination_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Path Pattern</Label>
                      <p className="text-sm text-gray-600">{mapping.path_pattern || 'Tất cả'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Allowed Methods</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {allowedMethods.map((method) => (
                          <Badge key={method} variant="secondary" className="text-xs">
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {destination && (
                    <div>
                      <Label className="text-sm font-medium">Base URL</Label>
                      <p className="text-sm text-gray-600 font-mono bg-gray-100 p-2 rounded">
                        {destination.base_url}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMapping(mapping.id)}
                    >
                      Xóa
                    </Button>
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
