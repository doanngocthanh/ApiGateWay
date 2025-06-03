
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface ApiKey {
  id: number;
  name: string;
  key: string;
  status: string;
  created_at: string;
  last_used_at?: string;
}

interface TestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  responseTime: number;
}

export const ApiTester = () => {
  const { token } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [quotaStats, setQuotaStats] = useState<any>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  useEffect(() => {
    if (selectedApiKey) {
      fetchQuotaStats();
    }
  }, [selectedApiKey]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.KEYS.LIST), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('API Keys response:', data);
        
        // Handle the correct response structure
        if (data.success && data.data && data.data.api_keys) {
          setApiKeys(data.data.api_keys);
          if (data.data.api_keys.length > 0) {
            setSelectedApiKey(data.data.api_keys[0].key);
          }
        } else {
          console.error('Unexpected API response structure:', data);
          setApiKeys([]);
        }
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const fetchQuotaStats = async () => {
    if (!selectedApiKey) return;
    
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.QUOTA.STATS), {
        headers: {
          'X-API-Key': selectedApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuotaStats(data);
      }
    } catch (error) {
      console.error('Error fetching quota stats:', error);
    }
  };

  const sendRequest = async () => {
    if (!selectedApiKey) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn API key',
        variant: 'destructive',
      });
      return;
    }

    if (!url) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const startTime = Date.now();
      
      // Parse headers
      let parsedHeaders: Record<string, string> = {
        'X-API-Key': selectedApiKey,
      };
      
      if (headers.trim()) {
        try {
          parsedHeaders = { ...parsedHeaders, ...JSON.parse(headers) };
        } catch (e) {
          // Try to parse as key: value format
          headers.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              parsedHeaders[key.trim()] = valueParts.join(':').trim();
            }
          });
        }
      }

      const requestConfig: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (method !== 'GET' && body) {
        requestConfig.body = body;
        if (!parsedHeaders['Content-Type']) {
          parsedHeaders['Content-Type'] = 'application/json';
        }
      }

      // Use proxy endpoint
      const proxyUrl = buildApiUrl(`${API_CONFIG.ENDPOINTS.PROXY.API_REQUEST}${url.startsWith('/') ? url : '/' + url}`);
      
      const response = await fetch(proxyUrl, requestConfig);
      const endTime = Date.now();
      
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        responseTime: endTime - startTime,
      });

      // Refresh quota stats
      fetchQuotaStats();

    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể gửi request',
        variant: 'destructive',
      });
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: error instanceof Error ? error.message : 'Unknown error',
        responseTime: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedKeyInfo = apiKeys.find(key => key.key === selectedApiKey);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">API Tester</h2>
        <p className="text-gray-600">Test API endpoints thông qua proxy gateway</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Configuration</CardTitle>
              <CardDescription>
                Cấu hình và gửi request thông qua API Gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn API Key" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiKeys.map((key) => (
                      <SelectItem key={key.key} value={key.key}>
                        {key.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedKeyInfo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Key: {selectedApiKey.substring(0, 20)}...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <Label htmlFor="method">Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="url">URL Path</Label>
                  <Input
                    id="url"
                    placeholder="/users hoặc https://jsonplaceholder.typicode.com/users"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>

              <Tabs defaultValue="headers" className="w-full">
                <TabsList>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="body" disabled={method === 'GET'}>Body</TabsTrigger>
                </TabsList>
                <TabsContent value="headers">
                  <div>
                    <Label htmlFor="headers">Headers (JSON hoặc key: value mỗi dòng)</Label>
                    <Textarea
                      id="headers"
                      placeholder='{"Content-Type": "application/json"} hoặc Content-Type: application/json'
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      rows={4}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="body">
                  <div>
                    <Label htmlFor="body">Request Body</Label>
                    <Textarea
                      id="body"
                      placeholder='{"name": "John", "email": "john@example.com"}'
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button 
                onClick={sendRequest} 
                disabled={loading || !selectedApiKey}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                {loading ? 'Đang gửi...' : 'Gửi Request'}
              </Button>
            </CardContent>
          </Card>

          {response && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Response</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={response.status >= 200 && response.status < 300 ? 'default' : 'destructive'}
                    >
                      {response.status} {response.statusText}
                    </Badge>
                    <Badge variant="outline">
                      {response.responseTime}ms
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="body" className="w-full">
                  <TabsList>
                    <TabsTrigger value="body">Response Body</TabsTrigger>
                    <TabsTrigger value="headers">Response Headers</TabsTrigger>
                  </TabsList>
                  <TabsContent value="body">
                    <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                      <pre className="text-sm">
                        {typeof response.data === 'string' 
                          ? response.data 
                          : JSON.stringify(response.data, null, 2)
                        }
                      </pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="headers">
                    <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                      <pre className="text-sm">
                        {JSON.stringify(response.headers, null, 2)}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {quotaStats && (
            <Card>
              <CardHeader>
                <CardTitle>Quota Status</CardTitle>
                <CardDescription>
                  Thống kê sử dụng API key hiện tại
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {quotaStats.requests_used || 0}
                  </div>
                  <p className="text-sm text-gray-600">Requests đã sử dụng</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Quota limit:</span>
                    <span>{quotaStats.quota_limit || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Requests hôm nay:</span>
                    <span>{quotaStats.today_requests || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Requests tuần này:</span>
                    <span>{quotaStats.week_requests || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ví dụ</CardTitle>
              <CardDescription>
                Một số endpoint mẫu để test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <strong>JSONPlaceholder:</strong>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• GET /posts</li>
                  <li>• GET /users</li>
                  <li>• POST /posts</li>
                </ul>
              </div>
              
              <div className="text-sm">
                <strong>HTTPBin:</strong>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• GET /get</li>
                  <li>• POST /post</li>
                  <li>• GET /headers</li>
                </ul>
              </div>

              <div className="text-sm">
                <strong>ReqRes:</strong>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• GET /users</li>
                  <li>• POST /users</li>
                  <li>• GET /users/1</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
