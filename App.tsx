import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { INITIAL_EMPLOYEES, generateMockAttendance, WORK_START_TIME, WORK_END_TIME, WEIGHT_COMMITMENT, WEIGHT_OVERTIME, WEIGHT_ABSENCE, DEFAULT_PENALTY_VALUE } from './constants';
import { Employee, AttendanceRecord, AppConfig, UserRole } from './types';

// Storage Keys
const STORAGE_KEYS = {
  EMPLOYEES: 'mowazeb_employees_v1',
  RECORDS: 'mowazeb_records_v1',
  CONFIG: 'mowazeb_config_v1'
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // -- Local Database Initialization --

  // 1. Employees: Load from DB or use Initial
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  // 2. Config: Load from DB or use Default
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
        const parsed = JSON.parse(saved);
        // Migration: Ensure new fields exist if loading old config
        return {
            ...parsed,
            penaltyValue: parsed.penaltyValue ?? DEFAULT_PENALTY_VALUE,
            holidays: parsed.holidays ?? []
        };
    }
    return {
      workStartTime: WORK_START_TIME,
      workEndTime: WORK_END_TIME,
      weightCommitment: WEIGHT_COMMITMENT,
      weightOvertime: WEIGHT_OVERTIME,
      weightAbsence: WEIGHT_ABSENCE,
      penaltyValue: DEFAULT_PENALTY_VALUE,
      holidays: []
    };
  });

  // 3. Records: Load from DB or Generate Mock for first run
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (saved) {
      return JSON.parse(saved);
    } else {
      // First run: Seed with mock data
      return generateMockAttendance(INITIAL_EMPLOYEES);
    }
  });

  // User Role State (Simulating permissions - not persisted for demo flexibility)
  const [userRole, setUserRole] = useState<UserRole>('manager');

  // -- Persistence Effects (Auto-Save) --

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // -- Handlers --

  const handleUpdateRecord = (newRecord: AttendanceRecord) => {
      setAttendanceRecords(prev => {
          const exists = prev.findIndex(r => r.id === newRecord.id);
          if (exists >= 0) {
              const updated = [...prev];
              updated[exists] = newRecord;
              return updated;
          }
          return [...prev, newRecord];
      });
  };

  // Factory Reset Function
  const handleResetData = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع البيانات واستعادة ضبط المصنع؟ لا يمكن التراجع عن هذا الإجراء.')) {
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
      localStorage.removeItem(STORAGE_KEYS.RECORDS);
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
      window.location.reload();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard employees={employees} attendanceRecords={attendanceRecords} config={config} />;
      case 'employees':
        return (
          <EmployeeManager 
            employees={employees} 
            attendanceRecords={attendanceRecords} 
            config={config} 
            userRole={userRole}
            onUpdateRecord={handleUpdateRecord} 
          />
        );
      case 'reports':
        return <Reports employees={employees} attendanceRecords={attendanceRecords} config={config} />;
      case 'settings':
        return (
          <Settings 
             config={config} 
             onConfigChange={setConfig} 
             userRole={userRole}
             onRoleChange={setUserRole}
             onResetData={handleResetData}
          />
        );
      default:
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                قريباً...
            </div>
        );
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;