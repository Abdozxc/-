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

export const saveSupabaseConfig = (config: SupabaseConfig) => {
    localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(config));
    initSupabase();
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

export const testConnection = async (): Promise<boolean> => {
    if (!supabase) initSupabase();
    if (!supabase) return false;

    try {
        const { error } = await supabase.from('app_config').select('id').limit(1);
        if (error && error.code !== 'PGRST116') { 
            console.error("Connection Test Error:", JSON.stringify(error, null, 2));
            return false; 
        }
        return true;
    } catch (e) {
        console.error('Supabase connection test failed:', e);
        return false;
    }
};

export const subscribeToRealtime = (onUpdate: () => void) => {
    if (!supabase) return;

    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }

    realtimeChannel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => onUpdate())
        .subscribe();
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
        if (confRes.error && confRes.error.code !== 'PGRST116') throw new Error(`Config sync error: ${JSON.stringify(confRes.error)}`);
        
        return {
            success: true,
            employees: empRes.data as Employee[],
            records: recRes.data as AttendanceRecord[],
            config: confRes.data?.config as AppConfig | null
        };
    } catch (err: any) {
        const msg = err.message || JSON.stringify(err);
        console.error('Error downloading data:', msg);
        return { success: false, message: msg };
    }
};

export const uploadAllData = async (employees: Employee[], records: AttendanceRecord[], config: AppConfig) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false, message: 'Not connected' };

    try {
        const timestamp = new Date().toISOString();

        if (employees.length > 0) {
            const empPayload = employees.map(e => ({
                ...e,
                created_at: timestamp
            }));

            const { error } = await supabase.from('employees').upsert(empPayload, { onConflict: 'id' });
            if (error) {
                console.error("Supabase Employees Upload Error:", JSON.stringify(error, null, 2));
                throw new Error(`Employees upload failed: ${error.message}`);
            }
        }
        
        if (records.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize).map(r => ({
                    ...r,
                    created_at: timestamp
                }));
                const { error } = await supabase.from('attendance_records').upsert(chunk, { onConflict: 'id' });
                if (error) {
                    console.error("Supabase Records Upload Error:", JSON.stringify(error, null, 2));
                    throw new Error(`Records upload failed: ${error.message}`);
                }
            }
        }

        const { error } = await supabase.from('app_config').upsert({ 
            id: 1, 
            config: config,
            created_at: timestamp
        }, { onConflict: 'id' });
        
        if (error) {
             console.error("Supabase Config Upload Error:", JSON.stringify(error, null, 2));
             throw new Error(`Config upload failed: ${error.message}`);
        }

        return { success: true, message: 'تم رفع البيانات بنجاح' };
    } catch (err: any) {
        const errorDetails = err.message || JSON.stringify(err);
        console.error('Error uploading data (Catch):', errorDetails);
        return { success: false, message: errorDetails };
    }
};