
import React, { useState, useEffect } from 'react';
import { Employee, AppConfig } from '../types';
import { Fingerprint, Scan, CheckCircle, AlertTriangle, Radio, Activity, MapPin } from 'lucide-react';
import { calculateDistance } from '../utils';

interface BiometricSimulatorProps {
  employees: Employee[];
  onDevicePunch: (employeeId: string, location?: {lat: number, lng: number, inRange: boolean, distance: number}) => { status: 'in' | 'out' | 'error', time: string, message: string };
  currentUser: Employee; 
  config: AppConfig; // Added config to check location rules
}

const BiometricSimulator: React.FC<BiometricSimulatorProps> = ({ employees, onDevicePunch, currentUser, config }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [logs, setLogs] = useState<{ id: string; msg: string; type: 'success' | 'error' | 'warning'; time: string }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Location State
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isEmployeeRole = currentUser.role === 'employee';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isEmployeeRole) {
        setSelectedId(currentUser.id);
    }
  }, [currentUser, isEmployeeRole]);

  // Request Location on Mount if enabled
  useEffect(() => {
      if (config.locationEnabled) {
          if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                  (pos) => {
                      setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setLocationError(null);
                  },
                  (err) => {
                      setLocationError("تعذر تحديد الموقع. يرجى تفعيل GPS.");
                  }
              );
          } else {
              setLocationError("المتصفح لا يدعم تحديد الموقع.");
          }
      }
  }, [config.locationEnabled]);

  const handleScan = () => {
    if (!selectedId) return;

    // --- Geofencing Check ---
    let locationData = undefined;
    
    if (config.locationEnabled) {
        if (!currentLocation) {
             // Try fetching one last time before failing
             navigator.geolocation.getCurrentPosition(
                 (pos) => {
                     // Got it late, but got it. Proceed recursively or just update state and retry?
                     // Simplest for now: fail this attempt and ask user to retry
                     setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                     alert("تم تحديد الموقع الآن. يرجى المحاولة مرة أخرى.");
                 }, 
                 () => alert("يجب تفعيل الموقع الجغرافي لتسجيل الحضور.")
             );
             return;
        }

        const distance = calculateDistance(
            currentLocation.lat, 
            currentLocation.lng, 
            config.companyLat || 0, 
            config.companyLng || 0
        );

        const inRange = distance <= (config.allowedRadiusMeters || 100);

        locationData = {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            inRange: inRange,
            distance: distance
        };

        if (!inRange) {
             const newLog = {
                id: Date.now().toString(),
                msg: `فشل: الموقع غير مطابق (المسافة: ${distance}م)`,
                type: 'error' as const,
                time: currentTime.toLocaleTimeString('en-GB')
            };
            setLogs(prev => [newLog, ...prev].slice(0, 10));
            // Optional: Block the punch? For "Simulator", we might just log error. 
            // Let's block it for realism.
            return; 
        }
    }
    // ------------------------

    setScanning(true);

    setTimeout(() => {
        const result = onDevicePunch(selectedId, locationData);
        const emp = employees.find(e => e.id === selectedId);
        
        const newLog = {
            id: Date.now().toString(),
            msg: `${emp?.name}: ${result.message}`,
            type: result.status === 'error' ? 'error' as const : 'success' as const,
            time: result.time
        };

        setLogs(prev => [newLog, ...prev].slice(0, 10)); 
        setScanning(false);
        if (!isEmployeeRole) {
             setSelectedId(''); 
        }
    }, 800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full max-h-[80vh]">
        {/* Device Interface */}
        <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-slate-700 relative overflow-hidden flex flex-col items-center justify-between min-h-[500px]">
            {/* Screen Glare Effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <div className="w-full flex justify-between items-center border-b border-slate-700 pb-4">
                <div className="flex items-center gap-2 text-emerald-400">
                    <Radio className="animate-pulse" size={16} />
                    <span className="text-xs font-mono">ONLINE</span>
                </div>
                <div className="flex items-center gap-4">
                     {config.locationEnabled && (
                         <div className={`flex items-center gap-1 text-xs font-mono ${currentLocation ? 'text-blue-400' : 'text-red-400'}`}>
                             <MapPin size={14} />
                             {currentLocation ? 'GPS LOCKED' : 'NO GPS'}
                         </div>
                     )}
                     <div className="text-slate-400 font-mono text-sm">
                        {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                     </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full my-8">
                 {scanning ? (
                     <div className="relative">
                         <Fingerprint size={120} className="text-emerald-500 animate-pulse" />
                         <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-ping"></div>
                         <div className="mt-8 text-emerald-400 font-mono text-lg animate-bounce">جارى المسح...</div>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center gap-6 w-full max-w-xs">
                        <div className="w-full bg-slate-800 p-4 rounded-xl border border-slate-600">
                             <label className="block text-xs text-slate-400 mb-2 font-mono">
                                 {isEmployeeRole ? 'تم التعرف على الموظف' : 'ID / Select Employee'}
                             </label>
                             <select 
                                value={selectedId}
                                onChange={e => setSelectedId(e.target.value)}
                                disabled={isEmployeeRole} // Lock selection for employees
                                className={`
                                    w-full p-3 rounded-lg outline-none border transition-colors font-mono
                                    ${isEmployeeRole 
                                        ? 'bg-slate-800 text-emerald-400 border-emerald-900 cursor-not-allowed opacity-100' 
                                        : 'bg-slate-900 text-white border-slate-700 focus:border-emerald-500'}
                                `}
                             >
                                 {!isEmployeeRole && <option value="">-- اختر الموظف --</option>}
                                 {employees.map(emp => (
                                     <option key={emp.id} value={emp.id}>{emp.name}</option>
                                 ))}
                             </select>
                        </div>
                        
                        <button 
                            onClick={handleScan}
                            disabled={!selectedId}
                            className={`
                                w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300
                                ${selectedId 
                                    ? 'border-emerald-500/50 bg-emerald-900/20 text-emerald-400 hover:scale-110 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] cursor-pointer' 
                                    : 'border-slate-700 bg-slate-800/50 text-slate-600 cursor-not-allowed'}
                            `}
                        >
                            <Fingerprint size={48} />
                        </button>
                        <p className="text-slate-500 text-xs font-mono">اضغط على البصمة للتسجيل</p>
                     </div>
                 )}
            </div>
            
            <div className="mb-4 text-center z-10">
                 <p className="text-emerald-300 font-bold text-xl tracking-widest drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                    اللهم صلى على سيدنا محمد
                 </p>
            </div>

            <div className="w-full border-t border-slate-700 pt-4 flex justify-between items-center text-slate-500 text-xs font-mono">
                <span>DEVICE: ZKTeco-Simulator-V1</span>
                <span>IP: 192.168.1.201</span>
            </div>
        </div>

        {/* Realtime Logs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={20} className="text-blue-500" />
                سجل الحركات الحية (Realtime Logs)
            </h3>
            <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <Scan size={48} className="mb-2 opacity-50" />
                        <p>بانتظار حركة تسجيل...</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className={`
                            flex items-center gap-3 p-3 rounded-lg border-l-4 animate-slide-in-right
                            ${log.type === 'success' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500' 
                                : 'bg-red-50 dark:bg-red-900/10 border-red-500'}
                        `}>
                             <div className={`
                                p-2 rounded-full 
                                ${log.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}
                             `}>
                                 {log.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                             </div>
                             <div className="flex-1">
                                 <p className={`text-sm font-bold ${log.type === 'success' ? 'text-slate-800 dark:text-slate-100' : 'text-red-800 dark:text-red-300'}`}>
                                     {log.msg}
                                 </p>
                                 <p className="text-xs text-slate-400 font-mono mt-1">{log.time}</p>
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default BiometricSimulator;