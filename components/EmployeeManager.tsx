import React, { useState } from 'react';
import { Employee, AttendanceRecord, AppConfig, UserRole } from '../types';
import SmartCalendar from './SmartCalendar';
import { ArrowRight, Search } from 'lucide-react';

interface EmployeeManagerProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: AppConfig;
  userRole: UserRole;
  onUpdateRecord: (record: AttendanceRecord) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ employees, attendanceRecords, config, userRole, onUpdateRecord }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ checkIn: string; checkOut: string; status: string }>({
      checkIn: '', checkOut: '', status: 'present'
  });

  const filteredEmployees = employees.filter(e => e.name.includes(searchTerm));

  const handleDayClick = (date: string, record: AttendanceRecord | undefined) => {
      setEditingDate(date);
      setEditForm({
          checkIn: record?.checkIn || '',
          checkOut: record?.checkOut || '',
          status: record?.status || 'present'
      });
  };

  const handleSave = () => {
      if (!selectedEmployee || !editingDate) return;

      const newRecord: AttendanceRecord = {
          id: `${selectedEmployee.id}-${editingDate}`,
          employeeId: selectedEmployee.id,
          date: editingDate,
          checkIn: editForm.checkIn || undefined,
          checkOut: editForm.checkOut || undefined,
          status: editForm.status as any
      };

      onUpdateRecord(newRecord);
      setEditingDate(null);
  };

  if (selectedEmployee) {
    const employeeRecords = attendanceRecords.filter(r => r.employeeId === selectedEmployee.id);
    // Employees can only view, managers/accountants can edit
    const canEdit = userRole === 'manager' || userRole === 'accountant';

    return (
      <div className="animate-fade-in">
        <button 
            onClick={() => setSelectedEmployee(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors"
        >
            <ArrowRight size={20} />
            عودة للقائمة
        </button>

        <SmartCalendar 
            employee={selectedEmployee} 
            records={employeeRecords} 
            config={config}
            onEditDay={handleDayClick} 
            readOnly={!canEdit}
        />

        {/* Edit Modal */}
        {editingDate && canEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4">تعديل سجل: {editingDate}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">الحالة</label>
                            <select 
                                value={editForm.status}
                                onChange={e => setEditForm({...editForm, status: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="present">حضور</option>
                                <option value="absent">غياب</option>
                                <option value="absent_penalty" className="text-red-600 font-bold">غياب بدون إذن (خصم)</option>
                                <option value="leave">إجازة</option>
                                <option value="weekend">عطلة رسمية</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">وقت الحضور</label>
                                <input 
                                    type="time" 
                                    value={editForm.checkIn}
                                    onChange={e => setEditForm({...editForm, checkIn: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">وقت الانصراف</label>
                                <input 
                                    type="time" 
                                    value={editForm.checkOut}
                                    onChange={e => setEditForm({...editForm, checkOut: e.target.value})}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">حفظ التغييرات</button>
                        <button onClick={() => setEditingDate(null)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200">إلغاء</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <Search className="text-slate-400" />
            <input 
                type="text" 
                placeholder="بحث عن موظف..." 
                className="flex-1 outline-none text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map(emp => (
                <div 
                    key={emp.id} 
                    onClick={() => setSelectedEmployee(emp)}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex flex-col items-center text-center group"
                >
                    <img src={emp.avatar} alt={emp.name} className="w-20 h-20 rounded-full mb-4 group-hover:scale-105 transition-transform" />
                    <h3 className="font-bold text-lg text-slate-800">{emp.name}</h3>
                    <p className="text-slate-500 text-sm mb-4">{emp.position}</p>
                    <div className="w-full border-t border-slate-100 pt-4 flex justify-between text-xs text-slate-400">
                        <span>{emp.department}</span>
                        <span>انضم: {emp.joinDate}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default EmployeeManager;