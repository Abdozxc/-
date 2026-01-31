import React, { useState } from 'react';
import { Employee } from '../types';
import { Lock, Mail, AlertCircle, Fingerprint, Database, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
    employees: Employee[];
    onLogin: (employee: Employee) => void;
}

const Login: React.FC<LoginProps> = ({ employees, onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            const user = employees.find(emp => 
                emp.email.toLowerCase() === email.toLowerCase() && 
                (emp.password === password || (!emp.password && password === '123'))
            );

            if (user) {
                onLogin(user);
            } else {
                setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen w-full flex relative bg-[#0B1120] text-white overflow-y-auto font-sans" dir="rtl">
            
            {/* Background Glow Effects */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Right Side: Form Container */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-8 z-20 relative py-12 lg:py-0">
                <div className="w-full max-w-md space-y-8">
                    
                    {/* Mobile Only Logo Header */}
                    <div className="lg:hidden flex flex-col items-center space-y-4 mb-2 animate-fade-in">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-[20px] opacity-20 rounded-full"></div>
                            <div className="w-20 h-20 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-2xl border border-slate-600/50 flex items-center justify-center shadow-xl relative rotate-3">
                                <Fingerprint size={40} className="text-blue-400" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-white">مواظب PRO</h2>
                            <div className="h-0.5 w-12 bg-blue-500/50 mx-auto mt-1 rounded-full"></div>
                        </div>
                    </div>

                    {/* Header Text */}
                    <div className="text-center lg:text-right space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">تسجيل الدخول</h1>
                        <p className="text-slate-400 text-sm">مرحباً بعودتك، يرجى إدخال بياناتك للمتابعة</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3 animate-shake">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div className="space-y-2">
                             <div className="relative group">
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                    <Mail size={20} strokeWidth={1.5} />
                                </div>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pr-12 pl-4 py-4 bg-[#1E293B]/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-slate-200 placeholder-slate-500 hover:bg-[#1E293B]/80"
                                    placeholder="البريد الإلكتروني"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <div className="relative group">
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={20} strokeWidth={1.5} />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pr-12 pl-12 py-4 bg-[#1E293B]/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-slate-200 placeholder-slate-500 hover:bg-[#1E293B]/80"
                                    placeholder="كلمة المرور"
                                    required
                                />
                                {/* Toggle Password Visibility */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                                </button>
                            </div>
                            <div className="flex justify-end">
                                <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                    نسيت كلمة المرور؟
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                'تسجيل الدخول'
                            )}
                        </button>
                    </form>

                    {/* Footer Hint */}
                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 opacity-60 hover:opacity-100 transition-opacity cursor-help" title="Local Storage Active">
                        <Database size={12} />
                        <span>يتم حفظ البيانات محلياً (Local Storage)</span>
                    </div>

                    <div className="pt-8 text-center">
                        <p className="text-[10px] text-slate-600">© {new Date().getFullYear()} نظام إدارة المصروفات والحضور. جميع الحقوق محفوظة.</p>
                    </div>
                </div>
            </div>

            {/* Left Side: Branding / Hero Area - Hidden on Mobile */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center z-10 overflow-hidden">
                {/* Slanted Background Shape */}
                <div className="absolute inset-y-0 left-0 w-[120%] bg-[#111827] transform -skew-x-6 origin-bottom-left translate-x-16 border-l border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-90"></div>
                     {/* Subtle Grid Pattern */}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-8 transform translate-x-8">
                    {/* Logo Container */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-20 rounded-full"></div>
                        <div className="w-40 h-40 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-[2rem] border border-slate-600/50 flex items-center justify-center shadow-2xl relative rotate-3 hover:rotate-0 transition-transform duration-500">
                             <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/5 rounded-[2rem]"></div>
                             <Fingerprint size={80} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                            نظام إدارة
                        </h2>
                        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                           الحضور والانصراف
                        </h2>
                    </div>

                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>

                    <p className="text-slate-400 text-lg font-light tracking-wide">
                        وفقك الله لما يحب ويرضاه
                    </p>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-20 right-20 w-4 h-4 bg-blue-500 rounded-full blur-[2px] animate-pulse"></div>
                <div className="absolute bottom-40 right-10 w-2 h-2 bg-purple-500 rounded-full blur-[1px]"></div>
            </div>

        </div>
    );
};

export default Login;