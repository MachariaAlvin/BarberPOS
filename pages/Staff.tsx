
import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
import { Staff, Appointment, Service, Role } from '../types';
import { 
  Plus, X, Phone, User, Lock, AlertCircle, Pencil, Trash2, 
  CheckCircle2, Clock, ShieldCheck, ToggleLeft, ToggleRight, 
  Key, Mail, Eye, EyeOff 
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { staff, transactions, appointments, services, addStaff, updateStaff, deleteStaff } = useDatabase();
  const { can, user: currentUser, businessId } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('Barber');
  const [newPhone, setNewPhone] = useState('');
  const [newCommission, setNewCommission] = useState('40');
  const [newAvatar, setNewAvatar] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newStatus, setNewStatus] = useState<'Active' | 'Inactive'>('Active');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  const canManage = can(PERMISSIONS.MANAGE_STAFF);

  const isStaffEngaged = (staffId: string): boolean => {
    return appointments.some(appt => {
      if (appt.staffId !== staffId || appt.status !== 'Scheduled') return false;
      const apptStartTime = new Date(appt.date);
      const service = services.find(s => s.id === appt.serviceId);
      const duration = service?.duration || 30;
      const apptEndTime = new Date(apptStartTime.getTime() + duration * 60000);
      return now >= apptStartTime && now <= apptEndTime;
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (s: Staff) => {
    setEditingId(s.id);
    setNewName(s.name);
    setNewRole(s.role);
    setNewPhone(s.phone);
    setNewCommission((s.commissionRate * 100).toString());
    setNewUsername(s.username || '');
    setNewPassword('');
    setNewAvatar(s.avatar);
    setNewStatus(s.status || 'Active');
    setError(null);
    setShowModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    
    try {
      if (editingId) {
        const existing = staff.find(s => s.id === editingId);
        if (!existing) throw new Error("Staff member not found");
        await updateStaff({
          ...existing,
          name: newName,
          role: newRole,
          phone: newPhone,
          commissionRate: Number(newCommission) / 100,
          avatar: newAvatar || existing.avatar,
          username: newUsername || undefined,
          passwordHash: newPassword || existing.passwordHash,
          status: newStatus,
        });
      } else {
        await addStaff({
          id: `S-${Date.now()}`,
          businessId: businessId || '',
          name: newName,
          role: newRole,
          phone: newPhone,
          commissionRate: Number(newCommission) / 100,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=random`,
          username: newUsername || undefined,
          passwordHash: newPassword || undefined, 
          status: 'Active',
          version: 1
        });
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (s: Staff) => {
    if (!canManage) return;
    const nextStatus = s.status === 'Active' ? 'Inactive' : 'Active';
    if (confirm(`Are you sure you want to ${nextStatus === 'Inactive' ? 'DEACTIVATE' : 'ACTIVATE'} ${s.name}'s account?`)) {
        try {
            await updateStaff({ ...s, status: nextStatus });
        } catch (e: any) { alert(e.message); }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Warning: Deleting "${name}" will permanently remove them. It is recommended to DEACTIVATE them instead to keep historical records. Continue with deletion?`)) {
      try { await deleteStaff(id); } catch (err: any) { alert(err.message); }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setNewRole('Barber');
    setNewPhone('');
    setNewCommission('40');
    setNewUsername('');
    setNewPassword('');
    setNewAvatar('');
    setNewStatus('Active');
    setError(null);
  };

  const staffMetrics = staff.map(s => {
    let totalGenerated = 0;
    let servicesCount = 0;
    transactions.forEach(t => {
       t.items.forEach(item => {
          const isAssigned = (item.staffIds && item.staffIds.includes(s.id)) || (item.barberId === s.id);
          if (isAssigned) {
             totalGenerated += (item.price * item.quantity);
             servicesCount++;
          }
       });
    });
    return { ...s, totalGenerated, commission: totalGenerated * s.commissionRate, servicesCount, isEngaged: isStaffEngaged(s.id) };
  });

  const visibleStaff = (canManage || can(PERMISSIONS.VIEW_STAFF))
    ? staffMetrics 
    : staffMetrics.filter(s => s.id === currentUser?.id);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Identity & Team</h2>
          <p className="text-slate-500 font-medium">Manage user credentials, roles, and real-time floor status</p>
        </div>
        {canManage && (
          <button onClick={openAddModal} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95">
            <Plus size={20} /> <span className="font-bold">Register User</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {visibleStaff.length > 0 ? visibleStaff.map(s => (
          <div key={s.id} className={`bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative group transition-all ${s.status === 'Inactive' ? 'opacity-60 grayscale' : ''}`}>
            
            {/* Status Ribbon */}
            <div className={`absolute top-0 right-0 p-2 px-6 rounded-bl-[1.5rem] text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${s.status === 'Active' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
              {s.status}
            </div>

            <div className={`absolute top-10 left-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${
              s.isEngaged 
                ? 'bg-amber-50 text-amber-600 border-amber-100' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              <div className={`w-2 h-2 rounded-full ${s.isEngaged ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
              {s.isEngaged ? 'Engaged' : 'Available'}
            </div>

            {canManage && (
              <div className="absolute top-12 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(s)} className="p-3 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-lg border border-slate-100 transition-all">
                  <Pencil size={18} />
                </button>
                <button onClick={() => toggleUserStatus(s)} className="p-3 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl shadow-lg border border-slate-100 transition-all">
                   {s.status === 'Active' ? <ToggleRight size={22} className="text-indigo-600" /> : <ToggleLeft size={22} />}
                </button>
              </div>
            )}

            <div className="p-8 flex items-center gap-5 border-b border-slate-50 pt-16 bg-slate-50/20">
              <img src={s.avatar} alt={s.name} className="w-20 h-20 rounded-[1.5rem] object-cover border-4 border-white shadow-xl bg-slate-100 transition-transform group-hover:scale-110" />
              <div>
                <h3 className="font-black text-xl text-slate-900 tracking-tight leading-none">{s.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 text-slate-400">
                        {s.role}
                    </span>
                    {s.username && (
                        <span className="text-[10px] font-mono font-bold text-indigo-500">@{s.username}</span>
                    )}
                </div>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-6 bg-white">
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                 <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Commission</p>
                 <p className="text-xl font-black text-slate-800">{(s.commissionRate * 100)}%</p>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                 <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Floor Items</p>
                 <p className="text-xl font-black text-slate-800">{s.servicesCount}</p>
              </div>
            </div>

            {(canManage || currentUser?.id === s.id) && (
              <div className="bg-indigo-50/30 px-8 py-5 flex justify-between items-center border-t border-indigo-50">
                 <span className="text-indigo-900/40 text-[11px] font-black uppercase tracking-[0.2em]">Net Due</span>
                 <span className="text-2xl font-black text-indigo-600 tracking-tight">KES {s.commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
        )) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
             <ShieldCheck size={64} className="mb-4 opacity-10"/>
             <p className="font-black uppercase tracking-widest text-xs">No user accounts found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-300 backdrop-blur-xl p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white">
            <div className="flex justify-between items-center p-8 border-b border-slate-50 bg-slate-50/30">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingId ? 'Edit User Identity' : 'Register New User'}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">System Profile Management</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 bg-white p-3 rounded-[1rem] shadow-sm transition-all active:scale-90">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              {error && <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-[1.5rem] flex items-center gap-4 text-sm font-bold animate-in slide-in-from-top-4"><AlertCircle size={24} />{error}</div>}
              
              <form onSubmit={handleSaveStaff} className="space-y-8">
                {/* Profile Section */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Basic Profile</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Full Name</label>
                            <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="John Doe" />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Phone</label>
                            <input required type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="07XX XXX XXX" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Role</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                                <option value="Barber">Barber</option>
                                <option value="Cashier">Cashier</option>
                                <option value="Manager">Manager</option>
                                <option value="Owner">Owner</option>
                            </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Commission (%)</label>
                            <input required type="number" min="0" max="100" value={newCommission} onChange={e => setNewCommission(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                        </div>
                    </div>
                </div>

                {/* Secure Identity Section */}
                <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Key size={18} className="text-indigo-500" />
                        <h4 className="text-[10px] font-black text-indigo-900/60 uppercase tracking-[0.3em]">Login Credentials</h4>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-indigo-900/40 mb-2 uppercase tracking-widest">Username</label>
                            <input 
                                type="text" 
                                value={newUsername} 
                                onChange={e => setNewUsername(e.target.value)} 
                                className="w-full px-5 py-3 bg-white border border-indigo-100 rounded-xl text-indigo-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                                placeholder="barber_login" 
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-indigo-900/40 mb-2 uppercase tracking-widest">{editingId ? 'New Password (Leave blank to keep current)' : 'Initial Password'}</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={newPassword} 
                                    onChange={e => setNewPassword(e.target.value)} 
                                    className="w-full px-5 py-3 bg-white border border-indigo-100 rounded-xl text-indigo-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all pr-12" 
                                    placeholder="••••••••" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-indigo-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-2 px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl shadow-indigo-100 transition-all hover:bg-slate-800 disabled:opacity-50 active:scale-95">
                    {isSubmitting ? 'Authenticating...' : (editingId ? 'Update Identity' : 'Register User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
