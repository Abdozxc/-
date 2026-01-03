import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import Reports from './components/Reports';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import BiometricSimulator from './components/BiometricSimulator'; 
import PageTransition from './components/PageTransition'; 
import { initializeDatabase, EmployeeService } from './db';
import { STORAGE_KEYS, INITIAL_EMPLOYEES } from './constants';
import { Employee, AttendanceRecord, AppConfig, UserRole, SupabaseConfig } from './types';
import { Permissions } from './utils';
import { initSupabase, subscribeToRealtime, downloadAllData, uploadAllData, getSupabaseConfig, saveSupabaseConfig } from './supabaseClient';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfig>(getSupabaseConfig());
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

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

  const triggerUpload = async (newEmps: Employee[], newRecs: AttendanceRecord[], newConf: AppConfig) => {
      const sbConfig = getSupabaseConfig();
      if (sbConfig.isConnected && !isSyncing) {
          // Silent background upload
          await uploadAllData(newEmps, newRecs, newConf);
      }
  };

  // -- Realtime & Cloud Sync Logic --
  const syncFromCloud = useCallback(async () => {
      setIsSyncing(true);
      const data = await downloadAllData();
      
      if (data.success) {
          // CRITICAL: If cloud is empty (fresh DB), SEED it with local initial data
          const cloudIsEmpty = (!data.employees || data.employees.length === 0);
          
          if (cloudIsEmpty) {
              console.log("Supabase is empty. Seeding with initial data...");
              // Upload the CURRENT local state (which contains Initial Employees) to Supabase
              await uploadAllData(dbData.employees, dbData.records, dbData.config);
          } else {
              // Normal Sync: Cloud has data, so update local
              if (data.employees && data.employees.length > 0) setEmployees(data.employees);
              if (data.records) setAttendanceRecords(data.records);
              if (data.config) setConfig(data.config);
              console.log("Data Synced from Cloud");
          }
      } else {
          console.error("Sync failed:", data.message);
      }
      setIsSyncing(false);
  }, [dbData]);

  // Initial Sync
  useEffect(() => {
      const sbConfig = getSupabaseConfig();
      if (sbConfig.isConnected) {
          syncFromCloud();
          subscribeToRealtime(() => {
              // Debounce sync slightly
              setTimeout(syncFromCloud, 500);
          });
      }
  }, [syncFromCloud]);

  // -- Handlers --
  const handleLogin = (user: Employee) => {
      setCurrentUser(user);
      setActiveTab('dashboard');
  };

  const handleLogout = () => {
      setCurrentUser(null);
  };

  const handleUpdateRecord = (newRecord: AttendanceRecord) => {
      const updatedRecords = [...attendanceRecords];
      const existsIdx = updatedRecords.findIndex(r => r.id === newRecord.id);
      if (existsIdx >= 0) {
          updatedRecords[existsIdx] = newRecord;
      } else {
          updatedRecords.push(newRecord);
      }
      
      setAttendanceRecords(updatedRecords);
      triggerUpload(employees, updatedRecords, config);
  };

  // -- Biometric Device Logic --
  const handleDevicePunch = (employeeId: string): { status: 'in' | 'out' | 'error'; time: string; message: string } => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // HH:MM
      
      const recordId = `${employeeId}-${dateStr}`;
      const existingRecord = attendanceRecords.find(r => r.id === recordId);
      
      let newRecord: AttendanceRecord;
      let status: 'in' | 'out' | 'error' = 'in';
      let message = '';
      
      let updatedRecords = [...attendanceRecords];

      if (!existingRecord) {
          // First punch -> Check In
          newRecord = {
              id: recordId,
              employeeId,
              date: dateStr,
              checkIn: timeStr,
              status: 'present',
              source: 'device'
          };
          message = `تم تسجيل دخول ${timeStr}`;
          status = 'in';
          updatedRecords = [...attendanceRecords, newRecord];
          setAttendanceRecords(updatedRecords);
      } else if (existingRecord.checkIn && !existingRecord.checkOut) {
          // Second punch -> Check Out
          newRecord = {
              ...existingRecord,
              checkOut: timeStr,
              source: 'device'
          };
          message = `تم تسجيل خروج ${timeStr}`;
          status = 'out';
          updatedRecords = attendanceRecords.map(r => r.id === recordId ? newRecord : r);
          setAttendanceRecords(updatedRecords);
      } else if (existingRecord.checkIn && existingRecord.checkOut) {
          // Already completed
          return { status: 'error', time: timeStr, message: 'تم تسجيل الدخول والخروج لهذا اليوم مسبقاً' };
      } else {
           // Fallback logic
           return { status: 'error', time: timeStr, message: 'حالة غير معروفة للسجل' };
      }

      triggerUpload(employees, updatedRecords, config); // Sync to cloud
      return { status, time: timeStr, message };
  };

  const handleConfigChange = (newConfig: AppConfig) => {
      setConfig(newConfig);
      triggerUpload(employees, attendanceRecords, newConfig);
  };

  const handleResetData = () => {
    if (window.confirm('تحذير: سيتم حذف البيانات محلياً. إذا كنت متصلاً بالسحابة، قد تحتاج لحذف البيانات من Supabase يدوياً.')) {
      const defaultAdmin: Employee = INITIAL_EMPLOYEES[0];

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
      triggerUpload(newEmployees, attendanceRecords, config);
  };

  const handleUpdateUser = (id: string, updates: Partial<Employee>) => {
      EmployeeService.update(id, updates);
      const newEmployees = employees.map(e => e.id === id ? { ...e, ...updates } : e);
      setEmployees(newEmployees);
      triggerUpload(newEmployees, attendanceRecords, config);
  };

  const handleDeleteUser = (id: string) => {
      EmployeeService.delete(id);
      const newEmployees = employees.filter(e => e.id !== id);
      setEmployees(newEmployees);
      triggerUpload(newEmployees, attendanceRecords, config);
  };

  // -- Supabase Configuration Handler --
  const handleSupabaseConfigSave = (newConfig: SupabaseConfig) => {
      saveSupabaseConfig(newConfig);
      setSupabaseConfigState(newConfig);
      if (newConfig.isConnected) {
          syncFromCloud();
      } else {
          alert('تم حفظ الإعدادات، ولكن الاتصال غير مفعل لعدم اكتمال البيانات.');
      }
  };

  // --- Auth Check ---
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
      case 'settings':
        if (!Permissions.canManageSettings(userRole)) return <div className="text-red-500 p-8">غير مصرح لك بالوصول لهذه الصفحة</div>;
        return (
          <Settings 
             config={config} 
             onConfigChange={handleConfigChange} 
             userRole={userRole}
             onRoleChange={() => {}} 
             onResetData={handleResetData}
             supabaseConfig={supabaseConfig}
             onSupabaseConfigSave={handleSupabaseConfigSave}
             onSyncClick={syncFromCloud}
             isSyncing={isSyncing}
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