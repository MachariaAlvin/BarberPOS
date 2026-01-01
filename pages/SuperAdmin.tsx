
import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { 
  ShieldCheck, Store, Users, DollarSign, Activity, 
  Search, ExternalLink, AlertCircle, CheckCircle, 
  PauseCircle, PlayCircle, Filter, MoreVertical, 
  BarChart2, CreditCard, ListChecks, Smartphone, 
  TrendingUp, Globe, Calendar, RefreshCw
} from 'lucide-react';
import { Business, Transaction, AuditLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from 'recharts';

type SuperTab = 'OVERVIEW' | 'SHOPS' | 'PAYMENTS' | 'AUDIT';

export const SuperAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SuperTab>('OVERVIEW');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({
    totalShops: 0,
    activeShops: 0,
    totalRevenue: 0,
    totalUsers: 0,
    newShops: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [s, b, t, l] = await Promise.all([
        apiService.getPlatformStats(),
        apiService.getGlobalBusinesses(),
        apiService.getGlobalTransactions(),
        apiService.getGlobalAuditLogs()
      ]);
      setStats(s);
      setBusinesses(b);
      setTransactions(t);
      setAuditLogs(l);
    } catch (e) {
      console.error("Platform data fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    if (confirm(`Are you sure you want to ${nextStatus.toLowerCase()} this business?`)) {
       try {
         await apiService.updateBusinessStatus(id, nextStatus as any);
         await loadAllData();
       } catch (e) {
         alert("Action failed");
       }
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(t => {
      const day = new Date(t.timestamp).toLocaleDateString();
      map.set(day, (map.get(day) || 0) + t.total);
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total })).reverse().slice(-7);
  }, [transactions]);

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Network Revenue', value: `KES ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '+12% growth' },
          { label: 'Active Shops', value: stats.activeShops, icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: `${Math.round((stats.activeShops/stats.totalShops)*100)}% active` },
          { label: 'Total Professionals', value: stats.totalUsers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Global network' },
          { label: 'New Registrations', value: stats.newShops, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'Last 30 days' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full uppercase tracking-widest">
                Real-time
              </span>
            </div>
            <p className="text-sm font-bold text-slate-400">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
            <p className="text-[10px] font-black text-emerald-600 mt-2 uppercase tracking-tight">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
           <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-500" /> Platform GMV Growth</h3>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={revenueByDay}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                 <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `K ${v/1000}k`} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                 <Bar dataKey="total" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-indigo-900 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
           <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
           <div>
             <h3 className="text-xl font-bold mb-2">SaaS Health Score</h3>
             <p className="text-indigo-300 text-sm">Platform is operating within normal parameters.</p>
           </div>
           <div className="my-8">
              <div className="text-6xl font-black text-white">99.8<span className="text-2xl">%</span></div>
              <p className="text-indigo-300 text-xs font-bold uppercase mt-2">Global System Uptime</p>
           </div>
           <div className="flex gap-4">
              <div className="flex-1 bg-white/10 p-4 rounded-2xl">
                 <p className="text-[10px] text-indigo-300 uppercase font-bold">API Latency</p>
                 <p className="text-xl font-bold">24ms</p>
              </div>
              <div className="flex-1 bg-white/10 p-4 rounded-2xl">
                 <p className="text-[10px] text-indigo-300 uppercase font-bold">Failed Payouts</p>
                 <p className="text-xl font-bold text-emerald-400">0</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderShops = () => (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search shops by name, ID or slug..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
            <tr>
              <th className="p-6">Business Entity</th>
              <th className="p-6">Subscription</th>
              <th className="p-6">Staff</th>
              <th className="p-6">Revenue</th>
              <th className="p-6">Status</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBusinesses.map(biz => (
              <tr key={biz.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-yellow-500 font-black shadow-lg">
                      {biz.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{biz.name}</p>
                      <p className="text-xs text-slate-400 font-mono">ID: {biz.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                    biz.plan === 'Enterprise' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    biz.plan === 'Pro' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    'bg-slate-50 text-slate-600 border-slate-100'
                  }`}>
                    {biz.plan.toUpperCase()}
                  </span>
                </td>
                <td className="p-6 font-bold text-slate-700">{(biz as any).staffCount || 0} Professionals</td>
                <td className="p-6">
                  <p className="font-black text-slate-900">KES {((biz as any).totalRevenue || 0).toLocaleString()}</p>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${biz.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-xs font-bold ${biz.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>{biz.status}</span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <button onClick={() => handleStatusToggle(biz.id, biz.status)} className={`p-2 rounded-xl transition-all ${biz.status === 'Active' ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                    {biz.status === 'Active' ? <PauseCircle size={22} /> : <PlayCircle size={22} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
       <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50 font-black text-slate-800 uppercase tracking-widest text-xs">Platform Global Transaction Log</div>
         <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <tr>
                <th className="p-6">Time</th>
                <th className="p-6">Source Shop</th>
                <th className="p-6">Reference</th>
                <th className="p-6">Amount</th>
                <th className="p-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {transactions.map(t => (
                 <tr key={t.id} className="text-sm">
                   <td className="p-6 text-slate-400 font-mono">{new Date(t.timestamp).toLocaleTimeString()}</td>
                   <td className="p-6 font-bold text-slate-800">{t.customerName || 'POS Sale'}</td>
                   <td className="p-6 font-mono text-xs">{t.id}</td>
                   <td className="p-6 font-black">KES {t.total.toLocaleString()}</td>
                   <td className="p-6">
                     <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                       {t.status.toUpperCase()}
                     </span>
                   </td>
                 </tr>
               ))}
            </tbody>
         </table>
       </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200 transform rotate-3">
             <ShieldCheck size={32} />
           </div>
           <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Control</h2>
              <p className="text-slate-500 font-medium">BarberPro Multivendor SaaS Platform Management</p>
           </div>
        </div>
        <button onClick={loadAllData} className="bg-white border border-slate-200 p-4 rounded-2xl hover:bg-slate-50 shadow-sm transition-all text-indigo-600 font-bold flex items-center gap-2">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} /> <span>Refresh Cloud Data</span>
        </button>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: BarChart2 },
          { id: 'SHOPS', label: 'Shop Manager', icon: Store },
          { id: 'PAYMENTS', label: 'Payment Feeds', icon: Smartphone },
          { id: 'AUDIT', label: 'Security Logs', icon: ListChecks },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SuperTab)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-widest ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-indigo-600">
             <Activity size={48} className="animate-pulse" />
          </div>
        ) : (
          <>
            {activeTab === 'OVERVIEW' && renderOverview()}
            {activeTab === 'SHOPS' && renderShops()}
            {activeTab === 'PAYMENTS' && renderPayments()}
            {activeTab === 'AUDIT' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 animate-in fade-in">
                 <h3 className="text-xl font-black mb-6">Global Audit Trail</h3>
                 <div className="space-y-4">
                    {auditLogs.map(log => (
                      <div key={log.id} className="flex items-start gap-4 p-4 border-l-4 border-indigo-500 bg-slate-50 rounded-r-xl">
                         <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                           <Activity size={16} />
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                               <p className="font-bold text-slate-800">{log.userName} <span className="text-slate-400 font-normal">in</span> {log.businessId}</p>
                               <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-500"><span className="font-black text-indigo-600 uppercase text-[9px] mr-2">{log.action}</span> {log.details}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
