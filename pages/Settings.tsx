
import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
import { StaffPage } from './Staff';
import { ServicesPage } from './ServicesPage';
import { Role, AuditLog } from '../types';
import { apiService } from '../services/api';
import { 
  Building2, Users, Scissors, Shield, CreditCard, Save, CheckCircle, 
  ToggleLeft, ToggleRight, Activity, ListChecks, HardDriveDownload
} from 'lucide-react';

type SettingsTab = 'BUSINESS' | 'STAFF' | 'SERVICES' | 'ROLES' | 'PAYMENTS' | 'DATA' | 'AUDIT';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useDatabase();
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('BUSINESS');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Business State
  const [businessName, setBusinessName] = useState(settings.business.name);
  const [businessPhone, setBusinessPhone] = useState(settings.business.phone);
  const [businessEmail, setBusinessEmail] = useState(settings.business.email);
  const [businessLocation, setBusinessLocation] = useState(settings.business.location);
  const [receiptHeader, setReceiptHeader] = useState(settings.business.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState(settings.business.receiptFooter);

  // Lipa Online Config
  const [lipaApiKey, setLipaApiKey] = useState(settings.payment.lipaOnlineApiKey || '');
  const [lipaShortcode, setLipaShortcode] = useState(settings.payment.lipaOnlineShortcode || '');

  // Role Permissions State (Local copy for editing)
  const [rolePerms, setRolePerms] = useState(settings.rolePermissions);

  useEffect(() => {
    if (activeTab === 'AUDIT') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await apiService.getAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error("Failed to load logs", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = async () => {
    if (saveStatus !== 'idle') return;
    setSaveStatus('saving');
    
    try {
      await updateSettings({
        business: { ...settings.business, name: businessName, phone: businessPhone, email: businessEmail, location: businessLocation, receiptHeader, receiptFooter },
        payment: { ...settings.payment, lipaOnlineApiKey: lipaApiKey, lipaOnlineShortcode: lipaShortcode },
        rolePermissions: rolePerms
      }, settings.version);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      alert(err.message);
      setSaveStatus('idle');
    }
  };

  const togglePermission = (role: Role, perm: string) => {
    setRolePerms(prev => {
      const currentPerms = prev[role] || [];
      const newPerms = currentPerms.includes(perm)
        ? currentPerms.filter(p => p !== perm)
        : [...currentPerms, perm];
      return { ...prev, [role]: newPerms };
    });
  };

  return (
    <div className="pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">System Settings</h2>
          <p className="text-slate-500 mt-1">SaaS Workspace Management</p>
        </div>
        {(activeTab === 'BUSINESS' || activeTab === 'ROLES' || activeTab === 'PAYMENTS') && (
          <button 
            onClick={handleSave}
            disabled={saveStatus !== 'idle'}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
              saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {saveStatus === 'saved' ? <CheckCircle size={20} /> : <Save size={20} />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          {[
            { id: 'BUSINESS', label: 'Business Profile', icon: Building2 },
            { id: 'STAFF', label: 'Team Members', icon: Users },
            { id: 'SERVICES', label: 'Services Menu', icon: Scissors },
            { id: 'ROLES', label: 'Access Control', icon: Shield },
            { id: 'PAYMENTS', label: 'M-Pesa Config', icon: CreditCard },
            { id: 'AUDIT', label: 'Audit Trail', icon: ListChecks },
            { id: 'DATA', label: 'Data Management', icon: HardDriveDownload },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm text-left ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-yellow-500' : ''} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 min-h-[600px]">
          {activeTab === 'BUSINESS' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
               <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-black text-slate-800">Shop Profile</h3>
                  <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-100 uppercase tracking-widest">
                    Pro Plan Account
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Contact Information</h4>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Business Name</label>
                      <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Public Phone</label>
                      <input type="text" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Support Email</label>
                      <input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Physical Location</label>
                      <input type="text" value={businessLocation} onChange={e => setBusinessLocation(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium" />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Receipt Branding</h4>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Receipt Header Text</label>
                      <textarea value={receiptHeader} onChange={e => setReceiptHeader(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium h-24 resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Receipt Footer / Socials</label>
                      <textarea value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-medium h-24 resize-none" />
                    </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'STAFF' && <StaffPage />}
          {activeTab === 'SERVICES' && <ServicesPage />}

          {activeTab === 'AUDIT' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black text-slate-800">Audit Trail</h3>
                <button onClick={loadAuditLogs} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                  <Activity size={20} />
                </button>
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="p-4">Time</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loadingLogs ? (
                      <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-bold">Fetching secure logs...</td></tr>
                    ) : auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-4 text-slate-400 font-mono text-[10px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-slate-700">{log.userName}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                            log.severity === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                            log.severity === 'medium' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 italic">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ROLES' && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">Role Permissions Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-4 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b">Permission Action</th>
                      {['Manager', 'Barber', 'Cashier'].map(role => (
                        <th key={role} className="text-center p-4 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b">{role}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {settings.rolePermissions && Object.keys(settings.rolePermissions.Owner || {}).length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic font-bold">Loading role structure...</td></tr>
                    ) : (
                      // We list the common permissions based on the Owner's full list
                      (settings.rolePermissions.Owner || []).map(perm => (
                        <tr key={perm} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-b border-slate-100 font-bold text-slate-700 text-xs uppercase tracking-tight">{perm.replace(/_/g, ' ')}</td>
                          {['Manager', 'Barber', 'Cashier'].map(role => (
                            <td key={role} className="p-4 border-b border-slate-100 text-center">
                              <input 
                                type="checkbox" 
                                checked={rolePerms[role as Role]?.includes(perm)} 
                                onChange={() => togglePermission(role as Role, perm)}
                                className="w-5 h-5 rounded-lg border-slate-300 text-yellow-500 focus:ring-yellow-500 transition-all cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
               <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800">Financial Integrations</h3>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" className="h-6" alt="M-Pesa" />
               </div>
               <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex gap-4 text-blue-700">
                  <Activity size={24} className="flex-shrink-0" />
                  <div>
                    <p className="font-bold">Lipa Na M-Pesa Online (STK Push)</p>
                    <p className="text-sm mt-1">Configure your Daraja API credentials to enable automated STK push notifications for your customers.</p>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">M-Pesa Shortcode</label>
                    <input type="text" value={lipaShortcode} onChange={e => setLipaShortcode(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none font-mono" placeholder="174379" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Daraja Passkey</label>
                    <input type="password" value={lipaApiKey} onChange={e => setLipaApiKey(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none font-mono" placeholder="••••••••••••••••" />
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
