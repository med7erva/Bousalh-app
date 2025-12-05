
import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, TrendingDown, Calendar, AlertTriangle, Trash2, LayoutList, Layers, User, AlertOctagon, MoreVertical, Edit2, Save, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getExpenses, addExpensesBatch, getSalesAnalytics, getPaymentMethods, ensurePaymentMethodsExist, getExpenseCategories, addExpenseCategory, deleteExpenseCategory, getEmployees, updateExpense, deleteExpense } from '../services/db';
import { getExpenseInsights } from '../services/geminiService';
import { Expense, PaymentMethod, ExpenseCategory, Employee } from '../types';
import { CURRENCY } from '../constants';
import AIInsightAlert from '../components/AIInsightAlert';

interface ExpenseRow {
    id: string;
    categoryId: string;
    employeeId: string;
    title: string;
    amount: number;
}

const Expenses: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'expenses' | 'accounts'>('expenses');
    
    // Data States
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    
    // UI States
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
    const [aiTips, setAiTips] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Batch Form State
    const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [batchPaymentMethodId, setBatchPaymentMethodId] = useState('');
    const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
        { id: '1', categoryId: '', employeeId: '', title: '', amount: 0 }
    ]);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        if (!user) return;
        
        await ensurePaymentMethodsExist(user.id);

        const [expData, catsData, salesData, pmData, empData] = await Promise.all([
            getExpenses(user.id),
            getExpenseCategories(user.id),
            getSalesAnalytics(user.id),
            getPaymentMethods(user.id),
            getEmployees(user.id)
        ]);
        
        setExpenses(expData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setCategories(catsData);
        setPaymentMethods(pmData);
        setEmployees(empData);

        // Default Payment Method
        const defaultPm = pmData.find(m => m.isDefault) || pmData[0];
        
        if (!batchPaymentMethodId && defaultPm) {
            setBatchPaymentMethodId(defaultPm.id);
        }

        // Initialize rows with default category if empty
        if (catsData.length > 0 && expenseRows[0].categoryId === '') {
            setExpenseRows(rows => rows.map(r => ({ ...r, categoryId: catsData[0].id })));
        }

        // Load AI Insights
        if (expData.length > 0 && aiTips.length === 0) {
            const tips = await getExpenseInsights(expData, salesData.totalSales);
            setAiTips(tips);
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

    // --- Expense Row Management ---
    const addRow = () => {
        setExpenseRows([...expenseRows, { 
            id: Date.now().toString(), 
            categoryId: categories[0]?.id || '', 
            employeeId: '', 
            title: '', 
            amount: 0 
        }]);
    };

    const removeRow = (id: string) => {
        if (expenseRows.length === 1) return; // Keep at least one
        setExpenseRows(expenseRows.filter(r => r.id !== id));
    };

    const updateRow = (id: string, field: keyof ExpenseRow, value: any) => {
        setExpenseRows(expenseRows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const calculateTotalBatch = () => expenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    // --- Actions ---
    const handleSaveBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        // Filter out empty rows (0 amount) unless user really intends it? Let's assume > 0 required.
        const validRows = expenseRows.filter(r => r.amount > 0);
        if (validRows.length === 0) {
            alert("الرجاء إدخال مبلغ لمصروف واحد على الأقل.");
            return;
        }

        setIsSubmitting(true);
        try {
            await addExpensesBatch(user.id, {
                date: batchDate,
                paymentMethodId: batchPaymentMethodId,
                expenses: validRows
            });

            setIsAddExpenseModalOpen(false);
            setExpenseRows([{ 
                id: Date.now().toString(), 
                categoryId: categories[0]?.id || '', 
                employeeId: '', 
                title: '', 
                amount: 0 
            }]);
            loadData();
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء حفظ المصاريف. يرجى التأكد من الاتصال.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!editingExpense) return;
        
        setIsSubmitting(true);
        try {
            await updateExpense(editingExpense);
            setIsEditExpenseModalOpen(false);
            setEditingExpense(null);
            loadData();
        } catch (error) {
            console.error(error);
            alert("فشل تحديث المصروف");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if(window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
            try {
                await deleteExpense(id);
                loadData();
                setActiveMenuId(null);
            } catch (error) {
                console.error(error);
                alert("حدث خطأ أثناء حذف المصروف.");
            }
        }
    };

    const openEditModal = (exp: Expense) => {
        setEditingExpense(exp);
        setIsEditExpenseModalOpen(true);
        setActiveMenuId(null);
    };

    // --- Category Actions ---
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newCategoryName.trim()) return;
        setIsSubmitting(true);
        try {
            await addExpenseCategory(user.id, newCategoryName);
            setNewCategoryName('');
            setIsAddCategoryModalOpen(false);
            loadData();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        if (!user) return;
        try {
            if(window.confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
                await deleteExpenseCategory(user.id, catId);
                loadData();
            }
        } catch (error: any) {
            if (error.message === 'HAS_EXPENSES') {
                alert("عذراً، لا يمكن حذف حساب عليه عمليات مالية حالياً. يرجى حذف العمليات المرتبطة به أولاً.");
            } else {
                alert("حدث خطأ أثناء حذف الحساب.");
            }
        }
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate per category for Accounts Tab
    const expensesByCategory = categories.map(cat => {
        const total = expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0);
        const count = expenses.filter(e => e.categoryId === cat.id).length;
        return { ...cat, total, count };
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">المصاريف</h1>
                
                <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button 
                        onClick={() => setActiveTab('expenses')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'expenses' ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <LayoutList size={16} className="inline ml-2" />
                        سجل العمليات
                    </button>
                    <button 
                        onClick={() => setActiveTab('accounts')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'accounts' ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Layers size={16} className="inline ml-2" />
                        إدارة الحسابات
                    </button>
                </div>
            </div>

            {activeTab === 'expenses' && (
                <>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-center gap-3 mb-2 opacity-90">
                                <Wallet size={24} />
                                <span className="font-medium">إجمالي المصاريف</span>
                            </div>
                            <div className="text-4xl font-bold">{totalExpenses.toLocaleString()} {CURRENCY}</div>
                        </div>

                        {/* AI Analysis (Collapsible) */}
                        <div className="md:col-span-2">
                             <AIInsightAlert 
                                title="تحليل المصاريف الذكي"
                                insight={aiTips}
                                icon={AlertTriangle}
                                baseColor="rose"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-700">سجل العمليات الأخيرة</span>
                            <button 
                                onClick={() => setIsAddExpenseModalOpen(true)}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm text-sm"
                            >
                                <Plus size={16} />
                                <span>تسجيل مصروفات</span>
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {expenses.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">لا توجد مصاريف مسجلة</div>
                            ) : (
                                expenses.map(exp => (
                                    <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition relative">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600`}>
                                                <TrendingDown size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{exp.title || 'بدون وصف'}</h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                    <Calendar size={12} />
                                                    <span>{exp.date}</span>
                                                    <span className="bg-gray-100 px-2 rounded-full">{exp.categoryName || 'مصروف عام'}</span>
                                                    {exp.employeeId && (
                                                        <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 rounded-full">
                                                            <User size={10} />
                                                            {employees.find(e => e.id === exp.employeeId)?.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="font-bold text-red-600 text-lg">-{exp.amount}</div>
                                            <button 
                                                onClick={() => setActiveMenuId(activeMenuId === exp.id ? null : exp.id)}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        {/* Dropdown */}
                                        {activeMenuId === exp.id && (
                                            <div ref={menuRef} className="absolute left-10 top-10 w-40 bg-white shadow-xl rounded-lg border border-gray-100 z-10 overflow-hidden">
                                                <button onClick={() => openEditModal(exp)} className="w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                    <Edit2 size={14} /> تعديل
                                                </button>
                                                <button onClick={() => handleDeleteExpense(exp.id)} className="w-full text-right px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                    <Trash2 size={14} /> حذف
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'accounts' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                        <AlertOctagon className="text-blue-600 shrink-0" />
                        <div>
                            <h4 className="font-bold text-blue-900 text-sm">إدارة حسابات الصرف</h4>
                            <p className="text-blue-800 text-xs mt-1">
                                هنا يمكنك إضافة تصنيفات مخصصة للمصاريف (مثل: ضيافة، صيانة مكيفات). كن حذراً عند حذف الحسابات.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                         <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-700">قائمة الحسابات</span>
                            <button 
                                onClick={() => setIsAddCategoryModalOpen(true)}
                                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition shadow-sm text-sm"
                            >
                                <Plus size={16} />
                                <span>إضافة حساب</span>
                            </button>
                        </div>
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">اسم الحساب</th>
                                    <th className="px-6 py-4">عدد العمليات</th>
                                    <th className="px-6 py-4">إجمالي المصروف</th>
                                    <th className="px-6 py-4">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {expensesByCategory.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-800">{cat.name}</td>
                                        <td className="px-6 py-4 text-sm">{cat.count} عملية</td>
                                        <td className="px-6 py-4 font-bold text-red-600">{cat.total} {CURRENCY}</td>
                                        <td className="px-6 py-4">
                                            {!cat.isDefault && (
                                                <button 
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                                    title="حذف الحساب"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Expense BATCH Modal */}
            {isAddExpenseModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">تسجيل مصاريف (متعدد)</h2>
                            <button onClick={() => setIsAddExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-800">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveBatch} className="space-y-6">
                            
                            {/* Header: Date & Payment Method */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
                                    <input 
                                        type="date" 
                                        className="w-full p-2 border rounded-lg bg-white"
                                        value={batchDate} 
                                        onChange={e => setBatchDate(e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">طريقة الدفع</label>
                                    <select 
                                        className="w-full p-2 border rounded-lg bg-white"
                                        value={batchPaymentMethodId}
                                        onChange={e => setBatchPaymentMethodId(e.target.value)}
                                        required
                                    >
                                        {paymentMethods.map(pm => (
                                            <option key={pm.id} value={pm.id}>{pm.name} (رصيد: {pm.balance})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Rows */}
                            <div className="space-y-3">
                                {expenseRows.map((row, index) => {
                                    // Check if Salary category selected for this row
                                    const catName = categories.find(c => c.id === row.categoryId)?.name || '';
                                    const isSalaryRow = catName.includes('رواتب') || catName.includes('Salaries');

                                    return (
                                        <div key={row.id} className="flex flex-col md:flex-row gap-2 items-start md:items-center p-3 border border-gray-200 rounded-lg hover:border-emerald-300 transition bg-white">
                                            <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-xs font-bold text-gray-500 shrink-0">
                                                {index + 1}
                                            </div>
                                            
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 w-full">
                                                {/* Category */}
                                                <div className="md:col-span-3">
                                                    <select 
                                                        className="w-full p-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                                        value={row.categoryId}
                                                        onChange={(e) => updateRow(row.id, 'categoryId', e.target.value)}
                                                        required
                                                    >
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Amount */}
                                                <div className="md:col-span-2">
                                                    <input 
                                                        type="number" 
                                                        placeholder="المبلغ" 
                                                        className="w-full p-2 border rounded-md text-sm font-bold text-red-600 outline-none focus:ring-1 focus:ring-emerald-500"
                                                        value={row.amount || ''}
                                                        onChange={(e) => updateRow(row.id, 'amount', Number(e.target.value))}
                                                        min="0"
                                                        required
                                                    />
                                                </div>

                                                {/* Description / Employee */}
                                                <div className={isSalaryRow ? "md:col-span-3" : "md:col-span-7"}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="الوصف (اختياري)" 
                                                        className="w-full p-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                                        value={row.title}
                                                        onChange={(e) => updateRow(row.id, 'title', e.target.value)}
                                                    />
                                                </div>

                                                {isSalaryRow && (
                                                    <div className="md:col-span-4 animate-in fade-in">
                                                        <select 
                                                            className="w-full p-2 border border-purple-200 rounded-md text-sm outline-none bg-purple-50 text-purple-700"
                                                            value={row.employeeId}
                                                            onChange={(e) => updateRow(row.id, 'employeeId', e.target.value)}
                                                            required
                                                        >
                                                            <option value="">اختر الموظف...</option>
                                                            {employees.map(emp => (
                                                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete Row */}
                                            {expenseRows.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeRow(row.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-between items-center pt-2">
                                <button 
                                    type="button" 
                                    onClick={addRow}
                                    className="flex items-center gap-2 text-emerald-600 font-bold hover:bg-emerald-50 px-3 py-2 rounded-lg transition text-sm"
                                >
                                    <Plus size={18} />
                                    إضافة بند آخر
                                </button>
                                
                                <div className="text-xl font-bold text-gray-800">
                                    الإجمالي: <span className="text-red-600">{calculateTotalBatch().toLocaleString()} {CURRENCY}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4 flex gap-3">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ الفاتورة'}</span>
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddExpenseModalOpen(false)} 
                                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

             {/* Edit Expense Modal (Single Edit remains simple) */}
             {isEditExpenseModalOpen && editingExpense && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">تعديل مصروف</h2>
                        <form onSubmit={handleUpdateExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">حساب المصروف</label>
                                <select 
                                    className="w-full p-2 border rounded-lg bg-gray-50"
                                    value={editingExpense.categoryId} 
                                    onChange={e => setEditingExpense({...editingExpense, categoryId: e.target.value})}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <input type="text" placeholder="الوصف (اختياري)" className="w-full p-2 border rounded-lg"
                                value={editingExpense.title} onChange={e => setEditingExpense({...editingExpense, title: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (تصحيح)</label>
                                    <input required type="number" className="w-full p-2 border rounded-lg"
                                        value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                                    <input type="date" className="w-full p-2 border rounded-lg"
                                        value={editingExpense.date} onChange={e => setEditingExpense({...editingExpense, date: e.target.value})} />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 mt-2 flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'حفظ التعديلات'}
                            </button>
                            <button type="button" onClick={() => setIsEditExpenseModalOpen(false)} className="w-full text-gray-500 py-2">إلغاء</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {isAddCategoryModalOpen && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">إضافة حساب مصروفات</h2>
                        <form onSubmit={handleAddCategory} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الحساب (التصنيف)</label>
                                <input required type="text" className="w-full p-2 border rounded-lg"
                                    value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} 
                                    placeholder="مثلاً: ضيافة، انترنت..."
                                    autoFocus
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 mt-2 flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'إضافة الحساب'}
                            </button>
                            <button type="button" onClick={() => setIsAddCategoryModalOpen(false)} className="w-full text-gray-500 py-2">إلغاء</button>
                        </form>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default Expenses;
