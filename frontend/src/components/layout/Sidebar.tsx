
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isAdmin?: boolean;
}

const clientMenuItems = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'API Keys', path: '/api-keys', icon: '🔑' },
  { name: 'Profile', path: '/profile', icon: '👤' },
  { name: 'Gói dịch vụ', path: '/plans', icon: '💎' },
  { name: 'Lịch sử thanh toán', path: '/payment-history', icon: '💳' },
  { name: 'Proxy Mappings', path: '/mappings', icon: '🔗' },
  { name: 'Test API', path: '/api-tester', icon: '🧪' },
];

const adminMenuItems = [
  { name: 'Dashboard', path: '/admin', icon: '📊' },
  { name: 'Proxy Destinations', path: '/admin/destinations', icon: '🌐' },
  { name: 'Analytics', path: '/admin/analytics', icon: '📈' },
  { name: 'Quản lý thanh toán', path: '/admin/payments', icon: '💰' },
  { name: 'Quản lý người dùng', path: '/admin/users', icon: '👥' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isAdmin = false }) => {
  const location = useLocation();
  const menuItems = isAdmin ? adminMenuItems : clientMenuItems;

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-50">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">API</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">API Gateway</h2>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Admin Panel' : 'Client Panel'}
            </p>
          </div>
        </div>
      </div>

      <nav className="mt-6 px-3">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-blue-50 group",
                    isActive 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg" 
                      : "text-gray-700 hover:text-blue-600"
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
