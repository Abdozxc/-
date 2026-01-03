export type UserRole = 'general_manager' | 'owner' | 'manager' | 'accountant' | 'employee';

export interface Employee {
  id: string;
  name: string;
  email: string; // Made required for login
  password?: string; // Optional for security (in real app, use hash)
  role: UserRole;
  position: string;
  department: string;
  joinDate: string;
  avatar: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'weekend' | 'leave' | 'absent_penalty' | 'under_review';

export type RecordSource = 'manual' | 'device' | 'app';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm format (24h internally)
  checkOut?: string; // HH:mm format (24h internally)
  status: AttendanceStatus;
  note?: string;
  source?: RecordSource; // New field for device integration
  earlyDeparturePermission?: boolean; // New: If true, early departure is not deducted from overtime
}

export interface DailyStats {
  record: AttendanceRecord | null;
  date: string;
  isFriday: boolean;
  isOfficialHoliday: boolean;
  delayMinutes: number;
  overtimeMinutes: number;
  netOvertimeMinutes: number;
  workingHours: number;
  statusLabel: string;
  colorClass: string;
  earlyDepartureMinutes?: number; // Added for UI display
}

export interface EmployeeScore {
  employeeId: string;
  name: string;
  avatar: string;
  position: string;
  score: number;
  commitmentScore: number;
  overtimeScore: number;
  absenceScore: number;
  totalNetOvertime: number;
  totalRawOvertime: number;
  totalDelay: number;
  rank: number;
  unexcusedAbsences: number;
  penaltyPoints: number;
  pointsToNextRank?: number; // Gamification
  pointsToFirst?: number;   // Gamification
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface AppConfig {
  workStartTime: string;
  workEndTime: string;
  gracePeriodMinutes: number; // Added Grace Period
  weightCommitment: number;
  weightOvertime: number;
  weightAbsence: number;
  penaltyValue: number;
  holidays: Holiday[];
}

export interface SupabaseConfig {
    projectUrl: string;
    apiKey: string;
    isConnected: boolean;
}