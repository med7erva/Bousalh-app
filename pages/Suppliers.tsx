
import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Phone, Plus, AlertCircle, FileText, Search, X, Truck, ArrowUpRight, ArrowDownLeft, MoreVertical, Edit2, Trash2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSuppliers, addSupplier, getPurchases, getTransactions, updateSupplier, deleteSupplier } from '../services/db';
import { getSupplierInsights } from '../services/geminiService';
import { Supplier, Purchase, FinancialTransaction } from '../types';
import { CURRENCY } from '../constants';
import AIInsightAlert from '../components/AIInsightAlert';

// Union type for the history list
// Changed discriminator to 'docType' to avoid conflict with FinancialTransaction.type
type HistoryItem = 
  | (Purchase & { docType: 'purchase' })
  | (FinancialTransaction & { docType: 'transaction' });

const Suppliers: React.FC = () => {
    const { user } = useAuth();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [aiInsight, setAiInsight] = useState('');
    
    // Add Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        phone: '',
        debt: 0,
        productsSummary: ''
    });

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    // Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        if (!user) return;
        const data = await getSuppliers(user.id);
        setSuppliers(data);
        
        if (data.length > 0 && !aiInsight) {
            const insight = await getSupplierInsights(data);
            setAiInsight(insight);
        }
    };

    useEffect(() => {
        loadData();
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [user]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        await addSupplier({
            userId: user.id,
            ...newSupplier
        });
        
        setIsModalOpen(false);
        setNewSupplier({ name: '', phone: '', debt: 0, productsSummary: '' });
        loadData();
    };

    const handleUpdateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!editingSupplier) return;
        await updateSupplier(editingSupplier);
        setIsEditModalOpen(false);
        setEditingSupplier(null);
        loadData();
    };

    const handleDeleteSupplier = async (id: string) => {
        if(window.confirm('هل أنت متأكد من حذف هذا المورد؟')) {
            try {
                await deleteSupplier(id);
                loadData();
                setActiveMenuId(null);
            } catch (error) {
                console.error(error);
                alert("لا يمكن حذف هذا المورد.");
            }
        }
    };

    const openEditModal = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsEditModalOpen(true);
        setActiveMenuId(null);
    };

    const handleViewHistory = async (supplier: Supplier) => {
        if(!user) return;
        setSelectedSupplier(supplier);
        
        // 1. Fetch Purchases
        const allPurchases = await getPurchases(user.id);
        const supplierPurchases = allPurchases.filter(p => p.supplierId === supplier.id)
            .map(p => ({ ...p, docType: 'purchase' as const }));

        // 2. Fetch Transactions (Payments/Receipts)
        const allTransactions = await getTransactions(user.id);
        const supplierTransactions = allTransactions.filter(tx => 
            tx.entityType === 'Supplier' && tx.entityId === supplier.id
        ).map(tx => ({ ...tx, docType: 'transaction' as const }));

        // 3. Merge and Sort
        const combined = [...supplierPurchases, ...supplierTransactions].sort(
            (a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setHistoryItems(combined as HistoryItem[]);
        setIsHistoryModalOpen(true);
        setActiveMenuId(null);
    };

    const filtered = suppliers.filter(s => 
        s.name.includes(searchTerm) || s.phone.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">الموردين</h1>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition shadow-sm"
                >
                    <Plus size={20} />
                    <span>مورد جديد</span>
                </button>
            </div>

            {/* AI Insight (Collapsible) */}
            <AIInsightAlert 
                title="تحليل علاقات الموردين"
                insight={aiInsight}
                icon={AlertCircle}
                baseColor="amber"
            />

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="بحث باسم المورد..." 
                    className="w-full pl-4 pr-12 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(supplier => (
                    <div key={supplier.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative">
                         <div className="absolute top-4 left-4">
                             <button 
                                onClick={() => setActiveMenuId(activeMenuId === supplier.id ? null : supplier.id)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                             >
                                 <MoreVertical size={20} />
                             </button>
                             {activeMenuId === supplier.id && (
                                 <div ref={menuRef} className="absolute left-0 top-8 w-40 bg-white shadow-xl rounded-lg border border-gray-100 z-10 overflow-hidden">
                                     <button onClick={() => openEditModal(supplier)} className="w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                         <Edit2 size={14} /> تعديل
                                     </button>
                                     <button onClick={() => handleDeleteSupplier(supplier.id)} className="w-full text-right px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                         <Trash2 size={14} /> حذف
                                     </button>
                                 </div>
                             )}
                         </div>

                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <Briefcase size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{supplier.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <Phone size={12} />
                                        <span dir="ltr">{supplier.phone}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
                                <span className="font-bold">يوفر:</span> {supplier.productsSummary || 'غير محدد'}
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                                <span className="text-sm text-red-600 font-bold">مستحقات له (دين)</span>
                                <span className="font-bold text-red-700">
                                    {supplier.debt} {CURRENCY}
                                </span>
                            </div>
                            <button 
                                onClick={() => handleViewHistory(supplier)}
                                className="w-full py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <FileText size={16} />
                                كشف الحساب
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">إضافة مورد جديد</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                                <input required type="text" className="w-full p-2 border rounded-lg"
                                    value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                                <input required type="text" className="w-full p-2 border rounded-lg"
                                    value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">أصناف المنتجات (اختياري)</label>
                                <input type="text" className="w-full p-2 border rounded-lg"
                                    placeholder="أقمشة، خيوط، اكسسوارات"
                                    value={newSupplier.productsSummary} onChange={e => setNewSupplier({...newSupplier, productsSummary: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رصيد افتتاحي (دين)</label>
                                <input type="number" className="w-full p-2 border rounded-lg"
                                    value={newSupplier.debt} onChange={e => setNewSupplier({...newSupplier, debt: Number(e.target.value)})} />
                            </div>
                            <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold">حفظ</button>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-gray-500 py-2">إلغاء</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editingSupplier && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">تعديل بيانات المورد</h2>
                        <form onSubmit={handleUpdateSupplier} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                                <input required type="text" className="w-full p-2 border rounded-lg"
                                    value={editingSupplier.name} onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                                <input required type="text" className="w-full p-2 border rounded-lg"
                                    value={editingSupplier.phone} onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">أصناف المنتجات</label>
                                <input type="text" className="w-full p-2 border rounded-lg"
                                    value={editingSupplier.productsSummary} onChange={e => setEditingSupplier({...editingSupplier, productsSummary: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رصيد الدين (تصحيح)</label>
                                <input type="number" className="w-full p-2 border rounded-lg"
                                    value={editingSupplier.debt} onChange={e => setEditingSupplier({...editingSupplier, debt: Number(e.target.value)})} />
                            </div>
                            <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold">حفظ التعديلات</button>
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full text-gray-500 py-2">إلغاء</button>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal (Statement of Account) */}
            {isHistoryModalOpen && selectedSupplier && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Truck className="text-slate-600" />
                                    كشف حساب: {selectedSupplier.name}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    المبلغ المتبقي له (دين): <span className="text-red-600 font-bold">{selectedSupplier.debt} {CURRENCY}</span>
                                </p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <X size={24} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-right">
                                <thead className="bg-white text-gray-500 text-xs uppercase sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 bg-gray-50 rounded-r-lg">التاريخ</th>
                                        <th className="px-4 py-3 bg-gray-50">النوع</th>
                                        <th className="px-4 py-3 bg-gray-50">البيان</th>
                                        <th className="px-4 py-3 bg-gray-50">له (مشتريات/سلف)</th>
                                        <th className="px-4 py-3 bg-gray-50 rounded-l-lg">عليه (دفعات منا)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {historyItems.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا توجد عمليات مسجلة مع هذا المورد</td></tr>
                                    ) : (
                                        historyItems.map(item => {
                                            const isPurchase = item.docType === 'purchase';
                                            let credit = 0; // له (Purchases we made on credit)
                                            let debit = 0; // عليه (Payments we made)

                                            if (isPurchase) {
                                                // Item is Purchase
                                                credit = item.totalCost;
                                                debit = item.paidAmount;
                                            } else {
                                                // Item is FinancialTransaction
                                                const tx = item;
                                                if (tx.type === 'out') {
                                                    // Out from us to Supplier = Payment = Debit
                                                    debit = tx.amount;
                                                } else {
                                                    // In from Supplier to us = Loan/Refund = Credit
                                                    credit = tx.amount;
                                                }
                                            }

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                                        {new Date(item.date).toLocaleDateString('ar-MA')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                         {isPurchase ? (
                                                            <span className="flex items-center gap-1 text-xs font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded w-fit">
                                                                <Truck size={12} /> فاتورة شراء
                                                            </span>
                                                        ) : (
                                                            item.type === 'out' ? 
                                                            <span className="flex items-center gap-1 text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded w-fit">
                                                                <ArrowUpRight size={12} /> سند صرف
                                                            </span> :
                                                            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded w-fit">
                                                                <ArrowDownLeft size={12} /> سند قبض
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {isPurchase ? (
                                                             <span className="truncate block max-w-[200px]">
                                                                {item.items.length} منتجات
                                                            </span>
                                                        ) : item.description}
                                                         <div className="text-xs text-gray-400 font-mono mt-0.5">{item.id.slice(-8)}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-800">
                                                        {credit > 0 ? `${credit}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600">
                                                        {debit > 0 ? `${debit}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
