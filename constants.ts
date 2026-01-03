import { Employee, AttendanceRecord } from './types';

// System Constants
export const DB_VERSION = 3; // Incremented for Grace Period Migration
export const WORK_START_TIME = "09:00";
export const WORK_END_TIME = "17:00";
export const DEFAULT_GRACE_PERIOD = 15; // 15 Minutes default grace

// Weights (Updated: 80% Overtime, 10% Work Hours, 10% Attendance)
export const WEIGHT_COMMITMENT = 0.1; // Work Hours
export const WEIGHT_OVERTIME = 0.8;   // Overtime
export const WEIGHT_ABSENCE = 0.1;    // Presence
export const DEFAULT_PENALTY_VALUE = 5;

// Storage Keys
export const STORAGE_KEYS = {
  EMPLOYEES: 'mowazeb_employees_v1',
  RECORDS: 'mowazeb_records_v1',
  CONFIG: 'mowazeb_config_v1',
  DB_VERSION: 'mowazeb_db_version',
  MIGRATION_LOG: 'mowazeb_migration_logs'
};

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'المدير العام (Abdo)', email: 'Abdo@gmail.com', password: 'Abdozxc123@#', role: 'general_manager', position: 'المدير العام', department: 'الإدارة العليا', joinDate: '2024-01-01', avatar: 'https://ui-avatars.com/api/?name=Abdo&background=0D8ABC&color=fff' },
  { id: '2', name: 'صاحب الشركة', email: 'owner@mowazeb.com', password: '123', role: 'owner', position: 'رئيس مجلس الإدارة', department: 'الإدارة العليا', joinDate: '2021-01-01', avatar: 'https://ui-avatars.com/api/?name=Owner&background=gold&color=fff' },
  { id: '3', name: 'أحمد محمد', email: 'ahmed@mowazeb.com', password: '123', role: 'employee', position: 'مهندس برمجيات', department: 'تطوير', joinDate: '2023-01-15', avatar: 'https://picsum.photos/100/100?random=1' },
  { id: '4', name: 'سارة علي', email: 'sara@mowazeb.com', password: '123', role: 'manager', position: 'مديرة موارد بشرية', department: 'إدارة', joinDate: '2022-05-20', avatar: 'https://picsum.photos/100/100?random=2' },
  { id: '5', name: 'خالد عمر', email: 'khaled@mowazeb.com', password: '123', role: 'accountant', position: 'محاسب', department: 'مالية', joinDate: '2023-08-01', avatar: 'https://picsum.photos/100/100?random=3' },
];

export const generateMockAttendance = (employees: Employee[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  employees.forEach(emp => {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const isFriday = dateObj.getDay() === 5; 
      const dateStr = dateObj.toISOString().split('T')[0];
      const rand = Math.random();
      
      if (isFriday) {
         if (rand > 0.8) {
             records.push({
                 id: `${emp.id}-${dateStr}`,
                 employeeId: emp.id,
                 date: dateStr,
                 checkIn: "10:00",
                 checkOut: "16:00",
                 status: 'weekend',
                 note: 'عمل إضافي في يوم إجازة'
             });
         }
      } else {
          if (rand > 0.15) {
              const isLate = Math.random() > 0.7;
              const checkIn = isLate ? `09:${Math.floor(Math.random() * 59)}` : `08:${Math.floor(Math.random() * 50)}`;
              const isOvertime = Math.random() > 0.6;
              const checkOut = isOvertime ? `18:${Math.floor(Math.random() * 30)}` : `17:00`;

              records.push({
                  id: `${emp.id}-${dateStr}`,
                  employeeId: emp.id,
                  date: dateStr,
                  checkIn,
                  checkOut,
                  status: isLate ? 'late' : 'present'
              });
          } else {
              const isUnexcused = Math.random() > 0.7; 
              records.push({
                  id: `${emp.id}-${dateStr}`,
                  employeeId: emp.id,
                  date: dateStr,
                  status: isUnexcused ? 'absent_penalty' : 'absent'
              });
          }
      }
    }
  });
  return records;
};