import React, { useState, useRef } from 'react';
import { Employee, AttendanceRecord, AppConfig, UserRole } from '../types';
import SmartCalendar from './SmartCalendar';
import { ArrowRight, Search, CheckCircle2, Trash2 } from 'lucide-react';
import { Permissions, getMonthDates } from '../utils';

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
  
  // Ref for focus management
  const checkOutRef = useRef<HTMLInputElement>(null);
  
  // Modal State
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [lastFocusedDate, setLastFocusedDate] = useState<string | null>(null); // To restore focus after save

  const [editForm, setEditForm] = useState<{ checkIn: string; checkOut: string; status: string; earlyPermission: boolean }>({
      checkIn: '', checkOut: '', status: 'present', earlyPermission: false
  });

  const filteredEmployees = employees.filter(e => e.name.includes(searchTerm));

  const handleDayClick = (date: string, record: AttendanceRecord | undefined) => {
      setLastFocusedDate(null); // Clear previous focus
      setEditingDate(date);
      setEditForm({
          checkIn: record?.checkIn || '',
          checkOut: record?.checkOut || '',
          status: record?.status || 'present',
          earlyPermission: record?.earlyDeparturePermission || false
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
          status: editForm.status as any,
          earlyDeparturePermission: editForm.earlyPermission
      };

      onUpdateRecord(newRecord);
      
      // Auto-advance logic: Focus the NEXT day after saving
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const dates = getMonthDates(currentYear, currentMonth);
      const currentIndex = dates.indexOf(editingDate);
      const nextDate = dates[currentIndex + 1] || editingDate; // Move to next day or stay if last

      setLastFocusedDate(nextDate);
      setEditingDate(null);
  };

  if (selectedEmployee) {
    const employeeRecords = attendanceRecords.filter(r => r.employeeId === selectedEmployee.id);
    
    // Check Permissions correctly via Utils
    const canEdit = Permissions.canEditAttendance(userRole);

    return (
      <div className="animate-slide-in-right">
        <button 
            onClick={() => setSelectedEmployee(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 mb-6 transition-colors"
        >
            <ArrowRight size={20} />
            عودة للقائمة
        </button>

        <div className="flex items-center justify-between mb-2">
            <div></div>
            {!canEdit && (
                <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                    للعرض فقط (ليس لديك صلاحية التعديل)
                </span>
            )}
        </div>

        <SmartCalendar 
            employee={selectedEmployee} 
            records={employeeRecords} 
            config={config} 
            onEditDay={handleDayClick}
            readOnly={!canEdit}
            lastFocusedDate={lastFocusedDate}
        />

        {editingDate && canEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                        تعديل سجل {new Date(editingDate).toLocaleDateString('ar-EG')}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">وقت الحضور</label>
                            <div className="flex gap-2">
                                <input 
                                    type="time" 
                                    value={editForm.checkIn}
                                    onChange={e => setEditForm({...editForm, checkIn: e.target.value})}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            checkOutRef.current?.focus();
                                        }
                                    }}
                                    autoFocus
                                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dir-ltr dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                                {editForm.checkIn && (
                                    <button 
                                        onClick={() => setEditForm({ ...editForm, checkIn: '' })}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                        title="مسح وقت الحضور"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">وقت الانصراف</label>
                            <div className="flex gap-2">
                                <input 
                                    ref={checkOutRef}
                                    type="time" 
                                    value={editForm.checkOut}
                                    onChange={e => setEditForm({...editForm, checkOut: e.target.value})}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSave();
                                        }
                                    }}
                                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dir-ltr dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                                {editForm.checkOut && (
                                    <button 
                                        onClick={() => setEditForm({ ...editForm, checkOut: '' })}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                        title="مسح وقت الانصراف"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                         
                         {/* Early Departure Permission Toggle */}
                         <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                             <input 
                                type="checkbox"
                                id="earlyPerm"
                                checked={editForm.earlyPermission}
                                onChange={e => setEditForm({...editForm, earlyPermission: e.target.checked})}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                             />
                             <label htmlFor="earlyPerm" className="text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                 إذن انصراف مبكر / مأمورية
                             </label>
                         </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الحالة</label>
                            <select 
                                value={editForm.status}
                                onChange={e => setEditForm({...editForm, status: e.target.value})}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            >
                                <option value="present">حضور (Present)</option>
                                <option value="absent">غياب (Absent)</option>
                                <option value="late">تأخير (Late)</option>
                                <option value="leave">إجازة (Leave)</option>
                                <option value="absent_penalty">غياب بدون إذن (Penalty)</option>
                                <option value="under_review">تحت المراجعة (Under Review)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button 
                            onClick={handleSave}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            حفظ
                        </button>
                        <button 
                            onClick={() => setEditingDate(null)}
                            className="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 py-2 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
           <div>
               <h2 className="text-2xl font-bold text-slate-800 dark:text-white">سجل الحضور والانصراف</h2>
               <p className="text-slate-500 dark:text-slate-400">عرض وتعديل سجلات الموظفين</p>
           </div>
           <div className="relative mt-4 md:mt-0 w-full md:w-auto">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="بحث باسم الموظف..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 pr-10 pl-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
           </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredEmployees.map(emp => (
               <div 
                  key={emp.id} 
                  onClick={() => setSelectedEmployee(emp)}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
               >
                   <div className="flex items-center gap-4">
                       <img src={emp.avatar} alt={emp.name} className="w-14 h-14 rounded-full object-cover group-hover:scale-105 transition-transform" />
                       <div>
                           <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{emp.name}</h3>
                           <p className="text-xs text-slate-500 dark:text-slate-400">{emp.position}</p>
                           <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                               <span>{emp.department}</span>
                           </div>
                       </div>
                       <div className="mr-auto text-slate-300 group-hover:text-blue-500 transition-colors">
                           <ArrowRight size={20} className="transform rotate-180" />
                       </div>
                   </div>
               </div>
           ))}
           {filteredEmployees.length === 0 && (
               <div className="col-span-full text-center py-12 text-slate-400">
                   لا يوجد موظفين مطابقين للبحث
               </div>
           )}
       </div>
    </div>
  );
};

export default EmployeeManager;