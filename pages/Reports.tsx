
import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar, FileDown, TrendingUp, TrendingDown, DollarSign, Package, AlertOctagon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getReportData } from '../services/db';
import { CURRENCY } from '../constants';
import { Invoice, Expense, Product } from '../types';

declare var html2pdf: any;

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

interface OutflowItem {
    id: string;
    date: string;
    type: string; // 'Expense' or 'Transaction' or 'Purchase'
    category: string;
    description: string;
    amount: number;
}

const Reports: React.FC = () => {
    const { user } = useAuth();
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Last 30 days
        end: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState<{
        invoices: Invoice[],
        expenses: Expense[],
        products: Product[],
        kpis: any,
        salesChart: any[],
        categoryChart: any[],
        outflowsChart: any[],
        topProducts: any[],
        outflowsList: OutflowItem[]
    }>({
        invoices: [], expenses: [], products: [], kpis: {}, salesChart: [], categoryChart: [], outflowsChart: [], topProducts: [], outflowsList: []
    });

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        const report = await getReportData(user.id, dateRange.start, dateRange.end);
        
        // --- Calculate KPIs ---
        const totalSales = report.invoices.reduce((sum, i) => sum + i.total, 0);
        const totalExpenses = report.expenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Approx Cost of Goods Sold (Using current cost)
        let totalCOGS = 0;
        report.invoices.forEach(inv => {
            inv.items.forEach(item => {
                const prod = report.products.find(p => p.id === item.productId);
                if (prod) totalCOGS += (prod.cost * item.quantity);
            });
        });

        const grossProfit = totalSales - totalCOGS;
        const netProfit = totalSales - totalExpenses - totalCOGS;
        const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;
        const stockValue = report.products.reduce((sum, p) => sum + (p.stock * p.cost), 0);

        // --- Chart Data: Sales vs Expenses over time ---
        const dailyMap: Record<string, {sales: number, expenses: number, profit: number}> = {};
        
        // Init dates
        let curr = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        while(curr <= end) {
            const d = curr.toISOString().split('T')[0];
            dailyMap[d] = { sales: 0, expenses: 0, profit: 0 };
            curr.setDate(curr.getDate() + 1);
        }

        report.invoices.forEach(inv => {
            const d = inv.date.split('T')[0];
            if(dailyMap[d]) dailyMap[d].sales += inv.total;
        });

        report.expenses.forEach(exp => {
            const d = exp.date.split('T')[0];
            if(dailyMap[d]) dailyMap[d].expenses += exp.amount;
        });

        // Fill Profit
        Object.keys(dailyMap).forEach(k => {
            dailyMap[k].profit = dailyMap[k].sales - dailyMap[k].expenses; 
        });

        const salesChart = Object.keys(dailyMap).map(date => ({
            name: new Date(date).toLocaleDateString('ar-MA', {day: '2-digit', month: '2-digit'}),
            مبيعات: dailyMap[date].sales,
            مصاريف: dailyMap[date].expenses,
            ربح: dailyMap[date].profit
        }));

        // --- Pie Chart: Sales by Category ---
        const catMap: Record<string, number> = {};
        report.invoices.forEach(inv => {
            inv.items.forEach(item => {
                const prod = report.products.find(p => p.id === item.productId);
                const cat = prod?.category === 'Men' ? 'رجالي' : prod?.category === 'Women' ? 'نسائي' : prod?.category === 'Kids' ? 'أطفال' : 'أخرى';
                catMap[cat] = (catMap[cat] || 0) + (item.quantity * item.priceAtSale);
            });
        });
        const categoryChart = Object.keys(catMap).map(name => ({ name, value: catMap[name] }));

        // --- Top Products ---
        const prodSales: Record<string, {name: string, qty: number, total: number}> = {};
        report.invoices.forEach(inv => {
            inv.items.forEach(item => {
                if(!prodSales[item.productId]) {
                    prodSales[item.productId] = { name: item.productName, qty: 0, total: 0 };
                }
                prodSales[item.productId].qty += item.quantity;
                prodSales[item.productId].total += (item.quantity * item.priceAtSale);
            });
        });
        const topProducts = Object.values(prodSales).sort((a,b) => b.total - a.total).slice(0, 5);

        // --- Money Out (Expenses + Transactions OUT + Purchase Payments) ---
        const outflowMap: Record<string, number> = {};
        const allOutflows: OutflowItem[] = [];

        // 1. Process Expenses
        report.expenses.forEach(exp => {
            const catName = exp.categoryName || 'مصروف عام';
            outflowMap[catName] = (outflowMap[catName] || 0) + exp.amount;
            allOutflows.push({
                id: exp.id,
                date: exp.date,
                type: 'مصروف',
                category: catName,
                description: exp.title,
                amount: exp.amount
            });
        });

        // 2. Process Out Transactions (Payment to Supplier, Employee Loan, etc)
        report.transactions.filter(t => t.type === 'out').forEach(tx => {
            let catLabel = 'مدفوعات أخرى';
            if (tx.entityType === 'Supplier') catLabel = 'سداد ديون موردين';
            if (tx.entityType === 'Employee') catLabel = 'سلف موظفين';
            if (tx.entityType === 'Client') catLabel = 'إقراض عملاء';

            outflowMap[catLabel] = (outflowMap[catLabel] || 0) + tx.amount;
            allOutflows.push({
                id: tx.id,
                date: tx.date,
                type: 'سند صرف',
                category: catLabel,
                description: tx.description || `صرف لـ ${tx.entityName}`,
                amount: tx.amount
            });
        });

        // 3. Process Purchase Payments (Immediate payment at time of purchase)
        report.purchases.forEach(pur => {
            if (pur.paidAmount > 0) {
                const catLabel = 'مشتريات بضاعة';
                outflowMap[catLabel] = (outflowMap[catLabel] || 0) + pur.paidAmount;
                allOutflows.push({
                    id: pur.id,
                    date: pur.date,
                    type: 'فاتورة شراء',
                    category: catLabel,
                    description: `شراء من ${pur.supplierName}`,
                    amount: pur.paidAmount
                });
            }
        });

        const outflowsChart = Object.keys(outflowMap).map(name => ({ name, value: outflowMap[name] }));
        // Sort table by date desc
        allOutflows.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


        setData({
            invoices: report.invoices,
            expenses: report.expenses,
            products: report.products,
            kpis: { totalSales, totalExpenses, netProfit, profitMargin, stockValue, totalCOGS, grossProfit },
            salesChart,
            categoryChart,
            outflowsChart,
            topProducts,
            outflowsList: allOutflows
        });
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [user, dateRange]);

    const handleExportPDF = () => {
        setExporting(true);
        const element = document.getElementById('report-container');
        const opt = {
            margin: [0.3, 0.3],
            filename: `تقرير_بوصلة_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        // Adding a slight delay to ensure UI updates before snapshot
        setTimeout(() => {
            html2pdf().set(opt).from(element).save().then(() => {
                setExporting(false);
            });
        }, 100);
    };

    if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-gray-500 gap-2"><Loader2 className="animate-spin" /> جاري تحميل التقارير...</div>;

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">التقارير الشاملة</h1>
                    <p className="text-gray-500 text-sm">تحليل أداء المتجر والوضع المالي</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                        <Calendar size={18} className="text-gray-400" />
                        <input 
                            type="date" 
                            className="text-sm outline-none"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            className="text-sm outline-none"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={handleExportPDF}
                        disabled={exporting}
                        className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-900 transition shadow-sm font-bold text-sm disabled:opacity-70"
                    >
                        {exporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
                        تصدير PDF
                    </button>
                </div>
            </div>

            {/* PRINTABLE CONTENT AREA */}
            <div id="report-container" className="space-y-6">
                
                {/* PDF Header (Only visible in PDF logically, but part of DOM) */}
                <div className="hidden pdf-header flex-col items-center mb-8 border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-800">تقرير مالي - {user?.storeName}</h1>
                    <p className="text-gray-500 mt-2">الفترة: {dateRange.start} إلى {dateRange.end}</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
                            <span className="text-gray-500 font-bold text-sm">صافي الربح</span>
                        </div>
                        <div className={`text-3xl font-extrabold ${data.kpis.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {data.kpis.netProfit?.toLocaleString()} {CURRENCY}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">هامش الربح: {data.kpis.profitMargin}%</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
                            <span className="text-gray-500 font-bold text-sm">إجمالي الإيرادات</span>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {data.kpis.totalSales?.toLocaleString()} {CURRENCY}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{data.invoices.length} فاتورة</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><TrendingDown size={20} /></div>
                            <span className="text-gray-500 font-bold text-sm">إجمالي المصاريف</span>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {data.kpis.totalExpenses?.toLocaleString()} {CURRENCY}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">تشغيلي + رواتب</p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Package size={20} /></div>
                            <span className="text-gray-500 font-bold text-sm">قيمة المخزون الحالي</span>
                        </div>
                        <div className="text-3xl font-extrabold text-gray-800">
                            {data.kpis.stockValue?.toLocaleString()} {CURRENCY}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">بسعر التكلفة</p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 break-inside-avoid">
                    {/* Main Line Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6">الأداء المالي (مبيعات vs مصاريف)</h3>
                        <div className="h-80 w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.salesChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                    />
                                    <Legend />
                                    <Bar dataKey="مبيعات" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="مصاريف" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Pie Chart: Outflows */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <AlertOctagon size={18} className="text-red-500" />
                            تحليل الأموال الخارجة
                        </h3>
                        <div className="h-64 w-full flex items-center justify-center" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.outflowsChart}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.outflowsChart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Outflows List Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden break-inside-avoid">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800">جدول الأموال الخارجة (مصاريف + مشتريات + مدفوعات)</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">التاريخ</th>
                                    <th className="px-6 py-4">النوع</th>
                                    <th className="px-6 py-4">التصنيف</th>
                                    <th className="px-6 py-4">البيان</th>
                                    <th className="px-6 py-4">المبلغ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.outflowsList.map((item, i) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-500 text-sm">{item.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                item.type === 'مصروف' ? 'bg-orange-100 text-orange-700' : 
                                                item.type === 'فاتورة شراء' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800 text-sm">{item.category}</td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{item.description}</td>
                                        <td className="px-6 py-4 font-bold text-red-600">{item.amount} {CURRENCY}</td>
                                    </tr>
                                ))}
                                {data.outflowsList.length === 0 && (
                                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">لا توجد عمليات صرف مسجلة في هذه الفترة</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Tables Section (Bottom) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 break-inside-avoid">
                    {/* Top Products */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">المنتجات الأكثر مبيعاً</h3>
                        </div>
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">المنتج</th>
                                    <th className="px-6 py-4">الكمية المباعة</th>
                                    <th className="px-6 py-4">العائد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.topProducts.map((p, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                        <td className="px-6 py-4">{p.qty}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-600">{p.total} {CURRENCY}</td>
                                    </tr>
                                ))}
                                {data.topProducts.length === 0 && (
                                    <tr><td colSpan={3} className="p-6 text-center text-gray-400">لا توجد بيانات كافية</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* P&L Summary Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">ملخص الأرباح والخسائر</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center text-gray-800">
                                <span>إجمالي المبيعات</span>
                                <span className="font-bold text-lg">{data.kpis.totalSales?.toLocaleString()} {CURRENCY}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-500 border-b border-gray-50 pb-2">
                                <span>- تكلفة البضاعة المباعة (COGS)</span>
                                <span className="font-bold">({data.kpis.totalCOGS?.toLocaleString()})</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-gray-700 bg-gray-50 p-2 rounded-lg">
                                <span className="font-bold">إجمالي الربح (Gross Profit)</span>
                                <span className="font-bold text-lg">{data.kpis.grossProfit?.toLocaleString()} {CURRENCY}</span>
                            </div>

                            <div className="flex justify-between items-center text-red-500 pb-2">
                                <span>- المصاريف التشغيلية</span>
                                <span className="font-bold">({data.kpis.totalExpenses?.toLocaleString()})</span>
                            </div>

                            <div className={`border-t-2 border-dashed border-gray-200 pt-3 flex justify-between items-center text-xl font-extrabold ${data.kpis.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                <span>صافي الربح</span>
                                <span>{data.kpis.netProfit?.toLocaleString()} {CURRENCY}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .pdf-header { display: none; }
                @media print {
                   body { background-color: white; }
                   .pdf-header { display: flex; }
                }
            `}</style>
        </div>
    );
};

export default Reports;
