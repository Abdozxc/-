import React from 'react';
import { calculateDailyStats, formatTime12H, getMonthDates } from '../utils';
import { AttendanceRecord, Employee, AppConfig } from '../types';
import { Edit2 } from 'lucide-react';

interface SmartCalendarProps {
  employee: Employee;
  records: AttendanceRecord[];
  config: AppConfig;
  onEditDay: (date: string, record: AttendanceRecord | undefined) => void;
  readOnly?: boolean;
}

const SmartCalendar: React.FC<SmartCalendarProps> = ({ employee, records, config, onEditDay, readOnly }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const dates = getMonthDates(currentYear, currentMonth);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <img src={employee.avatar} className="w-16 h-16 rounded-full border-2 border-white shadow" alt={employee.name} />
        <div>
           <h3 className="text-xl font-bold text-slate-800">{employee.name}</h3>
           <p className="text-slate-500">{employee.position}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dates.map((date) => {
          const record = records.find(r => r.date === date);
          const stats = calculateDailyStats(date, config, record);
          const dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
          const dayNumber = new Date(date).getDate();

          return (
            <div 
              key={date}
              onClick={() => !readOnly && onEditDay(date, record)}
              className={`
                relative p-4 rounded-xl border transition-all group
                ${stats.colorClass}
                ${!readOnly ? 'cursor-pointer hover:shadow-md' : 'opacity-90'}
              `}
            >
              {!readOnly && (
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Edit2 size={14} className="text-slate-500" />
              </div>
              )}

              <div className="flex justify-between items-start mb-3">
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold opacity-80">{dayNumber}</span>
                    <span className="text-xs opacity-60">{dayName}</span>
                 </div>
                 <span className={`px-2 py-1 rounded text-xs font-bold mix-blend-multiply bg-white/50`}>
                    {stats.statusLabel}
                 </span>
              </div>

              <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                    <span className="opacity-70">دخول:</span>
                    <span className="font-semibold dir-ltr">{formatTime12H(record?.checkIn)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="opacity-70">خروج:</span>
                    <span className="font-semibold dir-ltr">{formatTime12H(record?.checkOut)}</span>
                 </div>
                 
                 {stats.delayMinutes > 0 && (
                     <div className="flex justify-between text-amber-700 font-medium">
                        <span>تأخير:</span>
                        <span>{stats.delayMinutes} د</span>
                     </div>
                 )}

                 {stats.netOvertimeMinutes > 0 && (
                     <div className="flex justify-between text-indigo-700 font-medium border-t border-indigo-200/50 pt-1 mt-1">
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
