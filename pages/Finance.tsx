
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPaymentMethods, ensurePaymentMethodsExist, getTransactions, addFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction, getClients, getSuppliers, getEmployees } from '../services/db';
import { PaymentMethod, FinancialTransaction, Client, Supplier, Employee } from '../types';
import { CURRENCY } from '../constants';
import { Landmark, Wallet, Smartphone, ArrowDownLeft, ArrowUpRight, Plus, Minus, User, Briefcase, Users, X, Edit2, Trash2 } from 'lucide-react';

const Finance: React.FC = () => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  
  // Entities Data for Modal
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'in' | 'out'>('in'); // 'in' = Receipt, 'out' = Payment
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
      amount: 0,
      entityType: 'Client' as 'Client' | 'Supplier' | 'Employee' | 'Other',
      entityId: '',
      paymentMethodId: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
  });

  const loadData = async () => {
    if (!user) return;
    await ensurePaymentMethodsExist(user.id); 
    const [pmData, txData, cliData, supData, empData] = await Promise.all([
        getPaymentMethods(user.id),
        getTransactions(user.id),
        getClients(user.id),
        getSuppliers(user.id),
        getEmployees(user.id)
    ]);
    
    setMethods(pmData);
    setTransactions(txData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setClients(cliData);
    setSuppliers(supData);
    setEmployees(empData);
    
    // Default selection
    if (!formData.paymentMethodId && pmData.length > 0) {
         setFormData(prev => ({ ...prev, paymentMethodId: pmData.find(m => m.isDefault)?.id || pmData[0].id }));
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const openTxModal = (type: 'in' | 'out', txToEdit?: FinancialTransaction) => {
      setTxType(type);
      if (txToEdit) {
          setEditingTxId(txToEdit.id);
          setFormData({
              amount: txToEdit.amount,
              entityType: txToEdit.entityType,
              entityId: txToEdit.entityId || '',
              paymentMethodId: txToEdit.paymentMethodId,
              date: txToEdit.date.split('T')[0],
              description: txToEdit.description || ''
          });
      } else {
          setEditingTxId(null);
          setFormData(prev => ({
              ...prev, 
              amount: 0, 
              description: '', 
              entityType: 'Client', // reset default
              entityId: '' 
          }));
      }
      setIsTxModalOpen(true);
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (formData.entityType !== 'Other' && !formData.entityId) {
          alert("الرجاء اختيار الطرف المستفيد/الدافع");
          return;
      }

      try {
          if (editingTxId) {
              await updateFinancialTransaction(editingTxId, {
                  userId: user.id,
                  type: txType,
                  amount: formData.amount,
                  date: formData.date,
                  paymentMethodId: formData.paymentMethodId,
                  entityType: formData.entityType,
                  entityId: formData.entityId,
                  description: formData.description
              });
          } else {
              await addFinancialTransaction({
                  userId: user.id,
                  type: txType,
                  amount: formData.amount,
                  date: formData.date,
                  paymentMethodId: formData.paymentMethodId,
                  entityType: formData.entityType,
                  entityId: formData.entityId,
                  description: formData.description
              });
          }
    
          setIsTxModalOpen(false);
          setEditingTxId(null);
          loadData();
      } catch (error) {
          console.error(error);
          alert("حدث خطأ أثناء حفظ العملية.");
      }
  };

  const handleDeleteTransaction = async (txId: string) => {
      if(window.confirm("هل أنت متأكد من حذف هذه العملية؟ سيتم عكس التأثير المالي على الخزينة والعملاء.")) {
          try {
              await deleteFinancialTransaction(txId);
              loadData();
          } catch (error) {
              console.error(error);
              alert("فشل حذف العملية.");
          }
      }
  }

  const totalBalance = methods.reduce((sum, m) => sum + m.balance, 0);

  const getProviderStyle = (provider: string) => {
      switch (provider) {
          case 'Bankily': return 'bg-gradient-to-br from-teal-500 to-orange-400 text-white';
          case 'Masrvi': return 'bg-gradient-to-br from-green-600 to-emerald-400 text-white';
          case 'Sedad': return 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white';
          case 'Cash': return 'bg-gradient-to-br from-gray-800 to-gray-600 text-white';
          default: return 'bg-white border border-gray-200 text-gray-800';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">الحسابات المالية</h1>
            <p className="text-gray-500 text-sm">إدارة الخزينة وحركة الأموال</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => openTxModal('in')}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition shadow-sm font-bold"
            >
                <ArrowDownLeft size={20} />
                <span>قبض (إيداع)</span>
            </button>
            <button 
                onClick={() => openTxModal('out')}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition shadow-sm font-bold"
            >
                <ArrowUpRight size={20} />
                <span>صرف (دفع)</span>
            </button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500 opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
            <h3 className="text-slate-400 font-medium mb-2 flex items-center gap-2">
                <Wallet size={20} />
                إجمالي السيولة
            </h3>
            <div className="text-5xl font-bold tracking-tight">
                {totalBalance.toLocaleString()} <span className="text-2xl text-slate-400">{CURRENCY}</span>
            </div>
        </div>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {methods.map(method => (
            <div key={method.id} className={`rounded-2xl p-6 shadow-lg transition hover:scale-[1.02] ${getProviderStyle(method.provider)}`}>
                <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        {method.type === 'Cash' ? <Wallet size={24} /> : <Smartphone size={24} />}
                    </div>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">
                        {method.provider}
                    </span>
                </div>
                <div>
                    <h3 className="text-lg font-medium opacity-90 mb-1">{method.name}</h3>
                    <p className="text-3xl font-bold">{method.balance.toLocaleString()} {CURRENCY}</p>
                </div>
            </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Landmark size={20} />
            سجل حركة الأموال (خارج المبيعات)
        </h3>
        
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-4">التاريخ</th>
                        <th className="px-6 py-4">النوع</th>
                        <th className="px-6 py-4">الطرف (المعني)</th>
                        <th className="px-6 py-4">الوصف</th>
                        <th className="px-6 py-4">الحساب المالي</th>
                        <th className="px-6 py-4">المبلغ</th>
                        <th className="px-6 py-4">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {transactions.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا توجد عمليات مسجلة</td></tr>
                    ) : (
                        transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-4 text-gray-500 text-sm">{tx.date.split('T')[0]}</td>
                                <td className="px-6 py-4">
                                    {tx.type === 'in' ? (
                                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                            <ArrowDownLeft size={14} /> قبض
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-full w-fit">
                                            <ArrowUpRight size={14} /> صرف
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-800 font-medium">
                                    <span className="text-xs text-gray-400 block mb-0.5">
                                        {tx.entityType === 'Client' ? 'عميل' : tx.entityType === 'Supplier' ? 'مورد' : tx.entityType === 'Employee' ? 'موظف' : 'آخر'}
                                    </span>
                                    {tx.entityName || '-'}
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm">{tx.description}</td>
                                <td className="px-6 py-4 text-gray-600 text-sm">{tx.paymentMethodName}</td>
                                <td className={`px-6 py-4 font-bold ${tx.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {tx.type === 'in' ? '+' : '-'}{tx.amount}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => openTxModal(tx.type, tx)}
                                            className="p-1.5 bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded transition"
                                            title="تعديل"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteTransaction(tx.id)}
                                            className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded transition"
                                            title="حذف"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Transaction Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${txType === 'in' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {txType === 'in' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">
                            {editingTxId ? 'تعديل العملية' : (txType === 'in' ? 'سند قبض (إيداع)' : 'سند صرف (دفع)')}
                        </h2>
                    </div>
                    <button onClick={() => setIsTxModalOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-800" /></button>
                </div>

                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                    
                    {/* Entity Type Selector */}
                    <div className="grid grid-cols-4 gap-2 bg-gray-50 p-1 rounded-xl">
                        {['Client', 'Supplier', 'Employee', 'Other'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({...formData, entityType: type as any, entityId: ''})}
                                className={`text-xs font-bold py-2 rounded-lg transition ${
                                    formData.entityType === type 
                                    ? 'bg-white shadow-sm text-gray-900 border border-gray-100' 
                                    : 'text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {type === 'Client' && 'عميل'}
                                {type === 'Supplier' && 'مورد'}
                                {type === 'Employee' && 'موظف'}
                                {type === 'Other' && 'آخر'}
                            </button>
                        ))}
                    </div>

                    {/* Specific Entity Select */}
                    {formData.entityType !== 'Other' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                اختر {formData.entityType === 'Client' ? 'العميل' : formData.entityType === 'Supplier' ? 'المورد' : 'الموظف'}
                            </label>
                            <select 
                                required
                                className="w-full p-2.5 border rounded-lg bg-white"
                                value={formData.entityId}
                                onChange={(e) => setFormData({...formData, entityId: e.target.value})}
                            >
                                <option value="">-- اختر من القائمة --</option>
                                {formData.entityType === 'Client' && clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} (دين: {c.debt})</option>
                                ))}
                                {formData.entityType === 'Supplier' && suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} (دين: {s.debt})</option>
                                ))}
                                {formData.entityType === 'Employee' && employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                {txType === 'in' && formData.entityType === 'Client' && "سيتم خصم المبلغ من دين العميل."}
                                {txType === 'out' && formData.entityType === 'Client' && "سيتم إضافة المبلغ كدين (سلفة) على العميل."}
                                {txType === 'out' && formData.entityType === 'Supplier' && "سيتم خصم المبلغ من دين المورد."}
                                {txType === 'in' && formData.entityType === 'Supplier' && "سيتم إضافة المبلغ كدين علينا للمورد."}
                                {txType === 'out' && formData.entityType === 'Employee' && "سلفة للموظف (تسجل عليه)."}
                                {txType === 'in' && formData.entityType === 'Employee' && "الموظف يسدد سلفة."}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                        <input 
                            required 
                            type="number" 
                            className="w-full p-2.5 border rounded-lg font-bold text-lg"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع/القبض</label>
                            <select 
                                required
                                className="w-full p-2.5 border rounded-lg bg-gray-50"
                                value={formData.paymentMethodId}
                                onChange={(e) => setFormData({...formData, paymentMethodId: e.target.value})}
                            >
                                {methods.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                            <input 
                                required 
                                type="date" 
                                className="w-full p-2.5 border rounded-lg bg-gray-50"
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">بيان / ملاحظات</label>
                        <input 
                            type="text" 
                            className="w-full p-2.5 border rounded-lg"
                            placeholder="مثلاً: سداد دفعة، سلفة مستعجلة..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={`w-full py-3 rounded-xl font-bold text-white transition ${
                            txType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {editingTxId ? 'حفظ التغييرات' : 'تأكيد العملية'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
