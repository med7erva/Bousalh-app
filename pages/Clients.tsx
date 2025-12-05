
import React, { useState, useEffect, useRef } from 'react';
import { User, Phone, Search, UserPlus, AlertCircle, FileText, Clock, X, ShoppingBag, ArrowDownLeft, ArrowUpRight, Banknote, MoreVertical, Edit2, Trash2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClients, addClient, getInvoices, getTransactions, updateClient, deleteClient } from '../services/db';
import { getClientInsights } from '../services/geminiService';
import { Client, Invoice, FinancialTransaction } from '../types';
import { CURRENCY } from '../constants';
import AIInsightAlert from '../components/AIInsightAlert';

// Union type for the history list
type HistoryItem = 
  | (Invoice & { type: 'invoice' })
  | (FinancialTransaction & { type: 'transaction' });

const Clients: React.FC = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [aiInsight, setAiInsight] = useState('');

    // Add Client Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newClient, setNewClient] = useState({
        name: '', phone: '', debt: 0, notes: ''
    });

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

    // Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const loadClients = async () => {
        if (!user) return;
        const data = await getClients(user.id);
        setClients(data);
        
        if (data.length > 0 && !aiInsight) {
            const insight = await getClientInsights(data);
            setAiInsight(insight);
        }
    };

    useEffect(() => {
        loadClients();
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [user]);

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        await addClient({ userId: user.id, ...newClient });
        setIsAddModalOpen(false);
        setNewClient({ name: '', phone: '', debt: 0, notes: '' });
        loadClients();
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!editingClient) return;
        await updateClient(editingClient);
        setIsEditModalOpen(false);
        setEditingClient(null);
        loadClients();
    };

    const handleDeleteClient = async (id: string) => {
        if(window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
            try {
                await deleteClient(id);
                loadClients();
                setActiveMenuId(null);
            } catch (error) {
                console.error(error);
                alert("لا يمكن حذف هذا العميل.");
            }
        }
    };

    const openEditModal = (client: Client) => {
        setEditingClient(client);
        setIsEditModalOpen(true);
        setActiveMenuId(null);
    };

    const handleViewHistory = async (client: Client) => {
        if (!user) return;
        setSelectedClient(client);
        
        // 1. Fetch Invoices
        const allInvoices = await getInvoices(user.id);
        const clientInvoices = allInvoices.filter(inv => 
            inv.customerName.trim().toLowerCase() === client.name.trim().toLowerCase()
        ).map(inv => ({ ...inv, type: 'invoice' as const }));

        // 2. Fetch Transactions (Receipts/Payments)
        const allTransactions = await getTransactions(user.id);
        const clientTransactions = allTransactions.filter(tx => 
            tx.entityType === 'Client' && tx.entityId === client.id
        ).map(tx => ({ ...tx, type: 'transaction' as const }));

        // 3. Merge and Sort by Date Descending
        const combined = [...clientInvoices, ...clientTransactions].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setHistoryItems(combined as HistoryItem[]);
        setIsHistoryModalOpen(true);
        setActiveMenuId(null);
    };

    const filteredClients = clients.filter(c => 
        c.name.includes(searchTerm) || c.phone.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">إدارة العملاء</h1>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition shadow-sm"
                >
                    <UserPlus size={20} />
                    <span>عميل جديد</span>
                </button>
            </div>

            {/* AI Insight (Collapsible) */}
            <AIInsightAlert 
                title="استعادة العملاء"
                insight={aiInsight}
                icon={Clock}
                baseColor="indigo"
            />

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="بحث باسم العميل أو رقم الهاتف..." 
                    className="w-full pl-4 pr-12 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map(client => (
                    <div key={client.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative">
                         <div className="absolute top-4 left-4">
                             <button 
                                onClick={() => setActiveMenuId(activeMenuId === client.id ? null : client.id)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                             >
                                 <MoreVertical size={20} />
                             </button>
                             {activeMenuId === client.id && (
                                 <div ref={menuRef} className="absolute left-0 top-8 w-40 bg-white shadow-xl rounded-lg border border-gray-100 z-10 overflow-hidden">
                                     <button onClick={() => openEditModal(client)} className="w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                         <Edit2 size={14} /> تعديل
                                     </button>
                                     <button onClick={() => handleDeleteClient(client.id)} className="w-full text-right px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                         <Trash2 size={14} /> حذف
                                     </button>
                                 </div>
                             )}
                         </div>

                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{client.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <Phone size={12} />
                                        <span dir="ltr">{client.phone}</span>
                                    </div>
                                </div>
                            </div>
                            {client.debt > 0 && (
                                <div className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    <span>مدين</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded">
                            آخر شراء: {client.lastPurchaseDate ? new Date(client.lastPurchaseDate).toLocaleDateString('ar-MA') : 'لا يوجد'}
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                <span className="text-sm text-gray-500">رصيد الديون</span>
                                <span className={`font-bold ${client.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {client.debt} {CURRENCY}
                                </span>
                            </div>
                            <button 
                                onClick={() => handleViewHistory(client)}
                                className="w-full py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition flex items-center justify-center"
                            >
                                <FileText size={16} className="ml-2" />
                                كشف الحساب (السجل)
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Client Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">إضافة عميل جديد</h2>
                        <form onSubmit={handleAddClient} className="space-y-4">
                            <input required type="text" placeholder="الاسم" className="w-full p-2 border rounded-lg"
                                value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                            <input required type="text" placeholder="رقم الهاتف" className="w-full p-2 border rounded-lg"
                                value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                            <input type="number" placeholder="ديون سابقة (اختياري)" className="w-full p-2 border rounded-lg"
                                value={newClient.debt} onChange={e => setNewClient({...newClient, debt: Number(e.target.value)})} />
                            <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold">حفظ</button>
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full text-gray-500 py-2">إلغاء</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
             {isEditModalOpen && editingClient && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">تعديل بيانات العميل</h2>
                        <form onSubmit={handleUpdateClient} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                                <input required type="text" className="w-full p-2 border rounded-lg"
                                    value={editingClient.name} onChange={e => setEditingClient({...editingClient, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                                <input required type="text" className="w-full p-2 border rounded-lg"
                                    value={editingClient.phone} onChange={e => setEditingClient({...editingClient, phone: e.target.value})} />
                            </div>
                            {/* Debt editing is restricted to keep financial integrity usually, but allowed here for corrections */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رصيد الدين (تصحيح)</label>
                                <input type="number" className="w-full p-2 border rounded-lg"
                                    value={editingClient.debt} onChange={e => setEditingClient({...editingClient, debt: Number(e.target.value)})} />
                            </div>
                            <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold">حفظ التعديلات</button>
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full text-gray-500 py-2">إلغاء</button>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal (Statement of Account) */}
            {isHistoryModalOpen && selectedClient && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <ShoppingBag className="text-emerald-600" />
                                    كشف حساب: {selectedClient.name}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    الرصيد الحالي (دين): <span className={`${selectedClient.debt > 0 ? 'text-red-600' : 'text-emerald-600'} font-bold`}>{selectedClient.debt} {CURRENCY}</span>
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
                                        <th className="px-4 py-3 bg-gray-50">البيان / المنتجات</th>
                                        <th className="px-4 py-3 bg-gray-50">عليه (مبيعات/سلف)</th>
                                        <th className="px-4 py-3 bg-gray-50 rounded-l-lg">له (دفعات)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {historyItems.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا توجد حركات مسجلة لهذا العميل</td></tr>
                                    ) : (
                                        historyItems.map(item => {
                                            const isInvoice = item.type === 'invoice';
                                            
                                            // Determine Amount placement
                                            let debit = 0; // عليه (Sales / Loans given)
                                            let credit = 0; // له (Payments made)

                                            if (isInvoice) {
                                                debit = (item as Invoice).total;
                                                credit = (item as Invoice).paidAmount; // Immediate payment
                                            } else {
                                                const tx = item as FinancialTransaction;
                                                if (tx.type === 'in') {
                                                    // Receipt (قبض) = Client paying us = Credit
                                                    credit = tx.amount;
                                                } else {
                                                    // Payment (صرف) = We paying client (Refund/Loan) = Debit
                                                    debit = tx.amount;
                                                }
                                            }

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                                        {new Date(item.date).toLocaleDateString('ar-MA')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {isInvoice ? (
                                                            <span className="flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded w-fit">
                                                                <FileText size={12} /> فاتورة
                                                            </span>
                                                        ) : (
                                                            (item as FinancialTransaction).type === 'in' ? 
                                                            <span className="flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded w-fit">
                                                                <ArrowDownLeft size={12} /> سند قبض
                                                            </span> :
                                                            <span className="flex items-center gap-1 text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded w-fit">
                                                                <ArrowUpRight size={12} /> سند صرف
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {isInvoice ? (
                                                            <span className="truncate block max-w-[200px]">
                                                                {(item as Invoice).items.map(i => i.productName).join(', ')}
                                                            </span>
                                                        ) : (
                                                            (item as FinancialTransaction).description
                                                        )}
                                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{item.id.slice(-8)}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-800">
                                                        {debit > 0 ? `${debit}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600">
                                                        {credit > 0 ? `${credit}` : '-'}
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

export default Clients;
