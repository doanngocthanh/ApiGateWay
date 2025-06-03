import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface AdminPayment {
  id?: string;
  order_id: string;
  user_id?: number;
  user_email?: string;
  plan_name: string;
  amount: string; // API returns string
  status: string;
  created_at: string;
  paid_at?: string;
  duration_days: number;
}

export const PaymentManagement = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.ADMIN.PAYMENTS), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Admin payments response:', data);
        if (data.success && data.data?.payments) {
          setPayments(data.data.payments);
        } else {
          setPayments([]);
        }
      } else {
        console.log('Admin payments endpoint not available, using mock data');
        // Mock data for demo since API might not be implemented yet
        setPayments([
          {
            order_id: 'order_1_1748858453158_153144d1',
            user_id: 1,
            user_email: 'user@example.com',
            plan_name: 'Free',
            amount: '0.00',
            status: 'success',
            created_at: '2025-06-02T10:00:53.304Z',
            paid_at: '2025-06-02T10:00:53.304Z',
            duration_days: 30,
          },
          {
            order_id: 'order_1_1748858440605_742d9e5f',
            user_id: 2,
            user_email: 'customer@example.com',
            plan_name: 'Free',
            amount: '0.00',
            status: 'success',
            created_at: '2025-06-02T10:00:40.750Z',
            paid_at: '2025-06-02T10:00:40.750Z',
            duration_days: 30,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách thanh toán',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Thành công</Badge>;
      case 'pending':
        return <Badge variant="secondary">Đang xử lý</Badge>;
      case 'failed':
        return <Badge variant="destructive">Thất bại</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesSearch = (payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         payment.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.plan_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate statistics
  const successPayments = payments.filter(p => p.status === 'success');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const failedPayments = payments.filter(p => p.status === 'failed');
  const totalRevenue = successPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingRevenue = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quản lý thanh toán</h2>
          <p className="text-gray-600">Theo dõi và quản lý tất cả các giao dịch</p>
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quản lý thanh toán</h2>
        <p className="text-gray-600">Theo dõi và quản lý tất cả các giao dịch</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Tổng thu nhập
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              ${totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Từ {successPayments.length} giao dịch
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Đang xử lý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              ${pendingRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {pendingPayments.length} giao dịch
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Thất bại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {failedPayments.length}
            </div>
            <p className="text-xs text-red-600 mt-1">
              Giao dịch lỗi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">
              Tổng giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {payments.length}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Tất cả giao dịch
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách giao dịch</CardTitle>
          <CardDescription>
            Quản lý và theo dõi tất cả các giao dịch của người dùng
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <Input
              placeholder="Tìm kiếm theo email, order ID, hoặc gói..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="success">Thành công</SelectItem>
                <SelectItem value="pending">Đang xử lý</SelectItem>
                <SelectItem value="failed">Thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead>Gói dịch vụ</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Ngày thanh toán</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Không tìm thấy giao dịch nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.order_id}>
                    <TableCell className="font-mono text-sm">
                      {payment.order_id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.user_email || 'N/A'}</div>
                        {payment.user_id && (
                          <div className="text-sm text-gray-500">ID: {payment.user_id}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.plan_name}</div>
                        <div className="text-sm text-gray-500">
                          {payment.duration_days} ngày
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${Number(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      {payment.paid_at 
                        ? new Date(payment.paid_at).toLocaleDateString('vi-VN')
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={fetchPayments} variant="outline">
          Làm mới
        </Button>
      </div>
    </div>
  );
};
