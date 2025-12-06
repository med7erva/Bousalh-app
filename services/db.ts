import { supabase } from './supabase';
import { Product, Invoice, SaleItem, User, Client, Expense, Purchase, Supplier, PurchaseItem, PaymentMethod, Employee, ExpenseCategory, FinancialTransaction, ProductCategory } from '../types';
import { SEED_PRODUCTS, SEED_PAYMENT_METHODS } from '../constants';

// --- Auth Operations ---
export const registerUser = async (user: Omit<User, 'id' | 'createdAt' | 'email'>) => {
  const sanitizedPhone = user.phone.replace(/\D/g, ''); 
  const pseudoEmail = `${sanitizedPhone}@bousla.app`;

  const { data, error } = await supabase.auth.signUp({
    email: pseudoEmail,
    password: user.password!,
    options: {
      data: {
        name: user.name,
        storeName: user.storeName,
        phone: sanitizedPhone
      }
    }
  });

  if (error) {
      if (error.message.includes('already registered')) {
          throw new Error('رقم الهاتف هذا مسجل مسبقاً');
      }
      throw error;
  }
  
  if (!data.user) throw new Error("Registration failed");

  const userId = data.user.id;

  const methodsToInsert = SEED_PAYMENT_METHODS.map(pm => ({
      user_id: userId,
      name: pm.name,
      type: pm.type,
      provider: pm.provider,
      balance: 0,
      is_default: pm.isDefault
  }));
  await supabase.from('payment_methods').insert(methodsToInsert);

  const seedExpCats = ['إيجار', 'رواتب', 'فواتير', 'صيانة', 'أخرى'];
  await supabase.from('expense_categories').insert(seedExpCats.map(c => ({ 
      user_id: userId, name: c, is_default: c === 'رواتب' 
  })));

  await supabase.from('clients').insert({
      user_id: userId, name: 'عميل افتراضي', phone: '00000000', debt: 0, notes: 'للزبائن العابرين'
  });
  await supabase.from('suppliers').insert({
      user_id: userId, name: 'مورد افتراضي', phone: '00000000', debt: 0
  });

  return { id: userId, ...user, email: pseudoEmail, createdAt: new Date().toISOString() };
};

export const loginUser = async (phone: string, password: string): Promise<User> => {
    // Force sign out first to ensure clean state and avoid 'Invalid Refresh Token'
    await supabase.auth.signOut();

    const sanitizedPhone = phone.replace(/\D/g, '');
    const pseudoEmail = `${sanitizedPhone}@bousla.app`;

    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password
    });

    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
        }
        throw error;
    }
    
    if (!data.user) throw new Error("Login failed");

    // 2. Fetch User Profile Data from 'profiles' table (Single Source of Truth)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (profileError) {
        console.warn("Could not fetch profile, falling back to auth metadata");
    }

    // Check defaults exist (migration safety)
    const { data: defaults } = await supabase.from('clients').select('id').eq('name', 'عميل افتراضي').single();
    if(!defaults) {
        await supabase.from('clients').insert({ user_id: data.user.id, name: 'عميل افتراضي', phone: '00000000', debt: 0 });
        await supabase.from('suppliers').insert({ user_id: data.user.id, name: 'مورد افتراضي', phone: '00000000', debt: 0 });
    }

    return {
        id: data.user.id,
        // Prefer profile data, fallback to auth metadata
        name: profile?.name || data.user.user_metadata.name,
        email: data.user.email,
        phone: profile?.phone || data.user.user_metadata.phone || sanitizedPhone,
        storeName: profile?.store_name || data.user.user_metadata.storeName,
        createdAt: data.user.created_at
    };
};

export const initDB = async () => {
    return true; 
};

// --- Payment Methods ---
export const getPaymentMethods = async (userId: string): Promise<PaymentMethod[]> => {
    const { data, error } = await supabase.from('payment_methods').select('*');
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id, userId: d.user_id, name: d.name, type: d.type, provider: d.provider, balance: d.balance, isDefault: d.is_default
    }));
};

export const ensurePaymentMethodsExist = async (userId: string) => {
    const { count } = await supabase.from('payment_methods').select('*', { count: 'exact', head: true });
    if (count === 0) {
        const methodsToInsert = SEED_PAYMENT_METHODS.map(pm => ({
            user_id: userId,
            name: pm.name,
            type: pm.type,
            provider: pm.provider,
            balance: 0,
            is_default: pm.isDefault
        }));
        await supabase.from('payment_methods').insert(methodsToInsert);
    }
};

// --- Products ---
export const getProducts = async (userId: string): Promise<Product[]> => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id, userId: d.user_id, name: d.name, category: d.category, price: d.price, cost: d.cost, stock: d.stock, barcode: d.barcode
    }));
};

export const getProductCategories = async (userId: string): Promise<ProductCategory[]> => {
    const { data, error } = await supabase.from('product_categories').select('*');
    if (error) throw error;
    return data.map((d: any) => ({ id: d.id, userId: d.user_id, name: d.name }));
};

export const addProductCategory = async (userId: string, name: string) => {
    const { data, error } = await supabase.from('product_categories').insert({ user_id: userId, name }).select().single();
    if (error) throw error;
    return { id: data.id, userId: data.user_id, name: data.name };
};

export const deleteProductCategory = async (id: string) => {
    // Reverted to simple delete: DB will block if items exist
    const { error } = await supabase.from('product_categories').delete().eq('id', id);
    if (error) throw error;
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
    const finalBarcode = product.barcode.trim() === '' ? `GEN-${Date.now().toString().slice(-6)}` : product.barcode;
    const { data, error } = await supabase.from('products').insert({
        user_id: product.userId,
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        barcode: finalBarcode
    }).select().single();
    
    if (error) throw error;
    return { ...product, id: data.id, barcode: finalBarcode };
};

export const updateProduct = async (product: Product) => {
    await supabase.from('products').update({
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        barcode: product.barcode
    }).eq('id', product.id);
};

export const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
};

export const manufactureProduct = async (sourceId: string, targetId: string, qty: number, rawPerUnit: number, laborCostPerUnit: number = 0, supplierId: string = '') => {
    
    const { data: source } = await supabase.from('products').select('*').eq('id', sourceId).single();
    const { data: target } = await supabase.from('products').select('*').eq('id', targetId).single();

    if (!source || !target) throw new Error("منتج غير موجود");

    const totalRawNeeded = qty * rawPerUnit;
    if (source.stock < totalRawNeeded) throw new Error(`نقص مواد خام. متاح: ${source.stock}`);

    // Update Source
    await supabase.from('products').update({ stock: source.stock - totalRawNeeded }).eq('id', sourceId);

    // Calc Cost
    const totalRawCost = totalRawNeeded * source.cost;
    const totalLaborCost = qty * laborCostPerUnit;
    const newUnitCost = (totalRawCost + totalLaborCost) / qty;
    
    const currentStockVal = target.stock * target.cost;
    const newBatchVal = qty * newUnitCost;
    const newTotalStock = target.stock + qty;
    const weightedCost = Math.round((currentStockVal + newBatchVal) / newTotalStock);

    // Update Target
    await supabase.from('products').update({ stock: newTotalStock, cost: weightedCost }).eq('id', targetId);

    // Update Supplier Debt
    if (supplierId && totalLaborCost > 0) {
        const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', supplierId).single();
        if (supplier) {
            await supabase.from('suppliers').update({ debt: Number(supplier.debt) + totalLaborCost }).eq('id', supplierId);
        }
    }
    return true;
};

// --- Invoices ---
export const getInvoices = async (userId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase.from('invoices').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        customerName: d.customer_name,
        date: d.date,
        total: d.total,
        paidAmount: d.paid_amount,
        remainingAmount: d.remaining_amount,
        status: d.status,
        items: d.items, 
        paymentMethodId: d.payment_method_id
    }));
};

export const createInvoice = async (userId: string, items: SaleItem[], total: number, paidAmount: number, customerName: string, paymentMethodId: string, customDate?: string) => {
    const date = customDate || new Date().toISOString();
    const remainingAmount = total - paidAmount;
    const isDebt = remainingAmount > 0;
    const finalCustomerName = (customerName && customerName.trim() !== '') ? customerName : 'عميل افتراضي';

    const { data: invoice, error } = await supabase.from('invoices').insert({
        user_id: userId,
        customer_name: finalCustomerName,
        date: date,
        total: total,
        paid_amount: paidAmount,
        remaining_amount: isDebt ? remainingAmount : 0,
        status: isDebt ? 'Pending' : 'Completed',
        payment_method_id: paymentMethodId,
        items: items 
    }).select().single();

    if (error) throw error;

    for (const item of items) {
        if (!item.productId.startsWith('custom-')) {
            const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
            if (prod) {
                await supabase.from('products').update({ stock: prod.stock - item.quantity }).eq('id', item.productId);
            }
        }
    }

    const { data: clients } = await supabase.from('clients').select('*').ilike('name', finalCustomerName).limit(1);
    let client = clients && clients.length > 0 ? clients[0] : null;

    if (client) {
        const updateData: any = { last_purchase_date: date };
        if (isDebt) updateData.debt = Number(client.debt) + remainingAmount;
        await supabase.from('clients').update(updateData).eq('id', client.id);
    } else if (isDebt) {
        await supabase.from('clients').insert({
            user_id: userId, name: finalCustomerName, phone: '', debt: remainingAmount, last_purchase_date: date
        });
    }

    if (paymentMethodId && paidAmount > 0) {
        const { data: pm } = await supabase.from('payment_methods').select('balance').eq('id', paymentMethodId).single();
        if (pm) {
            await supabase.from('payment_methods').update({ balance: pm.balance + paidAmount }).eq('id', paymentMethodId);
        }
    }

    return invoice;
};

export const deleteInvoice = async (invoiceId: string) => {
    // 1. Get Invoice Data
    const { data: inv, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
    if (error || !inv) throw new Error("الفاتورة غير موجودة");

    // 2. Restore Stock
    if (inv.items && Array.isArray(inv.items)) {
        for (const item of inv.items) {
            if (item.productId && !item.productId.startsWith('custom-')) {
                 // Get current stock
                 const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).maybeSingle();
                 if (prod) {
                     // Add quantity back
                     await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.productId);
                 }
            }
        }
    }

    // 3. Reverse Client Debt (If it was a credit sale)
    if (inv.remaining_amount > 0) {
        // Try to find client by name
        const { data: client } = await supabase.from('clients').select('*').ilike('name', inv.customer_name).limit(1).maybeSingle();
        if (client) {
            const newDebt = Math.max(0, Number(client.debt) - Number(inv.remaining_amount));
            await supabase.from('clients').update({ debt: newDebt }).eq('id', client.id);
        }
    }

    // 4. Reverse Wallet Balance (If money was paid)
    if (inv.paid_amount > 0 && inv.payment_method_id) {
        const { data: pm } = await supabase.from('payment_methods').select('balance').eq('id', inv.payment_method_id).maybeSingle();
        if (pm) {
            const newBalance = Number(pm.balance) - Number(inv.paid_amount);
            await supabase.from('payment_methods').update({ balance: newBalance }).eq('id', inv.payment_method_id);
        }
    }

    // 5. Delete Invoice Record (Relations like items stored in JSONB are deleted automatically)
    const { error: delError } = await supabase.from('invoices').delete().eq('id', invoiceId);
    if (delError) throw delError;
};

export const getSalesAnalytics = async (userId: string) => {
    // Fetch ALL invoices to calculate KPIs correctly (Total Sales All Time)
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId);
        
    if (error) throw error;

    const totalSales = invoices.reduce((sum: number, inv: any) => sum + inv.total, 0);
    const totalInvoices = invoices.length;
    
    // CHART LOGIC: Show Last 7 Days Chronologically (Trend)
    const chartData = [];
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6); // 7 days window

    // 1. Initialize Skeleton for Last 7 Days
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(sevenDaysAgo.getDate() + i);
        const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
        // Label format: "السبت 12/05"
        const label = d.toLocaleDateString('ar-MA', { weekday: 'short', day: 'numeric', month: 'numeric' });
        chartData.push({ dateKey, name: label, sales: 0 });
    }

    // 2. Fill Data from invoices
    invoices.forEach((inv: any) => {
        const invDate = inv.date.split('T')[0];
        // Only count if within our chart window
        const dayBin = chartData.find(d => d.dateKey === invDate);
        if (dayBin) {
            dayBin.sales += inv.total;
        }
    });

    // 3. Clean up for Recharts (remove dateKey)
    const finalChart = chartData.map(({ name, sales }) => ({ name, sales }));

    // Fallback if empty (new store)
    return { 
        totalSales, 
        totalInvoices, 
        chartData: finalChart.some(d => d.sales > 0) ? finalChart : [{ name: 'اليوم', sales: 0 }] 
    };
};

// --- Clients ---
export const getClients = async (userId: string): Promise<Client[]> => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id, userId: d.user_id, name: d.name, phone: d.phone, debt: d.debt, lastPurchaseDate: d.last_purchase_date, notes: d.notes
    }));
};

export const addClient = async (client: Omit<Client, 'id'>) => {
    await supabase.from('clients').insert({
        user_id: client.userId, name: client.name, phone: client.phone, debt: client.debt, notes: client.notes
    });
};

export const updateClient = async (client: Client) => {
    await supabase.from('clients').update({
        name: client.name, phone: client.phone, debt: client.debt, notes: client.notes
    }).eq('id', client.id);
};

export const deleteClient = async (id: string) => {
    // Reverted to simple delete: DB will block if items exist
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
};

// --- Suppliers ---
export const getSuppliers = async (userId: string): Promise<Supplier[]> => {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id, userId: d.user_id, name: d.name, phone: d.phone, debt: d.debt, productsSummary: d.products_summary
    }));
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    await supabase.from('suppliers').insert({
        user_id: supplier.userId, name: supplier.name, phone: supplier.phone, debt: supplier.debt, products_summary: supplier.productsSummary
    });
};

export const updateSupplier = async (supplier: Supplier) => {
    await supabase.from('suppliers').update({
        name: supplier.name, phone: supplier.phone, debt: supplier.debt, products_summary: supplier.productsSummary
    }).eq('id', supplier.id);
};

export const deleteSupplier = async (id: string) => {
    // Reverted to simple delete: DB will block if items exist
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
};

// --- Purchases ---
export const getPurchases = async (userId: string): Promise<Purchase[]> => {
    const { data, error } = await supabase.from('purchases').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id, userId: d.user_id, supplierId: d.supplier_id, supplierName: d.supplier_name, date: d.date, totalCost: d.total_cost, paidAmount: d.paid_amount, items: d.items, status: d.status, paymentMethodId: d.payment_method_id
    }));
};

export const createPurchase = async (userId: string, supplierId: string, supplierName: string, items: PurchaseItem[], totalCost: number, paidAmount: number, date: string, paymentMethodId: string) => {
    const { data: purchase, error } = await supabase.from('purchases').insert({
        user_id: userId, supplier_id: supplierId, supplier_name: supplierName, date, total_cost: totalCost, paid_amount: paidAmount, status: 'Completed', payment_method_id: paymentMethodId, items
    }).select().single();

    if (error) throw error;

    for (const item of items) {
        const { data: prod } = await supabase.from('products').select('*').eq('id', item.productId).single();
        if (prod) {
            await supabase.from('products').update({ 
                stock: prod.stock + item.quantity,
                cost: item.costPrice 
            }).eq('id', item.productId);
        }
    }

    const debtAmount = totalCost - paidAmount;
    if (debtAmount > 0) {
        const { data: supp } = await supabase.from('suppliers').select('debt').eq('id', supplierId).single();
        if (supp) {
            await supabase.from('suppliers').update({ debt: Number(supp.debt) + debtAmount }).eq('id', supplierId);
        }
    }

    if (paidAmount > 0 && paymentMethodId) {
        const { data: pm } = await supabase.from('payment_methods').select('balance').eq('id', paymentMethodId).single();
        if (pm) {
            await supabase.from('payment_methods').update({ balance: Number(pm.balance) - paidAmount }).eq('id', paymentMethodId);
        }
    }

    return purchase;
};

// --- Expenses ---
export const getExpenses = async (userId: string): Promise<Expense[]> => {
    // NOTE: Fetching separately to be more robust against join failures
    const { data: expenses, error: expError } = await supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (expError) throw expError;

    const { data: categories, error: catError } = await supabase.from('expense_categories').select('*').eq('user_id', userId);
    if (catError) throw catError;
    
    // Map manually
    return expenses.map((d: any) => ({
        id: d.id, 
        userId: d.user_id, 
        title: d.title, 
        amount: d.amount, 
        categoryId: d.category_id, 
        categoryName: categories.find((c: any) => c.id === d.category_id)?.name || 'غير مصنف', 
        employeeId: d.employee_id, 
        date: d.date, 
        paymentMethodId: d.payment_method_id
    }));
};

export const getExpenseCategories = async (userId: string): Promise<ExpenseCategory[]> => {
    const { data, error } = await supabase.from('expense_categories').select('*');
    if (error) throw error;
    return data.map((d: any) => ({ id: d.id, userId: d.user_id, name: d.name, isDefault: d.is_default }));
};

export const addExpenseCategory = async (userId: string, name: string) => {
    await supabase.from('expense_categories').insert({ user_id: userId, name });
};

export const deleteExpenseCategory = async (userId: string, id: string) => {
    // Reverted to simple delete: DB will block if items exist
    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw error;
};

// Replaces simple addExpense with Batch
export const addExpensesBatch = async (userId: string, batchData: { date: string, paymentMethodId: string, expenses: any[] }) => {
    
    // 1. Prepare Rows
    const rowsToInsert = batchData.expenses.map(e => ({
        user_id: userId,
        title: e.title,
        amount: e.amount,
        category_id: e.categoryId,
        employee_id: e.employeeId || null,
        date: batchData.date,
        payment_method_id: batchData.paymentMethodId
    }));

    // 2. Insert Expenses
    const { error } = await supabase.from('expenses').insert(rowsToInsert);
    if (error) throw error;

    // 3. Update Balance (Sum all amounts)
    const totalAmount = batchData.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    if (batchData.paymentMethodId && totalAmount > 0) {
        const { data: pm } = await supabase.from('payment_methods').select('balance').eq('id', batchData.paymentMethodId).single();
        if (pm) {
            await supabase.from('payment_methods').update({ balance: Number(pm.balance) - totalAmount }).eq('id', batchData.paymentMethodId);
        }
    }
};

export const updateExpense = async (expense: Expense) => {
    await supabase.from('expenses').update({
        title: expense.title, amount: expense.amount, category_id: expense.categoryId, date: expense.date
    }).eq('id', expense.id);
};

export const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
};

// --- Employees ---
export const getEmployees = async (userId: string): Promise<Employee[]> => {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;
    return data.map((d: any) => ({
        id: d.id, userId: d.user_id, name: d.name, role: d.role, phone: d.phone, salary: d.salary, joinDate: d.join_date, loanBalance: d.loan_balance
    }));
};

export const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    await supabase.from('employees').insert({
        user_id: employee.userId, name: employee.name, role: employee.role, phone: employee.phone, salary: employee.salary, join_date: employee.joinDate, loan_balance: 0
    });
};

// --- Transactions ---
export const getTransactions = async (userId: string): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase.from('transactions').select(`
        *,
        payment_methods (name)
    `).order('date', { ascending: false });
    
    if (error) throw error;
    
    return data.map((d: any) => ({
        id: d.id, userId: d.user_id, type: d.type, amount: d.amount, date: d.date, 
        paymentMethodId: d.payment_method_id, paymentMethodName: d.payment_methods?.name,
        entityType: d.entity_type, entityId: d.entity_id, description: d.description
    }));
};

export const addFinancialTransaction = async (txData: Omit<FinancialTransaction, 'id' | 'paymentMethodName' | 'entityName'>) => {
    const { userId, type, amount, date, paymentMethodId, entityType, entityId, description } = txData;
    
    const { data: tx, error } = await supabase.from('transactions').insert({
        user_id: userId, type, amount, date, payment_method_id: paymentMethodId, entity_type: entityType, entity_id: entityId, description
    }).select().single();

    if(error) throw error;

    // Apply impact on Entity (Client/Supplier/Employee)
    if (entityId) {
        await adjustEntityBalance(entityType, entityId, type, amount);
    }

    // Apply impact on Wallet
    const { data: pm } = await supabase.from('payment_methods').select('balance').eq('id', paymentMethodId).single();
    if (pm) {
        const newBal = type === 'in' ? Number(pm.balance) + amount : Number(pm.balance) - amount;
        await supabase.from('payment_methods').update({ balance: newBal }).eq('id', paymentMethodId);
    }

    return tx;
};

// Helper to adjust balance for entities
const adjustEntityBalance = async (entityType: string, entityId: string, txType: 'in' | 'out', amount: number) => {
    if (entityType === 'Client') {
        // Client IN (Receipt) = Debt Decreases
        // Client OUT (Loan) = Debt Increases
        const { data: ent } = await supabase.from('clients').select('debt').eq('id', entityId).single();
        if (ent) {
            const newDebt = txType === 'in' ? Number(ent.debt) - amount : Number(ent.debt) + amount;
            await supabase.from('clients').update({ debt: newDebt }).eq('id', entityId);
        }
    } else if (entityType === 'Supplier') {
        // Supplier OUT (Payment) = Debt Decreases
        // Supplier IN (Loan from them) = Debt Increases
        const { data: ent } = await supabase.from('suppliers').select('debt').eq('id', entityId).single();
        if (ent) {
            const newDebt = txType === 'out' ? Number(ent.debt) - amount : Number(ent.debt) + amount;
            await supabase.from('suppliers').update({ debt: newDebt }).eq('id', entityId);
        }
    } else if (entityType === 'Employee') {
        // Employee OUT (Loan given) = Balance Increases
        // Employee IN (Repayment) = Balance Decreases
        const { data: ent } = await supabase.from('employees').select('loan_balance').eq('id', entityId).single();
        if (ent) {
            const newLoan = txType === 'out' ? Number(ent.loan_balance) + amount : Number(ent.loan_balance) - amount;
            await supabase.from('employees').update({ loan_balance: newLoan }).eq('id', entityId);
        }
    }
}

export const updateFinancialTransaction = async (txId: string, newData: Omit<FinancialTransaction, 'id' | 'paymentMethodName' | 'entityName'>) => {
    // 1. Get Old Data
    const { data: oldTx, error } = await supabase.from('transactions').select('*').eq('id', txId).single();
    if (error || !oldTx) throw new Error("Transaction not found");

    // 2. Revert Old Balances
    if (oldTx.entity_id) {
        let reverseAmount = -oldTx.amount; // Negative amount reverses the addition
        await adjustEntityBalance(oldTx.entity_type, oldTx.entity_id, oldTx.type as 'in' | 'out', reverseAmount);
    }

    // Reverse Wallet Balance
    const { data: oldPm } = await supabase.from('payment_methods').select('balance').eq('id', oldTx.payment_method_id).single();
    if (oldPm) {
        const revertBal = oldTx.type === 'in' ? Number(oldPm.balance) - oldTx.amount : Number(oldPm.balance) + oldTx.amount;
        await supabase.from('payment_methods').update({ balance: revertBal }).eq('id', oldTx.payment_method_id);
    }

    // 3. Apply New Balances (New Data)
    if (newData.entityId) {
        await adjustEntityBalance(newData.entityType, newData.entityId, newData.type, newData.amount);
    }

    const { data: newPm } = await supabase.from('payment_methods').select('balance').eq('id', newData.paymentMethodId).single();
    if (newPm) {
        const newBal = newData.type === 'in' ? Number(newPm.balance) + newData.amount : Number(newPm.balance) - newData.amount;
        await supabase.from('payment_methods').update({ balance: newBal }).eq('id', newData.paymentMethodId);
    }

    // 4. Update Record
    await supabase.from('transactions').update({
        type: newData.type,
        amount: newData.amount,
        date: newData.date,
        payment_method_id: newData.paymentMethodId,
        entity_type: newData.entityType,
        entity_id: newData.entityId,
        description: newData.description
    }).eq('id', txId);
};

export const deleteFinancialTransaction = async (txId: string) => {
    // 1. Get Old Data
    const { data: oldTx, error } = await supabase.from('transactions').select('*').eq('id', txId).single();
    if (error || !oldTx) throw new Error("Transaction not found");

    // 2. Revert Balances (Entity & Wallet)
    if (oldTx.entity_id) {
        // Revert by applying negative amount
        await adjustEntityBalance(oldTx.entity_type, oldTx.entity_id, oldTx.type as 'in' | 'out', -oldTx.amount);
    }

    const { data: pm } = await supabase.from('payment_methods').select('balance').eq('id', oldTx.payment_method_id).single();
    if (pm) {
        // Revert Wallet
        const revertBal = oldTx.type === 'in' ? Number(pm.balance) - oldTx.amount : Number(pm.balance) + oldTx.amount;
        await supabase.from('payment_methods').update({ balance: revertBal }).eq('id', oldTx.payment_method_id);
    }

    // 3. Delete Record
    const { error: delError } = await supabase.from('transactions').delete().eq('id', txId);
    if (delError) throw delError;
};

// --- Report Data ---
export const getReportData = async (userId: string, startDate?: string, endDate?: string) => {
    const filter = (query: any, col: string = 'date') => {
        if(startDate) query = query.gte(col, startDate);
        if(endDate) query = query.lte(col, endDate + 'T23:59:59');
        return query;
    };

    const invReq = supabase.from('invoices').select('*').eq('user_id', userId);
    // Fetch expenses without join, we map later or just use ID in reports for simplicity
    const expReq = supabase.from('expenses').select('*').eq('user_id', userId); 
    const catsReq = supabase.from('expense_categories').select('*').eq('user_id', userId);

    const purReq = supabase.from('purchases').select('*').eq('user_id', userId);
    const txReq = supabase.from('transactions').select('*').eq('user_id', userId);
    
    const prodReq = supabase.from('products').select('*').eq('user_id', userId);

    const [invRes, expRes, catsRes, prodRes, purRes, txRes] = await Promise.all([
        filter(invReq).then(),
        filter(expReq).then(),
        catsReq.then(),
        prodReq.then(),
        filter(purReq).then(),
        filter(txReq).then()
    ]);

    const products = (prodRes.data || []).map((d: any) => ({
         id: d.id, userId: d.user_id, name: d.name, category: d.category, price: d.price, cost: d.cost, stock: d.stock, barcode: d.barcode
    }));

    const invoices = (invRes.data || []).map((d: any) => ({
        id: d.id, userId: d.user_id, customerName: d.customer_name, date: d.date, total: d.total, paidAmount: d.paid_amount, items: d.items
    }));

    const categories = catsRes.data || [];
    const expenses = (expRes.data || []).map((d: any) => ({
        id: d.id, userId: d.user_id, title: d.title, amount: d.amount, 
        categoryId: d.category_id,
        categoryName: categories.find((c: any) => c.id === d.category_id)?.name || 'غير مصنف', 
        date: d.date
    }));

    const purchases = (purRes.data || []).map((d: any) => ({
        id: d.id, userId: d.user_id, date: d.date, totalCost: d.total_cost, paidAmount: d.paid_amount
    }));

    const transactions = (txRes.data || []).map((d: any) => ({
        id: d.id, type: d.type, amount: d.amount, date: d.date, entityType: d.entity_type, description: d.description
    }));

    return { invoices, expenses, products, purchases, transactions };
};