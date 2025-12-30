import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Employee, AttendanceRecord, AppConfig } from '../types';
import { calculateRanking } from '../utils';
import { Trophy, Clock, AlertTriangle, CalendarCheck, Users } from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: AppConfig;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

const Dashboard: React.FC<DashboardProps> = ({ employees, attendanceRecords, config }) => {
  const ranking = useMemo(() => calculateRanking(employees, attendanceRecords, config), [employees, attendanceRecords, config]);
  
  const topEmployees = ranking.slice(0, 3);
  
  // Stats
  const totalEmployees = employees.length;
  const totalLate = attendanceRecords.filter(r => {
      const isFriday = new Date(r.date).getDay() === 5;
      return !isFriday && r.checkIn && parseInt(r.checkIn.split(':')[0]) * 60 + parseInt(r.checkIn.split(':')[1]) > parseInt(config.workStartTime.split(':')[0]) * 60 + parseInt(config.workStartTime.split(':')[1]);
  }).length;
  const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;

  const chartData = ranking.slice(0, 10).map(emp => ({
      name: emp.name.split(' ')[0], // First name for chart
      score: emp.score
  }));

  const pieData = [
      { name: 'ملتزم', value: Math.max(0, attendanceRecords.length - totalLate - totalAbsent) },
      { name: 'تأخير', value: totalLate },
      { name: 'غياب', value: totalAbsent },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">لوحة التحكم العامة</h2>
          <p className="text-slate-500 text-sm mt-1">نظرة عامة على أداء الموظفين والحضور لهذا الشهر</p>
        </div>
        <div className="flex gap-2">
            <span className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-slate-600 border border-slate-200">
                {new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
            </span>
        </div>
      </div>

      {/* Top 3 Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Second Place */}
        <div className="order-2 md:order-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center pt-8 mt-4 relative">
             <div className="absolute -top-4 w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 shadow-sm border-4 border-white">2</div>
             {topEmployees[1] && (
                 <>
                    <img src={topEmployees[1].avatar} alt={topEmployees[1].name} className="w-20 h-20 rounded-full mb-3 border-4 border-white shadow-md" />
                    <h3 className="font-bold text-slate-800">{topEmployees[1].name}</h3>
                    <span className="text-xs text-slate-500 mb-2">{topEmployees[1].position}</span>
                    <div className="text-2xl font-black text-blue-600">{topEmployees[1].score}</div>
                    <span className="text-xs text-slate-400">نقطة</span>
                 </>
             )}
        </div>

        {/* First Place */}
        <div className="order-1 md:order-2 bg-gradient-to-b from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg border border-blue-400 flex flex-col items-center relative transform -translate-y-4">
             <div className="absolute -top-6 text-yellow-300">
                 <Trophy size={48} fill="currentColor" />
             </div>
             {topEmployees[0] && (
                 <>
                    <img src={topEmployees[0].avatar} alt={topEmployees[0].name} className="w-24 h-24 rounded-full mb-3 border-4 border-white/30 shadow-inner mt-6" />
                    <h3 className="font-bold text-white text-lg">{topEmployees[0].name}</h3>
                    <span className="text-xs text-blue-100 mb-2">{topEmployees[0].position}</span>
                    <div className="text-3xl font-black text-white">{topEmployees[0].score}</div>
                    <span className="text-xs text-blue-100">نقطة</span>
                 </>
             )}
        </div>

        {/* Third Place */}
        <div className="order-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center pt-8 mt-4 relative">
             <div className="absolute -top-4 w-8 h-8 bg-amber-700/20 text-amber-900 rounded-full flex items-center justify-center font-bold shadow-sm border-4 border-white">3</div>
             {topEmployees[2] && (
                 <>
                    <img src={topEmployees[2].avatar} alt={topEmployees[2].name} className="w-20 h-20 rounded-full mb-3 border-4 border-white shadow-md" />
                    <h3 className="font-bold text-slate-800">{topEmployees[2].name}</h3>
                    <span className="text-xs text-slate-500 mb-2">{topEmployees[2].position}</span>
                    <div className="text-2xl font-black text-blue-600">{topEmployees[2].score}</div>
                    <span className="text-xs text-slate-400">نقطة</span>
                 </>
             )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><Users size={24} /></div>
            <div>
                <p className="text-sm text-slate-500">إجمالي الموظفين</p>
                <p className="text-xl font-bold text-slate-800">{totalEmployees}</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600"><Clock size={24} /></div>
            <div>
                <p className="text-sm text-slate-500">حالات التأخير</p>
                <p className="text-xl font-bold text-slate-800">{totalLate}</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600"><AlertTriangle size={24} /></div>
            <div>
                <p className="text-sm text-slate-500">حالات الغياب</p>
                <p className="text-xl font-bold text-slate-800">{totalAbsent}</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600"><CalendarCheck size={24} /></div>
            <div>
                <p className="text-sm text-slate-500">نسبة الالتزام</p>
                <p className="text-xl font-bold text-slate-800">
                    {Math.round(((attendanceRecords.length - totalAbsent - totalLate) / Math.max(1, attendanceRecords.length)) * 100)}%
                </p>
            </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Top Employees */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <h3 className="font-bold text-slate-800 mb-6">ترتيب الموظفين (أعلى 10)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                        <Tooltip 
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Pie Chart - Attendance Split */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6">توزيع الحالات</h3>
            <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> ملتزم</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> تأخير</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> غياب</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
