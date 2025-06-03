
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { RegisterPage } from '@/components/auth/RegisterPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { ApiKeys } from '@/components/dashboard/ApiKeys';
import { Profile } from '@/components/dashboard/Profile';
import { Plans } from '@/components/dashboard/Plans';
import { PaymentHistory } from '@/components/dashboard/PaymentHistory';
import { ProxyMappings } from '@/components/dashboard/ProxyMappings';
import { ApiTester } from '@/components/dashboard/ApiTester';
import { ProxyDestinations } from '@/components/admin/ProxyDestinations';
import { Analytics } from '@/components/admin/Analytics';
import { PaymentManagement } from '@/components/admin/PaymentManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { Layout } from '@/components/layout/Layout';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Client Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="profile" element={<Profile />} />
              <Route path="plans" element={<Plans />} />
              <Route path="payment-history" element={<PaymentHistory />} />
              <Route path="mappings" element={<ProxyMappings />} />
              <Route path="api-tester" element={<ApiTester />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <Layout isAdmin={true} />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="destinations" element={<ProxyDestinations />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="payments" element={<PaymentManagement />} />
              <Route path="users" element={<UserManagement />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
