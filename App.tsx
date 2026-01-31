
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import Reports from './components/Reports';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import BiometricSimulator from './components/BiometricSimulator'; 
import ActivityLogs from './components/ActivityLogs';
import PageTransition from './components/PageTransition';
import { initializeDatabase, EmployeeService, LogService } from './db';
import { STORAGE_KEYS, INITIAL_EMPLOYEES } from './constants';
import { Employee, AttendanceRecord, AppConfig, UserRole, ActivityLog, ActionType } from './types';
import { Permissions } from './utils';
import { 
    initSupabase, 
    subscribeToRealtime, 
    downloadAllData, 
    uploadAllData, 
    getSupabaseConfig,
    upsertSingleRecord,
    upsertSingleEmployee,
    deleteSingleEmployee,
    upsertConfig
} from './supabaseClient';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
      return localStorage.getItem('mowazeb_theme') === 'dark';
  });
  
  // -- Initialization State --
  const [dbData] = useState(() => {
      const data = initializeDatabase();
      initSupabase(); 
      return data;
  });

  const [employees, setEmployees] = useState<Employee[]>(dbData.employees);
  const [config, setConfig] = useState<AppConfig>(dbData.config);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(dbData.records);
  const [logs, setLogs] = useState<ActivityLog[]>(dbData.logs || []);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  // -- Helper: Add Log --
  const addLog = (action: ActionType, target: string, details: string) => {
      if (!currentUser) return;
      
      const newLog: ActivityLog = {
          id: Date.now().toString(),
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action,
          target,
          details,
          timestamp: new Date().toISOString()
      };
      
      LogService.add(newLog);
      setLogs(prev => [newLog, ...prev]);
  };

  // -- Dark Mode Effect --
  useEffect(() => {
    if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('mowazeb_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('mowazeb_theme', 'light');
    }
  }, [darkMode]);

  // -- Persistence Effects (Local) --
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // -- Realtime & Cloud Sync Logic --
  const syncFromCloud = useCallback(async () => {
      setIsSyncing(true);
      const data = await downloadAllData();
      
      if (data.success) {
          const cloudIsEmpty = (!data.employees || data.employees.length === 0);
          
          if (cloudIsEmpty) {
              console.log("Supabase is empty. Seeding with initial data...");
              await uploadAllData(dbData.employees, dbData.records, dbData.config);
          } else {
              if (data.employees && data.employees.length > 0) setEmployees(data.employees);
              if (data.records) setAttendanceRecords(data.records);
              if (data.config) setConfig(data.config);
              console.log("Data Synced from Cloud");
          }
      }
      setIsSyncing(false);
  }, [dbData]);

  useEffect(() => {
      const sbConfig = getSupabaseConfig();
      if (sbConfig.isConnected) {
          syncFromCloud();
          subscribeToRealtime(() => {
              // When a realtime event happens, we fetch the latest state
              // We debounce this slightly to avoid double-fetching on own-updates
              setTimeout(() => {
                  syncFromCloud();
              }, 500);
          });
      }
  }, [syncFromCloud]);

  // -- Handlers --
  const handleLogin = (user: Employee) => {
      setCurrentUser(user);
      setActiveTab('dashboard');
      const newLog: ActivityLog = {
          id: Date.now().toString(),
          actorName: user.name,
          actorRole: user.role,
          action: 'LOGIN',
          target: 'System',
          details: 'قام المستخدم بتسجيل الدخول',
          timestamp: new Date().toISOString()
      };
      LogService.add(newLog);
      setLogs(prev => [newLog, ...prev]);
  };

  const handleLogout = () => {
      if (currentUser) {
         addLog('LOGOUT', 'System', 'قام المستخدم بتسجيل الخروج');
      }
      setCurrentUser(null);
  };

  const handleUpdateRecord = (newRecord: AttendanceRecord) => {
      // 1. Optimistic UI Update
      const updatedRecords = [...attendanceRecords];
      const existsIdx = updatedRecords.findIndex(r => r.id === newRecord.id);
      if (existsIdx >= 0) {
          updatedRecords[existsIdx] = newRecord;
      } else {
          updatedRecords.push(newRecord);
      }
      setAttendanceRecords(updatedRecords);
      
      // 2. Granular Cloud Update
      upsertSingleRecord(newRecord);
      
      const empName = employees.find(e => e.id === newRecord.employeeId)?.name || 'مجهول';
      addLog('UPDATE', `Attendance: ${empName}`, `تعديل سجل بتاريخ ${newRecord.date} (حالة: ${newRecord.status})`);
  };

  // -- Biometric Device Logic --
  const handleDevicePunch = (employeeId: string, location?: {lat: number, lng: number, inRange: boolean, distance: number}): { status: 'in' | 'out' | 'error'; time: string; message: string } => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // HH:MM
      
      const recordId = `${employeeId}-${dateStr}`;
      const existingRecord = attendanceRecords.find(r => r.id === recordId);
      const employeeName = employees.find(e => e.id === employeeId)?.name || 'Unknown';
      
      let newRecord: AttendanceRecord;
      let status: 'in' | 'out' | 'error' = 'in';
      let message = '';
      let logAction: ActionType = 'ATTENDANCE';
      
      let updatedRecords = [...attendanceRecords];
      const locDetails = location ? `(Loc: ${location.inRange ? 'OK' : 'Fail'} - ${location.distance}m)` : '';

      if (!existingRecord) {
          // First punch -> Check In
          newRecord = {
              id: recordId,
              employeeId,
              date: dateStr,
              checkIn: timeStr,
              status: 'present',
              source: 'device',
              location: location
          };
          message = `تم تسجيل دخول ${timeStr}`;
          status = 'in';
          updatedRecords = [...attendanceRecords, newRecord];
          setAttendanceRecords(updatedRecords);
          addLog(logAction, `Device: ${employeeName}`, `تسجيل دخول عبر البصمة ${timeStr} ${locDetails}`);
          
          // Cloud Update
          upsertSingleRecord(newRecord);

      } else if (existingRecord.checkIn && !existingRecord.checkOut) {
          // Second punch -> Check Out
          newRecord = {
              ...existingRecord,
              checkOut: timeStr,
              source: 'device',
          };
          message = `تم تسجيل خروج ${timeStr}`;
          status = 'out';
          updatedRecords = attendanceRecords.map(r => r.id === recordId ? newRecord : r);
          setAttendanceRecords(updatedRecords);
          addLog(logAction, `Device: ${employeeName}`, `تسجيل خروج عبر البصمة ${timeStr} ${locDetails}`);

          // Cloud Update
          upsertSingleRecord(newRecord);

      } else if (existingRecord.checkIn && existingRecord.checkOut) {
          return { status: 'error', time: timeStr, message: 'تم تسجيل الدخول والخروج لهذا اليوم مسبقاً' };
      } else {
           return { status: 'error', time: timeStr, message: 'حالة غير معروفة للسجل' };
      }

      return { status, time: timeStr, message };
  };

  const handleConfigChange = (newConfig: AppConfig) => {
      setConfig(newConfig);
      upsertConfig(newConfig); // Granular Update
      addLog('SETTINGS', 'General Settings', 'تم تحديث إعدادات النظام');
  };

  const handleResetData = () => {
    if (window.confirm('تحذير: سيتم حذف البيانات محلياً. إذا كنت متصلاً بالسحابة، قد تحتاج لحذف البيانات من Supabase يدوياً.')) {
      const defaultAdmin: Employee = INITIAL_EMPLOYEES[0];
      
      addLog('DELETE', 'System', 'إعادة ضبط المصنع (حذف جميع البيانات المحلية)');

      setEmployees([defaultAdmin]);
      setAttendanceRecords([]);
      alert('تمت إعادة تعيين النظام محلياً. يرجى إعادة رفع البيانات للسحابة إذا لزم الأمر.');
      handleLogout();
    }
  };

  const handleAddUser = (user: Omit<Employee, 'id'>) => {
      const newUser = EmployeeService.add(user);
      const newEmployees = [...employees, newUser];
      setEmployees(newEmployees);
      
      upsertSingleEmployee(newUser); // Granular Update
      
      addLog('CREATE', `User: ${user.name}`, `إضافة مستخدم جديد (${user.role})`);
  };

  const handleUpdateUser = (id: string, updates: Partial<Employee>) => {
      EmployeeService.update(id, updates);
      const updatedUser = { ...employees.find(e => e.id === id)!, ...updates };
      const newEmployees = employees.map(e => e.id === id ? updatedUser : e);
      setEmployees(newEmployees);
      
      upsertSingleEmployee(updatedUser); // Granular Update
      
      const oldName = employees.find(e => e.id === id)?.name;
      addLog('UPDATE', `User: ${oldName}`, `تحديث بيانات المستخدم`);
  };

  const handleDeleteUser = (id: string) => {
      const targetName = employees.find(e => e.id === id)?.name || 'Unknown';
      EmployeeService.delete(id);
      const newEmployees = employees.filter(e => e.id !== id);
      setEmployees(newEmployees);
      
      deleteSingleEmployee(id); // Granular Update
      
      addLog('DELETE', `User: ${targetName}`, `حذف المستخدم من النظام`);
  };

  if (!currentUser) {
      return <Login employees={employees} onLogin={handleLogin} />;
  }

  const userRole = currentUser.role;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            employees={employees} 
            attendanceRecords={attendanceRecords} 
            config={config} 
            currentUserRole={userRole}
            currentEmployeeId={currentUser.id}
          />
        );
      case 'employees':
        if (!Permissions.canViewAllDashboard(userRole)) return <div className="text-red-500 p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
        return (
          <EmployeeManager 
            employees={employees} 
            attendanceRecords={attendanceRecords} 
            config={config} 
            userRole={userRole}
            onUpdateRecord={handleUpdateRecord} 
          />
        );
      case 'biometric':
          if (!Permissions.canAccessBiometricDevice(userRole)) return <div className="text-red-500 p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
          return (
              <BiometricSimulator 
                  employees={employees}
                  onDevicePunch={handleDevicePunch}
                  currentUser={currentUser}
                  config={config}
              />
          );
      case 'reports':
        return (
            <Reports 
                employees={employees} 
                attendanceRecords={attendanceRecords} 
                config={config} 
                currentUserRole={userRole}
                currentEmployeeId={currentUser.id}
            />
        );
      case 'users':
        if (!Permissions.canManageUsers(userRole)) return <div className="text-red-500 p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
        return (
            <UserManagement 
                employees={employees}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
            />
        );
      case 'logs':
        if (!Permissions.canViewLogs(userRole)) return <div className="text-red-500 p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
        return <ActivityLogs logs={logs} />;
      case 'settings':
        if (!Permissions.canManageSettings(userRole)) return <div className="text-red-500 p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
        return (
          <Settings 
             config={config} 
             onConfigChange={handleConfigChange} 
             userRole={userRole}
             onRoleChange={() => {}} 
             onResetData={handleResetData}
          />
        );
      default:
        return <div className="p-10 text-center text-slate-400">Loading...</div>;
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        userRole={userRole}
        currentUserName={currentUser.name}
        currentUserRole={userRole}
        onLogout={handleLogout}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
    >
      {isSyncing && (
          <div className="fixed top-0 left-0 w-full h-1 bg-blue-100 z-50">
              <div className="h-full bg-blue-600 animate-pulse w-full"></div>
          </div>
      )}
      <AnimatePresence mode="wait">
        <PageTransition key={activeTab}>
            {renderContent()}
        </PageTransition>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
