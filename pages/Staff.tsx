
import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
// Fix: Explicitly import Role type for type safety
import { Staff, Appointment, Service, Role } from '../types';
import { Plus, X, Phone, User, Lock, AlertCircle, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { staff, transactions, appointments, services, addStaff, updateStaff, deleteStaff } = useDatabase();
  const { can, user: currentUser, businessId } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  // Fix: Broaden newRole state type to Role to match the Staff role property
  const [newRole, setNewRole] = useState<Role>('Barber');
  const [newPhone, setNewPhone] = useState('');
  const [newCommission, setNewCommission] = useState('40');
  const [newAvatar, setNewAvatar] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
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
          version: 1
        });
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}"?`)) {
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
    setError(null);
  };

  const staffMetrics = staff.map(s => {
    let totalGenerated = 0;
    let servicesCount = 0;
    transactions.forEach(t => {
       t.items.forEach(item => {
          if ((item.staffIds && item.staffIds.includes(s.id)) || (item.barberId === s.id)) {
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Staff & Availability</h2>
          <p className="text-slate-500">Real-time status of your grooming professionals</p>
        </div>
        {canManage && (
          <button onClick={openAddModal} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-lg">
            <Plus size={20} /> <span>Add Staff</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleStaff.length > 0 ? visibleStaff.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
            
            <div className={`absolute top-4 left-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${
              s.isEngaged 
                ? 'bg-amber-50 text-amber-600 border-amber-100' 
                : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${s.isEngaged ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`}></div>
              {s.isEngaged ? 'Engaged' : 'Available'}
            </div>

            {canManage && (
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(s)} className="p-2 bg-white text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg shadow-sm border border-slate-100 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(s.id, s.name)} className="p-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm border border-slate-100 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <div className="p-6 flex items-center gap-4 border-b border-slate-100 pt-12">
              <img src={s.avatar} alt={s.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md bg-slate-100" />
              <div>
                <h3 className="font-bold text-lg text-slate-800">{s.name}</h3>
                <span className="text-slate-500 text-sm bg-slate-100 px-2 py-0.5 rounded-full">{s.role}</span>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                 <p className="text-xs text-slate-500 uppercase font-semibold">Commission</p>
                 <p className="text-lg font-bold text-slate-800">{(s.commissionRate * 100)}%</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                 <p className="text-xs text-slate-500 uppercase font-semibold">Services</p>
                 <p className="text-lg font-bold text-slate-800">{s.servicesCount}</p>
              </div>
            </div>

            {(canManage || currentUser?.id === s.id) && (
              <div className="bg-green-50 p-4 flex justify-between items-center border-t border-green-100">
                 <span className="text-green-800 font-medium">Payout Due</span>
                 <span className="text-2xl font-bold text-green-700">KES {s.commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
        )) : (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-400">
             <Lock size={48} className="mb-2 opacity-50"/>
             <p>No staff found or insufficient permissions.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl shadow-black border border-slate-800 relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h3 className="text-2xl font-bold text-white">{editingId ? 'Edit Staff' : 'Add New Staff'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm"><AlertCircle size={18} />{error}</div>}
              <form onSubmit={handleSaveStaff} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold outline-none" placeholder="David Kimani" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value as any)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold outline-none">
                    <option value="Barber">Barber</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Manager</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input required type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold outline-none" placeholder="07XX XXX XXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Commission (%)</label>
                  <input required type="number" min="0" max="100" value={newCommission} onChange={e => setNewCommission(e.target.value)} className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold outline-none" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-300 font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg">{isSubmitting ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
