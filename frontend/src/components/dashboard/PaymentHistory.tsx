
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface Payment {
  order_id: string;
  amount: string; // API returns string
  status: string;
  created_at: string;
  paid_at?: string;
  plan_name: string;
  duration_days: number;
}

export const PaymentHistory = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.PAYMENT.HISTORY), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Payment history response:', data);
        if (data.success && data.data?.payments) {
          setPayments(data.data.payments);
        } else {
          setPayments([]);
        }
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể tải lịch sử thanh toán',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải lịch sử thanh toán',
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Lịch sử thanh toán</h2>
          <p className="text-gray-600">Xem lại các giao dịch đã thực hiện</p>
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Lịch sử thanh toán</h2>
        <p className="text-gray-600">Xem lại các giao dịch đã thực hiện</p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold mb-2">Chưa có giao dịch nào</h3>
            <p className="text-gray-600 text-center">
              Bạn chưa thực hiện giao dịch thanh toán nào
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Giao dịch của bạn</CardTitle>
            <CardDescription>
              Danh sách tất cả các giao dịch thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn hàng</TableHead>
                  <TableHead>Gói dịch vụ</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Ngày thanh toán</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.order_id}>
                    <TableCell className="font-mono text-sm">
                      {payment.order_id}
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={fetchPaymentHistory} variant="outline">
          Làm mới
        </Button>
      </div>
    </div>
  );
};
