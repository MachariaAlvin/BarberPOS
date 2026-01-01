
import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  DollarSign, CreditCard, Users, Scissors, TrendingUp, Calendar, AlertTriangle, Package, CheckCircle2, Activity, Filter, RefreshCw, Lock
} from 'lucide-react';

type ReportTab = 'SALES' | 'SERVICES' | 'STAFF' | 'CUSTOMERS' | 'INVENTORY' | 'FINANCIALS';
type DateRangePreset = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Reports: React.FC = () => {
  const { transactions, appointments, staff, customers, products } = useDatabase();
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('SALES');
  
  // Date Filter State
  const [preset, setPreset] = useState<DateRangePreset>('LAST_30_DAYS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Access Control
  if (!can(PERMISSIONS.VIEW_REPORTS)) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} className="text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 max-w-md text-center">You do not have permission to view business reports. Please contact your manager.</p>
      </div>
    );
  }

  // Initialize Dates on Mount
  useEffect(() => {
    applyPreset('LAST_30_DAYS');
  }, []);

  const applyPreset = (type: DateRangePreset) => {
    setPreset(type);
    const end = new Date();
    let start = new Date();

    switch (type) {
      case 'TODAY':
        start = new Date();
        break;
      case 'YESTERDAY':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'LAST_7_DAYS':
        start.setDate(start.getDate() - 7);
        break;
      case 'LAST_30_DAYS':
        start.setDate(start.getDate() - 30);
        break;
      case 'THIS_MONTH':
        start.setDate(1); // 1st of current month
        break;
      case 'LAST_MONTH':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Last day of previous month
        break;
      case 'CUSTOM':
        return; // Don't change dates, let user pick
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
    setPreset('CUSTOM');
  };

  // --- Filtered Data ---

  const filteredTransactions = useMemo(() => {
    if (!startDate || !endDate) return transactions;
    
    // Create date objects for comparison (inclusive range)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return transactions.filter(t => {
      const tDate = new Date(t.timestamp);
      return tDate >= start && tDate <= end;
    });
  }, [transactions, startDate, endDate]);

  // --- Report Calculations ---

  const salesData = useMemo(() => {
    const dailyMap = new Map<string, number>();
    
    // Pre-fill dates in range if range is small (< 31 days) to show zeros
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays <= 31 && startDate) {
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        dailyMap.set(d.toISOString().split('T')[0], 0);
      }
    }

    filteredTransactions.forEach(t => {
      const date = t.timestamp.split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + t.total);
    });

    return Array.from(dailyMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions, startDate, endDate]);

  const paymentMethodData = useMemo(() => {
    const methodMap = new Map<string, number>();
    filteredTransactions.forEach(t => {
      methodMap.set(t.paymentMethod, (methodMap.get(t.paymentMethod) || 0) + t.total);
    });
    return Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const servicePerformance = useMemo(() => {
    const serviceMap = new Map<string, { count: number, revenue: number }>();
    filteredTransactions.flatMap(t => t.items).forEach(item => {
      if (item.type === 'service') {
        const current = serviceMap.get(item.name) || { count: 0, revenue: 0 };
        serviceMap.set(item.name, {
          count: current.count + item.quantity,
          revenue: current.revenue + (item.price * item.quantity)
        });
      }
    });
    return Array.from(serviceMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5
  }, [filteredTransactions]);

  const staffPerformance = useMemo(() => {
    return staff.map(s => {
      // Find items where this staff is listed.
      // If staffIds exists, check includes. Otherwise check deprecated barberId.
      const myItems = filteredTransactions.flatMap(t => t.items).filter(i => {
         return (i.staffIds && i.staffIds.includes(s.id)) || (i.barberId === s.id);
      });
      
      // Calculate revenue. Full item price is attributed to each staff member.
      const revenue = myItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      
      const clients = new Set(filteredTransactions.filter(t => t.items.some(i => (i.staffIds && i.staffIds.includes(s.id)) || (i.barberId === s.id))).map(t => t.id)).size;
      return {
        name: s.name,
        revenue,
        commission: revenue * s.commissionRate,
        clients
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [staff, filteredTransactions]);

  const productPerformance = useMemo(() => {
    const productMap = new Map<string, { count: number, revenue: number }>();
    filteredTransactions.flatMap(t => t.items).forEach(item => {
      if (item.type === 'product') {
        const current = productMap.get(item.name) || { count: 0, revenue: 0 };
        productMap.set(item.name, {
          count: current.count + item.quantity,
          revenue: current.revenue + (item.price * item.quantity)
        });
      }
    });
    return Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count); // Sort by quantity sold
  }, [filteredTransactions]);

  // --- Render Components ---

  const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between`}>
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  );

  const renderSalesReports = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`KES ${filteredTransactions.reduce((acc, t) => acc + t.total, 0).toLocaleString()}`} 
          subtext="In selected period"
          icon={DollarSign} 
          color="bg-green-100 text-green-600" 
        />
        <StatCard 
          title="Transactions" 
          value={filteredTransactions.length} 
          subtext="Completed sales"
          icon={CreditCard} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Avg. Transaction" 
          value={`KES ${filteredTransactions.length ? Math.round(filteredTransactions.reduce((acc, t) => acc + t.total, 0) / filteredTransactions.length) : 0}`} 
          subtext="Per sale average"
          icon={TrendingUp} 
          color="bg-purple-100 text-purple-600" 
        />
        <StatCard 
          title="Refunds" 
          value={filteredTransactions.filter(t => t.status === 'Refunded').length} 
          subtext="Voided transactions"
          icon={AlertTriangle} 
          color="bg-red-100 text-red-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.slice(5)} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                />
                <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={40} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Payment Methods Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServicesReports = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Top Performing Services (Revenue)</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicePerformance} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={100} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#eab308" radius={[0, 4, 4, 0]} barSize={30} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6 border-b border-slate-100">
           <h3 className="font-bold text-lg text-slate-800">Service Breakdown</h3>
         </div>
         <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Service Name</th>
                <th className="p-4">Times Performed</th>
                <th className="p-4">Total Revenue</th>
                <th className="p-4">Avg Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicePerformance.map((service, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">{service.name}</td>
                  <td className="p-4 text-slate-600">{service.count}</td>
                  <td className="p-4 font-bold text-slate-800">KES {service.revenue.toLocaleString()}</td>
                  <td className="p-4 text-slate-500">KES {Math.round(service.revenue / service.count)}</td>
                </tr>
              ))}
            </tbody>
         </table>
       </div>
    </div>
  );

  const renderStaffReports = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-bold text-lg text-slate-800">Staff Performance & Commissions</h3>
         </div>
         <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Clients Served</th>
                <th className="p-4">Revenue Attributed</th>
                <th className="p-4">Est. Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffPerformance.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">{s.name}</td>
                  <td className="p-4 text-slate-600">{s.clients}</td>
                  <td className="p-4 font-bold text-slate-800">KES {s.revenue.toLocaleString()}</td>
                  <td className="p-4 font-bold text-green-600">KES {s.commission.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
         </table>
         <div className="p-4 text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
            * Revenue Attributed reflects the full value of services performed by the staff member.
         </div>
       </div>
    </div>
  );

  const renderInventoryReports = () => {
    // Inventory State (Current)
    const lowStock = products.filter(p => p.stock < 10);
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
    
    // Inventory Velocity (Filtered by Date)
    const fastMoving = productPerformance.slice(0, 5);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Current Inventory Value" 
              value={`KES ${totalValue.toLocaleString()}`} 
              subtext="Retail Value of stock on hand"
              icon={DollarSign} 
              color="bg-emerald-100 text-emerald-600" 
            />
            <StatCard 
              title="Low Stock Items" 
              value={lowStock.length} 
              subtext="Items below 10 units"
              icon={AlertTriangle} 
              color="bg-red-100 text-red-600" 
            />
            <StatCard 
              title="Products Sold" 
              value={filteredTransactions.flatMap(t => t.items).filter(i => i.type === 'product').reduce((acc, i) => acc + i.quantity, 0)} 
              subtext="In selected period"
              icon={Package} 
              color="bg-blue-100 text-blue-600" 
            />
         </div>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100">
                 <h3 className="font-bold text-lg text-slate-800">Fastest Moving Products (Sales)</h3>
               </div>
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">Units Sold</th>
                      <th className="p-4">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fastMoving.length > 0 ? fastMoving.map((p, idx) => (
                      <tr key={idx}>
                        <td className="p-4 font-medium text-slate-800">{p.name}</td>
                        <td className="p-4">{p.count}</td>
                        <td className="p-4">KES {p.revenue.toLocaleString()}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="p-4 text-center text-slate-400">No product sales in this period</td></tr>
                    )}
                  </tbody>
               </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100">
                 <h3 className="font-bold text-lg text-slate-800">Low Stock Alerts (Current)</h3>
               </div>
               {lowStock.length > 0 ? (
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="p-4">Product</th>
                        <th className="p-4">Stock</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lowStock.map((p, idx) => (
                        <tr key={idx}>
                          <td className="p-4 font-medium text-slate-800">{p.name}</td>
                          <td className="p-4 font-bold text-red-600">{p.stock}</td>
                          <td className="p-4"><span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">Restock</span></td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               ) : (
                 <div className="p-8 text-center text-slate-500">All stock levels are healthy.</div>
               )}
            </div>
         </div>
      </div>
    );
  };

  const renderFinancialReports = () => {
    const totalRevenue = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
    const totalCommissions = staffPerformance.reduce((acc, s) => acc + s.commission, 0);
    const netRevenue = totalRevenue - totalCommissions;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
         <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Profit & Loss Summary (Estimated)</h3>
            <p className="text-center text-slate-500 mb-6">Period: {startDate} to {endDate}</p>
            
            <div className="space-y-4 max-w-2xl mx-auto">
               <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <span className="text-slate-600 font-medium">Total Gross Revenue</span>
                  <span className="text-xl font-bold text-slate-900">KES {totalRevenue.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="text-red-600 font-medium">(-) Staff Commissions Payout</span>
                  <span className="text-xl font-bold text-red-700">KES {totalCommissions.toLocaleString()}</span>
               </div>
               <div className="border-t-2 border-slate-200 my-4"></div>
               <div className="flex justify-between items-center p-6 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-green-800 font-bold text-lg">Net Operating Revenue</span>
                  <span className="text-3xl font-bold text-green-700">KES {netRevenue.toLocaleString()}</span>
               </div>
               <p className="text-xs text-center text-slate-400 mt-4">* Calculation based on Sales minus Estimated Commissions only.</p>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Business Reports</h2>
          <p className="text-slate-500 mt-1">Analytics and performance metrics</p>
        </div>
        
        {/* Date Filter Toolbar */}
        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 px-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Filter Date:</span>
          </div>

          <select 
            value={preset} 
            onChange={(e) => applyPreset(e.target.value as DateRangePreset)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block p-2.5 outline-none font-medium"
          >
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="CUSTOM">Custom Range</option>
          </select>

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block p-2.5 outline-none"
            />
            <span className="text-slate-400">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block p-2.5 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200 no-scrollbar">
         {[
           { id: 'SALES', label: 'Sales & Payments', icon: TrendingUp },
           { id: 'SERVICES', label: 'Services', icon: Scissors },
           { id: 'STAFF', label: 'Staff Performance', icon: Users },
           { id: 'INVENTORY', label: 'Inventory', icon: Package },
           { id: 'FINANCIALS', label: 'Profit & Loss', icon: Activity },
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as ReportTab)}
             className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
               activeTab === tab.id 
                 ? 'border-yellow-500 text-slate-900' 
                 : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
             }`}
           >
             <tab.icon size={16} />
             {tab.label}
           </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'SALES' && renderSalesReports()}
        {activeTab === 'SERVICES' && renderServicesReports()}
        {activeTab === 'STAFF' && renderStaffReports()}
        {activeTab === 'INVENTORY' && renderInventoryReports()}
        {activeTab === 'FINANCIALS' && renderFinancialReports()}
      </div>
    </div>
  );
};
