
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  DollarSign, ShoppingBag, Users, Sparkles, Bell, Clock, 
  Calendar, Activity, TrendingUp, TrendingDown, Scissors, 
  AlertCircle, ChevronRight, Zap, Coffee, Timer, CheckCircle2, RefreshCw
} from 'lucide-react';
import { generateBusinessInsights } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const Dashboard: React.FC = () => {
  const { transactions, appointments, staff, services, settings } = useDatabase();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Time-based updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Constants for calculations
  const todayStr = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  // Permissions & Role Flags
  const isOwner = user?.role === 'Owner';
  const showRevenue = isOwner; 

  // --- KPI CALCULATIONS ---

  const stats = useMemo(() => {
    const todayTxs = transactions.filter(t => t.timestamp.startsWith(todayStr));
    const yesterdayTxs = transactions.filter(t => t.timestamp.startsWith(yesterdayStr));

    const todayRev = todayTxs.reduce((acc, t) => acc + t.total, 0);
    const yesterdayRev = yesterdayTxs.reduce((acc, t) => acc + t.total, 0);

    const revDelta = yesterdayRev === 0 ? 100 : ((todayRev - yesterdayRev) / yesterdayRev) * 100;
    
    // Staff Utilization
    const todayAppts = appointments.filter(a => a.date.startsWith(todayStr) && a.status !== 'Cancelled');
    const totalBookedMinutes = todayAppts.reduce((acc, a) => {
      const srv = services.find(s => s.id === a.serviceId);
      return acc + (srv?.duration || 30);
    }, 0);
    const activeBarbersCount = staff.filter(s => s.role === 'Barber').length || 1;
    const totalPotentialMinutes = activeBarbersCount * 480; // 8 hours shift
    const utilization = Math.min(100, Math.round((totalBookedMinutes / totalPotentialMinutes) * 100));

    // Queue Length
    const twoHoursLater = new Date(currentTime.getTime() + 120 * 60000);
    const queueLength = appointments.filter(a => {
      const apptTime = new Date(a.date);
      return a.status === 'Scheduled' && apptTime >= currentTime && apptTime <= twoHoursLater;
    }).length;

    return {
      todayRev,
      yesterdayRev,
      revDelta,
      salesCount: todayTxs.length,
      avgTicket: todayTxs.length > 0 ? todayRev / todayTxs.length : 0,
      utilization,
      queueLength,
      bookingsCount: todayAppts.length
    };
  }, [transactions, appointments, services, staff, todayStr, yesterdayStr, currentTime]);

  const revenueTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('en-CA');
    }).reverse();

    return days.map(day => ({
      name: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
      amount: transactions
        .filter(t => t.timestamp.startsWith(day))
        .reduce((acc, t) => acc + t.total, 0)
    }));
  }, [transactions]);

  const servicePopularity = useMemo(() => {
    const todayTxs = transactions.filter(t => t.timestamp.startsWith(todayStr));
    const counts: Record<string, number> = {};
    todayTxs.forEach(t => {
      t.items.forEach(item => {
        if (item.type === 'service') counts[item.name] = (counts[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions, todayStr]);

  const revPerStaff = useMemo(() => {
    const todayTxs = transactions.filter(t => t.timestamp.startsWith(todayStr));
    return staff.filter(s => s.role === 'Barber').map(s => {
      const rev = todayTxs.reduce((acc, t) => {
        const itemRev = t.items
          .filter(i => (i.staffIds && i.staffIds.includes(s.id)) || (i.barberId === s.id))
          .reduce((sum, i) => sum + (i.price * i.quantity), 0);
        return acc + itemRev;
      }, 0);
      return { name: s.name.split(' ')[0], revenue: rev };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [transactions, staff, todayStr]);

  const isStaffEngaged = (staffId: string) => {
    return appointments.some(appt => {
      if (appt.staffId !== staffId || appt.status !== 'Scheduled') return false;
      const apptStartTime = new Date(appt.date);
      const service = services.find(s => s.id === appt.serviceId);
      const duration = service?.duration || 30;
      const apptEndTime = new Date(apptStartTime.getTime() + duration * 60000);
      return currentTime >= apptStartTime && currentTime <= apptEndTime;
    });
  };

  const currentServiceForStaff = (staffId: string) => {
    const appt = appointments.find(a => {
      if (a.staffId !== staffId || a.status !== 'Scheduled') return false;
      const apptStartTime = new Date(a.date);
      const service = services.find(s => s.id === a.serviceId);
      const duration = service?.duration || 30;
      const apptEndTime = new Date(apptStartTime.getTime() + duration * 60000);
      return currentTime >= apptStartTime && currentTime <= apptEndTime;
    });
    return services.find(s => s.id === appt?.serviceId)?.name || 'Busy';
  };

  const floorStatus = staff.filter(s => s.role === 'Barber').map(s => ({
    ...s,
    engaged: isStaffEngaged(s.id),
    currentService: isStaffEngaged(s.id) ? currentServiceForStaff(s.id) : null
  }));

  const alerts = useMemo(() => {
    const list = [];
    if (stats.utilization > 85) list.push({ type: 'warning', text: 'High floor pressure. Consider opening another station.', icon: Zap });
    if (stats.queueLength > 3) list.push({ type: 'info', text: 'Upcoming rush detected. 3+ appointments in next 2 hours.', icon: Timer });
    if (stats.revDelta < -20 && stats.todayRev > 0) list.push({ type: 'critical', text: 'Revenue is 20% lower than yesterday.', icon: TrendingDown });
    const idleCount = floorStatus.filter(s => !s.engaged).length;
    if (idleCount > 2 && stats.queueLength === 0) list.push({ type: 'info', text: `${idleCount} staff currently idle. Opportunity for promo?`, icon: Coffee });
    return list;
  }, [stats, floorStatus]);

  const handleGetInsights = async () => {
    setLoadingInsight(true);
    const result = await generateBusinessInsights(transactions, staff);
    setInsight(result);
    setLoadingInsight(false);
  };

  // --- KPI THEMES ---
  const THEMES = {
    revenue: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-500', shadow: 'shadow-emerald-200/50', iconColor: 'text-white' },
    sales: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', shadow: 'shadow-blue-200/50', iconColor: 'text-white' },
    bookings: { bg: 'bg-indigo-50', iconBg: 'bg-indigo-500', shadow: 'shadow-indigo-200/50', iconColor: 'text-white' },
    utilization: { bg: 'bg-amber-50', iconBg: 'bg-amber-500', shadow: 'shadow-amber-200/50', iconColor: 'text-white' },
    pressure: { bg: 'bg-rose-50', iconBg: 'bg-rose-500', shadow: 'shadow-rose-200/50', iconColor: 'text-white' }
  };

  const KPICard = ({ title, value, delta, icon: Icon, themeKey, suffix = "", isRev = false }: any) => {
    if (isRev && !showRevenue) return null;
    const theme = THEMES[themeKey as keyof typeof THEMES];
    
    return (
      <div className={`p-5 rounded-3xl border border-white flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-xl ${theme.bg} ${theme.shadow}`}>
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-2xl shadow-sm ${theme.iconBg} ${theme.iconColor}`}>
            <Icon size={20} />
          </div>
          {delta !== undefined && (
            <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${delta >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(Math.round(delta))}%
            </div>
          )}
        </div>
        <div className="mt-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">
            {suffix}{value.toLocaleString()}
          </h3>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Top Overview Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            {settings?.business?.name || 'BarberPro'}
          </h2>
          <div className="flex items-center gap-3 mt-1.5">
            <p className="text-slate-500 font-medium">{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <p className="text-indigo-600 font-mono font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-black uppercase text-slate-600 tracking-widest">Live Operations</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard title="Revenue" value={stats.todayRev} delta={stats.revDelta} icon={DollarSign} themeKey="revenue" suffix="KES " isRev={true} />
        <KPICard title="Total Sales" value={stats.salesCount} icon={ShoppingBag} themeKey="sales" />
        <KPICard title="Bookings" value={stats.bookingsCount} icon={Calendar} themeKey="bookings" />
        <KPICard title="Utilization" value={stats.utilization} icon={Activity} themeKey="utilization" suffix="%" />
        <KPICard title="Wait Pressure" value={stats.queueLength} icon={Users} themeKey="pressure" suffix=" Clients" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Floor Status */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-2">
              <Activity className="text-indigo-500" size={20} />
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Live Floor Status</h3>
            </div>
            <div className="text-[10px] font-black uppercase text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
              {floorStatus.filter(s => !s.engaged).length} Available
            </div>
          </div>
          <div className="p-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 flex-1">
            {floorStatus.map(s => (
              <div key={s.id} className="group relative flex flex-col items-center p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-300">
                <div className="relative mb-3">
                  <img src={s.avatar} alt={s.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md transition-transform group-hover:scale-110" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${s.engaged ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                </div>
                <p className="font-bold text-slate-900 text-sm truncate w-full text-center">{s.name}</p>
                <div className={`mt-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${s.engaged ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {s.engaged ? 'Engaged' : 'Available'}
                </div>
                {s.engaged && (
                  <p className="text-[10px] text-slate-400 mt-2 italic truncate w-full text-center">{s.currentService}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Smart Alerts & AI Insights */}
        <div className="flex flex-col gap-8">
          {/* Alerts */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
              <Bell className="text-rose-500" size={18} />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Operational Alerts</h3>
            </div>
            <div className="p-3 space-y-2">
              {alerts.length > 0 ? alerts.map((alert, i) => (
                <div key={i} className={`p-4 rounded-2xl flex items-start gap-4 transition-all hover:translate-x-1 border ${
                  alert.type === 'critical' ? 'bg-rose-50 border-rose-100 text-rose-700' : 
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                  'bg-blue-50 border-blue-100 text-blue-700'
                }`}>
                  <alert.icon size={18} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{alert.text}</p>
                </div>
              )) : (
                <div className="p-10 text-center text-slate-300">
                  <CheckCircle2 size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest">All Clear</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="text-yellow-400" size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">AI Advisor</h3>
              </div>
              <button 
                onClick={handleGetInsights} 
                disabled={loadingInsight}
                className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={loadingInsight ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="min-h-[120px] flex flex-col justify-center relative z-10">
              {loadingInsight ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-white/10 rounded w-full"></div>
                  <div className="h-3 bg-white/10 rounded w-5/6"></div>
                  <div className="h-3 bg-white/10 rounded w-4/6"></div>
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-slate-300 italic">
                  {insight || "Connect with your business performance. Press refresh to generate real-time AI recommendations."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend */}
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Revenue Trend</h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Performance over the last 7 days</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl">
               <TrendingUp size={24} className="text-indigo-500" />
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis hide={!showRevenue} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dx={-10} />
                <Tooltip 
                  cursor={{stroke: '#6366f1', strokeWidth: 2}}
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Service Popularity */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Service Popularity</h3>
            <div className="flex-1 space-y-6">
              {servicePopularity.length > 0 ? servicePopularity.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase text-slate-500 tracking-tight">
                    <span>{item.name}</span>
                    <span className="text-indigo-600">{item.value} sold</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full shadow-sm shadow-indigo-200 transition-all duration-1000" 
                      style={{ width: `${(item.value / servicePopularity[0].value) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 italic text-xs">
                  No services recorded today
                </div>
              )}
            </div>
          </div>

          {/* Revenue per Staff */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Barber Efficiency</h3>
            <div className="flex-1 space-y-3">
              {showRevenue ? (revPerStaff.length > 0 ? revPerStaff.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-lg hover:shadow-indigo-50/50">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-[11px] font-black uppercase shadow-lg shadow-indigo-100">
                        {item.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{item.name}</span>
                   </div>
                   <span className="text-xs font-black text-indigo-600">KES {item.revenue.toLocaleString()}</span>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 italic text-xs">
                  Awaiting first sales...
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 italic text-xs">
                  Revenue visibility restricted
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
