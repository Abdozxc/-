import React from 'react';
import { calculateDailyStats, formatTime12H, getMonthDates } from '../utils';
import { AttendanceRecord, Employee, AppConfig } from '../types';
import { Edit2, CheckCircle2 } from 'lucide-react';

interface SmartCalendarProps {
  employee: Employee;
  records: AttendanceRecord[];
  config: AppConfig;
  onEditDay: (date: string, record: AttendanceRecord | undefined) => void;
  readOnly?: boolean;
  // New props for filtering
  year?: number;
  month?: number; // 0-indexed (0 = Jan)
}

const SmartCalendar: React.FC<SmartCalendarProps> = ({ employee, records, config, onEditDay, readOnly, year, month }) => {
  // Use props if provided, otherwise default to current date
  const targetYear = year !== undefined ? year : new Date().getFullYear();
  const targetMonth = month !== undefined ? month : new Date().getMonth();
  
  const dates = getMonthDates(targetYear, targetMonth);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-4">
        <img src={employee.avatar} className="w-16 h-16 rounded-full border-2 border-white dark:border-slate-700 shadow object-cover" alt={employee.name} />
        <div>
           <h3 className="text-xl font-bold text-slate-800 dark:text-white">{employee.name}</h3>
           <p className="text-slate-500 dark:text-slate-400">{employee.position}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dates.map((date, idx) => {
          const record = records.find(r => r.date === date);
          const stats = calculateDailyStats(date, config, record);
          const dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
          const dayNumber = new Date(date).getDate();

          return (
            <div 
              key={date}
              style={{ animationDelay: `${idx * 0.02}s` }}
              onClick={() => !readOnly && onEditDay(date, record)}
              className={`
                relative p-4 rounded-xl border transition-all duration-300 group animate-scale-in
                ${stats.colorClass} 
                dark:bg-opacity-10 dark:border-opacity-30
                ${!readOnly ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : 'opacity-90'}
              `}
            >
              {!readOnly && (
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Edit2 size={14} className="text-slate-500 dark:text-slate-300" />
              </div>
              )}

              <div className="flex justify-between items-start mb-3">
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold opacity-80 dark:text-slate-200">{dayNumber}</span>
                    <span className="text-xs opacity-60 dark:text-slate-300">{dayName}</span>
                 </div>
                 <span className={`px-2 py-1 rounded text-xs font-bold mix-blend-multiply dark:mix-blend-normal bg-white/50 dark:bg-white/10 dark:text-white shadow-sm`}>
                    {stats.statusLabel}
                 </span>
              </div>

              <div className="space-y-2 text-sm dark:text-slate-200">
                 <div className="flex justify-between">
                    <span className="opacity-70">دخول:</span>
                    <span className="font-semibold dir-ltr">{formatTime12H(record?.checkIn)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="opacity-70">خروج:</span>
                    <span className="font-semibold dir-ltr">{formatTime12H(record?.checkOut)}</span>
                 </div>
                 
                 {stats.delayMinutes > 0 && (
                     <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                        <span>تأخير:</span>
                        <span>{stats.delayMinutes} د</span>
                     </div>
                 )}

                 {/* Early Departure Deduction Display */}
                 {stats.earlyDepartureMinutes !== undefined && stats.earlyDepartureMinutes > 0 && (
                     <div className="flex justify-between text-red-600 dark:text-red-400 font-medium text-xs">
                        <span>انصراف مبكر:</span>
                        <span>خصم {stats.earlyDepartureMinutes} د</span>
                     </div>
                 )}
                 {record?.earlyDeparturePermission && (
                     <div className="flex justify-start gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                         <CheckCircle2 size={12} />
                         <span>إذن انصراف مبكر</span>
                     </div>
                 )}

                 {stats.netOvertimeMinutes > 0 && (
                     <div className="flex justify-between text-indigo-700 dark:text-indigo-300 font-medium border-t border-indigo-200/50 dark:border-indigo-500/30 pt-1 mt-1">
                        <span>إضافي صافي:</span>
                        <span>{stats.netOvertimeMinutes} د</span>
                     </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartCalendar;