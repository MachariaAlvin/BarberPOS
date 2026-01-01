
import React, { useState, useMemo } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';
import { Customer, Appointment } from '../types';
import { Plus, Search, Phone, Mail, Calendar, User, FileText, X, History, ChevronRight, AlertCircle, Edit2, UserPlus, Scissors } from 'lucide-react';

export const Customers: React.FC = () => {
  const { customers, appointments, staff, services, addCustomer, updateCustomer } = useDatabase();
  const { can, businessId } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Adding/Editing
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);

  // Permissions
  const canManage = can(PERMISSIONS.MANAGE_CUSTOMERS);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedId) || null;
  }, [customers, selectedId]);

  const customerAppointments = useMemo(() => {
    if (!selectedCustomer) return [];
    return appointments.filter(a => a.customerPhone === selectedCustomer.phone)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, selectedCustomer]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', notes: '' });
    }
    setError(null);
    setShowModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingCustomer) {
        await updateCustomer({
          ...editingCustomer,
          ...formData
        });
      } else {
        const newCustomer: Customer = {
          id: `CUST-${Date.now()}`,
          businessId: businessId || '',
          ...formData,
          joinDate: new Date().toISOString(),
          version: 1
        };
        await addCustomer(newCustomer);
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to save customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Customers</h2>
          <p className="text-slate-500">Manage your client database and history</p>
        </div>
        {canManage && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
          >
            <UserPlus size={20} />
            Add New Customer
          </button>
        )}
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left: Customer List */}
        <div className="w-full md:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 ${selectedId === c.id ? 'bg-yellow-50 border-r-4 border-yellow-500' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 truncate">{c.phone}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            )) : (
              <div className="p-8 text-center text-slate-400 text-sm">No customers found</div>
            )}
          </div>
        </div>

        {/* Right: Details View */}
        <div className="hidden md:flex flex-1 flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {selectedCustomer ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 text-yellow-500 flex items-center justify-center text-3xl font-black">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedCustomer.name}</h3>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Phone size={14} /> {selectedCustomer.phone}
                      </div>
                      {selectedCustomer.email && (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <Mail size={14} /> {selectedCustomer.email}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Calendar size={14} /> Joined {new Date(selectedCustomer.joinDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <button 
                    onClick={() => handleOpenModal(selectedCustomer)}
                    className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
                  >
                    <Edit2 size={20} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Notes Section */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={18} className="text-yellow-600" />
                    Client Notes
                  </h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 min-h-[100px] italic">
                    {selectedCustomer.notes || "No notes available for this client."}
                  </div>
                </div>

                {/* Booking History Section */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <History size={18} className="text-yellow-600" />
                    Recent Visits
                  </h4>
                  <div className="space-y-3">
                    {customerAppointments.length > 0 ? customerAppointments.slice(0, 5).map(appt => {
                      const service = services.find(s => s.id === appt.serviceId);
                      const barber = staff.find(s => s.id === appt.staffId);
                      return (
                        <div key={appt.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex justify-between items-center group hover:border-yellow-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                              <Scissors size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{service?.name || "Service"}</p>
                              <p className="text-xs text-slate-500">{new Date(appt.date).toLocaleDateString()} • {barber?.name}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-8 text-slate-400 text-sm italic">No visit history found.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <User size={32} />
              </div>
              <h3 className="font-bold text-slate-800">No Customer Selected</h3>
              <p className="text-sm max-w-xs mt-1">Select a customer from the list to view their full profile and visit history.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-2xl font-bold text-white">{editingCustomer ? 'Edit Client' : 'New Client'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-5">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-bold focus:ring-4 focus:ring-yellow-500/50 outline-none transition-all"
                  placeholder="e.g. Michael Jordan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Phone Number</label>
                <input 
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-bold focus:ring-4 focus:ring-yellow-500/50 outline-none transition-all"
                  placeholder="07XX XXX XXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address (Optional)</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-bold focus:ring-4 focus:ring-yellow-500/50 outline-none transition-all"
                  placeholder="client@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Important Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-slate-900 font-medium h-24 outline-none focus:ring-4 focus:ring-yellow-500/50 transition-all resize-none"
                  placeholder="e.g. Skin allergies, style preferences..."
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-yellow-500 text-slate-900 font-bold rounded-xl hover:bg-yellow-400 shadow-lg shadow-yellow-900/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : (editingCustomer ? 'Update Client' : 'Create Client')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
