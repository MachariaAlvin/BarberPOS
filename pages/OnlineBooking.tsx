
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useDatabase } from '../contexts/DatabaseContext';
import { Service, Staff, Appointment, Business } from '../types';
import { Calendar, Clock, Scissors, User, ChevronRight, CheckCircle2, ChevronLeft, ArrowRight, WifiOff, Store } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

type BookingStep = 'SHOP' | 'SERVICE' | 'STAFF' | 'TIME' | 'DETAILS' | 'CONFIRM';

export const OnlineBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const shopSlug = searchParams.get('shop');
  
  const { addAppointment, isRemote, services: localServices, staff: localStaff } = useDatabase();
  const [step, setStep] = useState<BookingStep>(shopSlug ? 'SERVICE' : 'SHOP');
  
  // Data
  const [targetBusiness, setTargetBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(!!shopSlug);
  const [error, setError] = useState<string | null>(null);

  // Form Selection
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shop Selection State (if slug not provided)
  const [inputSlug, setInputSlug] = useState('');

  useEffect(() => {
    if (shopSlug) {
      loadShopData(shopSlug);
    }
  }, [shopSlug]);

  const loadShopData = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isRemote) {
        const business = await apiService.getPublicBusiness(slug);
        if (!business || !business.id) throw new Error("Shop not found");
        
        const [s, st] = await Promise.all([
          apiService.getPublicServices(slug),
          apiService.getPublicStaff(slug)
        ]);
        setTargetBusiness(business);
        setServices(s);
        setStaff(st);
      } else {
        // Fallback for local demo mode
        setServices(localServices);
        setStaff(localStaff);
        setTargetBusiness({ id: 'local-demo', name: 'Demo Shop', slug: 'demo' } as any);
      }
      setStep('SERVICE');
    } catch (e: any) {
      setError(e.message || "Failed to load shop details");
      setStep('SHOP');
    } finally {
      setLoading(false);
    }
  };

  const submitBooking = async () => {
    if (!selectedService || !selectedStaff || !targetBusiness) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const appt: Appointment = {
        id: `WEB-${Date.now()}`,
        businessId: targetBusiness.id,
        customerName,
        customerPhone,
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        date: `${date}T${time}:00.000Z`,
        status: 'Scheduled',
        version: 1
      };
      
      if (isRemote) {
        await apiService.createPublicAppointment(appt);
      } else {
        await addAppointment(appt);
      }
      setStep('CONFIRM');
    } catch (e: any) {
      setError(e.message || "Booking failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (step === 'CONFIRM') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Confirmed!</h2>
          <p className="text-slate-500 mb-8">Your appointment at <span className="font-bold">{targetBusiness?.name}</span> is set.</p>
          <div className="bg-slate-50 p-4 rounded-xl text-left mb-8 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Date</span><span className="font-bold">{new Date(date).toLocaleDateString()} at {time}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Service</span><span className="font-bold">{selectedService?.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Professional</span><span className="font-bold">{selectedStaff?.name}</span></div>
          </div>
          <Link to="/" className="text-yellow-600 font-bold hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between">
        <div>
           <div className="w-12 h-12 bg-yellow-500 text-slate-900 rounded-xl flex items-center justify-center mb-6">
             <Scissors size={24} className="-rotate-45" />
           </div>
           <h1 className="text-4xl font-black tracking-tight mb-2">BOOK<br/>YOUR<br/>LOOK.</h1>
           {targetBusiness && <p className="text-yellow-500 font-bold uppercase tracking-widest text-sm mt-4">{targetBusiness.name}</p>}
        </div>
        <div className="hidden md:block">
           <p className="text-xs text-slate-500 uppercase tracking-widest">BarberPro Online Booking Platform</p>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-12 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100 flex items-center gap-2">
              <WifiOff size={18} /> {error}
            </div>
          )}

          {step === 'SHOP' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Find a Shop</h2>
              <p className="text-slate-500 mb-8">Enter the unique Shop ID of the barber shop you want to book with.</p>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative mb-6">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    placeholder="e.g. barberpro"
                    value={inputSlug}
                    onChange={e => setInputSlug(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none font-bold"
                  />
                </div>
                <button 
                  onClick={() => loadShopData(inputSlug)}
                  disabled={!inputSlug || loading}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Searching...' : 'Continue to Booking'} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 'SERVICE' && (
            <div className="animate-in fade-in slide-in-from-right-4">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">What are we doing today?</h2>
              <div className="grid grid-cols-1 gap-4">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s); setStep('STAFF'); }}
                    className="flex items-center justify-between p-6 bg-white border-2 border-slate-100 hover:border-yellow-500 rounded-2xl shadow-sm transition-all text-left group"
                  >
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{s.name}</h3>
                      <p className="text-slate-500 text-sm mt-1">{s.duration} mins • KES {s.price}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-yellow-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'STAFF' && (
             <div className="animate-in fade-in slide-in-from-right-4">
               <button onClick={() => setStep('SERVICE')} className="text-slate-400 mb-4 flex items-center gap-1 text-sm font-bold"><ChevronLeft size={16}/> Back</button>
               <h2 className="text-2xl font-bold text-slate-800 mb-6">Choose a Professional</h2>
               <div className="grid grid-cols-2 gap-4">
                 {staff.map(s => (
                   <button
                     key={s.id}
                     onClick={() => { setSelectedStaff(s); setStep('TIME'); }}
                     className="p-6 bg-white border-2 border-slate-100 hover:border-yellow-500 rounded-2xl shadow-sm transition-all text-center group"
                   >
                     <img src={s.avatar} alt={s.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-slate-50 group-hover:border-yellow-100" />
                     <h3 className="font-bold text-lg text-slate-800">{s.name}</h3>
                     <p className="text-slate-500 text-xs uppercase font-bold mt-1">{s.role}</p>
                   </button>
                 ))}
               </div>
             </div>
          )}

          {step === 'TIME' && (
             <div className="animate-in fade-in slide-in-from-right-4">
                <button onClick={() => setStep('STAFF')} className="text-slate-400 mb-4 flex items-center gap-1 text-sm font-bold"><ChevronLeft size={16}/> Back</button>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Pick a Time</h2>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-4 border border-slate-200 rounded-xl mb-6 outline-none focus:ring-2 focus:ring-yellow-500 font-bold"
                />
                {date && (
                  <div className="grid grid-cols-3 gap-3">
                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                      <button
                        key={t}
                        onClick={() => { setTime(t); setStep('DETAILS'); }}
                        className="py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-900 hover:text-white transition-all"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
             </div>
          )}

          {step === 'DETAILS' && (
             <div className="animate-in fade-in slide-in-from-right-4">
               <button onClick={() => setStep('TIME')} className="text-slate-400 mb-4 flex items-center gap-1 text-sm font-bold"><ChevronLeft size={16}/> Back</button>
               <h2 className="text-2xl font-bold text-slate-800 mb-6">Your Information</h2>
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                   <input 
                     type="text" 
                     value={customerName}
                     onChange={e => setCustomerName(e.target.value)}
                     className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500"
                     placeholder="John Doe"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                   <input 
                     type="tel" 
                     value={customerPhone}
                     onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                     className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500"
                     placeholder="07XX XXX XXX"
                   />
                 </div>
                 <button 
                   disabled={!customerName || !customerPhone || isSubmitting}
                   onClick={submitBooking}
                   className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                 >
                   {isSubmitting ? 'Processing...' : 'Confirm Appointment'}
                 </button>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
