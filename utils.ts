import { AttendanceRecord, DailyStats, Employee, EmployeeScore, AppConfig } from './types';

// Convert HH:mm to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Format minutes to HH:mm
export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const formatTime12H = (time24?: string): string => {
  if (!time24) return '--:--';
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
};

// Check if a specific date matches any defined holiday
const checkIsHoliday = (dateStr: string, config: AppConfig): boolean => {
    if (!config.holidays || config.holidays.length === 0) return false;
    
    return config.holidays.some(holiday => {
        const d = new Date(dateStr);
        const start = new Date(holiday.startDate);
        const end = new Date(holiday.endDate);
        // Reset times to ensure accurate date comparison
        d.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return d >= start && d <= end;
    });
};

export const calculateDailyStats = (dateStr: string, config: AppConfig, record?: AttendanceRecord): DailyStats => {
  const dateObj = new Date(dateStr);
  const isFriday = dateObj.getDay() === 5;
  const isOfficialHoliday = checkIsHoliday(dateStr, config);
  const isHoliday = isFriday || isOfficialHoliday; // Treat both as holidays
  
  const defaultStats: DailyStats = {
    record: record || null,
    date: dateStr,
    isFriday,
    isOfficialHoliday,
    delayMinutes: 0,
    overtimeMinutes: 0,
    netOvertimeMinutes: 0,
    workingHours: 0,
    statusLabel: isOfficialHoliday ? 'إجازة رسمية' : (isFriday ? 'إجازة جمعة' : (record ? '' : 'غياب')),
    colorClass: isOfficialHoliday ? 'bg-purple-50 border-purple-200 text-purple-700' : (isFriday ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'),
  };

  // Explicit Penalty Handling for Display
  if (record?.status === 'absent_penalty') {
      defaultStats.statusLabel = 'غياب بدون إذن';
      defaultStats.colorClass = 'bg-red-100 border-red-400 text-red-900 font-bold';
      return defaultStats;
  }

  if (!record || !record.checkIn || !record.checkOut) {
    if (record?.status === 'leave') {
        defaultStats.statusLabel = 'إجازة';
        defaultStats.colorClass = 'bg-orange-50 border-orange-200 text-orange-700';
    }
    return defaultStats;
  }

  const checkInMin = timeToMinutes(record.checkIn);
  const checkOutMin = timeToMinutes(record.checkOut);
  const workStartMin = timeToMinutes(config.workStartTime);
  const workEndMin = timeToMinutes(config.workEndTime);

  let delay = 0;
  let rawOvertime = 0;
  let netOvertime = 0;
  const workedMinutes = checkOutMin - checkInMin;

  if (isHoliday) {
    // Holiday Rule: Full day is overtime, no delay calculation
    rawOvertime = workedMinutes;
    netOvertime = workedMinutes;
    defaultStats.statusLabel = isOfficialHoliday ? 'عمل بإجازة رسمية (إضافي)' : 'عمل يوم جمعة (إضافي)';
    defaultStats.colorClass = 'bg-indigo-50 border-indigo-200 text-indigo-700'; // Special color for Holiday work
  } else {
    // Normal Day Rules
    // 1. Calculate Delay
    if (checkInMin > workStartMin) {
      delay = checkInMin - workStartMin;
    }

    // 2. Calculate Raw Overtime (staying after end time)
    if (checkOutMin > workEndMin) {
      rawOvertime = checkOutMin - workEndMin;
    }

    // 3. Net Overtime = Overtime - Delay
    netOvertime = Math.max(0, rawOvertime - delay);

    // Determine status label and color
    if (record.status === 'absent') {
        defaultStats.statusLabel = 'غياب';
        defaultStats.colorClass = 'bg-red-100 border-red-300 text-red-800';
    } else if (delay > 0) {
        defaultStats.statusLabel = 'تأخير';
        defaultStats.colorClass = 'bg-yellow-50 border-yellow-200 text-yellow-700';
    } else {
        defaultStats.statusLabel = 'ملتزم';
        defaultStats.colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
  }

  return {
    ...defaultStats,
    delayMinutes: delay,
    overtimeMinutes: rawOvertime,
    netOvertimeMinutes: netOvertime,
    workingHours: workedMinutes / 60,
  };
};

export const calculateRanking = (employees: Employee[], records: AttendanceRecord[], config: AppConfig): EmployeeScore[] => {
  const scores: EmployeeScore[] = employees.map(emp => {
    const empRecords = records.filter(r => r.employeeId === emp.id);
    
    let totalDelay = 0;
    let totalNetOvertime = 0;
    let totalRawOvertime = 0;
    let daysPresent = 0;
    let daysAbsent = 0;
    let unexcusedAbsences = 0;
    let totalWorkingDays = 0; // Excluding Holidays

    empRecords.forEach(r => {
        const stats = calculateDailyStats(r.date, config, r);
        totalDelay += stats.delayMinutes;
        totalNetOvertime += stats.netOvertimeMinutes;
        totalRawOvertime += stats.overtimeMinutes;
        
        // Check if it's a working day (Not Friday AND Not Official Holiday)
        if (!stats.isFriday && !stats.isOfficialHoliday) {
             totalWorkingDays++;
             if (r.status === 'absent') {
                 daysAbsent++;
             } else if (r.status === 'absent_penalty') {
                 daysAbsent++;
                 unexcusedAbsences++;
             } else if (r.status !== 'weekend' && r.checkIn) {
                 daysPresent++;
             }
        }
    });

    // Avoid division by zero
    totalWorkingDays = totalWorkingDays || 1;

    // 1. Commitment Score (Inverse of delay)
    const commitmentRaw = 100 - (totalDelay * 0.5);
    const commitmentScore = Math.max(0, Math.min(100, commitmentRaw));

    // 2. Overtime Score
    const overtimeRaw = (totalNetOvertime / 60) * 10;
    const overtimeScore = Math.max(0, Math.min(100, overtimeRaw));

    // 3. Absence Score (Normal absences affect percentage)
    const absenceRaw = (daysPresent / totalWorkingDays) * 100;
    const absenceScore = Math.max(0, Math.min(100, absenceRaw));

    // Calculate Penalty Deduction
    const penaltyPoints = unexcusedAbsences * (config.penaltyValue || 0);

    // Weighted Final Score minus Penalties
    let finalScore = (commitmentScore * config.weightCommitment) + 
                       (overtimeScore * config.weightOvertime) + 
                       (absenceScore * config.weightAbsence);
    
    // Apply Deduction
    finalScore = finalScore - penaltyPoints;

    return {
      employeeId: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      position: emp.position,
      score: Math.round(finalScore),
      commitmentScore,
      overtimeScore,
      absenceScore,
      totalNetOvertime,
      totalRawOvertime,
      totalDelay,
      unexcusedAbsences,
      penaltyPoints,
      rank: 0
    };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Assign ranks
  scores.forEach((s, idx) => s.rank = idx + 1);

  return scores;
};

export const getMonthDates = (year: number, month: number): string[] => {
    const date = new Date(year, month, 1);
    const dates = [];
    while (date.getMonth() === month) {
        dates.push(date.toISOString().split('T')[0]);
        date.setDate(date.getDate() + 1);
    }
    return dates;
};