import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'employees', label: 'الموظفين والحضور', icon: Users },
    { id: 'reports', label: 'التقارير', icon: FileText },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out border-l border-slate-100
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static lg:block
      `}>
        <div className="flex items-center justify-center h-20 border-b border-slate-100">
           <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
             مواظب <span className="text-slate-400 font-light text-sm">PRO</span>
           </h1>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
              >
                <Icon size={20} className="ml-3" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-100">
            <button className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-500 transition-colors rounded-xl hover:bg-red-50">
                <LogOut size={20} className="ml-3" />
                تسجيل خروج
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header (Mobile) */}
        <header className="flex items-center justify-between p-4 bg-white border-b border-slate-100 lg:hidden">
          <h1 className="text-xl font-bold text-slate-800">مواظب</h1>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 rounded-lg hover:bg-slate-100">
            <Menu size={24} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
