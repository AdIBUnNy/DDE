
import React from 'react';
import { Database, Workflow, LayoutDashboard, Settings, History, GitBranch, CalendarDays } from 'lucide-react';

export type ViewType = 'dashboard' | 'datasources' | 'pipelines' | 'history' | 'versionControl' | 'schedule' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  theme: 'dark' | 'light';
}

const NavItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  theme: 'dark' | 'light';
  onClick: () => void 
}> = ({ icon, label, active, theme, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-200 rounded-lg group ${
      active 
        ? 'bg-blue-600/10 text-blue-500' 
        : theme === 'dark' 
          ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <span className={`${active ? 'text-blue-500' : ''}`}>{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, theme }) => {
  return (
    <aside className={`w-64 border-r flex flex-col h-screen sticky top-0 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Workflow className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>DDE AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Architect</p>
          </div>
        </div>

        <nav className="space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            theme={theme}
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')} 
          />
          <NavItem 
            icon={<Database size={18} />} 
            label="Data Sources" 
            theme={theme}
            active={currentView === 'datasources'} 
            onClick={() => onNavigate('datasources')} 
          />
          <NavItem 
            icon={<Workflow size={18} />} 
            label="Pipelines" 
            theme={theme}
            active={currentView === 'pipelines'} 
            onClick={() => onNavigate('pipelines')} 
          />
          <NavItem 
            icon={<CalendarDays size={18} />} 
            label="Schedule" 
            theme={theme}
            active={currentView === 'schedule'} 
            onClick={() => onNavigate('schedule')} 
          />
          <NavItem 
            icon={<History size={18} />} 
            label="History" 
            theme={theme}
            active={currentView === 'history'} 
            onClick={() => onNavigate('history')} 
          />
          <NavItem 
            icon={<GitBranch size={18} />} 
            label="Version Control" 
            theme={theme}
            active={currentView === 'versionControl'} 
            onClick={() => onNavigate('versionControl')} 
          />
        </nav>
      </div>

      <div className={`p-6 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <NavItem 
          icon={<Settings size={18} />} 
          label="Settings" 
          theme={theme}
          active={currentView === 'settings'} 
          onClick={() => onNavigate('settings')} 
        />
      </div>
    </aside>
  );
};

export default Sidebar;
