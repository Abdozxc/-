import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, UserCog, Moon, Sun, Fingerprint } from 'lucide-react';
import { UserRole } from '../types';
import { Permissions } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: UserRole;
  currentUserName: string;
  currentUserRole: string;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, userRole, currentUserName, currentUserRole, onLogout, darkMode, toggleDarkMode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, visible: true },
    { id: 'employees', label: 'الموظفين والحضور', icon: Users, visible: Permissions.canViewAllDashboard(userRole) }, 
    { id: 'biometric', label: 'جهاز البصمة (Live)', icon: Fingerprint, visible: Permissions.canAccessBiometricDevice(userRole) },
    { id: 'reports', label: 'التقارير', icon: FileText, visible: true },
    { id: 'users', label: 'إدارة المستخدمين', icon: UserCog, visible: Permissions.canManageUsers(userRole) },
    { id: 'settings', label: 'الإعدادات', icon: Settings, visible: Permissions.canManageSettings(userRole) },
  ];

  return (
    <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300`}>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <aside className={`
        fixed inset-y-0 right-0 z-30 w-64 bg-white dark:bg-slate-800 shadow-xl dark:shadow-slate-900/50 transform transition-all duration-300 ease-in-out border-l border-slate-100 dark:border-slate-700
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static lg:block
      `}>
        <div className="flex items-center justify-between px-4 h-20 border-b border-slate-100 dark:border-slate-700 relative">
           <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
             مواظب <span className="text-slate-400 font-light text-sm">PRO</span>
           </h1>
           <button 
             onClick={toggleDarkMode}
             className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:scale-110 transition-transform"
             title={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
           >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
           </button>
        </div>
        
        {/* User Info Sidebar */}
        <div className="p-4 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="text-sm font-bold text-slate-800 dark:text-white">{currentUserName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 inline-block px-2 py-1 rounded-full shadow-sm">
               {currentUserRole === 'general_manager' ? 'مدير عام' : 
                currentUserRole === 'owner' ? 'صاحب شركة' :
                currentUserRole === 'manager' ? 'مدير' :
                currentUserRole === 'accountant' ? 'محاسب' : 'موظف'}
            </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.filter(i => i.visible).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl group relative overflow-hidden
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-100 dark:ring-blue-800' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"></div>}
                <Icon size={20} className={`ml-3 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button 
                onClick={onLogout}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95 duration-200"
            >
                <LogOut size={20} className="ml-3" />
                تسجيل خروج
            </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 lg:hidden shadow-sm z-20">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">مواظب</h1>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <Menu size={24} />
          </button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;