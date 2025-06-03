
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shield, User } from 'lucide-react';

export const AdminToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Chỉ hiển thị nếu user là admin
  if (user?.role !== 'admin') {
    return null;
  }

  const isAdminRoute = location.pathname.startsWith('/admin');

  const toggleAdminMode = () => {
    if (isAdminRoute) {
      navigate('/'); // Chuyển về dashboard user
    } else {
      navigate('/admin'); // Chuyển về dashboard admin
    }
  };

  return (
    <Button
      onClick={toggleAdminMode}
      variant={isAdminRoute ? "default" : "outline"}
      className={`flex items-center gap-2 ${
        isAdminRoute 
          ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700" 
          : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
      }`}
    >
      {isAdminRoute ? (
        <>
          <User className="h-4 w-4" />
          Chế độ User
        </>
      ) : (
        <>
          <Shield className="h-4 w-4" />
          Quản lý nâng cao
        </>
      )}
    </Button>
  );
};
