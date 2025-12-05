import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/db';
import { Compass, Smartphone, Lock, User as UserIcon, Store, Loader2 } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    storeName: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    if (!formData.phone || formData.phone.length < 8) {
        setError('الرجاء إدخال رقم هاتف صحيح');
        return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: formData.name,
        phone: formData.phone,
        storeName: formData.storeName,
        password: formData.password
      });
      
      // Supabase handles session automatically
      navigate('/'); 
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'فشل إنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 mb-6">
            <Compass className="text-emerald-600 w-10 h-10" />
            <h2 className="text-3xl font-extrabold text-gray-900">بوصلة</h2>
        </Link>
        <h2 className="text-center text-2xl font-bold text-gray-900">
          أنشئ حساباً جديداً
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          بياناتك آمنة ومحفوظة على السيرفر
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                    {error}
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">الاسم الكامل</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pr-10 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border"
                  placeholder="محمد أحمد"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">اسم المتجر</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pr-10 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border"
                  placeholder="أزياء النخبة"
                  value={formData.storeName}
                  onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">رقم الهاتف (للدخول)</label>
              <div className="mt-1 relative rounded-md shadow-sm" dir="ltr">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none border-r border-gray-200 pr-2">
                  <span className="text-gray-500 font-bold">+222</span>
                </div>
                <input
                  type="tel"
                  required
                  className="block w-full pl-16 text-right border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border"
                  placeholder="22334455"
                  value={formData.phone}
                  onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({...formData, phone: val})
                  }}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">سيتم استخدام هذا الرقم لتسجيل الدخول</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">كلمة المرور</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pr-10 border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'إنشاء الحساب'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">لديك حساب بالفعل؟</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;