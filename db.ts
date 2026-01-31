
import { STORAGE_KEYS, DB_VERSION, WORK_START_TIME, WORK_END_TIME, WEIGHT_COMMITMENT, WEIGHT_OVERTIME, WEIGHT_ABSENCE, DEFAULT_PENALTY_VALUE, DEFAULT_GRACE_PERIOD, INITIAL_EMPLOYEES, generateMockAttendance, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_RADIUS } from './constants';
import { AppConfig, Employee, AttendanceRecord, ActivityLog } from './types';
import { v4 as uuidv4 } from 'uuid'; 

// -- Supabase Readiness Layer --
// This structure mimics an async API so replacing LocalStorage with Supabase later is easier.

export const getStoredItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return defaultValue;
  }
};

const createBackup = () => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupData = {
            employees: localStorage.getItem(STORAGE_KEYS.EMPLOYEES),
            records: localStorage.getItem(STORAGE_KEYS.RECORDS),
            config: localStorage.getItem(STORAGE_KEYS.CONFIG),
            logs: localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS),
            version: localStorage.getItem(STORAGE_KEYS.DB_VERSION)
        };
        localStorage.setItem(`mowazeb_backup_${timestamp}`, JSON.stringify(backupData));
        return true;
    } catch (e) {
        console.error('Backup failed:', e);
        return false;
    }
};

// --- Services (Mocking Supabase Tables) ---

export const LogService = {
    getAll: (): ActivityLog[] => {
        return getStoredItem<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS, []);
    },

    add: (log: ActivityLog): void => {
        const logs = LogService.getAll();
        // Keep only last 500 logs to prevent localStorage overflow
        const updated = [log, ...logs].slice(0, 500);
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(updated));
    }
};

export const EmployeeService = {
    getAll: (): Employee[] => {
        return getStoredItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    },
    
    add: (employee: Omit<Employee, 'id'>): Employee => {
        const employees = EmployeeService.getAll();
        const newEmployee: Employee = {
            ...employee,
            id: Date.now().toString(), // Use uuidv4() when package is available
        };
        const updated = [...employees, newEmployee];
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
        return newEmployee;
    },

    delete: (id: string): void => {
        const employees = EmployeeService.getAll();
        const updated = employees.filter(e => e.id !== id);
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
    },

    update: (id: string, updates: Partial<Employee>): void => {
        const employees = EmployeeService.getAll();
        const updated = employees.map(e => e.id === id ? { ...e, ...updates } : e);
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
    }
};

const runMigrations = (currentVersion: number) => {
    let version = currentVersion;

    if (version < 1) {
        // V1 Migration (Holidays)
        const configStr = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (configStr) {
            const oldConfig = JSON.parse(configStr);
            const newConfig: AppConfig = {
                ...oldConfig,
                holidays: oldConfig.holidays || [],
                penaltyValue: oldConfig.penaltyValue !== undefined ? oldConfig.penaltyValue : DEFAULT_PENALTY_VALUE
            };
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
        }
        version = 1;
    }

    if (version < 2) {
        // V2 Migration (Roles)
        console.log('Running Migration V2: Adding Roles...');
        const employees = getStoredItem<any[]>(STORAGE_KEYS.EMPLOYEES, []);
        const updatedEmployees = employees.map(emp => ({
            ...emp,
            role: emp.role || 'employee' // Default to employee if no role
        }));
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updatedEmployees));
        version = 2;
    }
    
    if (version < 3) {
        // V3 Migration (Grace Period)
        console.log('Running Migration V3: Grace Period...');
        const configStr = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (configStr) {
            const oldConfig = JSON.parse(configStr);
            const newConfig: AppConfig = {
                ...oldConfig,
                gracePeriodMinutes: DEFAULT_GRACE_PERIOD
            };
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
        }
        version = 3;
    }

    return version;
};

export const initializeDatabase = () => {
    const currentVersion = getStoredItem(STORAGE_KEYS.DB_VERSION, 0);

    if (currentVersion < DB_VERSION) {
        createBackup();
        const newVersion = runMigrations(currentVersion);
        localStorage.setItem(STORAGE_KEYS.DB_VERSION, JSON.stringify(newVersion));
        
        const logs = getStoredItem(STORAGE_KEYS.MIGRATION_LOG, []);
        logs.push({ date: new Date().toISOString(), from: currentVersion, to: newVersion, status: 'SUCCESS' });
        localStorage.setItem(STORAGE_KEYS.MIGRATION_LOG, JSON.stringify(logs));
    }

    // Init Logic similar to previous code...
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(generateMockAttendance(INITIAL_EMPLOYEES)));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
         const defaultConfig: AppConfig = {
            workStartTime: WORK_START_TIME,
            workEndTime: WORK_END_TIME,
            gracePeriodMinutes: DEFAULT_GRACE_PERIOD,
            weightCommitment: WEIGHT_COMMITMENT,
            weightOvertime: WEIGHT_OVERTIME,
            weightAbsence: WEIGHT_ABSENCE,
            penaltyValue: DEFAULT_PENALTY_VALUE,
            holidays: [],
            locationEnabled: false,
            companyLat: DEFAULT_LAT,
            companyLng: DEFAULT_LNG,
            allowedRadiusMeters: DEFAULT_RADIUS
        };
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
        localStorage.setItem(STORAGE_KEYS.DB_VERSION, JSON.stringify(DB_VERSION));
    }
    // No logs initially

    return {
        employees: EmployeeService.getAll(),
        records: getStoredItem<AttendanceRecord[]>(STORAGE_KEYS.RECORDS, []),
        config: getStoredItem<AppConfig>(STORAGE_KEYS.CONFIG, {
             workStartTime: WORK_START_TIME,
             workEndTime: WORK_END_TIME,
             gracePeriodMinutes: DEFAULT_GRACE_PERIOD,
             weightCommitment: WEIGHT_COMMITMENT,
             weightOvertime: WEIGHT_OVERTIME,
             weightAbsence: WEIGHT_ABSENCE,
             penaltyValue: DEFAULT_PENALTY_VALUE,
             holidays: [],
             locationEnabled: false,
             companyLat: DEFAULT_LAT,
             companyLng: DEFAULT_LNG,
             allowedRadiusMeters: DEFAULT_RADIUS
        }),
        logs: LogService.getAll()
    };
};