
import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu xác nhận không khớp',
        variant: 'destructive'
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu phải có ít nhất 8 ký tự',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Đăng ký thành công',
          description: 'Tài khoản đã được tạo. Vui lòng đăng nhập.',
        });
        // Redirect to login page
        window.location.href = '/login';
      } else {
        toast({
          title: 'Đăng ký thất bại',
          description: data.message || 'Có lỗi xảy ra khi tạo tài khoản',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến máy chủ',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5"></div>
      
      <Card className="w-full max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="text-white text-2xl font-bold">API</div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Đăng Ký Tài Khoản
          </CardTitle>
          <CardDescription className="text-gray-600">
            Tạo tài khoản mới để sử dụng API Gateway
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Loại tài khoản</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Chọn loại tài khoản" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Khách hàng</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </Button>
          </form>
          
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
