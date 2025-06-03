import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface User {
  id: number;
  email: string;
  role: string;
  status: string;
  created_at: string;
  api_key_count: number;
  subscription?: {
    plan_name: string;
    end_date: string;
  };
  total_requests: number;
}

export const UserManagement = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Thêm state cho phân trang
  const [page, setPage] = useState(1);
  const [perPage] = useState(20); // hoặc cho phép chọn
  const [pagination, setPagination] = useState<{current_page: number, total_pages: number, total_count: number, per_page: number}>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    per_page: 20,
  });

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/getListUsers/all?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.data?.users || []);
      setPagination(data.data?.pagination || pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách người dùng',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Hoạt động</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Không hoạt động</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Bị khóa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default">Admin</Badge>;
      case 'customer':
        return <Badge variant="outline">Khách hàng</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  // Lọc chỉ trên client cho search/filter, hoặc có thể gửi lên server nếu backend hỗ trợ
  const filteredUsers = users.filter(user => {
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quản lý người dùng</h2>
          <p className="text-gray-600">Quản lý tất cả người dùng trong hệ thống</p>
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quản lý người dùng</h2>
        <p className="text-gray-600">Quản lý tất cả người dùng trong hệ thống</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Tổng người dùng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{users.length}</div>
            <p className="text-xs text-blue-600 mt-1">
              Đã đăng ký
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {users.filter(u => u.status === 'active').length}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Người dùng active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">
              Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Quản trị viên
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {users.reduce((sum, u) => sum + u.api_key_count, 0)}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              Tổng số keys
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng</CardTitle>
          <CardDescription>
            Quản lý và theo dõi tất cả người dùng
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <Input
              placeholder="Tìm kiếm theo email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
                <SelectItem value="suspended">Bị khóa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="customer">Khách hàng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>API Keys</TableHead>
                <TableHead>Gói dịch vụ</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Không tìm thấy người dùng nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">{user.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{user.email}</div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-center">{user.api_key_count}</TableCell>
                    <TableCell>
                      {user.subscription ? (
                        <div>
                          <div className="font-medium">{user.subscription.plan_name}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(user.subscription.end_date).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.total_requests.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <Dialog open={dialogOpen && selectedUser?.id === user.id} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            Chi tiết
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Chi tiết người dùng</DialogTitle>
                            <DialogDescription>
                              Thông tin chi tiết về {selectedUser?.email}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedUser && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>ID</Label>
                                  <p className="font-mono">{selectedUser.id}</p>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <p>{selectedUser.email}</p>
                                </div>
                                <div>
                                  <Label>Vai trò</Label>
                                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                                </div>
                                <div>
                                  <Label>Trạng thái</Label>
                                  <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                                </div>
                                <div>
                                  <Label>Số API Keys</Label>
                                  <p>{selectedUser.api_key_count}</p>
                                </div>
                                <div>
                                  <Label>Tổng requests</Label>
                                  <p>{selectedUser.total_requests.toLocaleString()}</p>
                                </div>
                              </div>
                              {selectedUser.subscription && (
                                <div>
                                  <Label>Gói dịch vụ</Label>
                                  <div className="mt-1">
                                    <p className="font-medium">{selectedUser.subscription.plan_name}</p>
                                    <p className="text-sm text-gray-500">
                                      Hết hạn: {new Date(selectedUser.subscription.end_date).toLocaleDateString('vi-VN')}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div>
                                <Label>Ngày đăng ký</Label>
                                <p>{new Date(selectedUser.created_at).toLocaleDateString('vi-VN')}</p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {/* Phân trang */}
          <div className="flex justify-between items-center mt-4">
            <span>
              Trang {pagination.current_page} / {pagination.total_pages} ({pagination.total_count} người dùng)
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page >= pagination.total_pages}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
