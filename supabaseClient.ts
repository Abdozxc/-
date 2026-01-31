
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseConfig, Employee, AttendanceRecord, AppConfig } from './types';

const STORAGE_KEY_SUPABASE = 'mowazeb_supabase_config';

// Provided credentials by user
const DEFAULT_PROJECT_URL = 'https://xsotqedbwmhmdoihyrrr.supabase.co';
const DEFAULT_API_KEY = 'sb_publishable_tqhUw7R3GpXY0rTnczsKEw_otnGUvt9';

let supabase: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

export const getSupabaseConfig = (): SupabaseConfig => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_SUPABASE);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.projectUrl !== DEFAULT_PROJECT_URL) {
                return { ...parsed, projectUrl: DEFAULT_PROJECT_URL, apiKey: DEFAULT_API_KEY };
            }
            return parsed;
        }
    } catch (e) {
        console.error("Error reading supabase config", e);
    }

    const defaultConfig: SupabaseConfig = {
        projectUrl: DEFAULT_PROJECT_URL,
        apiKey: DEFAULT_API_KEY,
        isConnected: true
    };
    
    localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(defaultConfig));
    
    return defaultConfig;
};

export const initSupabase = () => {
    const config = getSupabaseConfig();
    
    if (config.isConnected && config.projectUrl && config.apiKey) {
        try {
            supabase = createClient(config.projectUrl, config.apiKey, {
                auth: { persistSession: false }
            });
            console.log('Supabase client initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            supabase = null;
        }
    } else {
        supabase = null;
    }
};

export const subscribeToRealtime = (onUpdate: () => void) => {
    if (!supabase) return;

    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }

    // Subscribe to all changes in the relevant tables
    realtimeChannel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
            console.log('Realtime change received: employees', payload);
            onUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, (payload) => {
             console.log('Realtime change received: records', payload);
             onUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, (payload) => {
             console.log('Realtime change received: config', payload);
             onUpdate();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to Realtime changes');
            }
        });
};

export const downloadAllData = async () => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false, message: 'Not connected' };

    try {
        const [empRes, recRes, confRes] = await Promise.all([
            supabase.from('employees').select('*'),
            supabase.from('attendance_records').select('*'),
            supabase.from('app_config').select('config').eq('id', 1).maybeSingle()
        ]);

        if (empRes.error) throw new Error(`Employees sync error: ${JSON.stringify(empRes.error)}`);
        if (recRes.error) throw new Error(`Records sync error: ${JSON.stringify(recRes.error)}`);
        
        return {
            success: true,
            employees: empRes.data as Employee[],
            records: recRes.data as AttendanceRecord[],
            config: confRes.data?.config as AppConfig | null
        };
    } catch (err: any) {
        console.error('Error downloading data:', err.message);
        return { success: false, message: err.message };
    }
};

// --- GRANULAR OPERATIONS (HIGH PERFORMANCE) ---

export const upsertSingleEmployee = async (employee: Employee) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').upsert({
        ...employee,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) console.error("Error upserting employee:", error);
};

export const deleteSingleEmployee = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) console.error("Error deleting employee:", error);
};

export const upsertSingleRecord = async (record: AttendanceRecord) => {
    if (!supabase) return;
    const { error } = await supabase.from('attendance_records').upsert({
        ...record,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) console.error("Error upserting record:", error);
};

export const upsertConfig = async (config: AppConfig) => {
    if (!supabase) return;
    const { error } = await supabase.from('app_config').upsert({ 
        id: 1, 
        config: config,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) console.error("Error upserting config:", error);
};

// Kept for initial seed only
export const uploadAllData = async (employees: Employee[], records: AttendanceRecord[], config: AppConfig) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false, message: 'Not connected' };

    try {
        const timestamp = new Date().toISOString();

        if (employees.length > 0) {
             const { error } = await supabase.from('employees').upsert(
                 employees.map(e => ({...e, created_at: timestamp})), 
                 { onConflict: 'id' }
             );
             if (error) throw error;
        }
        
        if (records.length > 0) {
            // Upload in chunks to avoid payload limits
            const chunkSize = 50;
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize).map(r => ({...r, created_at: timestamp}));
                const { error } = await supabase.from('attendance_records').upsert(chunk, { onConflict: 'id' });
                if (error) throw error;
            }
        }

        await supabase.from('app_config').upsert({ 
            id: 1, 
            config: config,
            created_at: timestamp
        });

        return { success: true, message: 'تم رفع البيانات بنجاح' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};
