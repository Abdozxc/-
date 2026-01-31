import React, { useMemo, useState, useEffect } from 'react';
import { Employee, AttendanceRecord, AppConfig, UserRole } from '../types';
import { calculateRanking, minutesToTime, Permissions, generatePerformanceReview, calculateDailyStats, formatTime12H, getMonthDates } from '../utils';
import { Printer, Users, Clock, AlertTriangle, CalendarCheck, Trophy, List, Table2, CheckSquare, Square, UserPlus } from 'lucide-react';
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
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
  
  // State for selected employees in detailed report
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 1. Filter records to only include active employees AND within CURRENT MONTH
  const activeEmployeeIds = useMemo(() => new Set(employees.map(e => e.id)), [employees]);
  
  const activeRecords = useMemo(() => {
      const today = new Date();
      const currentMonth = today.getMonth(); 
      const currentYear = today.getFullYear();

      return attendanceRecords.filter(r => {
          if (!activeEmployeeIds.has(r.employeeId)) return false;
          const [rYear, rMonth] = r.date.split('-').map(Number);
          return rMonth - 1 === currentMonth && rYear === currentYear;
      });
  }, [attendanceRecords, activeEmployeeIds]);

  // 2. Calculate data based on ACTIVE records
  const data = useMemo(() => calculateRanking(employees, activeRecords, config), [employees, activeRecords, config]);
  
  // Filtering based on Role
  const canViewAll = Permissions.canViewAllReports(currentUserRole) || Permissions.isOwner(currentUserRole);
  const displayData = canViewAll ? data : data.filter(d => d.employeeId === currentEmployeeId);

  // Initialize selected IDs with all rankable employees on first load
  useEffect(() => {
      if (canViewAll && selectedIds.length === 0) {
          setSelectedIds(displayData.map(e => e.employeeId));
      } else if (!canViewAll) {
          setSelectedIds([currentEmployeeId]);
      }
  }, [displayData.length, canViewAll]);

  const toggleEmployeeSelection = (id: string) => {
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const selectAll = () => setSelectedIds(displayData.map(e => e.employeeId));
  const deselectAll = () => setSelectedIds([]);

  const handlePrint = () => {
    window.print();
  };

  const totalEmployees = employees.length;
  const totalLate = activeRecords.filter(r => {
      const isFriday = new Date(r.date).getDay() === 5;
      return !isFriday && r.checkIn && parseInt(r.checkIn.split(':')[0]) * 60 + parseInt(r.checkIn.split(':')[1]) > parseInt(config.workStartTime.split(':')[0]) * 60 + parseInt(config.workStartTime.split(':')[1]);
  }).length;
  const totalAbsent = activeRecords.filter(r => r.status === 'absent').length;
  const totalUnexcused = activeRecords.filter(r => r.status === 'absent_penalty').length;
  const totalRecordsCount = Math.max(1, activeRecords.length);
  const commitmentRate = activeRecords.length > 0 
      ? Math.round(((activeRecords.length - totalAbsent - totalLate - totalUnexcused) / totalRecordsCount) * 100)
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

  if (employees.length === 0) {
      return <div className="p-8 text-center text-slate-500 dark:text-slate-400">لا يوجد بيانات لعرضها.</div>;
  }
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthDates = getMonthDates(currentYear, currentMonth);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthName = today.toLocaleDateString('ar-EG', {month: 'long'});
  const reportDateTitle = `تقرير شهر ${monthName} ${currentYear}`;

  // Filter displayData for detailed reports based on user selection
  const detailedDisplayData = displayData.filter(e => selectedIds.includes(e.employeeId));

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:hidden">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {canViewAll ? 'التقارير الشهرية' : 'تقريري الشخصي'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
                تحليل الأداء للفترة من 1 {monthName} إلى {lastDayOfMonth} {monthName} {currentYear}
            </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4 md:mt-0">
             {/* Report Type Switcher */}
             <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                <button 
                    onClick={() => setReportType('summary')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'summary' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <List size={16} />
                    تقرير موجز
                </button>
                <button 
                    onClick={() => setReportType('detailed')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportType === 'detailed' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <Table2 size={16} />
                    تقرير تفصيلي
                </button>
             </div>

            {canViewAll && (
            <div className="flex gap-2 border-r border-slate-200 dark:border-slate-600 pr-3 mr-1">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg transition-colors">
                    <Printer size={18} />
                    طباعة
                </button>
            </div>
            )}
        </div>
      </div>

      {/* --- EMPLOYEE SECTOR SELECTOR (ONLY FOR DETAILED) --- */}
      {reportType === 'detailed' && canViewAll && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:hidden animate-slide-up">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <UserPlus size={18} className="text-blue-500" />
                      تحديد الموظفين للتقرير التفصيلي
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">تحديد الكل</button>
                      <span className="text-slate-300">|</span>
                      <button onClick={deselectAll} className="text-xs text-red-500 hover:underline">إلغاء التحديد</button>
                  </div>
              </div>
              
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {displayData.map(emp => {
                      const isSelected = selectedIds.includes(emp.employeeId);
                      return (
                          <button
                            key={emp.employeeId}
                            onClick={() => toggleEmployeeSelection(emp.employeeId)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all
                                ${isSelected 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' 
                                    : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'}
                            `}
                          >
                              {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                              {emp.name}
                          </button>
                      );
                  })}
              </div>
              <p className="text-[10px] text-slate-400 mt-4 italic">
                  * سيتم عرض وطباعة تقارير الموظفين المحددين فقط ({detailedDisplayData.length} موظف).
              </p>
          </div>
      )}

      {/* ======================= SUMMARY REPORT ======================= */}
      <div className={reportType === 'summary' ? 'block animate-fade-in' : 'hidden'}>
      {canViewAll && (
      <>
         {/* Summary Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
                { label: 'إجمالي الموظفين', val: totalEmployees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'حالات التأخير', val: totalLate, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                { label: 'إجمالي الغياب', val: totalAbsent + totalUnexcused, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'نسبة الالتزام', val: `${commitmentRate}%`, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
            ].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
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
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:hidden">
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
      </>
      )}

      {/* Employee Gamification Banner */}
      {!canViewAll && displayData.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 text-white p-6 rounded-2xl shadow-lg mb-4">
              <div className="flex justify-between items-center">
                  <div>
                      <h3 className="text-xl font-bold mb-1">ترتيبك الحالي: #{displayData[0].rank}</h3>
                      <p className="text-blue-100 text-sm">
                          {displayData[0].rank === 1 ? 'تهانينا! أنت الأول على الشركة!' : `تحتاج إلى ${displayData[0].pointsToNextRank} نقطة لتتجاوز الموظف الذي أمامك.`}
                      </p>
                  </div>
                  <div className="text-4xl font-black">{displayData[0].score}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-500/30 text-sm text-blue-100 italic">
                  "{generatePerformanceReview(displayData[0])}"
              </div>
          </div>
      )}

      {/* SUMMARY TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
            جدول الترتيب العام
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-100 dark:border-slate-700">
                    <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">الموظف</th>
                        <th className="p-3">النقاط</th>
                        <th className="p-3 text-red-600 dark:text-red-400">التأخير</th>
                        <th className="p-3 text-red-800 dark:text-red-300">غياب (ب.ع)</th>
                        <th className="p-3 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20">إضافي (كلي)</th>
                        <th className="p-3 text-emerald-600 dark:text-emerald-400">إضافي (صافي)</th>
                        <th className="p-3 text-center">التزام</th>
                        <th className="p-3 text-center">إضافي</th>
                        <th className="p-3 text-center">حضور</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {displayData.map((row) => (
                        <tr key={row.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="p-3">
                                <span className={`
                                    inline-flex items-center justify-center w-6 h-6 text-xs rounded-full font-bold
                                    ${row.rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 
                                      row.rank === 2 ? 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200' :
                                      row.rank === 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}
                                `}>
                                    {row.rank}
                                </span>
                            </td>
                            <td className="p-3 flex items-center gap-2">
                                <img src={row.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white">{row.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.position}</div>
                                </div>
                            </td>
                            <td className="p-3">
                                <div className="font-bold text-blue-600 dark:text-blue-400">{row.score}</div>
                                {row.penaltyPoints > 0 && (
                                    <div className="text-[10px] text-red-500 dark:text-red-400">خصم: {row.penaltyPoints}-</div>
                                )}
                            </td>
                            <td className="p-3 text-red-600 dark:text-red-400 font-medium">{minutesToTime(row.totalDelay)}</td>
                            <td className={`p-3 font-bold ${row.unexcusedAbsences > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}`}>
                                {row.unexcusedAbsences}
                            </td>
                            <td className="p-3 text-blue-600 dark:text-blue-400 font-medium bg-blue-50/30 dark:bg-blue-900/10">{minutesToTime(row.totalRawOvertime)}</td>
                            <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{minutesToTime(row.totalNetOvertime)}</td>
                            
                            <td className="p-3 text-center">
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${row.commitmentScore}%` }}></div>
                                </div>
                            </td>
                            <td className="p-3 text-center">
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${row.overtimeScore}%` }}></div>
                                </div>
                            </td>
                            <td className="p-3 text-center">
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${row.absenceScore}%` }}></div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      </div>

      {/* ======================= DETAILED REPORT ======================= */}
      <div className={reportType === 'detailed' ? 'block animate-fade-in' : 'hidden'}>
         {detailedDisplayData.length === 0 ? (
             <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                 يرجى تحديد موظف واحد على الأقل لعرض تقريره المفصل.
             </div>
         ) : (
             detailedDisplayData.map((emp) => {
                return (
                    <div key={`detail-${emp.employeeId}`} className="bg-white dark:bg-slate-800 p-8 mb-8 shadow-md rounded-2xl border border-slate-100 dark:border-slate-700 print:shadow-none print:border-none print:p-0 print:mb-0 break-after-page print:w-full">
                         {/* Header */}
                         <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-800 dark:border-slate-200 pb-6 mb-6">
                            <div className="text-right">
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">كشف حضور وانصراف تفصيلي</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">{reportDateTitle}</p>
                            </div>
                            <div className="text-left mt-4 md:mt-0">
                                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">مواظب PRO</h2>
                                <p className="text-xs text-slate-400">نظام إدارة الموارد البشرية</p>
                            </div>
                         </div>

                         {/* Employee Card */}
                         <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6 mb-8 border border-slate-200 dark:border-slate-600 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-600 border-2 border-slate-200 dark:border-slate-500 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-200 overflow-hidden">
                                    {emp.avatar ? <img src={emp.avatar} className="w-full h-full object-cover" alt="" /> : emp.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{emp.name}</h3>
                                    <p className="text-slate-500 dark:text-slate-300">{emp.position}</p>
                                </div>
                            </div>
                            <div className="flex gap-8 text-center divide-x divide-x-reverse divide-slate-200 dark:divide-slate-600">
                                <div className="px-4">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">الترتيب</div>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">#{emp.rank}</div>
                                </div>
                                <div className="px-4">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">النقاط</div>
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{emp.score}</div>
                                </div>
                                <div className="px-4">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">صافي الإضافي</div>
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 dir-ltr">{minutesToTime(emp.totalNetOvertime)}</div>
                                </div>
                            </div>
                         </div>
                         
                         {/* Narrative */}
                         <div className="mb-8 text-slate-600 dark:text-slate-300 text-sm italic bg-blue-50/50 dark:bg-blue-900/10 border-r-4 border-blue-500 p-4 rounded-r shadow-sm">
                             "{generatePerformanceReview(emp)}"
                         </div>

                         {/* Detailed Table */}
                         <div className="overflow-x-auto">
                             <table className="w-full text-xs text-right border-collapse">
                                 <thead>
                                     <tr className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                         <th className="p-3 border border-slate-200 dark:border-slate-600">التاريخ</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600">اليوم</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 text-center">الحالة</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 text-center">دخول</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 text-center">خروج</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 text-center text-red-600 dark:text-red-400 font-bold">تأخير (د)</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 text-center text-blue-600 dark:text-blue-400 font-bold">إضافي كلي</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 text-center text-orange-600 dark:text-orange-400">انصراف مبكر</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 text-center text-emerald-600 dark:text-emerald-400 font-bold">إضافي صافي</th>
                                         <th className="p-3 border border-slate-200 dark:border-slate-600 w-32">ملاحظات</th>
                                     </tr>
                                 </thead>
                                 <tbody className="text-slate-600 dark:text-slate-300">
                                     {monthDates.map((date) => {
                                         const record = activeRecords.find(r => r.employeeId === emp.employeeId && r.date === date);
                                         const stats = calculateDailyStats(date, config, record);
                                         const dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
                                         return (
                                             <tr key={date} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 dir-ltr text-right">{date}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600">{dayName}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-center">
                                                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                         stats.statusLabel === 'تأخير' ? 'bg-yellow-100 text-yellow-700' :
                                                         stats.statusLabel === 'غياب' ? 'bg-red-100 text-red-700' :
                                                         stats.statusLabel === 'ملتزم' ? 'bg-emerald-100 text-emerald-700' :
                                                         'bg-slate-100 text-slate-600'
                                                     }`}>
                                                         {stats.statusLabel}
                                                     </span>
                                                 </td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-center dir-ltr">{formatTime12H(record?.checkIn)}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-center dir-ltr">{formatTime12H(record?.checkOut)}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-center font-bold">{stats.delayMinutes > 0 ? stats.delayMinutes : '-'}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-center font-medium">{stats.overtimeMinutes > 0 ? minutesToTime(stats.overtimeMinutes) : '-'}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-center">{stats.earlyDepartureMinutes > 0 ? minutesToTime(stats.earlyDepartureMinutes) : '-'}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-center font-bold text-emerald-600 dark:text-emerald-400">{stats.netOvertimeMinutes > 0 ? minutesToTime(stats.netOvertimeMinutes) : '-'}</td>
                                                 <td className="p-2 border border-slate-200 dark:border-slate-600 text-[10px]">{record?.note || '-'}</td>
                                             </tr>
                                         );
                                     })}
                                 </tbody>
                                 <tfoot className="bg-slate-50 dark:bg-slate-700 font-bold border-t-2 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white">
                                     <tr>
                                         <td colSpan={5} className="p-3 text-left">الإجمالي</td>
                                         <td className="p-3 border border-slate-200 dark:border-slate-600 text-center text-red-600 dark:text-red-400 font-black">{minutesToTime(emp.totalDelay)}</td>
                                         <td className="p-3 border border-slate-200 dark:border-slate-600 text-center text-blue-600 dark:text-blue-400 font-black">{minutesToTime(emp.totalRawOvertime)}</td>
                                         <td className="p-3 border border-slate-200 dark:border-slate-600 text-center text-orange-600 dark:text-orange-400">-</td> 
                                         <td className="p-3 border border-slate-200 dark:border-slate-600 text-center text-emerald-600 dark:text-emerald-400 font-black">{minutesToTime(emp.totalNetOvertime)}</td>
                                         <td className="p-3 border border-slate-200 dark:border-slate-600"></td>
                                     </tr>
                                 </tfoot>
                             </table>
                         </div>
                    </div>
                );
             })
         )}
      </div>
    </div>
  );
};

export default Reports;