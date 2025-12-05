
import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, TrendingUp, ShieldCheck, Zap, ArrowRight, Smartphone } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
                <Compass className="text-emerald-600 w-8 h-8" />
                <span className="text-2xl font-bold text-slate-900">بوصلة</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-slate-600 hover:text-emerald-600 font-medium transition">
                تسجيل الدخول
              </Link>
              <Link 
                to="/register" 
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-full font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
              >
                ابدأ مجاناً
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-32 lg:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold mb-6 border border-emerald-100">
            👋 للمحلات التجارية في موريتانيا
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
            أدر محلك بذكاء مع <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">نظام بوصلة المحاسبي</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-500 mb-10">
            تطبيق ويب متكامل لإدارة المبيعات، المخزون، والعملاء. مصمم خصيصاً لتجار الملابس، يعمل بدون إنترنت، ويدعم الذكاء الاصطناعي لتحليل أرباحك.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
             <Link 
                to="/register" 
                className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-slate-800 transition shadow-xl"
              >
                <span>أنشئ حسابك الآن</span>
                <ArrowRight size={20} />
              </Link>
              <Link 
                to="/login"
                className="flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-50 transition"
              >
                <span>لدي حساب بالفعل</span>
              </Link>
          </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30">
            <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-10 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:shadow-lg transition">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                        <TrendingUp size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">تقارير وأرباح فورية</h3>
                    <p className="text-slate-500 leading-relaxed">
                        تابع مبيعاتك لحظة بلحظة. احصل على تقارير دقيقة حول الأرباح، المنتجات الأكثر مبيعاً، وحالة المخزون بضغطة زر.
                    </p>
                </div>
                <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:shadow-lg transition">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                        <Zap size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">ذكاء اصطناعي مدمج</h3>
                    <p className="text-slate-500 leading-relaxed">
                        احصل على مساعد شخصي يحلل بياناتك ويقترح عليك استراتيجيات لزيادة المبيعات عبر Google Gemini API.
                    </p>
                </div>
                <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:shadow-lg transition">
                    <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                        <Smartphone size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">يعمل على أي جهاز</h3>
                    <p className="text-slate-500 leading-relaxed">
                        سواء كنت تستخدم الهاتف، الجهاز اللوحي، أو الكمبيوتر. نظام بوصلة متجاوب ويعمل حتى بدون اتصال بالإنترنت.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-center text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-4">
            <Compass className="text-emerald-500" />
            <span className="text-xl font-bold text-white">بوصلة</span>
        </div>
        <p>© {new Date().getFullYear()} جميع الحقوق محفوظة. صُنع بفخر للمتاجر الموريتانية.</p>
      </footer>
    </div>
  );
};

export default Landing;
