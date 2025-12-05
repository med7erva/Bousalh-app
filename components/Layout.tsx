
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  Wallet, 
  FileText, 
  Settings, 
  MessageSquare, 
  Menu, 
  X,
  LogOut,
  UserCircle,
  Briefcase,
  Landmark,
  IdCard
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'الرئيسية', icon: LayoutDashboard, path: '/' },
  { label: 'المبيعات', icon: ShoppingCart, path: '/sales' },
  { label: 'المخزون', icon: Package, path: '/inventory' },
  { label: 'المالية', icon: Landmark, path: '/finance' }, 
  { label: 'المشتريات', icon: Truck, path: '/purchases' },
  { label: 'العملاء', icon: Users, path: '/clients' },
  { label: 'الموردين', icon: Briefcase, path: '/suppliers' },
  { label: 'الموظفين', icon: IdCard, path: '/employees' }, // New
  { label: 'المصاريف', icon: Wallet, path: '/expenses' },
  { label: 'التقارير', icon: FileText, path: '/reports' },
  { label: 'الإعدادات', icon: Settings, path: '/settings' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 right-0 z-30 h-full w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:block
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-700">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-emerald-400">
            <span>🧭</span> بوصلة
          </h1>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100vh-4rem)] flex flex-col justify-between">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-1 border-t border-slate-700 pt-4">
             <Link
              to="/ai-chat"
              onClick={() => setIsSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-lg transition-colors mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg animate-pulse hover:animate-none
              `}
            >
              <MessageSquare size={20} />
              <span className="font-bold">المساعد الذكي</span>
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <UserCircle size={20} />
              <span>الملف الشخصي</span>
            </Link>
            <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
            >
              <LogOut size={20} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {NAV_ITEMS.find(i => i.path === location.pathname)?.label || 
               (location.pathname === '/ai-chat' ? 'المساعد الذكي' : 'لوحة التحكم')}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{user?.storeName || 'متجري'}</span>
              <span className="text-xs text-gray-500">{user?.name}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-200">
              {user?.name?.charAt(0) || 'م'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;