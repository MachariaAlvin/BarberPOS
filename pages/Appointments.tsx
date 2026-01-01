
import React, { useState } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { Appointment } from '../types';
import { Plus, Calendar as CalIcon, Clock, Check, X, AlertCircle, Phone, User, Scissors, Lock } from 'lucide-react';
import { useAuth, PERMISSIONS } from '../contexts/AuthContext';

export const Appointments: React.FC = () => {
  const { appointments, addAppointment, staff, services, updateAppointmentStatus } = useDatabase();
  const { can, user: currentUser, businessId } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get today's date string for min attribute (YYYY-MM-DD)
  const todayStr = new Date().toLocaleDateString('en-CA'); 

  // Permission Checks
  const canAdd = can(PERMISSIONS.CREATE_APPOINTMENT);
  const canViewAll = can(PERMISSIONS.VIEW_ALL_APPOINTMENTS);

  // Filter Appointments based on role
  const visibleAppointments = canViewAll 
    ? appointments 
    : appointments.filter(a => a.staffId === currentUser?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const selectedDateTime = new Date(`${date}T${time}`);
      const now = new Date();

      if (selectedDateTime < now) {
        throw new Error('Cannot book an appointment in the past. Please select a future time.');
      }

      // --- CONFLICT CHECK START ---
      const selectedService = services.find(s => s.id === serviceId);
      if (!selectedService) throw new Error('Please select a valid service.');
      
      const duration = selectedService.duration; // in minutes
      
      const newStart = new Date(`${date}T${time}:00.000Z`);
      const newEnd = new Date(newStart.getTime() + duration * 60000);

      const hasConflict = appointments.some(appt => {
        if (appt.status === 'Cancelled' || appt.staffId !== staffId) return false;
        
        const existingService = services.find(s => s.id === appt.serviceId);
        const existingDuration = existingService ? existingService.duration : 30; 
        
        const existingStart = new Date(appt.date);
        const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);

        return newStart < existingEnd && newEnd > existingStart;
      });

      if (hasConflict) {
        throw new Error('This staff member is already booked for this time slot.');
      }
      // --- CONFLICT CHECK END ---

      // Fix: Injected businessId from useAuth to satisfy the interface requirement
      const newAppt: Appointment = {
        id: `APT-${Date.now()}`,
        businessId: businessId || '',
        customerName,
        customerPhone,
        serviceId,
        staffId,
        date: `${date}T${time}:00.000Z`,
        status: 'Scheduled',
        version: 1
      };
      await addAppointment(newAppt);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = (appt: Appointment, status: 'Completed' | 'Cancelled') => {
    try {
      updateAppointmentStatus(appt.id, status, appt.version);
    } catch (err: any) {
      alert(err.message); 
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setServiceId('');
    setStaffId('');
    setDate('');
    setTime('');
    setError(null);
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setError(null); 
    setter(value);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Appointments</h2>
        {canAdd && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Plus size={20} />
            New Appointment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleAppointments.length > 0 ? (
          visibleAppointments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(appt => {
           const staffMember = staff.find(s => s.id === appt.staffId);
           const service = services.find(s => s.id === appt.serviceId);
           const apptDate = new Date(appt.date);

           const timeString = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
           const month = apptDate.toLocaleDateString(undefined, { month: 'short' });
           const day = apptDate.getDate();
           const weekday = apptDate.toLocaleDateString(undefined, { weekday: 'long' });

           const isToday = appt.date.startsWith(todayStr);

           return (
            <div 
              key={appt.id} 
              className={`bg-white rounded-xl shadow-sm border relative overflow-hidden group hover:shadow-md transition-all ${
                isToday 
                  ? 'border-blue-500 ring-1 ring-blue-500 shadow-blue-100' 
                  : 'border-slate-200'
              }`}
            >
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                 appt.status === 'Completed' ? 'bg-green-500' : 
                 appt.status === 'Cancelled' ? 'bg-red-500' : 
                 'bg-yellow-500'
               }`}></div>
               
               <div className="p-5">
                 <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-xl p-2 min-w-[60px] text-center flex flex-col border transition-colors ${
                        isToday 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                          : 'bg-slate-100 border-slate-200'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isToday ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          {isToday ? 'TODAY' : month}
                        </span>
                        <span className={`text-2xl font-bold leading-none ${
                          isToday ? 'text-white' : 'text-slate-800'
                        }`}>
                          {day}
                        </span>
                      </div>
                      
                      <div>
                        <div className={`flex items-center gap-2 text-2xl font-bold ${isToday ? 'text-blue-900' : 'text-slate-800'}`}>
                           <Clock size={20} className={isToday ? 'text-blue-500' : 'text-slate-400'} />
                           {timeString}
                        </div>
                        <div className={`text-xs font-medium uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                          {weekday}
                        </div>
                      </div>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                      appt.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                      appt.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {appt.status}
                    </span>
                 </div>

                 <div className="mb-4">
                   <h3 className="font-bold text-lg text-slate-800 mb-1">{appt.customerName}</h3>
                   <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Phone size={14} /> 
                      <span>{appt.customerPhone}</span>
                   </div>
                 </div>

                 <div className="flex flex-wrap gap-2 mb-6">
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-sm font-medium text-slate-700">
                       <Scissors size={14} className="text-slate-400" />
                       {service?.name} <span className="text-slate-400 text-xs">({service?.duration}m)</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-sm font-medium text-slate-700">
                       {staffMember?.avatar ? (
                         <img src={staffMember.avatar} className="w-4 h-4 rounded-full" alt="" />
                       ) : (
                         <User size={14} className="text-slate-400" />
                       )}
                       {staffMember?.name}
                    </div>
                 </div>

                 {appt.status === 'Scheduled' && (
                   <div className="flex gap-3">
                     <button 
                      onClick={() => handleUpdateStatus(appt, 'Completed')}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2.5 rounded-xl hover:bg-green-100 text-sm font-bold transition-colors border border-green-100"
                     >
                       <Check size={18} /> Complete
                     </button>
                     <button 
                      onClick={() => handleUpdateStatus(appt, 'Cancelled')}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 py-2.5 rounded-xl hover:bg-red-100 text-sm font-bold transition-colors border border-red-100"
                     >
                       <X size={18} /> Cancel
                     </button>
                   </div>
                 )}
               </div>
            </div>
           );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
             <CalIcon size={48} className="mb-4 opacity-50"/>
             <p>No appointments found.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-lg p-8 shadow-2xl shadow-black border border-slate-800 relative">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-bold text-white">Book Appointment</h3>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
                  <input 
                    required 
                    type="text" 
                    value={customerName} 
                    onChange={e => handleInputChange(setCustomerName, e.target.value)} 
                    className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/50 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input 
                    required 
                    type="tel" 
                    value={customerPhone} 
                    onChange={e => handleInputChange(setCustomerPhone, e.target.value)} 
                    className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/50 outline-none transition-all" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                   <input 
                     required 
                     type="date" 
                     min={todayStr} 
                     value={date} 
                     onChange={e => handleInputChange(setDate, e.target.value)} 
                     className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold focus:ring-4 focus:ring-blue-500/50 outline-none transition-all" 
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Time</label>
                   <input 
                     required 
                     type="time" 
                     value={time} 
                     onChange={e => handleInputChange(setTime, e.target.value)} 
                     className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold focus:ring-4 focus:ring-blue-500/50 outline-none transition-all" 
                   />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Service</label>
                <select 
                  required 
                  value={serviceId} 
                  onChange={e => handleInputChange(setServiceId, e.target.value)} 
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold focus:ring-4 focus:ring-blue-500/50 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="">Select Service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - {s.duration}m</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Barber/Stylist</label>
                <select 
                  required 
                  value={staffId} 
                  onChange={e => handleInputChange(setStaffId, e.target.value)} 
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-blue-900 font-bold focus:ring-4 focus:ring-blue-500/50 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="">Select Staff</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3 text-slate-300 hover:bg-slate-800 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold shadow-lg shadow-blue-900/50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Booking...' : 'Book Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
