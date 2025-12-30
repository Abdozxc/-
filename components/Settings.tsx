import React, { useState } from 'react';
import { AppConfig, UserRole, Holiday } from '../types';
import { Save, RefreshCw, Archive, CheckCircle, Trash2, Calendar, Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Since we don't have uuid installed, we'll use a simple generator or simple string

interface SettingsProps {
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetData?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ config, onConfigChange, userRole, onRoleChange, onResetData }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [showSaved, setShowSaved] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Holiday Form State
  const [newHoliday, setNewHoliday] = useState<{name: string, startDate: string, endDate: string}>({
      name: '', startDate: '', endDate: ''
  });

  const handleSave = () => {
    onConfigChange(localConfig);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleCloseMonth = () => {
      setShowArchived(true);
      setTimeout(() => setShowArchived(false), 3000);
  };

  const handleAddHoliday = () => {
      if(!newHoliday.name || !newHoliday.startDate || !newHoliday.endDate) return;
      
      const holiday: Holiday = {
          id: Date.now().toString(),
          name: newHoliday.name,
          startDate: newHoliday.startDate,
          endDate: newHoliday.endDate
      };

      setLocalConfig(prev => ({
          ...prev,
          holidays: [...(prev.holidays || []), holiday]
      }));

      setNewHoliday({ name: '', startDate: '', endDate: '' });
  };

  const handleRemoveHoliday = (id: string) => {
      setLocalConfig(prev => ({
          ...prev,
          holidays: prev.holidays.filter(h => h.id !== id)
      }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">الإعدادات ولوحة الإدارة</h2>

      {/* Role Simulation */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <RefreshCw size={20} className="text-blue-500" />
            محاكاة الصلاحيات
        </h3>
        <p className="text-sm text-slate-500 mb-4">تبديل واجهة العرض الحالية لتجربة النظام بصلاحيات مختلفة.</p>
        <div className="flex gap-2">
            {(['manager', 'accountant', 'employee'] as UserRole[]).map(role => (
                <button
                    key={role}
                    onClick={() => onRoleChange(role)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                        userRole === role 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {role === 'manager' ? 'مدير عام' : role === 'accountant' ? 'محاسب' : 'موظف'}
                </button>
            ))}
        </div>
      </div>

      {/* General Settings */}
      {userRole !== 'employee' && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">إعدادات أوقات العمل</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">وقت بدء العمل</label>
                    <input 
                        type="time" 
                        value={localConfig.workStartTime}
                        onChange={e => setLocalConfig({...localConfig, workStartTime: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">وقت انتهاء العمل</label>
                    <input 
                        type="time" 
                        value={localConfig.workEndTime}
                        onChange={e => setLocalConfig({...localConfig, workEndTime: e.target.value})}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                    />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">نظام التقييم والجزاءات</h3>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <label className="font-medium text-slate-700">وزن الالتزام (الحضور المبكر)</label>
                        <span className="text-blue-600 font-bold">{Math.round(localConfig.weightCommitment * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05"
                        value={localConfig.weightCommitment}
                        onChange={e => setLocalConfig({...localConfig, weightCommitment: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <label className="font-medium text-slate-700">وزن ساعات الإضافي</label>
                        <span className="text-blue-600 font-bold">{Math.round(localConfig.weightOvertime * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05"
                        value={localConfig.weightOvertime}
                        onChange={e => setLocalConfig({...localConfig, weightOvertime: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <label className="font-medium text-slate-700">وزن عدم الغياب</label>
                        <span className="text-blue-600 font-bold">{Math.round(localConfig.weightAbsence * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05"
                        value={localConfig.weightAbsence}
                        onChange={e => setLocalConfig({...localConfig, weightAbsence: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-medium text-red-700 mb-2">خصم نقاط الغياب بدون إذن (لكل يوم)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="0" max="50"
                            value={localConfig.penaltyValue}
                            onChange={e => setLocalConfig({...localConfig, penaltyValue: parseInt(e.target.value) || 0})}
                            className="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-center font-bold text-red-600"
                        />
                        <span className="text-slate-500 text-sm">نقطة خصم مباشر من المجموع</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Holiday Manager */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-purple-600" />
              الإجازات الرسمية
          </h3>
          <p className="text-sm text-slate-500 mb-6">يتم معاملة أيام الإجازات الرسمية مثل يوم الجمعة (احتساب إضافي كامل وعدم احتساب تأخير).</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
              <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">اسم الإجازة</label>
                  <input 
                      type="text" placeholder="مثال: عيد الفطر"
                      value={newHoliday.name}
                      onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                      className="w-full p-2 border rounded-lg outline-none focus:border-purple-500"
                  />
              </div>
              <div>
                   <label className="block text-xs font-medium text-slate-600 mb-1">من تاريخ</label>
                   <input 
                      type="date"
                      value={newHoliday.startDate}
                      onChange={e => setNewHoliday({...newHoliday, startDate: e.target.value})}
                      className="w-full p-2 border rounded-lg outline-none focus:border-purple-500"
                  />
              </div>
              <div>
                   <label className="block text-xs font-medium text-slate-600 mb-1">إلى تاريخ</label>
                   <input 
                      type="date"
                      value={newHoliday.endDate}
                      onChange={e => setNewHoliday({...newHoliday, endDate: e.target.value})}
                      className="w-full p-2 border rounded-lg outline-none focus:border-purple-500"
                  />
              </div>
              <button 
                onClick={handleAddHoliday}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-1 h-[42px]"
              >
                  <Plus size={18} /> إضافة
              </button>
          </div>

          {localConfig.holidays && localConfig.holidays.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {localConfig.holidays.map(h => (
                      <div key={h.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <div>
                              <div className="font-bold text-purple-800 text-sm">{h.name}</div>
                              <div className="text-xs text-purple-600">{h.startDate} <span className="mx-1">إلى</span> {h.endDate}</div>
                          </div>
                          <button onClick={() => handleRemoveHoliday(h.id)} className="text-red-400 hover:text-red-600 p-1">
                              <X size={16} />
                          </button>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  لا توجد إجازات رسمية معرفة
              </div>
          )}
      </div>
      </>
      )}

      {/* Save Button */}
      {userRole !== 'employee' && (
          <div className="flex justify-end">
             <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95"
             >
                {showSaved ? <CheckCircle size={20} /> : <Save size={20} />}
                {showSaved ? 'تم الحفظ بنجاح' : 'حفظ الإعدادات'}
             </button>
          </div>
      )}

      {/* Accounting Actions */}
      {userRole !== 'employee' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-xl font-bold mb-2">إغلاق الشهر المحاسبي</h3>
                    <p className="text-slate-300 text-sm">تأكيد البيانات الحالية وأرشفتها.</p>
                </div>
                <button 
                    onClick={handleCloseMonth}
                    disabled={showArchived}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 disabled:bg-green-600 disabled:cursor-default transition-colors text-sm"
                >
                    {showArchived ? <CheckCircle size={18} /> : <Archive size={18} />}
                    {showArchived ? 'تمت الأرشفة' : 'إغلاق الشهر'}
                </button>
            </div>
        </div>

        {/* Database Management */}
        <div className="bg-white border border-red-100 p-6 rounded-2xl shadow-sm">
             <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-xl font-bold mb-2 text-red-700">إدارة قاعدة البيانات</h3>
                    <p className="text-slate-500 text-sm">حذف جميع البيانات واستعادة النظام لضبط المصنع.</p>
                </div>
                <button 
                    onClick={onResetData}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg shadow-sm hover:bg-red-50 hover:border-red-300 transition-colors text-sm"
                >
                    <Trash2 size={18} />
                    حذف وإعادة ضبط
                </button>
            </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Settings;