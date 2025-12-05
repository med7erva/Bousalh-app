
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import AIChat from './pages/AIChat';
import Clients from './pages/Clients';
import Expenses from './pages/Expenses';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers'; 
import Employees from './pages/Employees'; 
import Finance from './pages/Finance';
import Reports from './pages/Reports'; // New
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Settings, UserCircle, Wrench } from 'lucide-react';

const PlaceholderPage: React.FC<{ title: string; icon: any }> = ({ title, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-3xl border border-dashed border-gray-300">
    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
        <Icon size={40} className="text-gray-400" />
    </div>
    <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
    <p className="text-gray-500 max-w-md">
      جاري العمل على هذه الصفحة. ستكون متاحة قريباً.
    </p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            <Route path="/" element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Landing />} />

            <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
            <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
            
            <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            
            <Route path="/settings" element={<ProtectedRoute><PlaceholderPage title="الإعدادات" icon={Settings} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><PlaceholderPage title="الملف الشخصي" icon={UserCircle} /></ProtectedRoute>} />
            
            <Route path="*" element={<PlaceholderPage title="صفحة غير موجودة" icon={Wrench} />} />
        </Routes>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
        <Router>
            <AppRoutes />
        </Router>
    </AuthProvider>
  );
};

export default App;
