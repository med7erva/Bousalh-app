
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Package,
  X,
  MoreVertical,
  AlertCircle,
  Scissors,
  Settings,
  Trash2,
  Edit2,
  Save,
  Truck,
  DollarSign,
  Loader2 // Import Loader
} from 'lucide-react';
import { CURRENCY } from '../constants';
import { Product, ProductCategory, Supplier } from '../types';
import { getInventoryInsights } from '../services/geminiService';
import { getProducts, addProduct, manufactureProduct, updateProduct, deleteProduct, getProductCategories, addProductCategory, deleteProductCategory, getSuppliers } from '../services/db';
import { useAuth } from '../context/AuthContext';
import AIInsightAlert from '../components/AIInsightAlert';

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [insight, setInsight] = useState('');
  
  // Loading States for Actions
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManuModalOpen, setIsManuModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Forms
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    barcode: '',
  });

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [manuData, setManuData] = useState({
      sourceId: '',
      targetId: '',
      quantityToMake: 1,
      rawPerUnit: 1,
      laborCostPerUnit: 0,
      supplierId: ''
  });

  const [newCatName, setNewCatName] = useState('');

  // Dropdown Management
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!user) return;
    const [data, catData, supData] = await Promise.all([
        getProducts(user.id),
        getProductCategories(user.id),
        getSuppliers(user.id)
    ]);
    setProducts(data);
    setCategories(catData);
    setSuppliers(supData);
    
    // Set default category
    if (catData.length > 0 && !newProduct.category) {
        setNewProduct(prev => ({ ...prev, category: catData[0].id }));
    }

    if (data.length > 0 && !insight) {
       const text = await getInventoryInsights(data);
       setInsight(text);
    }
  };

  useEffect(() => {
    loadData();
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setActiveMenuId(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  // --- Product Actions ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true); // Lock button
    try {
        await addProduct({
            ...newProduct,
            userId: user.id
        });
        setIsAddModalOpen(false);
        loadData();
        setNewProduct({
            name: '',
            category: categories[0]?.id || '',
            price: 0,
            cost: 0,
            stock: 0,
            barcode: ''
        });
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء إضافة المنتج.");
    } finally {
        setIsSubmitting(false); // Unlock button
    }
  };

  const handleDeleteProduct = async (id: string) => {
      if(window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
          try {
            await deleteProduct(id);
            loadData();
            setActiveMenuId(null);
          } catch (error) {
            console.error(error);
            alert("لا يمكن حذف هذا المنتج.");
          }
      }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingProduct) return;
      
      setIsSubmitting(true);
      try {
          await updateProduct(editingProduct);
          setIsEditModalOpen(false);
          setEditingProduct(null);
          loadData();
      } catch (error) {
          alert("فشل تحديث المنتج");
      } finally {
          setIsSubmitting(false);
      }
  };

  const openEditModal = (product: Product) => {
      setEditingProduct(product);
      setIsEditModalOpen(true);
      setActiveMenuId(null);
  };

  // --- Category Actions ---
  const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!user || !newCatName.trim()) return;
      await addProductCategory(user.id, newCatName);
      setNewCatName('');
      loadData();
  };

  const handleDeleteCategory = async (id: string) => {
      if(window.confirm("حذف القسم؟")) {
          try {
              await deleteProductCategory(id);
              loadData();
          } catch (error) {
              console.error(error);
              alert("لا يمكن حذف هذا القسم لأنه مستخدم في منتجات.");
          }
      }
  };

  // --- Manufacturing ---
  const handleManufacture = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
          await manufactureProduct(
              manuData.sourceId, 
              manuData.targetId, 
              Number(manuData.quantityToMake), 
              Number(manuData.rawPerUnit),
              Number(manuData.laborCostPerUnit),
              manuData.supplierId
          );
          alert('تمت عملية التصنيع بنجاح وتحديث المخزون والديون!');
          setIsManuModalOpen(false);
          loadData();
          setManuData({ sourceId: '', targetId: '', quantityToMake: 1, rawPerUnit: 1, laborCostPerUnit: 0, supplierId: '' });
      } catch (error: any) {
          alert(error.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const filteredProducts = products.filter(p => 
    p.name.includes(searchTerm) || p.barcode.includes(searchTerm)
  );

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المخزون</h1>
          <p className="text-gray-500 text-sm">تتبع المنتجات، المواد الخام، وعمليات التصنيع</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsCatModalOpen(true)}
                className="p-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                title="إدارة الأقسام"
            >
                <Settings size={20} />
            </button>
            <button 
                onClick={() => setIsManuModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
                <Scissors size={20} />
                <span>تصنيع / خياطة</span>
            </button>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition shadow-sm"
            >
                <Plus size={20} />
                <span>منتج جديد</span>
            </button>
        </div>
      </div>

      {/* AI Insight (Collapsible) */}
      <AIInsightAlert 
        title="تحليل المخزون الذكي"
        insight={insight}
        icon={Package}
        baseColor="blue"
      />

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="بحث باسم المنتج أو الباركود..." 
            className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">باركود</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">اسم المنتج</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">القسم</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">السعر</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">الكمية</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{product.barcode}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{product.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${product.category === 'RawMaterial' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                      {getCategoryName(product.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                        <p className="font-bold text-gray-900">{product.price} {CURRENCY}</p>
                        <p className="text-xs text-gray-400">ت: {product.cost}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.stock < 10 ? (
                        <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                            <AlertCircle size={14} />
                            <span>منخفض</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>متوفر</span>
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 relative">
                    <button 
                        onClick={() => setActiveMenuId(activeMenuId === product.id ? null : product.id)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {activeMenuId === product.id && (
                        <div ref={menuRef} className="absolute left-6 top-12 w-40 bg-white rounded-lg shadow-xl border border-gray-100 z-20 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => openEditModal(product)}
                                className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Edit2 size={14} /> تعديل
                            </button>
                            <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                            >
                                <Trash2 size={14} /> حذف
                            </button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-gray-500">
                لا توجد منتجات مطابقة للبحث.
            </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">إضافة منتج جديد</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleAddProduct} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
                        <input 
                            required
                            type="text" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الباركود (اختياري)</label>
                            <input 
                                type="text" 
                                placeholder="تلقائي إذا ترك فارغاً"
                                className="w-full p-2 border rounded-lg outline-none"
                                value={newProduct.barcode}
                                onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                            <select 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السعر</label>
                            <input 
                                required type="number" 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة</label>
                            <input 
                                required type="number" 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={newProduct.cost}
                                onChange={(e) => setNewProduct({...newProduct, cost: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                            <input 
                                required type="number" 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={newProduct.stock}
                                onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin ml-2" size={20} />
                                جاري الحفظ...
                            </>
                        ) : 'حفظ المنتج'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">تعديل المنتج</h2>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleUpdateProduct} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
                        <input 
                            required
                            type="text" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={editingProduct.barcode}
                                onChange={(e) => setEditingProduct({...editingProduct, barcode: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                            <select 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={editingProduct.category}
                                onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السعر</label>
                            <input 
                                required type="number" 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={editingProduct.price}
                                onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة</label>
                            <input 
                                required type="number" 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={editingProduct.cost}
                                onChange={(e) => setEditingProduct({...editingProduct, cost: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                            <input 
                                required type="number" 
                                className="w-full p-2 border rounded-lg outline-none"
                                value={editingProduct.stock}
                                onChange={(e) => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                         {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin ml-2" size={20} />
                                جاري التحديث...
                            </>
                        ) : (
                            <>
                                <Save size={18} className="ml-2" />
                                حفظ التعديلات
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Manufacturing Modal */}
      {isManuModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Scissors className="text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-800">تصنيع / خياطة</h2>
                    </div>
                    <button onClick={() => setIsManuModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-700 mb-6">
                    قم بتحويل المواد الخام إلى منتجات جاهزة. سيتم حساب التكلفة وإضافتها كدين على الخياط (المورد) إذا لزم الأمر.
                </div>
                
                <form onSubmit={handleManufacture} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">المادة الخام (المصدر)</label>
                            <select 
                                required
                                className="w-full p-2 border rounded-lg outline-none bg-gray-50"
                                value={manuData.sourceId}
                                onChange={(e) => setManuData({...manuData, sourceId: e.target.value})}
                            >
                                <option value="">اختر الخام...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (متوفر: {p.stock})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">المنتج النهائي</label>
                            <select 
                                required
                                className="w-full p-2 border rounded-lg outline-none bg-gray-50"
                                value={manuData.targetId}
                                onChange={(e) => setManuData({...manuData, targetId: e.target.value})}
                            >
                                <option value="">اختر المنتج...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (متوفر: {p.stock})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المراد إنتاجها</label>
                            <input 
                                required type="number" min="1"
                                className="w-full p-2 border rounded-lg outline-none"
                                value={manuData.quantityToMake}
                                onChange={(e) => setManuData({...manuData, quantityToMake: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">استهلاك الخام (للقطعة)</label>
                            <input 
                                required type="number" min="0.1" step="0.1"
                                className="w-full p-2 border rounded-lg outline-none"
                                value={manuData.rawPerUnit}
                                onChange={(e) => setManuData({...manuData, rawPerUnit: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4 border-dashed border-gray-200">
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-1">الخياط / المورد (اختياري)</label>
                             <select 
                                className="w-full p-2 border rounded-lg outline-none bg-gray-50"
                                value={manuData.supplierId}
                                onChange={(e) => setManuData({...manuData, supplierId: e.target.value})}
                            >
                                <option value="">اختر الخياط...</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تكلفة الخياطة (للقطعة)</label>
                            <input 
                                type="number" min="0"
                                className="w-full p-2 border rounded-lg outline-none"
                                value={manuData.laborCostPerUnit}
                                onChange={(e) => setManuData({...manuData, laborCostPerUnit: Number(e.target.value)})}
                            />
                        </div>
                         <div className="flex flex-col justify-end">
                             <div className="text-sm text-gray-500 mb-1">إجمالي أجرة الخياط</div>
                             <div className="font-bold text-red-600 bg-red-50 p-2 rounded-lg text-center">
                                 {manuData.laborCostPerUnit * manuData.quantityToMake} {CURRENCY}
                             </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin ml-2" size={20} />
                                جاري التصنيع...
                            </>
                        ) : 'تأكيد التصنيع'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Categories Management Modal */}
      {isCatModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-800">إدارة الأقسام</h2>
                      <button onClick={() => setIsCatModalOpen(false)} className="text-gray-500 hover:text-gray-800">
                          <X size={24} />
                      </button>
                  </div>

                  <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                      <input 
                        type="text" 
                        placeholder="اسم القسم الجديد"
                        className="flex-1 p-2 border rounded-lg"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        required
                      />
                      <button type="submit" className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"><Plus size={20}/></button>
                  </form>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                      {categories.map(cat => (
                          <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-700">{cat.name}</span>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-500">
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;
