
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Printer, CreditCard, CheckCircle, ShoppingBag, User, Banknote, X, PackagePlus, Wallet, Calendar, AlertCircle, History, FileDown, ChevronDown, ChevronUp, Eye, Loader2 } from 'lucide-react';
import { CURRENCY } from '../constants';
import { Product, SaleItem, PaymentMethod, Client, Invoice, ProductCategory } from '../types';
import { getProducts, createInvoice, getPaymentMethods, ensurePaymentMethodsExist, getClients, getInvoices, getProductCategories, deleteInvoice } from '../services/db';
import { useAuth } from '../context/AuthContext';

declare var html2pdf: any;

const Sales: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [clients, setClients] = useState<Client[]>([]); 
  const [invoices, setInvoices] = useState<Invoice[]>([]); // Invoice History
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // History UI State
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [exportingHistory, setExportingHistory] = useState(false);

  // Checkout & Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'input' | 'processing' | 'success'>('input');
  
  // Payment Details
  const [paymentDetails, setPaymentDetails] = useState({
    customerName: 'عميل افتراضي', 
    invoiceDate: new Date().toISOString().split('T')[0], 
    discount: 0,
    amountPaid: 0,
    paymentMethodId: ''
  });

  // Client Autocomplete State
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientInputRef = useRef<HTMLDivElement>(null);

  // Custom Item State
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', price: 0, quantity: 1 });

  const loadData = async () => {
      if (!user) return;
      const [prodData, catData, pmData, cliData, invData] = await Promise.all([
          getProducts(user.id),
          getProductCategories(user.id),
          getPaymentMethods(user.id),
          getClients(user.id),
          getInvoices(user.id)
      ]);
      setProducts(prodData);
      setCategories(catData);
      setClients(cliData);
      setInvoices(invData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      
      if(pmData.length === 0) {
          await ensurePaymentMethodsExist(user.id);
          const newPmData = await getPaymentMethods(user.id);
          setPaymentMethods(newPmData);
          const defaultMethod = newPmData.find(m => m.isDefault) || newPmData[0];
          setPaymentDetails(prev => ({...prev, paymentMethodId: defaultMethod?.id || ''}));
      } else {
          setPaymentMethods(pmData);
          const defaultMethod = pmData.find(m => m.isDefault) || pmData[0];
          setPaymentDetails(prev => ({...prev, paymentMethodId: defaultMethod?.id || ''}));
      }
  };

  useEffect(() => {
    loadData();
    const handleClickOutside = (event: MouseEvent) => {
        if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
            setShowClientSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  // --- Cart Actions ---
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
        alert("عذراً، هذا المنتج نفد من المخزون.");
        return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
             alert("لا توجد كمية كافية في المخزون.");
             return prev;
        }
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, quantity: 1, priceAtSale: product.price, productName: product.name }];
    });
  };

  const addCustomItemToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItem.name || customItem.price <= 0) return;
    const newItem: SaleItem = {
        productId: `custom-${Date.now()}`,
        productName: customItem.name,
        priceAtSale: customItem.price,
        quantity: customItem.quantity
    };
    setCart(prev => [...prev, newItem]);
    setIsCustomItemModalOpen(false);
    setCustomItem({ name: '', price: 0, quantity: 1 });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const isCustom = productId.startsWith('custom-');
    const product = products.find(p => p.id === productId);
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        if (!isCustom && product && newQty > product.stock) {
            alert("لا توجد كمية كافية في المخزون.");
            return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // --- Calculations ---
  const calculateSubtotal = () => cart.reduce((sum, item) => sum + (item.quantity * item.priceAtSale), 0);
  const calculateTotal = () => Math.max(0, calculateSubtotal() - paymentDetails.discount);
  const calculateRemaining = () => paymentDetails.amountPaid - calculateTotal();
  const isDebt = () => calculateRemaining() < 0;

  // --- Checkout Process ---
  const openPaymentModal = () => {
      if (cart.length === 0) return;
      const total = calculateTotal();
      const defaultPm = paymentMethods.find(m => m.isDefault) || paymentMethods[0];
      setPaymentDetails(prev => ({
          ...prev,
          discount: 0,
          amountPaid: total,
          paymentMethodId: defaultPm?.id || '',
          customerName: 'عميل افتراضي' // Reset to default on new sale
      }));
      setCheckoutStep('input');
      setIsPaymentModalOpen(true);
  };

  const handleFinalizeCheckout = async () => {
    if (!user) return;
    if (isDebt() && !paymentDetails.customerName.trim()) {
        alert("يجب تحديد اسم العميل لتسجيل الدين عليه.");
        return;
    }
    setCheckoutStep('processing');
    try {
        await createInvoice(
            user.id, 
            cart, 
            calculateTotal(), 
            paymentDetails.amountPaid,
            paymentDetails.customerName,
            paymentDetails.paymentMethodId,
            paymentDetails.invoiceDate
        );
        setCheckoutStep('success');
        loadData(); // Refresh history
        setTimeout(() => {
            setIsPaymentModalOpen(false);
            setCart([]);
            setCheckoutStep('input');
            setPaymentDetails(prev => ({...prev, customerName: 'عميل افتراضي', amountPaid: 0}));
        }, 2000);
    } catch (error) {
        console.error("Checkout failed", error);
        alert("حدث خطأ أثناء عملية الدفع");
        setCheckoutStep('input');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الفاتورة؟ سيتم استرجاع المخزون وإلغاء أي ديون أو مدفوعات مرتبطة بها.")) {
        try {
            await deleteInvoice(id);
            loadData();
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء حذف الفاتورة.");
        }
    }
  };

  const handleExportPDF = () => {
    setExportingHistory(true);
    // Force showing all history for the PDF
    const wasShowingAll = showAllHistory;
    setShowAllHistory(true);

    setTimeout(() => {
        const element = document.getElementById('sales-history-container');
        const opt = {
            margin: 0.5,
            filename: `سجل_المبيعات_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            setExportingHistory(false);
            setShowAllHistory(wasShowingAll); // Restore state
        });
    }, 500); // Delay to allow render
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.includes(searchTerm) || p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return p.category !== 'RawMaterial' && matchesSearch && matchesCategory;
  });
  
  const filteredClients = clients.filter(c => 
     c.name.toLowerCase().includes(paymentDetails.customerName.toLowerCase())
  );

  // History Slice
  const displayedInvoices = showAllHistory ? invoices : invoices.slice(0, 7);

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto min-h-screen pb-10">
      
      {/* --- TOP SECTION: POS & CART --- */}
      {/* Changed layout from fixed height to flexible stack on mobile */}
      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-8rem)] relative shrink-0">
        
        {/* Left Side: Product Browser */}
        {/* Added fixed height on mobile to ensure internal scrolling */}
        <div className="lg:w-2/3 flex flex-col gap-4 h-[500px] lg:h-full">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between shrink-0">
            <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                type="text" 
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="بحث باسم المنتج أو الباركود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setIsCustomItemModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-100 transition font-medium whitespace-nowrap"
            >
                <PackagePlus size={20} />
                <span>منتج يدوي</span>
            </button>
            </div>

            {/* Category Filter - Scrollable with 3 visible hint */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0 snap-x">
                <button 
                    onClick={() => setSelectedCategory('All')}
                    className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all snap-start min-w-[80px] ${
                        selectedCategory === 'All' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                    الكل
                </button>
                {categories.map((cat) => (
                    <button 
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all snap-start min-w-[100px] ${
                            selectedCategory === cat.id 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 h-full">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                            <tr>
                                <th className="px-5 py-4 text-xs font-bold text-gray-500">المنتج</th>
                                <th className="px-5 py-4 text-xs font-bold text-gray-500">السعر</th>
                                <th className="px-5 py-4 text-xs font-bold text-gray-500">المخزون</th>
                                <th className="px-5 py-4 text-xs font-bold text-gray-500">إضافة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredProducts.map(product => (
                                <tr 
                                    key={product.id} 
                                    className="hover:bg-emerald-50/60 transition cursor-pointer group" 
                                    onClick={() => addToCart(product)}
                                >
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-gray-800 text-sm group-hover:text-emerald-700 transition">{product.name}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{product.barcode}</div>
                                    </td>
                                    <td className="px-5 py-4 font-bold text-emerald-600 text-sm">{product.price} {CURRENCY}</td>
                                    <td className="px-5 py-4 text-sm">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{product.stock}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <button 
                                            className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition shadow-sm"
                                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Right Side: Cart & Checkout */}
        {/* Increased explicit height for mobile so it is not cramped */}
        <div className="lg:w-1/3 flex flex-col h-[500px] lg:h-full bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingBag className="text-emerald-600" size={20} />
                    سلة المبيعات
                </h2>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{cart.length} عناصر</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <ShoppingBag size={32} className="opacity-30 mb-2" />
                    <p className="font-medium text-sm">السلة فارغة</p>
                </div>
            ) : (
                cart.map(item => (
                    <div key={item.productId} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-gray-800 text-sm line-clamp-1">{item.productName}</p>
                                <p className="text-emerald-600 text-xs font-bold mt-1">{item.priceAtSale} {CURRENCY}</p>
                            </div>
                            <button onClick={() => removeFromCart(item.productId)} className="text-gray-400 hover:text-red-500 transition p-1"><Trash2 size={16} /></button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm h-8">
                                <button onClick={() => updateQuantity(item.productId, 1)} className="w-8 h-full flex items-center justify-center hover:bg-emerald-50 text-emerald-600 rounded-r-lg">+</button>
                                <span className="w-8 text-center font-bold text-sm text-gray-800 border-x border-gray-100 h-full flex items-center justify-center bg-gray-50">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.productId, -1)} className="w-8 h-full flex items-center justify-center hover:bg-red-50 text-red-500 rounded-l-lg">-</button>
                            </div>
                            <span className="font-bold text-gray-900 text-sm">{item.priceAtSale * item.quantity} {CURRENCY}</span>
                        </div>
                    </div>
                ))
            )}
            </div>

            <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] shrink-0 z-20">
                <div className="space-y-3 mb-5">
                    <div className="flex justify-between items-center text-gray-500 text-sm">
                        <span>المجموع الفرعي</span>
                        <span className="font-medium">{calculateSubtotal()} {CURRENCY}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-extrabold text-gray-900">
                        <span>الإجمالي</span>
                        <span className="text-emerald-600">{calculateSubtotal()} {CURRENCY}</span>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    <button disabled={cart.length === 0} className="col-span-1 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-50">
                        <Printer size={20} />
                    </button>
                    <button 
                        onClick={openPaymentModal}
                        disabled={cart.length === 0}
                        className="col-span-3 flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg shadow-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                        <CreditCard size={20} />
                        <span>إكمال</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: SALES HISTORY --- */}
      <div id="sales-history-container" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <History className="text-slate-500" />
                سجل المبيعات الأخيرة
            </h3>
            <button 
                onClick={handleExportPDF}
                disabled={exportingHistory}
                className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg transition border border-slate-200 disabled:opacity-70"
                data-html2canvas-ignore="true" // Ignore button in PDF
            >
                {exportingHistory ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                تصدير PDF
            </button>
        </div>

        {/* Hidden Header for PDF only */}
        <div className="hidden pdf-header-sales mb-4 border-b pb-2">
             <h2 className="text-xl font-bold">سجل المبيعات - {user?.storeName}</h2>
             <p className="text-sm text-gray-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-MA')}</p>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-4 rounded-r-xl">رقم الفاتورة</th>
                        <th className="px-6 py-4">التاريخ</th>
                        <th className="px-6 py-4">العميل</th>
                        <th className="px-6 py-4">العناصر</th>
                        <th className="px-6 py-4">الإجمالي</th>
                        <th className="px-6 py-4">المدفوع</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4 rounded-l-xl">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {displayedInvoices.length === 0 ? (
                        <tr><td colSpan={8} className="p-8 text-center text-gray-400">لا توجد مبيعات مسجلة حتى الآن</td></tr>
                    ) : (
                        displayedInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-gray-50 transition group">
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{inv.id.slice(-6)}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{new Date(inv.date).toLocaleDateString('ar-MA')}</td>
                                <td className="px-6 py-4 font-bold text-gray-800">{inv.customerName}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{inv.items.length} منتجات</td>
                                <td className="px-6 py-4 font-bold text-emerald-600">{inv.total} {CURRENCY}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{inv.paidAmount}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        inv.remainingAmount > 0 
                                        ? 'bg-red-50 text-red-600' 
                                        : 'bg-emerald-50 text-emerald-600'
                                    }`}>
                                        {inv.remainingAmount > 0 ? 'آجل' : 'مكتمل'}
                                    </span>
                                </td>
                                <td className="px-6 py-4" data-html2canvas-ignore="true">
                                    <button 
                                        onClick={() => handleDeleteInvoice(inv.id)}
                                        className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded transition"
                                        title="حذف الفاتورة واسترجاع المخزون"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {invoices.length > 7 && (
            <div className="mt-4 flex justify-center border-t border-gray-100 pt-4" data-html2canvas-ignore="true">
                <button 
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition"
                >
                    {showAllHistory ? (
                        <>
                            <span>إخفاء السجل الكامل</span>
                            <ChevronUp size={16} />
                        </>
                    ) : (
                        <>
                            <span>عرض المزيد ({invoices.length - 7})</span>
                            <ChevronDown size={16} />
                        </>
                    )}
                </button>
            </div>
        )}
      </div>

      <style>{`
         .pdf-header-sales { display: none; }
         .html2pdf__page-break { page-break-before: always; }
      `}</style>

      {/* --- MODALS --- */}
      {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                  <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <Banknote className="text-emerald-600" />
                          تفاصيل الدفع
                      </h3>
                      <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-800"><X size={24} /></button>
                  </div>

                  {checkoutStep === 'success' ? (
                      <div className="p-10 flex flex-col items-center text-center">
                          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                              <CheckCircle size={40} />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">تمت العملية بنجاح!</h2>
                          <p className="text-gray-500">تم تسجيل الفاتورة وتحديث الحسابات.</p>
                      </div>
                  ) : (
                      <div className="p-6 space-y-6">
                          <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100">
                              <p className="text-emerald-700 text-sm font-medium mb-1">المبلغ الإجمالي</p>
                              <p className="text-4xl font-black text-emerald-800 tracking-tight">{calculateTotal()} <span className="text-lg font-bold">{CURRENCY}</span></p>
                          </div>

                          <div className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 mb-1 block">تاريخ الفاتورة</label>
                                  <div className="relative">
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="date"
                                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={paymentDetails.invoiceDate}
                                        onChange={(e) => setPaymentDetails({...paymentDetails, invoiceDate: e.target.value})}
                                    />
                                  </div>
                              </div>
                              <div className="relative" ref={clientInputRef}>
                                  <label className="text-xs font-bold text-gray-500 mb-1 block">اسم العميل {isDebt() && <span className="text-red-500 text-xs">(مطلوب للدين)</span>}</label>
                                  <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="بحث أو إدخال اسم عميل جديد..."
                                        className={`w-full pl-4 pr-10 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 outline-none ${isDebt() && !paymentDetails.customerName ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-emerald-500'}`}
                                        value={paymentDetails.customerName}
                                        onFocus={() => setShowClientSuggestions(true)}
                                        onChange={(e) => {
                                            setPaymentDetails({...paymentDetails, customerName: e.target.value});
                                            setShowClientSuggestions(true);
                                        }}
                                    />
                                  </div>
                                  {showClientSuggestions && filteredClients.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                                        {filteredClients.map(client => (
                                            <button
                                                key={client.id}
                                                className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-sm text-gray-700 flex justify-between items-center border-b border-gray-50 last:border-0"
                                                onClick={() => {
                                                    setPaymentDetails({...paymentDetails, customerName: client.name});
                                                    setShowClientSuggestions(false);
                                                }}
                                            >
                                                <span className="font-bold">{client.name}</span>
                                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full" dir="ltr">{client.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                  )}
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 mb-1 block">طريقة الاستلام</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {paymentMethods.map(pm => (
                                        <button
                                            key={pm.id}
                                            onClick={() => setPaymentDetails({...paymentDetails, paymentMethodId: pm.id})}
                                            className={`p-3 rounded-xl border text-sm font-bold transition flex items-center justify-center gap-2 ${paymentDetails.paymentMethodId === pm.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <Wallet size={16} />
                                            {pm.name}
                                        </button>
                                    ))}
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 mb-1 block">خصم</label>
                                      <input 
                                          type="number" 
                                          className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-center"
                                          value={paymentDetails.discount}
                                          onChange={(e) => setPaymentDetails({...paymentDetails, discount: Number(e.target.value)})}
                                          onFocus={(e) => e.target.select()}
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 mb-1 block">المدفوع</label>
                                      <input 
                                          type="number" 
                                          className="w-full p-3 rounded-xl border-2 border-emerald-500 bg-white focus:ring-4 focus:ring-emerald-100 outline-none font-bold text-center text-lg"
                                          value={paymentDetails.amountPaid}
                                          onChange={(e) => setPaymentDetails({...paymentDetails, amountPaid: Number(e.target.value)})}
                                          onFocus={(e) => e.target.select()}
                                      />
                                  </div>
                              </div>
                              <div className={`flex justify-between items-center p-4 rounded-xl ${isDebt() ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                  <span className={`font-bold ${isDebt() ? 'text-red-600' : 'text-emerald-700'}`}>{isDebt() ? 'المتبقي (دين):' : 'الباقي (للعميل):'}</span>
                                  <span className={`text-xl font-bold ${isDebt() ? 'text-red-600' : 'text-emerald-700'}`}>{Math.abs(calculateRemaining())} {CURRENCY}</span>
                              </div>
                              {isDebt() && !paymentDetails.customerName && (
                                  <div className="text-red-500 text-xs flex items-center gap-1 font-bold"><AlertCircle size={12} />يجب اختيار عميل لتسجيل الدين</div>
                              )}
                          </div>
                          <button 
                              onClick={handleFinalizeCheckout}
                              disabled={checkoutStep === 'processing' || (isDebt() && !paymentDetails.customerName)}
                              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {checkoutStep === 'processing' ? 'جاري التنفيذ...' : 'تأكيد العملية'}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
      
      {isCustomItemModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800">إضافة منتج يدوي</h3>
                      <button onClick={() => setIsCustomItemModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                  </div>
                  <form onSubmit={addCustomItemToCart} className="space-y-4">
                      <input 
                          autoFocus type="text" placeholder="الاسم" 
                          className="w-full p-3 border rounded-lg"
                          value={customItem.name} onChange={(e) => setCustomItem({...customItem, name: e.target.value})} required
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="السعر" className="w-full p-3 border rounded-lg"
                            value={customItem.price || ''} onChange={(e) => setCustomItem({...customItem, price: Number(e.target.value)})} required />
                        <input type="number" placeholder="الكمية" className="w-full p-3 border rounded-lg"
                            value={customItem.quantity} onChange={(e) => setCustomItem({...customItem, quantity: Number(e.target.value)})} required />
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">إضافة</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Sales;
