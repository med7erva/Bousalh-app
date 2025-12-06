import { GoogleGenAI } from "@google/genai";
import { Product, Client, Expense, Supplier } from "../types";

// Safe environment variable accessor
const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || '';
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch (e) {}
  return '';
};

// Check for VITE_API_KEY (Vite standard) or API_KEY (Node standard)
const apiKey = getEnv('VITE_API_KEY') || getEnv('API_KEY');
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL_NAME = 'gemini-2.5-flash';

// --- Caching Helpers ---
const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour

const getCachedInsight = (key: string): string | string[] | null => {
    try {
        const item = localStorage.getItem(`ai_cache_${key}`);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp > CACHE_DURATION) {
            localStorage.removeItem(`ai_cache_${key}`);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
};

const setCachedInsight = (key: string, data: string | string[]) => {
    try {
        localStorage.setItem(`ai_cache_${key}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn("Storage full, cannot cache AI insight");
    }
};

// --- Shared Prompt Builder ---
const buildAnalystPrompt = (dataContext: string) => `
أنت مساعد ذكاء اصطناعي متخصص في التحليل المالي والمحاسبي وإدارة المتاجر، وتركّز على محلات الملابس في موريتانيا.

مهمتك هي تحليل كل البيانات الظاهرة أمامك في الصفحة المرسلة لك، سواء كانت تتعلق بالمبيعات، المصاريف، المخزون، الموردين، الديون، الربح، أو حركة المنتجات.
قم بفهم السياق الكامل كما لو أنك محلل مالي داخل متجر فعلي.

البيانات للتحليل:
${dataContext}

يجب عليك:
1. تحليل كل الأرقام الموجودة بعمق، واكتشاف أي نمط أو مشكلة أو فرصة.
2. تقديم توصية واحدة فقط، جوهرية، عملية، ومباشرة، وليست عامة أو نظرية.
3. إذا وُجد خطأ أو خلل في البيانات أو تناقض، قم بالتنبيه عليه بوضوح.
4. توقع التغيّرات المحتملة بناءً على البيانات.
5. تقديم نصيحة قابلة للتطبيق فورًا داخل المتجر.
6. أن تكون مختصرًا جدًا وواضحًا، بدون مقدمات، وبدون شرح طويل.
7. أن تكون النصيحة مبنية على البيانات المعروضة فقط.
8. عدم إرجاع أي صياغة عامة مثل "راقب المبيعات" أو "حسّن الإدارة".
9. مراعاة واقع السوق الموريتاني.

صيغة الرد يجب أن تكون:
- جملة واحدة مركزة.
- لا تتجاوز 30 كلمة كحد أقصى.
- لا تسأل المستخدم أسئلة، فقط قدّم أفضل تحليل ممكن بناءً على البيانات.
`;

// --- Dashboard (Strategic Liquidity Mode) ---
export const getDashboardInsights = async (salesChart: any[], products: Product[]): Promise<string[]> => {
  if (!ai) return ["يرجى إضافة مفتاح API لتفعيل التوصيات الذكية."];

  // Smart cache key considering stock value + total sales volume to detect meaningful changes
  const totalStockValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
  const totalSalesVolume = salesChart.reduce((sum, s) => sum + (s.sales || 0), 0);
  
  const cacheKey = `dash_v2_${totalStockValue}_${totalSalesVolume}`;
  const cached = getCachedInsight(cacheKey);
  if (cached && Array.isArray(cached)) return cached;

  try {
    // 1. Data Pre-processing (Financial Health Check)
    const deadStockItems = products
        .filter(p => p.stock > 20) // Assuming >20 is high for boutique
        .sort((a, b) => (b.cost * b.stock) - (a.cost * a.stock))
        .slice(0, 5)
        .map(p => `${p.name} (${p.stock} قطعة)`);

    const lowStockCashCows = products
        .filter(p => p.stock < 5 && p.price > 2000) // Expensive items running low
        .map(p => p.name);

    const salesTrend = salesChart.length >= 2 
        ? (salesChart[salesChart.length-1].sales > salesChart[salesChart.length-2].sales ? 'صاعد' : 'هابط')
        : 'مستقر';

    const context = `
      تقرير السيولة (Cash Flow Report):
      - رأس المال المجمد في المخزن (بسعر التكلفة): ${totalStockValue.toLocaleString()} أوقية.
      - اتجاه المبيعات الأخير: ${salesTrend}.
      - منتجات تمتص السيولة (مكدسة): ${deadStockItems.join(', ') || 'لا يوجد تكدس خطير'}.
      - منتجات رابحة توشك على النفاد: ${lowStockCashCows.join(', ') || 'لا يوجد'}.
    `;

    // 2. The Strict Prompt
    const prompt = `
      أنت خبير استراتيجي في إدارة "السيولة المالية" (Cash Flow) لمتاجر التجزئة في موريتانيا.
      هدفك الوحيد: مساعدة التاجر على تحويل البضاعة إلى "كاش" بأسرع وقت وزيادة الربحية.

      البيانات المالية الحالية:
      ${context}

      المطلوب:
      أعطني 3 "قرارات إدارية" صارمة ومختصرة جداً (Bullet points) لزيادة السيولة هذا الأسبوع.
      
      الشروط:
      1. ركز على تسييل البضاعة الراكدة (تخفيضات، عروض حزمة).
      2. نبه فوراً إذا كان هناك رأس مال كبير مجمد.
      3. لا تستخدم عبارات عامة مثل "حسن التسويق". أريد إجراءات مالية.
      4. كن مباشراً وحازماً.
    `;

    const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
    const tips = (response.text || "")
        .split('\n')
        .filter(l => l.trim().length > 0 && (l.startsWith('-') || l.startsWith('*') || /^\d\./.test(l)))
        .slice(0, 3)
        .map(l => l.replace(/^[-*\d\.]+\s*/, '')); // Clean bullets
    
    // Fallback if AI creates weird format
    const finalTips = tips.length > 0 ? tips : ["راجع المنتجات المكدسة وقم بعمل تصفية.", "ركز على بيع المنتجات ذات الهامش الربحي العالي.", "راقب السيولة النقدية يومياً."];

    setCachedInsight(cacheKey, finalTips);
    return finalTips;
  } catch (error) {
    return ["ركز على المنتجات الأكثر مبيعاً لزيادة السيولة.", "تخلص من المخزون الراكد بعروض خاصة.", "راقب المصاريف التشغيلية بدقة."];
  }
};

// --- Inventory (Strict Analyst Mode) ---
export const getInventoryInsights = async (products: Product[]): Promise<string> => {
  if (!ai) return "تحليل المخزون غير متاح حالياً.";
  
  const cacheKey = `inv_${products.length}_${products.reduce((sum,p) => sum+p.stock, 0)}`;
  const cached = getCachedInsight(cacheKey);
  if (cached && typeof cached === 'string') return cached;

  try {
    const totalValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const lowStock = products.filter(p => p.stock < 5).map(p => p.name);
    const highStock = products.filter(p => p.stock > 50).map(p => p.name);
    const categories = [...new Set(products.map(p => p.category))];
    
    const context = JSON.stringify({
        total_inventory_value: totalValue,
        total_items_count: products.length,
        low_stock_items: lowStock,
        overstocked_items: highStock,
        categories_available: categories,
        sample_products: products.slice(0, 10).map(p => ({name: p.name, margin: p.price - p.cost}))
    });

    const prompt = buildAnalystPrompt(context);
    const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
    const insight = response.text || "راجع المنتجات الراكدة وحاول تحريكها بعروض.";
    
    setCachedInsight(cacheKey, insight);
    return insight;
  } catch (error) { return "قم بجرد المخزون وتحديث الكميات لضمان دقة التحليل."; }
};

// --- Clients (Strict Analyst Mode) ---
export const getClientInsights = async (clients: Client[]): Promise<string> => {
    if (!ai) return "";
    
    const cacheKey = `cli_${clients.length}_${clients.reduce((s,c) => s+c.debt, 0)}`;
    const cached = getCachedInsight(cacheKey);
    if (cached && typeof cached === 'string') return cached;

    try {
        const totalDebt = clients.reduce((sum, c) => sum + c.debt, 0);
        const debtors = clients.filter(c => c.debt > 0).map(c => ({name: c.name, debt: c.debt}));
        
        const context = JSON.stringify({
            total_clients: clients.length,
            total_outstanding_debt: totalDebt,
            top_debtors: debtors.slice(0, 5),
        });

        const prompt = buildAnalystPrompt(context);
        const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
        const insight = response.text || "تابع ديون العملاء بانتظام.";
        
        setCachedInsight(cacheKey, insight);
        return insight;
    } catch { return ""; }
};

// --- Suppliers (Strict Analyst Mode) ---
export const getSupplierInsights = async (suppliers: Supplier[]): Promise<string> => {
    if (!ai) return "";
    
    const cacheKey = `sup_${suppliers.length}_${suppliers.reduce((s,su) => s+su.debt, 0)}`;
    const cached = getCachedInsight(cacheKey);
    if (cached && typeof cached === 'string') return cached;

    try {
        const totalDebt = suppliers.reduce((sum, s) => sum + s.debt, 0);
        const creditors = suppliers.filter(s => s.debt > 0).map(s => ({name: s.name, amount_we_owe: s.debt}));

        const context = JSON.stringify({
            total_suppliers: suppliers.length,
            total_debt_to_suppliers: totalDebt,
            suppliers_we_owe_money: creditors
        });

        const prompt = buildAnalystPrompt(context);
        const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
        const insight = response.text || "حاول التفاوض على فترات سداد أطول.";
        
        setCachedInsight(cacheKey, insight);
        return insight;
    } catch { return ""; }
};

// --- Expenses (Strict Analyst Mode) ---
export const getExpenseInsights = async (expenses: Expense[], totalSales: number): Promise<string[]> => {
    if (!ai) return [];
    
    const cacheKey = `exp_${expenses.length}_${totalSales}`;
    const cached = getCachedInsight(cacheKey);
    if (cached && Array.isArray(cached)) return cached;

    try {
        const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
        const expRatio = totalSales > 0 ? (totalExp / totalSales) * 100 : 0;
        
        const context = JSON.stringify({
            total_sales_period: totalSales,
            total_expenses: totalExp,
            expense_to_sales_ratio: expRatio.toFixed(1) + '%',
            top_expenses: expenses.sort((a,b) => b.amount - a.amount).slice(0, 3).map(e => ({title: e.title, amount: e.amount}))
        });

        const prompt = buildAnalystPrompt(context);
        const response = await ai.models.generateContent({ model: MODEL_NAME, contents: prompt });
        const tip = response.text || "تحكم في المصاريف المتغيرة لزيادة الربحية.";
        
        const result = [tip];
        setCachedInsight(cacheKey, result);
        return result;
    } catch { return ["راجع بنود الصرف الأعلى تكلفة."]; }
};

export const getChatStream = async (history: { role: string, text: string }[], message: string) => {
    if (!ai) throw new Error("API Key missing");
    const chat = ai.chats.create({
        model: MODEL_NAME,
        history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        config: { systemInstruction: "أنت مساعد ذكي لتطبيق 'بوصلة'. تتحدث العربية. العملة هي الأوقية." }
    });
    return await chat.sendMessageStream({ message });
};