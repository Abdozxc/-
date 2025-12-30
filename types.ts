export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  joinDate: string;
  avatar: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'weekend' | 'leave' | 'absent_penalty';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm format (24h internally)
  checkOut?: string; // HH:mm format (24h internally)
  status: AttendanceStatus;
  note?: string;
}

export interface DailyStats {
  record: AttendanceRecord | null;
  date: string;
  isFriday: boolean;
  isOfficialHoliday: boolean; // New field
  delayMinutes: number;
  overtimeMinutes: number;
  netOvertimeMinutes: number; // The calculated final overtime
  workingHours: number;
  statusLabel: string;
  colorClass: string;
}

export interface EmployeeScore {
  employeeId: string;
  name: string;
  avatar: string;
  position: string;
  score: number;
  commitmentScore: number; // 50%
  overtimeScore: number; // 30%
  absenceScore: number; // 20%
  totalNetOvertime: number;
  totalRawOvertime: number; // Total overtime before deduction
  totalDelay: number;
  rank: number;
  unexcusedAbsences: number; // Count of penalty absences
  penaltyPoints: number; // Total points deducted
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface AppConfig {
  workStartTime: string;
  workEndTime: string;
  weightCommitment: number;
  weightOvertime: number;
  weightAbsence: number;
  penaltyValue: number; // Points to deduct per unexcused absence
  holidays: Holiday[];
}

export type UserRole = 'manager' | 'accountant' | 'employee';