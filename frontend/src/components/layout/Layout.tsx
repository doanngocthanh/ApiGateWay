
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  isAdmin?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ isAdmin = false }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="flex">
        <Sidebar isAdmin={isAdmin} />
        
        <div className="flex-1 ml-64">
          <Header />
          
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
