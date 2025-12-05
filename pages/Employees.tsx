
import React, { useState, useEffect } from 'react';
import { UserPlus, User, Phone, Briefcase, DollarSign, Calendar, Users, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEmployees, addEmployee, getExpenses } from '../services/db';
import { Employee, Expense } from '../types';
import { CURRENCY } from '../constants';

const Employees: React.FC = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // New Employee Form State
    const [newEmp, setNewEmp] = useState({
        name: '',
        role: 'Sales' as 'Manager' | 'Sales' | 'Worker' | 'Security',
        phone: '',
        salary: 0,
        joinDate: new Date().toISOString().split('T')[0]
    });

    const loadData = async () => {
        if (!user) return;
        const [empData, expData] = await Promise.all([
            getEmployees(user.id),
            getExpenses(user.id)
        ]);
        setEmployees(empData);
        setExpenses(expData);
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        await addEmployee({
            userId: user.id,
            ...newEmp
        });
        
        setIsModalOpen(false);
        setNewEmp({ name: '', role: 'Sales', phone: '', salary: 0, joinDate: new Date().toISOString().split('T')[0] });
        loadData();
    };

    const totalSalaries = employees.reduce((sum, e) => sum + e.salary, 0);

    const getRoleLabel = (role: string) => {
        switch(role) {
            case 'Manager': return 'مدير';
            case 'Sales': return 'بائع';
            case 'Worker': return 'عامل';
            case 'Security': return 'حارس';
            default: return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch(role) {
            case 'Manager': return 'bg-purple-100 text-purple-700';
            case 'Sales': return 'bg-emerald-100 text-emerald-700';
            case 'Worker': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getEmployeeTotalReceived = (empId: string) => {
        return expenses
            .filter(e => e.employeeId === empId)
            .reduce((sum, e) => sum + e.amount, 0);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">طاقم العمل</h1>
                    <p className="text-gray-500 text-sm">إدارة الموظفين والرواتب</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-900 transition shadow-sm"
                >
                    <UserPlus size={20} />
                    <span>موظف جديد</span>
                </button>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
                <div>
                    <h3 className="font-medium opacity-90 mb-1 flex items-center gap-2">
                        <Users size={20} /> إجمالي الموظفين
                    </h3>
                    <div className="text-3xl font-bold">{employees.length}</div>
                </div>
                <div className="text-left">
                    <h3 className="font-medium opacity-90 mb-1">مجموع الرواتب التعاقدية</h3>
                    <div className="text-3xl font-bold">{totalSalaries.toLocaleString()} {CURRENCY}</div>
                </div>
            </div>

            {/* Employees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map(emp => (
                    <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{emp.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getRoleColor(emp.role)}`}>
                                        {getRoleLabel(emp.role)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-4">
                            <div className="flex items-center gap-3 text-gray-600 text-sm p-2 bg-gray-50 rounded-lg">
                                <Phone size={16} className="text-gray-400" />
                                <span dir="ltr">{emp.phone}</span>
                            </div>
                             <div className="flex items-center gap-3 text-gray-600 text-sm p-2 bg-gray-50 rounded-lg">
                                <DollarSign size={16} className="text-gray-400" />
                                <span>الراتب: <span className="font-bold text-gray-800">{emp.salary} {CURRENCY}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 text-sm p-2 bg-gray-50 rounded-lg">
                                <Wallet size={16} className="text-purple-500" />
                                <span>تم استلام: <span className="font-bold text-purple-700">{getEmployeeTotalReceived(emp.id)} {CURRENCY}</span></span>
                            </div>
                             <div className="flex items-center gap-3 text-gray-600 text-sm p-2 bg-gray-50 rounded-lg">
                                <Calendar size={16} className="text-gray-400" />
                                <span>تاريخ التعيين: {emp.joinDate}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {employees.length === 0 && (
                     <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Users size={48} className="mx-auto mb-3 opacity-20" />
                        <p>لا يوجد موظفين مسجلين حالياً</p>
                    </div>
                )}
            </div>

            {/* Add Employee Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-6 text-gray-800">تسجيل موظف جديد</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                                <input required type="text" className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
                                    value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الوظيفة</label>
                                    <select className="w-full p-2.5 border rounded-lg bg-gray-50"
                                        value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value as any})}>
                                        <option value="Sales">بائع</option>
                                        <option value="Manager">مدير</option>
                                        <option value="Worker">عامل</option>
                                        <option value="Security">حارس</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                                    <input required type="text" className="w-full p-2.5 border rounded-lg"
                                        value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الراتب الشهري</label>
                                    <input required type="number" className="w-full p-2.5 border rounded-lg"
                                        value={newEmp.salary} onChange={e => setNewEmp({...newEmp, salary: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التعيين</label>
                                    <input required type="date" className="w-full p-2.5 border rounded-lg"
                                        value={newEmp.joinDate} onChange={e => setNewEmp({...newEmp, joinDate: e.target.value})} />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition">حفظ البيانات</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
