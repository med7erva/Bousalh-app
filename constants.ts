import { Product, Invoice, PaymentMethod } from './types';

export const CURRENCY = 'أوقية'; // MRU

// Seed Payment Methods (Templates)
export const SEED_PAYMENT_METHODS: Omit<PaymentMethod, 'userId'>[] = [
  { id: 'cash', name: 'الصندوق (الكاش)', type: 'Cash', provider: 'Cash', balance: 0, isDefault: true },
  { id: 'bankily', name: 'بنكيلي', type: 'BankApp', provider: 'Bankily', balance: 0 },
  { id: 'masrvi', name: 'مصرفي', type: 'BankApp', provider: 'Masrvi', balance: 0 },
  { id: 'sedad', name: 'السداد', type: 'BankApp', provider: 'Sedad', balance: 0 },
];

// These will now serve as initial data for the Database
export const SEED_PRODUCTS: Product[] = [
  { id: '1', userId: 'seed', name: 'دراعة رجالية فاخرة', category: 'Men', price: 1500, cost: 1000, stock: 45, barcode: '1001' },
  { id: '2', userId: 'seed', name: 'ملحفة نسائية مطرزة', category: 'Women', price: 800, cost: 500, stock: 12, barcode: '1002' },
  { id: '3', userId: 'seed', name: 'قماش (ازبيي) - خام', category: 'RawMaterial', price: 0, cost: 200, stock: 100, barcode: 'RAW01' }, // Raw material example
  { id: '4', userId: 'seed', name: 'نعال جلد طبيعي', category: 'Men', price: 600, cost: 400, stock: 25, barcode: '1004' },
  { id: '5', userId: 'seed', name: 'خيوط تطريز ذهبية', category: 'RawMaterial', price: 0, cost: 50, stock: 200, barcode: 'RAW02' },
];

export const SEED_INVOICES: Invoice[] = [
  { 
    id: 'INV-001', 
    userId: 'seed', 
    customerName: 'أحمد محمود', 
    date: new Date().toISOString(), 
    total: 3000, 
    status: 'Completed', 
    items: [],
    paidAmount: 3000,
    remainingAmount: 0
  },
];

// Deprecated: Use DB instead, kept for fallback in components not yet updated
export const MOCK_PRODUCTS = SEED_PRODUCTS;
export const SALES_DATA = [
  { name: 'السبت', sales: 0 },
  { name: 'الأحد', sales: 0 },
  { name: 'الاثنين', sales: 0 },
  { name: 'الثلاثاء', sales: 0 },
  { name: 'الأربعاء', sales: 0 },
  { name: 'الخميس', sales: 0 },
  { name: 'الجمعة', sales: 0 },
];