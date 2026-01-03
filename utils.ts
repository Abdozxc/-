import { AttendanceRecord, DailyStats, Employee, EmployeeScore, AppConfig, UserRole } from './types';

// Permissions Logic
export const Permissions = {
    // Only General Manager and Owner can manage users (add/delete)
    canManageUsers: (role: UserRole) => role === 'general_manager' || role === 'owner',
    
    // Only General Manager and Owner can access settings
    canManageSettings: (role: UserRole) => role === 'general_manager' || role === 'owner',
    
    // Managers and Accountants can view reports, Employees can't
    canViewAllReports: (role: UserRole) => role !== 'employee',
    
    // Managers and Accountants can view dashboard stats, Employees see only their own
    canViewAllDashboard: (role: UserRole) => role !== 'employee',
    
    // CRITICAL UPDATE: Only General Manager can edit/add attendance manually
    // Accountant and Owner are REMOVED from here
    canEditAttendance: (role: UserRole) => role === 'general_manager',
    
    isOwner: (role: UserRole) => role === 'owner',

    // New Permission: Biometric Device is visible to everyone EXCEPT the Owner
    // Employees need it to punch in/out (simulator), Managers need it to monitor.
    canAccessBiometricDevice: (role: UserRole) => role !== 'owner',
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

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

const checkIsHoliday = (dateStr: string, config: AppConfig): boolean => {
    if (!config.holidays || config.holidays.length === 0) return false;
    return config.holidays.some(holiday => {
        const d = new Date(dateStr);
        const start = new Date(holiday.startDate);
        const end = new Date(holiday.endDate);
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
  const isHoliday = isFriday || isOfficialHoliday;
  
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
    earlyDepartureMinutes: 0
  };

  // Handle 'Under Review' Status
  if (record?.status === 'under_review') {
      defaultStats.statusLabel = 'تحت المراجعة';
      defaultStats.colorClass = 'bg-gray-100 border-gray-300 text-gray-500 border-dashed';
      // Return neutral stats for "Under Review"
      return defaultStats;
  }

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
  let checkOutMin = timeToMinutes(record.checkOut); // Using let to allow modification for next-day logic
  const workStartMin = timeToMinutes(config.workStartTime);
  const workEndMin = timeToMinutes(config.workEndTime);

  // --- Logic Update: Handle Shifts Crossing Midnight ---
  // If check-out time is smaller than check-in time (e.g. In 09:30, Out 00:07),
  // assume it belongs to the next day.
  if (checkOutMin < checkInMin) {
      checkOutMin += 1440; // Add 24 hours (24 * 60 minutes)
  }

  let delay = 0;
  let rawOvertime = 0;
  let netOvertime = 0;
  let earlyDepartureDeduction = 0;
  let earlyDeparture = 0;

  const workedMinutes = checkOutMin - checkInMin;

  if (isHoliday) {
    rawOvertime = workedMinutes;
    netOvertime = workedMinutes;
    defaultStats.statusLabel = isOfficialHoliday ? 'عمل بإجازة رسمية (إضافي)' : 'عمل يوم جمعة (إضافي)';
    defaultStats.colorClass = 'bg-indigo-50 border-indigo-200 text-indigo-700';
  } else {
    // Logic with Grace Period
    const gracePeriod = config.gracePeriodMinutes || 0;
    let actualDelay = 0;
    
    // 1. Check Entry Time (Delay OR Early Overtime)
    if (checkInMin > workStartMin) {
        // Late Arrival Logic
        actualDelay = checkInMin - workStartMin;
        if (actualDelay > gracePeriod) {
            delay = actualDelay; // Total Delay minutes
        }
    } else {
        // Early Arrival Logic (Early Overtime)
        // Add difference to rawOvertime
        rawOvertime += (workStartMin - checkInMin);
    }

    // 2. Check Exit Time (Late Overtime OR Early Departure)
    // Note: checkOutMin might be > 1440 if next day, which correctly handles overtime
    if (checkOutMin > workEndMin) {
        // Late Departure (Extra Overtime)
        rawOvertime += (checkOutMin - workEndMin);
    } else if (checkOutMin < workEndMin) {
        // Early Departure
        earlyDeparture = workEndMin - checkOutMin;
        
        // Check permission flag
        if (!record.earlyDeparturePermission) {
            // No Permission -> Deduct from potential overtime
            earlyDepartureDeduction = earlyDeparture;
        }
    }
    
    // 3. Net Calculation
    // Update: Deduct delay from overtime, but EXCLUDE the grace period from the deduction.
    // If delay > 0, it means actualDelay > gracePeriod.
    // We deduct (actualDelay - gracePeriod).
    
    let delayPenalty = 0;
    if (delay > 0) {
        delayPenalty = Math.max(0, delay - gracePeriod);
    }

    netOvertime = Math.max(0, rawOvertime - delayPenalty - earlyDepartureDeduction);

    if (record.status === 'absent') {
        defaultStats.statusLabel = 'غياب';
        defaultStats.colorClass = 'bg-red-100 border-red-300 text-red-800';
    } else if (delay > 0) {
        defaultStats.statusLabel = 'تأخير';
        defaultStats.colorClass = 'bg-yellow-50 border-yellow-200 text-yellow-700';
    } else if (earlyDeparture > 0 && !record.earlyDeparturePermission) {
         defaultStats.statusLabel = 'انصراف مبكر';
         defaultStats.colorClass = 'bg-orange-50 border-orange-200 text-orange-700';
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
    workingHours: workedMinutes, // Return in Minutes for precision
    earlyDepartureMinutes: earlyDepartureDeduction
  };
};

export const calculateRanking = (employees: Employee[], records: AttendanceRecord[], config: AppConfig): EmployeeScore[] => {
  // Filter: Only include regular employees and accountants in the leaderboard.
  // Exclude 'owner', 'general_manager', and 'manager'.
  const rankableEmployees = employees.filter(e => 
    e.role !== 'owner' && 
    e.role !== 'general_manager' && 
    e.role !== 'manager'
  );

  // --- PASS 1: Calculate Raw Stats for ALL Employees (Aggregation) ---
  const processedStats = rankableEmployees.map(emp => {
      const empRecords = records.filter(r => r.employeeId === emp.id);
      let totalDelay = 0;
      let totalNetOvertime = 0;
      let totalRawOvertime = 0;
      let daysPresent = 0;
      let unexcusedAbsences = 0;
      let authorizedLeaves = 0;
      let totalActualWorkMinutes = 0; 
      let totalWorkingDays = 0;

      empRecords.forEach(r => {
          const stats = calculateDailyStats(r.date, config, r);
          
          // Skip 'under_review' records from stats aggregation to prevent skewing data until resolved
          if (stats.record?.status === 'under_review') return;

          totalDelay += stats.delayMinutes;
          totalNetOvertime += stats.netOvertimeMinutes;
          totalRawOvertime += stats.overtimeMinutes;
          totalActualWorkMinutes += stats.workingHours; // Aggregating actual work minutes
          
          if (!stats.isFriday && !stats.isOfficialHoliday) {
               totalWorkingDays++;
               if (r.status === 'absent_penalty') unexcusedAbsences++;
               else if (r.status === 'leave') authorizedLeaves++;
               else if (r.checkIn || r.status === 'present' || r.status === 'late') daysPresent++;
          }
      });
      totalWorkingDays = totalWorkingDays || 1;

      return {
          emp,
          totalDelay,
          totalNetOvertime,
          totalRawOvertime,
          totalActualWorkMinutes,
          daysPresent,
          unexcusedAbsences,
          authorizedLeaves,
          totalWorkingDays
      };
  });

  // --- DETERMINE MAX VALUES (The "Curve" / Normalization Factor) ---
  // We compare everyone to the best performer in the company.
  // Using Math.max(..., 1) to avoid division by zero.
  const maxNetOvertime = Math.max(...processedStats.map(s => s.totalNetOvertime), 1);
  const maxWorkMinutes = Math.max(...processedStats.map(s => s.totalActualWorkMinutes), 1);
  const maxDaysPresent = Math.max(...processedStats.map(s => s.daysPresent), 1);

  // --- PASS 2: Calculate Relative Scores ---
  const scores: EmployeeScore[] = processedStats.map(stats => {
      
      // 1. Overtime Score (Max 80 Points) - Relative to Top Performer
      // Formula: (Employee Overtime / Best Employee Overtime) * 80
      const overtimeScore = (stats.totalNetOvertime / maxNetOvertime) * 80;

      // 2. Work Hours / Commitment Score (Max 10 Points) - Relative to Top Performer
      // Formula: (Employee Work Minutes / Best Employee Work Minutes) * 10
      const commitmentScore = (stats.totalActualWorkMinutes / maxWorkMinutes) * 10;

      // 3. Absence Score (Max 10 Points) - Relative to Top Performer
      // Formula: (Employee Present Days / Best Employee Present Days) * 10
      // Note: This rewards showing up. If you showed up as much as the best person, you get 10.
      const absenceScore = (stats.daysPresent / maxDaysPresent) * 10;

      // 4. Penalties (Direct Deduction)
      // These are deducted from the final score
      const manualPenalty = stats.unexcusedAbsences * (config.penaltyValue || 0);

      // Summation
      let rawScore = (overtimeScore + commitmentScore + absenceScore) - manualPenalty;
      
      // Cap at 100, Floor at 0
      let finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      // UI Metrics (Percentages for progress bars - for display purposes only)
      // We map the internal 0-10, 0-80 scales to 0-100% for the UI bars
      // NOTE: We pass the RAW (0-80, 0-10) values to the UI, so we need to store them.
      // But the interface expects 'commitmentScore' to be 0-100 for the progress bar.
      // So we convert specifically for the UI property, but keep raw logic in mind for text generation if needed.
      
      const uiCommitmentPercent = (commitmentScore / 10) * 100;
      // overtimeScore is out of 80. To show as %, we divide by 80 * 100
      const uiOvertimePercent = (overtimeScore / 80) * 100;
      const uiAbsencePercent = (absenceScore / 10) * 100;

      return {
        employeeId: stats.emp.id,
        name: stats.emp.name,
        avatar: stats.emp.avatar,
        position: stats.emp.position,
        score: finalScore,
        commitmentScore: Math.round(uiCommitmentPercent), // For UI Bar (0-100)
        overtimeScore: Math.round(uiOvertimePercent),     // For UI Bar (0-100)
        absenceScore: Math.round(uiAbsencePercent),       // For UI Bar (0-100)
        
        // Pass Raw Normalized Scores (scaled to their weights) to helper if needed, 
        // but currently we can just use the final percentages or calculate inside the helper.
        
        totalNetOvertime: stats.totalNetOvertime,
        totalRawOvertime: stats.totalRawOvertime,
        totalDelay: stats.totalDelay,
        unexcusedAbsences: stats.unexcusedAbsences,
        penaltyPoints: manualPenalty,
        rank: 0,
        pointsToNextRank: 0,
        pointsToFirst: 0
      };
  });

  // Sort by Score (High to Low)
  // CRITICAL TIE-BREAKER: If scores are equal, sort by actual Net Overtime minutes.
  scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.totalNetOvertime - a.totalNetOvertime;
  });
  
  // Calculate Gamification Points
  const firstPlaceScore = scores.length > 0 ? scores[0].score : 0;
  
  scores.forEach((s, idx) => {
      s.rank = idx + 1;
      // Points needed to catch up to the person above you
      if (idx > 0) {
          s.pointsToNextRank = scores[idx - 1].score - s.score + 1;
      }
      // Points needed to be #1
      if (idx > 0) {
          s.pointsToFirst = firstPlaceScore - s.score + 1;
      }
  });
  
  return scores;
};

// --- NEW FUNCTION: Generate Human-Readable Performance Narrative ---
export const generatePerformanceReview = (scoreData: EmployeeScore): string => {
    const parts = [];

    // 1. Rank Context
    if (scoreData.rank === 1) {
        parts.push("حقق الموظف أداءً استثنائيًا وتصدر قائمة الترتيب العام،");
    } else if (scoreData.score >= 90) {
        parts.push(`حصل الموظف على ${scoreData.score} نقطة وهو معدل ممتاز،`);
    } else {
        parts.push(`حصل الموظف على ${scoreData.score} نقطة،`);
    }

    // 2. Overtime Context (Weight 80%)
    // scoreData.overtimeScore is 0-100% representation. 
    // High > 90% means they are close to the Top Performer.
    if (scoreData.overtimeScore >= 95) {
        parts.push("وذلك بفضل تحقيقه أعلى معدلات ساعات العمل الإضافي في الشركة،");
    } else if (scoreData.overtimeScore >= 70) {
        parts.push("مع تحقيقه معدل ساعات إضافية جيد مقارنة بالأعلى أداءً،");
    } else if (scoreData.overtimeScore >= 40) {
        parts.push("حيث كان معدل الساعات الإضافية متوسطاً مقارنةً بأعلى موظف في الشركة،");
    } else {
        parts.push("حيث تأثر التقييم بشكل رئيسي بانخفاض عدد ساعات العمل الإضافي مقارنةً بالموظف الأعلى إنتاجية،");
    }

    // 3. Attendance Context (Weight 10%)
    if (scoreData.unexcusedAbsences > 0) {
        parts.push(`كما أثر وجود ${scoreData.unexcusedAbsences} يوم غياب بدون إذن سلبًا على النتيجة النهائية`);
        if (scoreData.penaltyPoints > 0) parts.push(`(وتم تطبيق خصم ${scoreData.penaltyPoints} نقطة كجزاء)`);
        parts.push("،");
    } else if (scoreData.absenceScore >= 98) {
        parts.push("مع التزام تام بالحضور وعدم تسجيل أي حالات غياب،");
    }

    // 4. Commitment/Delays (Weight 10%)
    if (scoreData.totalDelay > 60) {
        parts.push("إلا أنه لوحظ وجود تأخيرات متكررة أثرت جزئياً على درجة الالتزام.");
    } else if (scoreData.totalDelay > 0) {
        parts.push("مع وجود بعض دقائق التأخير البسيطة.");
    } else {
        parts.push("وبالتزام ممتاز بالمواعيد.");
    }

    // Clean up punctuation
    let result = parts.join(" ");
    
    // Fix endings
    if (result.endsWith("،")) result = result.slice(0, -1) + ".";
    
    return result;
};

export const getMonthDates = (year: number, month: number): string[] => {
    const date = new Date(year, month, 1);
    const dates = [];
    while (date.getMonth() === month) {
        // Use local time to construct the string to avoid UTC shifting issues (ISOString converts to UTC, shifting date back)
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        
        date.setDate(date.getDate() + 1);
    }
    return dates;
};