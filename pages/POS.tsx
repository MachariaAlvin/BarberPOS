
import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Service, Product, CartItem, Transaction } from '../types';
import { 
  Smartphone, CreditCard, Banknote, Search, Receipt, 
  Scissors, Package, Printer, X, ShoppingCart, Loader2, AlertCircle, Check
} from 'lucide-react';

type POSStep = 'ITEM_SELECT' | 'RECEIPT';
type MobileView = 'MENU' | 'CART';

export const POS: React.FC = () => {
  const { services, products, staff, processCheckout, settings } = useDatabase();
  const { businessId, user: currentUserAuth } = useAuth();
  
  const [step, setStep] = useState<POSStep>('ITEM_SELECT');
  const [mobileView, setMobileView] = useState<MobileView>('MENU');
  const [selectedCustomer] = useState<{name: string, id?: string} | null>({ name: 'Walk-in Customer' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'M-Pesa' | 'Card' | 'Split'>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [itemSearch, setItemSearch] = useState('');
  
  // Staff Selection States
  const [selectedItemForAssignment, setSelectedItemForAssignment] = useState<Service | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [tempSelectedStaffIds, setTempSelectedStaffIds] = useState<string[]>([]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  const categories = useMemo(() => {
    const serviceCats = Array.from(new Set(services.map(s => s.category))).sort();
    return ['All', ...serviceCats, 'Products'];
  }, [services]);
  
  const displayedItems = useMemo(() => {
    const allServices = services.map(s => ({ ...s, type: 'service' as const }));
    const allProducts = products.filter(p => p.category === 'Retail').map(p => ({ ...p, type: 'product' as const }));
    let items = [...allServices, ...allProducts];
    if (activeCategory !== 'All') items = items.filter(i => activeCategory === 'Products' ? i.type === 'product' : i.category === activeCategory);
    if (itemSearch.trim()) items = items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
    return items;
  }, [activeCategory, services, products, itemSearch]);

  const addToCart = (item: Service | Product, type: 'service' | 'product', staffIds?: string[]) => {
    const assignedStaff = staffIds ? staff.filter(s => staffIds.includes(s.id)) : [];
    const newItem: CartItem = {
      itemId: item.id,
      type,
      name: item.name,
      price: item.price,
      quantity: 1,
      staffIds: staffIds,
      staffNames: assignedStaff.map(s => s.name),
      itemVersion: item.version,
    };
    setCart(prev => [...prev, newItem]);
    setIsStaffModalOpen(false);
    setTempSelectedStaffIds([]);
    setSelectedItemForAssignment(null);
  };

  const toggleStaffSelection = (id: string) => {
    setTempSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCheckoutInitiation = async () => {
    if (isProcessing || cart.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const txData: Transaction = { 
        id: `TX-${Date.now()}`, 
        businessId: businessId || '', 
        timestamp: new Date().toISOString(), 
        items: cart, 
        total: cartTotal, 
        paymentMethod, 
        status: 'Completed', 
        customerId: selectedCustomer?.id, 
        customerName: selectedCustomer?.name,
        metadata: {
          userId: currentUserAuth?.id || '',
          userName: currentUserAuth?.name || 'System'
        }
      };

      await processCheckout(txData);
      setLastTransaction(txData);
      setCart([]);
      setStep('RECEIPT');
    } catch (err: any) { 
      setError(err.message || "Checkout failed"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  if (step === 'RECEIPT' && lastTransaction) {
    const txDate = new Date(lastTransaction.timestamp);
    return (
      <div className="flex flex-col items-center pt-8 bg-slate-100 min-h-screen">
        <div className="print-container bg-white p-6 mx-auto w-full max-w-[80mm] font-mono text-black shadow-lg mb-8">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold uppercase mb-1">{settings.business.name}</h1>
            <p className="text-[10px]">{settings.business.location}</p>
            <p className="text-[10px]">Tel: {settings.business.phone}</p>
          </div>
          
          <div className="border-t border-dashed border-black my-2"></div>
          
          <div className="text-[10px] space-y-1 mb-2">
            <div className="flex justify-between"><span>DATE:</span><span>{txDate.toLocaleDateString()} {txDate.toLocaleTimeString()}</span></div>
            <div className="flex justify-between"><span>TX ID:</span><span>{lastTransaction.id}</span></div>
            <div className="flex justify-between"><span>CLIENT:</span><span>{lastTransaction.customerName || 'Walk-in'}</span></div>
          </div>

          <div className="border-t border-dashed border-black my-2"></div>
          
          <div className="text-[10px] font-bold mb-1 flex justify-between">
            <span className="w-1/2">ITEM</span>
            <span className="w-1/6 text-center">QTY</span>
            <span className="w-1/3 text-right">TOTAL</span>
          </div>
          
          {lastTransaction.items.map((item, idx) => (
             <div key={idx} className="flex justify-between text-[10px] leading-tight mb-1">
                <div className="w-1/2">
                  <span className="block">{item.name}</span>
                  <span className="text-[8px] opacity-70 block">{item.staffNames?.join(', ')}</span>
                </div>
                <span className="w-1/6 text-center">{item.quantity}</span>
                <span className="w-1/3 text-right">{(item.price * item.quantity).toLocaleString()}</span>
             </div>
          ))}

          <div className="border-t border-dashed border-black my-2"></div>
          
          <div className="space-y-1">
            <div className="flex justify-between font-bold text-sm">
              <span>GRAND TOTAL</span>
              <span>KES {lastTransaction.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>PAYMENT METHOD</span>
              <span className="font-bold">{lastTransaction.paymentMethod}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-black my-4"></div>
          
          <div className="text-center space-y-3">
            <p className="text-[10px] leading-tight italic">{settings.business.receiptFooter}</p>
            <p className="text-[8px] opacity-50 mt-4">Powered by BarberPro POS</p>
          </div>
        </div>
        
        <div className="flex gap-4 no-print mb-12">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-slate-800 transition-all active:scale-95"><Printer size={20} /><span>Print Receipt</span></button>
          <button onClick={() => { setStep('ITEM_SELECT'); setLastTransaction(null); }} className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold shadow-md border border-slate-200 hover:bg-slate-50 transition-all">New Sale</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6 overflow-hidden">
      {/* Product/Service Selection */}
      <div className={`flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${mobileView === 'CART' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-white z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium" placeholder="Search services or products..." />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{cat}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedItems.map(item => (
              <button key={item.id} onClick={() => {
                if (item.type === 'service') { setSelectedItemForAssignment(item as Service); setIsStaffModalOpen(true); } 
                else addToCart(item as Product, 'product');
              }} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-yellow-500 transition-all text-left group h-full relative overflow-hidden">
                <div className="mb-3">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${item.type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{item.type === 'service' ? <Scissors size={18}/> : <Package size={18}/>}</div>
                   <h3 className="font-bold text-slate-800 text-sm leading-tight">{item.name}</h3>
                </div>
                <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between font-bold text-slate-900">KES {item.price}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart & Checkout Panel */}
      <div className={`w-full md:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden flex-shrink-0 ${mobileView === 'MENU' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
           <div className="mb-4">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button onClick={() => setPaymentMethod('Cash')} className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${paymentMethod === 'Cash' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <Banknote size={16} /> Cash
                </button>
                <button onClick={() => setPaymentMethod('M-Pesa')} className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${paymentMethod === 'M-Pesa' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <Smartphone size={16} /> M-Pesa
                </button>
                <button onClick={() => setPaymentMethod('Card')} className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${paymentMethod === 'Card' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <CreditCard size={16} /> Card
                </button>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg font-bold flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}
          {cart.map((item, index) => (
            <div key={index} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <div><p className="font-bold text-slate-800 text-sm">{item.name}</p><p className="text-[10px] text-slate-500">{item.staffNames?.join(', ')}</p></div>
                 <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
              </div>
              <div className="flex items-center justify-between font-bold text-slate-900">
                 <span className="text-xs">x{item.quantity}</span>
                 <span>KES {item.price * item.quantity}</span>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50"><ShoppingCart size={48} /><p className="font-bold mt-2">Empty Cart</p></div>}
        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
           <div className="flex justify-between items-end mb-4 font-black">
              <span className="text-slate-500 text-sm">Total</span>
              <span className="text-2xl text-slate-900">KES {cartTotal.toLocaleString()}</span>
           </div>
           <button onClick={handleCheckoutInitiation} disabled={cart.length === 0 || isProcessing} className="w-full py-4 bg-yellow-500 text-slate-900 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2">
             {isProcessing ? <Loader2 className="animate-spin" size={24} /> : 'Complete Sale'}
           </button>
        </div>
      </div>

      {/* Staff Multi-Selection Modal */}
      {isStaffModalOpen && selectedItemForAssignment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
             <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xl text-slate-800">Assign Team</h3>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">For: {selectedItemForAssignment.name}</p>
                </div>
                <button onClick={() => { setIsStaffModalOpen(false); setTempSelectedStaffIds([]); }}><X size={20} /></button>
             </div>
             <div className="p-5 overflow-y-auto grid grid-cols-2 gap-3">
                {staff.filter(s => s.role !== 'Cashier').map(s => {
                  const isSelected = tempSelectedStaffIds.includes(s.id);
                  return (
                    <button 
                      key={s.id} 
                      onClick={() => toggleStaffSelection(s.id)} 
                      className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 relative ${
                        isSelected ? 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                       {isSelected && (
                         <div className="absolute top-2 right-2 bg-yellow-500 text-slate-900 rounded-full p-1">
                           <Check size={12} />
                         </div>
                       )}
                       <img src={s.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                       <span className="text-sm font-bold text-slate-700">{s.name}</span>
                       <span className="text-[10px] uppercase font-black text-slate-400">{s.role}</span>
                    </button>
                  );
                })}
             </div>
             <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => { setIsStaffModalOpen(false); setTempSelectedStaffIds([]); }}
                  className="flex-1 py-3 text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => addToCart(selectedItemForAssignment, 'service', tempSelectedStaffIds)}
                  disabled={tempSelectedStaffIds.length === 0}
                  className="flex-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
                >
                  Confirm {tempSelectedStaffIds.length} Assigned
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
