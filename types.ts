
declare var html2pdf: any;

export interface User {
  id: string;
  name: string;
  phone: string; // Unique identifier
  password?: string;
  storeName: string;
  email?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  name: string;
  type: 'Cash' | 'BankApp';
  provider: 'Cash' | 'Bankily' | 'Masrvi' | 'Sedad' | 'Other';
  balance: number;
  isDefault?: boolean;
}

export interface ProductCategory {
  id: string;
  userId: string;
  name: string;
}

export interface Product {
  id: string;
  userId: string; // Link to user
  name: string;
  category: string; // Changed from enum to string to support dynamic categories
  price: number; // Selling price
  cost: number; // Cost price
  stock: number;
  barcode: string;
}

export interface SaleItem {
  productId: string;
  quantity: number;
  priceAtSale: number;
  productName: string;
}

export interface Invoice {
  id: string;
  userId: string;
  customerName: string;
  date: string;
  items: SaleItem[];
  total: number;
  paidAmount: number; // New: Amount paid at checkout
  remainingAmount: number; // New: Debt calculated
  status: 'Completed' | 'Pending' | 'Returned';
  paymentMethodId?: string; // Where the money went
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  phone: string;
  debt: number;
  lastPurchaseDate?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  userId: string;
  name: string;
  phone: string;
  debt: number; // Amount we owe them
  productsSummary?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
}

export interface Purchase {
  id: string;
  userId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  totalCost: number;
  paidAmount: number; // If less than totalCost, difference is added to supplier debt
  paymentMethodId?: string; // Where the money came from
  status: 'Completed' | 'Pending';
}

export interface ExpenseCategory {
  id: string;
  userId: string;
  name: string;
  isDefault?: boolean; // System categories like Salaries that shouldn't be deleted easily
}

export interface Expense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  categoryId: string; // Linked to ExpenseCategory
  categoryName?: string; // Snapshot for display
  employeeId?: string; // Optional: Linked to Employee if it's a salary
  date: string;
  paymentMethodId?: string; // Where the money came from
  notes?: string;
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  role: 'Manager' | 'Sales' | 'Worker' | 'Security';
  phone: string;
  salary: number;
  joinDate: string;
  loanBalance?: number; // Track loans/advances given to employee
}

export interface FinancialTransaction {
  id: string;
  userId: string;
  type: 'in' | 'out'; // 'in' = Receipt (قبض), 'out' = Payment (صرف)
  amount: number;
  date: string;
  paymentMethodId: string;
  paymentMethodName?: string;
  entityType: 'Client' | 'Supplier' | 'Employee' | 'Other';
  entityId?: string;
  entityName?: string;
  description: string;
}

export interface KPIMetric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
