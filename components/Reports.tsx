import React, { useMemo, useState } from 'react';
import { Employee, AttendanceRecord, AppConfig, UserRole } from '../types';
import { calculateRanking, minutesToTime, Permissions, generatePerformanceReview, getMonthDates, calculateDailyStats, formatTime12H } from '../utils';
import { Download, Printer, Users, Clock, AlertTriangle, CalendarCheck, Trophy, FileText, Calendar, Filter, FileSpreadsheet, ListChecks } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface ReportsProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: AppConfig;
  currentUserRole: UserRole;
  currentEmployeeId: string;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-sm">
        <p className="font-bold text-slate-800 dark:text-white mb-1">{label ? label : payload[0].name}</p>
        <p className="text-blue-600 dark:text-blue-400 font-bold">
           {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const Reports: React.FC<ReportsProps> = ({ employees, attendanceRecords, config, currentUserRole, currentEmployeeId }) => {
  // --- Filter State ---
  const [filterType, setFilterType] = useState<'monthly' | 'daily'>('monthly');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // --- Report Type State (Summary vs Detailed) ---
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');

  // 1. Filter records based on UI Filters
  const activeEmployeeIds = useMemo(() => new Set(employees.map(e => e.id)), [employees]);
  
  const activeRecords = useMemo(() => {
      return attendanceRecords.filter(r => {
          if (!activeEmployeeIds.has(r.employeeId)) return false;
          
          if (filterType === 'monthly') {
             // Check Month & Year
             const [fYearStr, fMonthStr] = selectedMonth.split('-');
             const fYear = parseInt(fYearStr);
             const fMonth = parseInt(fMonthStr); // 1-12
             
             const [rYear, rMonth] = r.date.split('-').map(Number);
             return rYear === fYear && rMonth === fMonth;

          } else {
             // Check Exact Date
             return r.date === selectedDate;
          }
      });
  }, [attendanceRecords, activeEmployeeIds, filterType, selectedDate, selectedMonth]);

  // 2. Calculate Ranking Data
  const data = useMemo(() => calculateRanking(employees, activeRecords, config), [employees, activeRecords, config]);
  
  // Filtering based on Role (Who can see what)
  const canViewAll = Permissions.canViewAllReports(currentUserRole) || Permissions.isOwner(currentUserRole);
  const displayData = canViewAll ? data : data.filter(d => d.employeeId === currentEmployeeId);
  const topEmployees = displayData.slice(0, 3);

  const handlePrint = () => {
    window.print();
  };

  // Stats for Cards
  const totalEmployees = employees.length;
  // Calculate specific stats based on the FILTERED records
  const totalLate = activeRecords.filter(r => {
      const isFriday = new Date(r.date).getDay() === 5;
      return !isFriday && r.checkIn && parseInt(r.checkIn.split(':')[0]) * 60 + parseInt(r.checkIn.split(':')[1]) > parseInt(config.workStartTime.split(':')[0]) * 60 + parseInt(config.workStartTime.split(':')[1]);
  }).length;
  const totalAbsent = activeRecords.filter(r => r.status === 'absent').length;
  const totalUnexcused = activeRecords.filter(r => r.status === 'absent_penalty').length;
  
  // Denominator logic matches Dashboard
  const recordsDenominator = filterType === 'daily' ? totalEmployees : Math.max(1, activeRecords.length);

  const commitmentRate = recordsDenominator > 0 
      ? Math.round(((activeRecords.length - totalAbsent - totalLate - totalUnexcused) / recordsDenominator) * 100)
      : 0;

  const chartData = displayData.slice(0, 10).map(emp => ({
      name: emp.name.split(' ')[0],
      score: emp.score
  }));

  const pieData = [
      { name: 'ملتزم', value: Math.max(0, activeRecords.length - totalLate - totalAbsent - totalUnexcused) },
      { name: 'تأخير', value: totalLate },
      { name: 'غياب', value: totalAbsent },
      { name: 'غياب بدون إذن', value: totalUnexcused },
  ];

  // Helper to get title based on filter
  const getReportTitle = () => {
      if (filterType === 'monthly') {
          const [y, m] = selectedMonth.split('-');
          const date = new Date(parseInt(y), parseInt(m)-1);
          return `تقرير شهر ${date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`;
      } else {
          return `تقرير يوم ${new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
      }
  };

  // Helper to generate the list of dates for the Detailed Table
  const getReportDates = () => {
      if (filterType === 'monthly') {
          const [y, m] = selectedMonth.split('-');
          return getMonthDates(parseInt(y), parseInt(m) - 1);
      } else {
          return [selectedDate];
      }
  };

  const reportDates = getReportDates();

  if (employees.length === 0) {
      return <div className="p-8 text-center text-slate-500 dark:text-slate-400">لا يوجد بيانات لعرضها.</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Header & Controls (Hidden on Print) */}
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {canViewAll ? 'التقارير والإحصائيات' : 'تقريري الشخصي'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {getReportTitle()}
                </p>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-100 dark:border-slate-600">
                 <div className="flex bg-white dark:bg-slate-600 rounded-lg p-1 shadow-sm">
                     <button 
                        onClick={() => setFilterType('monthly')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'monthly' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-slate-500 dark:text-slate-300 hover:text-slate-700'}`}
                     >
                         شهري
                     </button>
                     <button 
                        onClick={() => setFilterType('daily')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === 'daily' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-slate-500 dark:text-slate-300 hover:text-slate-700'}`}
                     >
                         يومي
                     </button>
                 </div>

                 <div className="h-6 w-px bg-slate-300 dark:bg-slate-500 mx-1"></div>

                 <div className="flex items-center gap-2">
                     <Calendar size={16} className="text-slate-400" />
                     {filterType === 'monthly' ? (
                         <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none w-32"
                         />
                     ) : (
                         <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none"
                         />
                     )}
                 </div>
            </div>
        </div>

        {/* Action Bar (Print Type & Buttons) */}
        {canViewAll && (
        <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700 gap-4">
            
            {/* Report Type Selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FileText size={16} /> نوع التقرير:
                </span>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button 
                        onClick={() => setReportType('summary')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${reportType === 'summary' ? 'bg-white shadow text-slate-800 dark:bg-slate-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <FileSpreadsheet size={14} /> موجز
                    </button>
                    <button 
                        onClick={() => setReportType('detailed')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${reportType === 'detailed' ? 'bg-white shadow text-slate-800 dark:bg-slate-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <ListChecks size={14} /> شامل وتفصيلي
                    </button>
                </div>
            </div>

            <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-medium transition-colors text-sm">
                    <Download size={16} />
                    Excel
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-blue-200 dark:shadow-blue-900/50 shadow-lg transition-colors text-sm">
                    <Printer size={16} />
                    طباعة التقرير
                </button>
            </div>
        </div>
        )}
      </div>

      {/* 
        ######################################################################
        # SECTION 1: SUMMARY REPORT (Always Visible)
        ######################################################################
      */}
      <div className="print:block">
         {/* Print Header for Summary Page */}
         <div className="hidden print:flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-6">
             <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {reportType === 'summary' ? 'تقرير الأداء المختصر' : 'التقرير الشامل (ملخص)'}
                </h1>
                <p className="text-slate-600 mt-1">{getReportTitle()}</p>
             </div>
             <div className="text-left">
                <div className="font-bold text-lg">مواظب PRO</div>
                <div className="text-xs text-slate-500">{new Date().toLocaleDateString('ar-EG')}</div>
             </div>
         </div>

         {/* Charts & Cards (Hidden in Print for cleaner look usually, but kept if desired) */}
         <div className="print:hidden">
             {/* Summary Cards */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'إجمالي الموظفين', val: totalEmployees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'حالات التأخير', val: totalLate, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                    { label: 'إجمالي الغياب', val: totalAbsent + totalUnexcused, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'نسبة الالتزام', val: `${commitmentRate}%`, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
                ].map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200">
                        <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{item.val}</p>
                        </div>
                    </div>
                ))}
             </div>
             
             {/* Charts */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 lg:col-span-2">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm">أداء الموظفين (Top 10)</h3>
                    {chartData.length > 0 ? (
                    <div className="h-48 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#64748b', opacity: 0.1 }} content={<CustomTooltip />} />
                                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    ) : <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500">لا توجد بيانات</div>}
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm">توزيع الحضور</h3>
                    {activeRecords.length > 0 ? (
                    <div className="h-48 w-full min-w-0 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    ) : <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500">لا توجد بيانات</div>}
                </div>
             </div>
         </div>

         {/* SUMMARY TABLE (Visible on Screen & Printed as Page 1) */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden print:shadow-none print:border print:border-slate-300">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 print:bg-slate-100 print:text-black">
                جدول الترتيب العام
            </div>
            <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-right text-sm print:text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-100 dark:border-slate-700 print:bg-slate-100 print:text-black">
                        <tr>
                            <th className="p-3 print:p-1">#</th>
                            <th className="p-3 print:p-1">الموظف</th>
                            <th className="p-3 print:p-1">النقاط</th>
                            <th className="p-3 print:p-1 text-red-600 dark:text-red-400">التأخير</th>
                            <th className="p-3 print:p-1 text-red-800 dark:text-red-300">غياب (ب.ع)</th>
                            <th className="p-3 print:p-1 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 print:bg-transparent">إضافي (كلي)</th>
                            <th className="p-3 print:p-1 text-emerald-600 dark:text-emerald-400">إضافي (صافي)</th>
                            <th className="p-3 print:p-1 text-center">التزام</th>
                            <th className="p-3 print:p-1 text-center">إضافي</th>
                            <th className="p-3 print:p-1 text-center">حضور</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700 print:divide-slate-200">
                        {displayData.map((row, idx) => (
                            <tr key={row.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors print:break-inside-avoid">
                                <td className="p-3 print:p-1">
                                    <span className={`
                                        inline-flex items-center justify-center w-6 h-6 text-xs rounded-full font-bold print:border print:border-slate-300
                                        ${row.rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 
                                          row.rank === 2 ? 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200' :
                                          row.rank === 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}
                                    `}>
                                        {row.rank}
                                    </span>
                                </td>
                                <td className="p-3 print:p-1 flex items-center gap-2">
                                    <img src={row.avatar} className="w-8 h-8 rounded-full print:hidden" alt="" />
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white print:text-black">{row.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">{row.position}</div>
                                    </div>
                                </td>
                                <td className="p-3 print:p-1">
                                    <div className="font-bold text-blue-600 dark:text-blue-400 print:text-black">{row.score}</div>
                                    {row.penaltyPoints > 0 && (
                                        <div className="text-[10px] text-red-500 dark:text-red-400">خصم: {row.penaltyPoints}-</div>
                                    )}
                                </td>
                                <td className="p-3 print:p-1 text-red-600 dark:text-red-400 font-medium">{minutesToTime(row.totalDelay)}</td>
                                <td className={`p-3 print:p-1 font-bold ${row.unexcusedAbsences > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}`}>
                                    {row.unexcusedAbsences}
                                </td>
                                <td className="p-3 print:p-1 text-blue-600 dark:text-blue-400 font-medium bg-blue-50/30 dark:bg-blue-900/10 print:bg-transparent">{minutesToTime(row.totalRawOvertime)}</td>
                                <td className="p-3 print:p-1 text-emerald-600 dark:text-emerald-400 font-bold">{minutesToTime(row.totalNetOvertime)}</td>
                                
                                <td className="p-3 print:p-1 text-center">
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden print:border print:border-slate-200">
                                        <div className="bg-emerald-500 h-1.5 rounded-full print:bg-black" style={{ width: `${row.commitmentScore}%` }}></div>
                                    </div>
                                </td>
                                <td className="p-3 print:p-1 text-center">
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden print:border print:border-slate-200">
                                        <div className="bg-blue-500 h-1.5 rounded-full print:bg-black" style={{ width: `${row.overtimeScore}%` }}></div>
                                    </div>
                                </td>
                                <td className="p-3 print:p-1 text-center">
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden print:border print:border-slate-200">
                                        <div className="bg-purple-500 h-1.5 rounded-full print:bg-black" style={{ width: `${row.absenceScore}%` }}></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
      </div>

      {/* 
        ######################################################################
        # SECTION 2: DETAILED REPORT (Only if Detailed is selected)
        # Hidden by default, shown in print via CSS if enabled.
        ######################################################################
      */}
      <div className={`hidden ${reportType === 'detailed' ? 'print:block' : ''}`}>
        {displayData.map((emp, idx) => (
            <div key={`detail-${emp.employeeId}`} className="break-before-page p-8" style={{ pageBreakBefore: 'always' }}>
                {/* Detail Header */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">كشف حضور وانصراف تفصيلي</h1>
                        <p className="text-slate-600 mt-1">{getReportTitle()}</p>
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-xl">مواظب PRO</div>
                        <div className="text-sm text-slate-500">نظام إدارة الموارد البشرية</div>
                    </div>
                </div>

                {/* Employee Info Strip */}
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
                     <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-full border border-slate-300 overflow-hidden">
                             <img src={emp.avatar} className="w-full h-full object-cover" alt={emp.name} />
                        </div>
                        <div>
                             <h2 className="text-xl font-bold text-slate-900">{emp.name}</h2>
                             <p className="text-slate-600 text-sm">{emp.position}</p>
                        </div>
                     </div>
                     <div className="text-left flex gap-6">
                        <div className="text-center">
                            <div className="text-sm text-slate-500">الترتيب</div>
                            <div className="font-bold text-xl">#{emp.rank}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-slate-500">النقاط</div>
                            <div className="font-bold text-xl text-blue-600">{emp.score}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-slate-500">صافي الإضافي</div>
                            <div className="font-bold text-xl text-emerald-600 dir-ltr">{minutesToTime(emp.totalNetOvertime)}</div>
                        </div>
                     </div>
                </div>

                {/* Narrative (Brief) */}
                <div className="mb-6 text-sm text-slate-700 italic border-l-4 border-blue-200 pl-4 py-2 bg-slate-50/50">
                     "{generatePerformanceReview(emp)}"
                </div>

                {/* THE DETAILED TABLE (The Attendance Sheet) */}
                <h3 className="font-bold text-slate-800 mb-3 text-sm border-b pb-1">سجل الحركات اليومي</h3>
                <table className="w-full text-right text-xs print:text-[10px] border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <tr>
                            <th className="p-2 print:p-1 border-l border-slate-200 w-[120px] print:w-auto">التاريخ</th>
                            <th className="p-2 print:p-1 border-l border-slate-200 w-[80px] print:w-auto">الحالة</th>
                            <th className="p-2 print:p-1 border-l border-slate-200 w-[80px] print:w-auto text-center">دخول</th>
                            <th className="p-2 print:p-1 border-l border-slate-200 w-[80px] print:w-auto text-center">خروج</th>
                            <th className="p-2 print:p-1 border-l border-slate-200 text-center w-[80px] print:w-auto">تأخير</th>
                            <th className="p-2 print:p-1 border-l border-slate-200 text-center w-[80px] print:w-auto">إضافي (كلي)</th>
                            <th className="p-2 print:p-1 border-l border-slate-200 text-center w-[80px] print:w-auto">انصراف مبكر</th>
                            <th className="p-2 print:p-1 border-l border-slate-200 text-center w-[80px] print:w-auto">إضافي (صافي)</th>
                            <th className="p-2 print:p-1">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                        {reportDates.map(dateStr => {
                            // Find record or mock one if missing but inside range
                            const record = attendanceRecords.find(r => r.employeeId === emp.employeeId && r.date === dateStr);
                            const stats = calculateDailyStats(dateStr, config, record);
                            const dayName = new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long' });
                            
                            return (
                                <tr key={dateStr} className={`
                                    ${stats.isFriday ? 'bg-slate-50' : ''}
                                    ${stats.isOfficialHoliday ? 'bg-purple-50' : ''}
                                    ${stats.record?.status === 'absent_penalty' ? 'bg-red-50' : ''}
                                `}>
                                    <td className="p-2 print:p-1 border-l border-slate-200 font-medium">
                                        <div className="flex justify-between">
                                            <span>{dateStr}</span>
                                            <span className="text-slate-500 text-[10px]">{dayName}</span>
                                        </div>
                                    </td>
                                    <td className="p-2 print:p-1 border-l border-slate-200">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                            stats.statusLabel === 'ملتزم' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                            stats.statusLabel === 'تأخير' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                            stats.statusLabel.includes('غياب') ? 'bg-red-50 border-red-200 text-red-700' :
                                            'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}>
                                            {stats.statusLabel}
                                        </span>
                                    </td>
                                    <td className="p-2 print:p-1 border-l border-slate-200 text-center dir-ltr font-mono">{formatTime12H(record?.checkIn)}</td>
                                    <td className="p-2 print:p-1 border-l border-slate-200 text-center dir-ltr font-mono">{formatTime12H(record?.checkOut)}</td>
                                    
                                    <td className={`p-2 print:p-1 border-l border-slate-200 text-center font-bold ${stats.delayMinutes > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                                        {stats.delayMinutes > 0 ? stats.delayMinutes : '-'}
                                    </td>

                                    <td className="p-2 print:p-1 border-l border-slate-200 text-center text-slate-600">
                                        {stats.overtimeMinutes > 0 ? minutesToTime(stats.overtimeMinutes) : '-'}
                                    </td>
                                    
                                    <td className={`p-2 print:p-1 border-l border-slate-200 text-center ${stats.earlyDepartureMinutes && stats.earlyDepartureMinutes > 0 ? 'text-red-600 font-bold' : 'text-slate-300'}`}>
                                         {stats.earlyDepartureMinutes ? stats.earlyDepartureMinutes : '-'}
                                    </td>

                                    <td className={`p-2 print:p-1 border-l border-slate-200 text-center font-bold ${stats.netOvertimeMinutes > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-300'}`}>
                                        {stats.netOvertimeMinutes > 0 ? minutesToTime(stats.netOvertimeMinutes) : '-'}
                                    </td>
                                    <td className="p-2 print:p-1 text-xs text-slate-500">
                                        {record?.note || ''}
                                        {record?.earlyDeparturePermission && <span className="text-emerald-600 block">إذن انصراف</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                        <tr>
                            <td colSpan={4} className="p-2 print:p-1 border-l border-slate-200 text-center">الإجمالي</td>
                            <td className="p-2 print:p-1 border-l border-slate-200 text-center text-red-600">{minutesToTime(emp.totalDelay)}</td>
                            <td className="p-2 print:p-1 border-l border-slate-200 text-center text-blue-600">{minutesToTime(emp.totalRawOvertime)}</td>
                            <td className="p-2 print:p-1 border-l border-slate-200 text-center">-</td>
                            <td className="p-2 print:p-1 border-l border-slate-200 text-center text-emerald-600">{minutesToTime(emp.totalNetOvertime)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer Signature */}
                <div className="flex justify-between mt-12 pt-8 border-t border-slate-300 text-sm">
                    <div className="text-center">
                        <div className="mb-8">توقيع الموظف</div>
                        <div>..........................</div>
                    </div>
                    <div className="text-center">
                        <div className="mb-8">مدير الموارد البشرية</div>
                        <div>..........................</div>
                    </div>
                    <div className="text-center">
                        <div className="mb-8">اعتماد المدير العام</div>
                        <div>..........................</div>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;