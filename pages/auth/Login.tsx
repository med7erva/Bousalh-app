import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/db';
import { Compass, Smartphone, Lock, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!phone || phone.length < 8) {
        setError('الرجاء إدخال رقم هاتف صحيح');
        return;
    }

    setLoading(true);

    try {
      await loginUser(phone, password);
      navigate('/'); 
    } catch (err: any) {
      setError(err.message || 'بيانات الدخول غير صحيحة');
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
          تسجيل الدخول
        </h2>
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
              <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
              <div className="mt-1 relative rounded-md shadow-sm" dir="ltr">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none border-r border-gray-200 pr-2">
                  <span className="text-gray-500 font-bold">+222</span>
                </div>
                <input
                  type="tel"
                  required
                  className="block w-full pl-16 text-right border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border"
                  placeholder="22334455"
                  value={phone}
                  onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhone(val);
                  }}
                />
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                </div>
              </div>
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'دخول'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ليس لديك حساب؟</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                إنشاء حساب جديد
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;