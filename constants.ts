import { Employee, AttendanceRecord } from './types';

export const WORK_START_TIME = "09:00";
export const WORK_END_TIME = "17:00";

// Weights for ranking
export const WEIGHT_COMMITMENT = 0.5;
export const WEIGHT_OVERTIME = 0.3;
export const WEIGHT_ABSENCE = 0.2;
export const DEFAULT_PENALTY_VALUE = 5; // Points deducted per unexcused absence

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'أحمد محمد', position: 'مهندس برمجيات', department: 'تطوير', joinDate: '2023-01-15', avatar: 'https://picsum.photos/100/100?random=1' },
  { id: '2', name: 'سارة علي', position: 'مديرة موارد بشرية', department: 'إدارة', joinDate: '2022-05-20', avatar: 'https://picsum.photos/100/100?random=2' },
  { id: '3', name: 'خالد عمر', position: 'محاسب', department: 'مالية', joinDate: '2023-08-01', avatar: 'https://picsum.photos/100/100?random=3' },
  { id: '4', name: 'منى يوسف', position: 'مسؤولة تسويق', department: 'تسويق', joinDate: '2023-02-10', avatar: 'https://picsum.photos/100/100?random=4' },
  { id: '5', name: 'ياسر كمال', position: 'دعم فني', department: 'IT', joinDate: '2023-11-05', avatar: 'https://picsum.photos/100/100?random=5' },
];

// Helper to generate some dummy attendance data for the current month
export const generateMockAttendance = (employees: Employee[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  employees.forEach(emp => {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const isFriday = dateObj.getDay() === 5; // 5 is Friday
      const dateStr = dateObj.toISOString().split('T')[0];
      
      // Randomize attendance
      const rand = Math.random();
      
      if (isFriday) {
         // Some work on Fridays
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
              // Present
              // Simulate late arrival for some
              const isLate = Math.random() > 0.7;
              const checkIn = isLate ? `09:${Math.floor(Math.random() * 59)}` : `08:${Math.floor(Math.random() * 50)}`;
              
              // Simulate overtime for some
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
              // Absent types
              const isUnexcused = Math.random() > 0.7; // 30% chance of unexcused absent if absent
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