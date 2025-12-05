
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  AlertTriangle, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { CURRENCY } from '../constants';
import { getDashboardInsights } from '../services/geminiService';
import { getProducts, getSalesAnalytics, initDB } from '../services/db';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    invoiceCount: 0,
    lowStockCount: 0,
    chartData: [] as any[]
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      await initDB();
      const products = await getProducts(user.id);
      const analytics = await getSalesAnalytics(user.id);
      
      const lowStock = products.filter(p => p.stock < 10).length;
      
      // Calculate estimated profit
      const estimatedProfit = Math.round(analytics.totalSales * 0.3); 

      setStats({
        totalSales: analytics.totalSales,
        totalProfit: estimatedProfit,
        invoiceCount: analytics.totalInvoices,
        lowStockCount: lowStock,
        chartData: analytics.chartData
      });

      // AI Insights
      setLoadingAi(true);
      const tips = await getDashboardInsights(analytics.chartData, products);
      setAiTips(tips);
      setLoadingAi(false);
    };

    loadData();
  }, [user]);

  const kpiCards = [
    { label: 'إجمالي المبيعات', value: `${stats.totalSales.toLocaleString()} ${CURRENCY}`, change: 12, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'تقدير الأرباح', value: `${stats.totalProfit.toLocaleString()} ${CURRENCY}`, change: 8, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'عدد الفواتير', value: stats.invoiceCount.toString(), change: -3, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'تنبيهات المخزون', value: stats.lowStockCount.toString(), change: 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Msg */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">مرحباً، {user?.name.split(' ')[0]} 👋</h2>
        <p className="text-gray-500 text-sm">إليك ملخص أداء متجرك "{user?.storeName}" اليوم.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${stat.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                <span>{Math.abs(stat.change)}%</span>
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">تحليل المبيعات</h3>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <Sparkles className="text-yellow-400" />
            <h3 className="text-lg font-bold">توصيات الذكاء الاصطناعي</h3>
          </div>

          <div className="space-y-4 relative z-10">
            {loadingAi ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
                <div className="h-4 bg-white/20 rounded w-full"></div>
                <div className="h-4 bg-white/20 rounded w-5/6"></div>
              </div>
            ) : aiTips.length > 0 ? (
              aiTips.map((tip, i) => (
                <div key={i} className="flex gap-3 bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                  <div className="mt-1 min-w-[6px] h-1.5 rounded-full bg-yellow-400"></div>
                  <p className="text-sm text-indigo-100 leading-relaxed">{tip.replace(/^- /, '')}</p>
                </div>
              ))
            ) : (
              <p className="text-indigo-200 text-sm">جاري تحليل بيانات متجرك...</p>
            )}
          </div>
          
          <button className="mt-6 w-full py-2.5 bg-white text-indigo-900 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition">
            اطلب تحليلًا مفصلاً
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
