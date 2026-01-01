
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Scissors, Calendar, Users, Package, LogOut, ChevronLeft, ChevronRight, UserCircle, List, PieChart, Settings, Wifi, WifiOff, Store, ShieldCheck } from 'lucide-react';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
import { useDatabase } from '../contexts/DatabaseContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout, can, businessId } = useAuth();
  const { isConnected, settings } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', permission: PERMISSIONS.VIEW_DASHBOARD },
    { to: '/point-of-sale', icon: Scissors, label: 'Point of Sale', permission: PERMISSIONS.PROCESS_SALE },
    { to: '/appointments', icon: Calendar, label: 'Appointments', permission: PERMISSIONS.VIEW_ALL_APPOINTMENTS, alternatePermission: PERMISSIONS.VIEW_OWN_APPOINTMENTS }, 
    { to: '/customers', icon: UserCircle, label: 'Customers', permission: PERMISSIONS.VIEW_CUSTOMERS },
    { to: '/services', icon: List, label: 'Services Menu', permission: PERMISSIONS.VIEW_SERVICES },
    { to: '/staff', icon: Users, label: 'Staff', permission: PERMISSIONS.VIEW_STAFF },
    { to: '/inventory', icon: Package, label: 'Inventory', permission: PERMISSIONS.VIEW_INVENTORY },
    { to: '/reports', icon: PieChart, label: 'Reports', permission: PERMISSIONS.VIEW_REPORTS },
    { to: '/settings', icon: Settings, label: 'Settings', permission: PERMISSIONS.MANAGE_SETTINGS },
  ];

  // Global Management Item (Only for SuperAdmins)
  const superAdminItem = user?.role === 'SuperAdmin' ? { to: '/super-admin', icon: ShieldCheck, label: 'Super Admin' } : null;

  useEffect(() => {
    if (location.pathname === '/' && !can(PERMISSIONS.VIEW_DASHBOARD) && user?.role !== 'SuperAdmin') {
      const firstRoute = navItems.find(item => can(item.permission) || (item.alternatePermission && can(item.alternatePermission)));
      if (firstRoute) navigate(firstRoute.to, { replace: true });
    }
  }, [location.pathname, can, navigate, user?.role]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out z-20 flex-shrink-0 relative`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-9 z-50 bg-yellow-500 text-slate-900 rounded-full p-1 shadow-lg hover:bg-yellow-400 border-2 border-slate-100 transition-transform active:scale-90">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="h-20 flex items-center px-4 border-b border-slate-800/50 overflow-hidden whitespace-nowrap">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-slate-900 shadow-md">
              <Store size={22} />
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none truncate max-w-[150px]">
                {settings?.business?.name || 'BarberPro'}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1 truncate">ID: {businessId?.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1.5 mt-6 overflow-hidden overflow-y-auto custom-scrollbar">
          {superAdminItem && (
             <NavLink
              to={superAdminItem.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg transition-all overflow-hidden whitespace-nowrap group ${
                  isActive ? 'bg-blue-600 text-white font-medium shadow-lg' : 'text-blue-400 hover:bg-blue-900/30 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
              title={isCollapsed ? superAdminItem.label : undefined}
            >
              <superAdminItem.icon size={20} className="min-w-[20px]" />
              <span className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                {superAdminItem.label}
              </span>
            </NavLink>
          )}

          {superAdminItem && <div className="h-px bg-slate-800/50 my-4 mx-2"></div>}

          {navItems.filter(item => can(item.permission) || (item.alternatePermission && can(item.alternatePermission))).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg transition-all overflow-hidden whitespace-nowrap group ${
                  isActive ? 'bg-yellow-500 text-slate-900 font-bold shadow-lg ring-1 ring-yellow-400/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} className="min-w-[20px]" />
              <span className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 flex justify-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">v2.5 Pro</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <div 
                  className={`w-2.5 h-2.5 rounded-full shadow-sm ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} 
                  title={isConnected ? 'Connected to Cloud' : 'Local Mode Only'}
                ></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{user?.role}</p>
                </div>
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
                  className="w-9 h-9 rounded-xl border border-slate-200 shadow-sm" 
                  alt="" 
                />
             </div>

             <button 
               onClick={logout} 
               className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
               title="Secure Logout"
             >
                <LogOut size={20} />
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 w-full custom-scrollbar">
          <div className="p-4 md:p-8 w-full min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
