import React, { useMemo } from 'react';
import { Employee, AttendanceRecord, AppConfig } from '../types';
import { calculateRanking, minutesToTime } from '../utils';
import { Download, Printer, Users, Clock, AlertTriangle, CalendarCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ReportsProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: AppConfig;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'];

const Reports: React.FC<ReportsProps> = ({ employees, attendanceRecords, config }) => {
  const data = useMemo(() => calculateRanking(employees, attendanceRecords, config), [employees, attendanceRecords, config]);

  const handlePrint = () => {
    window.print();
  };

  // --- Analytics Data Calculation ---
  const totalEmployees = employees.length;
  // Calculate stats based on records only (approximate for report header)
  const totalLate = attendanceRecords.filter(r => {
      const isFriday = new Date(r.date).getDay() === 5;
      return !isFriday && r.checkIn && parseInt(r.checkIn.split(':')[0]) * 60 + parseInt(r.checkIn.split(':')[1]) > parseInt(config.workStartTime.split(':')[0]) * 60 + parseInt(config.workStartTime.split(':')[1]);
  }).length;
  const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
  const totalUnexcused = attendanceRecords.filter(r => r.status === 'absent_penalty').length;

  const chartData = data.slice(0, 10).map(emp => ({
      name: emp.name.split(' ')[0],
      score: emp.score
  }));

  const pieData = [
      { name: 'ملتزم', value: Math.max(0, attendanceRecords.length - totalLate - totalAbsent - totalUnexcused) },
      { name: 'تأخير', value: totalLate },
      { name: 'غياب', value: totalAbsent },
      { name: 'غياب بدون إذن', value: totalUnexcused },
  ];
  // --------------------------------

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0 print:mb-6 print:border-b print:border-slate-300 print:pb-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">التقرير الشهري الشامل</h2>
            <p className="text-slate-500 print:text-slate-600">تحليل الأداء والرواتب والحضور لشهر {new Date().toLocaleDateString('ar-EG', {month: 'long', year: 'numeric'})}</p>
        </div>
        <div className="flex gap-3 no-print">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium transition-colors">
                <Download size={18} />
                Excel
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-blue-200 shadow-lg transition-colors">
                <Printer size={18} />
                طباعة PDF
            </button>
        </div>
      </div>

      {/* Analytics Section (Visible in Print) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:gap-4 print:mb-8">
         {/* KPI Cards */}
         <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 print:border-slate-300 print:shadow-none">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 print:bg-transparent print:p-0"><Users size={24} /></div>
                <div>
                    <p className="text-sm text-slate-500">الموظفين</p>
                    <p className="text-xl font-bold text-slate-800">{totalEmployees}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 print:border-slate-300 print:shadow-none">
                <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600 print:bg-transparent print:p-0"><Clock size={24} /></div>
                <div>
                    <p className="text-sm text-slate-500">حالات التأخير</p>
                    <p className="text-xl font-bold text-slate-800">{totalLate}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 print:border-slate-300 print:shadow-none">
                <div className="p-3 rounded-lg bg-red-50 text-red-600 print:bg-transparent print:p-0"><AlertTriangle size={24} /></div>
                <div>
                    <p className="text-sm text-slate-500">إجمالي الغياب</p>
                    <p className="text-xl font-bold text-slate-800">{totalAbsent + totalUnexcused}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 print:border-slate-300 print:shadow-none">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 print:bg-transparent print:p-0"><CalendarCheck size={24} /></div>
                <div>
                    <p className="text-sm text-slate-500">نسبة الالتزام</p>
                    <p className="text-xl font-bold text-slate-800">
                        {Math.round(((attendanceRecords.length - totalAbsent - totalLate - totalUnexcused) / Math.max(1, attendanceRecords.length)) * 100)}%
                    </p>
                </div>
            </div>
         </div>

         {/* Charts */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 print:border-slate-300 print:shadow-none print:break-inside-avoid">
             <h3 className="font-bold text-slate-800 mb-4 text-sm">أداء الموظفين (Top 10)</h3>
             <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print:border-slate-300 print:shadow-none print:break-inside-avoid">
             <h3 className="font-bold text-slate-800 mb-4 text-sm">توزيع الحضور</h3>
             <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> ملتزم</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> تأخير</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> غياب</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-900"></div> غياب مخالف</div>
            </div>
         </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-none print:mt-4">
        <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100 print:bg-slate-100">
                    <tr>
                        <th className="p-3 print:p-2">#</th>
                        <th className="p-3 print:p-2">الموظف</th>
                        <th className="p-3 print:p-2">النقاط</th>
                        <th className="p-3 print:p-2 text-red-600">التأخير</th>
                        <th className="p-3 print:p-2 text-red-800">غياب (ب.ع)</th>
                        <th className="p-3 print:p-2 text-blue-600 bg-blue-50/50 print:bg-blue-50">إضافي (كلي)</th>
                        <th className="p-3 print:p-2 text-emerald-600">إضافي (صافي)</th>
                        <th className="p-3 print:p-2 text-center">التزام</th>
                        <th className="p-3 print:p-2 text-center">إضافي</th>
                        <th className="p-3 print:p-2 text-center">حضور</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                    {data.map((row, idx) => (
                        <tr key={row.employeeId} className="hover:bg-slate-50/50 transition-colors print:break-inside-avoid">
                            <td className="p-3 print:p-2">
                                <span className={`
                                    inline-flex items-center justify-center w-6 h-6 text-xs rounded-full font-bold print:border print:border-slate-300
                                    ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                                      idx === 2 ? 'bg-amber-100 text-amber-800' : 'text-slate-500'}
                                `}>
                                    {row.rank}
                                </span>
                            </td>
                            <td className="p-3 print:p-2 flex items-center gap-2">
                                <img src={row.avatar} className="w-8 h-8 rounded-full print:hidden" alt="" />
                                <div>
                                    <div className="font-bold text-slate-800">{row.name}</div>
                                    <div className="text-xs text-slate-500">{row.position}</div>
                                </div>
                            </td>
                            <td className="p-3 print:p-2">
                                <div className="font-bold text-blue-600">{row.score}</div>
                                {row.penaltyPoints > 0 && (
                                    <div className="text-[10px] text-red-500">خصم: {row.penaltyPoints}-</div>
                                )}
                            </td>
                            <td className="p-3 print:p-2 text-red-600 font-medium">{minutesToTime(row.totalDelay)}</td>
                            {/* Unexcused Absence Count */}
                            <td className={`p-3 print:p-2 font-bold ${row.unexcusedAbsences > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                                {row.unexcusedAbsences}
                            </td>
                            <td className="p-3 print:p-2 text-blue-600 font-medium bg-blue-50/30 print:bg-transparent">{minutesToTime(row.totalRawOvertime)}</td>
                            <td className="p-3 print:p-2 text-emerald-600 font-bold">{minutesToTime(row.totalNetOvertime)}</td>
                            
                            <td className="p-3 print:p-2 text-center">
                                <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden print:border print:border-slate-200">
                                    <div className="bg-emerald-500 h-1.5 rounded-full print:bg-black" style={{ width: `${row.commitmentScore}%` }}></div>
                                </div>
                            </td>
                            <td className="p-3 print:p-2 text-center">
                                <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden print:border print:border-slate-200">
                                    <div className="bg-blue-500 h-1.5 rounded-full print:bg-black" style={{ width: `${row.overtimeScore}%` }}></div>
                                </div>
                            </td>
                            <td className="p-3 print:p-2 text-center">
                                <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden print:border print:border-slate-200">
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
  );
};

export default Reports;